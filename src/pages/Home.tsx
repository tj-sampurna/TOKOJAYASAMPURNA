/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { getProductDetails, parseSupabaseDate } from '../utils/productHelper';
import { deleteProduct, seedProducts } from '../utils/productService';
import { getErrorMessage } from '../utils/supabaseError';
import SystemErrorModal from '../components/SystemErrorModal';
import { Search, MapPin, Grid, Heart, ShieldCheck, Sparkles, Plus, Eye, ShoppingCart, SlidersHorizontal, ArrowRight, Loader, Trash2, AlertCircle } from 'lucide-react';

interface DBProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string;
}

export default function Home() {
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [soldProductIds, setSoldProductIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<string>('user');

  // Search, Location and Category states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Semua Lokasi');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Pricing Filters
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Checkout Processing Overlay
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState('');

  // Pending orders tracking for duplicate check & auto-expiry cleanup
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);

  // Deletion modals & Custom notifications
  const [deleteConfirmProd, setDeleteConfirmProd] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [systError, setSystError] = useState<string | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const navigate = useNavigate();

  // Load auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sessionState) => {
      setSession(sessionState);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch true user-role from database table
  useEffect(() => {
    let active = true;
    const fetchRoleFromDatabase = async () => {
      if (!session?.user) {
        setRole('user');
        return;
      }
      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (active) {
          if (!error && data) {
            setRole(data.role || 'user');
          } else {
            setRole(session.user.user_metadata?.role ?? 'user');
          }
        }
      } catch (err) {
        if (active) {
          setRole(session.user.user_metadata?.role ?? 'user');
        }
      }
    };

    fetchRoleFromDatabase();
    
    // Listen to db update events in case table is rewritten
    window.addEventListener('tjs_db_update', fetchRoleFromDatabase);
    return () => {
      active = false;
      window.removeEventListener('tjs_db_update', fetchRoleFromDatabase);
    };
  }, [session]);

  // Read current user pending orders and auto-expire anything older than 5 minutes
  const fetchAndCleanupPendingOrders = async () => {
    // Synchronize sold product status from the database for everyone
    try {
      const { data: paidOrders, error: paidError } = await supabase
        .from('orders')
        .select('product_id')
        .eq('status', 'PAID');
      if (!paidError && paidOrders) {
        const ids = paidOrders.map((o: any) => o.product_id).filter(Boolean);
        setSoldProductIds(ids);
      }
    } catch (e) {
      console.error("Gagal membaca produk terbayar:", e);
    }

    if (!session?.user) {
      setPendingOrders([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'PENDING');

      if (!error && data) {
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        const remainingPending: any[] = [];

        for (const ord of data) {
          const createdTime = parseSupabaseDate(ord.created_at).getTime();
          if (now - createdTime > fiveMinutes) {
            // Expire order in Supabase table orders
            await supabase
              .from('orders')
              .update({ status: 'FAILED' })
              .eq('id', ord.id);
            // Sync in payments table too
            await supabase
              .from('payments')
              .update({ status: 'FAILED' })
              .eq('invoice', ord.invoice);
          } else {
            remainingPending.push(ord);
          }
        }
        setPendingOrders(remainingPending);
      }
    } catch (err) {
      console.error('Error running auto-expiry cleanup:', err);
    }
  };

  useEffect(() => {
    fetchAndCleanupPendingOrders();
    const interval = setInterval(fetchAndCleanupPendingOrders, 5000);
    window.addEventListener('tjs_db_update', fetchAndCleanupPendingOrders);
    return () => {
      clearInterval(interval);
      window.removeEventListener('tjs_db_update', fetchAndCleanupPendingOrders);
    };
  }, [session]);

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await deleteProduct(id);

      if (error) throw error;
      showToast('Produk berhasil dihapus.');
      fetchProducts();
    } catch (err: any) {
      showToast(`Gagal menghapus produk: ${err.message}`, 'error');
    } finally {
      setDeleteConfirmProd(null);
    }
  };

  // Fetch products from Supabase
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const  { data, error } = await supabase
        .from('products')
        .select('*');

      if (error) {
        console.error('Error fetching products:', error.message);
        // If the table doesn't exist, we explain it clearly to help them know they need to create it
        if (error.message.includes('does not exist')) {
          setSystError(`Tabel 'products' belum dibuat di database Supabase Anda atau RLS (Row Level Security) memblokir pembacaan publik. Hubungi Admin atau jalankan SQL skema lengkap di tab 'Integrasi Midtrans' di panel Admin.`);
        } else if (error.message === 'Failed to fetch' || error.message.includes('Failed to fetch')) {
          setSystError(`Gagal menghubungi server Supabase (Failed to fetch). Proyek Supabase Anda mungkin mengalami "Pause" karena tidak aktif, diblokir oleh AdBlock, atau URL salah. Silakan periksa Dashboard Supabase Anda.`);
        } else {
          setSystError(`Gagal membaca katalog produk dari Supabase: "${error.message}". Pastikan konfigurasi Anda sudah terhubung.`);
        }
      } else if (data) {
        const normalized = data.map((p: any) => ({
          ...p,
          name: p.name || p.title || '',
          image: p.image || p.image_url || ''
        }));
        // Sort by name
        normalized.sort((a, b) => a.name.localeCompare(b.name));
        setProducts(normalized);

        // Fetch sold products too
        try {
          const { data: paidOrders, error: paidError } = await supabase
            .from('orders')
            .select('product_id')
            .eq('status', 'PAID');
          if (!paidError && paidOrders) {
            const ids = paidOrders.map((o: any) => o.product_id).filter(Boolean);
            setSoldProductIds(ids);
          }
        } catch (e) {
          console.error(e);
        }
      }
    } catch (err: any) {
      console.error(err);
      setSystError(`Gagal menghubungkan ke Supabase: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedProducts = async () => {
    setSeedLoading(true);
    try {
      const { error } = await seedProducts();
      if (error) {
        if (error.message.includes('does not exist')) {
          setSystError(`Gagal memasukkan produk contoh karena tabel 'products' tidak ditemukan di database Anda. Silakan jalankan SQL Skema Editor di halaman Admin terlebih dahulu.`);
        } else {
          setSystError(`Gagal menambahkan produk contoh ke database: "${error.message}"`);
        }
      } else {
        showToast('6 Produk Contoh berhasil diunggah ke database Anda!', 'success');
        fetchProducts();
      }
    } catch (err: any) {
      setSystError(`Terjadi kesalahan pengisian produk contoh: ${err.message || err}`);
    } finally {
      setSeedLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    window.addEventListener('tjs_db_update', fetchProducts);
    return () => {
      window.removeEventListener('tjs_db_update', fetchProducts);
    };
  }, []);

  // Beli Sekarang CORE Checkout Flow
  const handleBuyNow = async (e: React.MouseEvent, product: DBProduct) => {
    e.stopPropagation();
    
    // STEP 1: Cek login Supabase Auth
    if (!session) {
      navigate('/login');
      return;
    }

    // Check duplicate check - prevent multiple orders for same product before completion
    const existingPending = pendingOrders.find(o => o.product_id === product.id);
    if (existingPending) {
      showToast('Anda sudah memiliki pesanan pending untuk produk ini. Mengalihkan...', 'error');
      setTimeout(() => {
        navigate('/orders');
      }, 1500);
      return;
    }

    setCheckoutLoading(true);
    setCheckoutStatus('Membuat pesanan aman & menyiapkan Midtrans Snap...');

    try {
      const user = session.user;
      const email = user.email || 'test@gmail.com';
      const customerName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Pelanggan Toko';
      const invoiceOfTransaction = `INV-${Date.now()}${Math.floor(Math.random() * 9000) + 1000}`;

      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          product_id: product.id,
          productName: product.name,
          amount: product.price,
          quantity: 1,
          invoice: invoiceOfTransaction,
          paymentMethod: 'midtrans_snap', 
          customer_name: customerName,
          email: email
        })
      });

      let parsedResult;
      try {
        parsedResult = await response.json();
      } catch (e) {
        throw new Error('Gagal memparsing respons dari server pembayaran lokal.');
      }

      if (!response.ok || !parsedResult.success) {
        throw new Error(`Gagal memicu transaksi aman: ${parsedResult.error || 'Server error'}`);
      }

      const funcData = parsedResult;

      const returnedInvoice = funcData?.invoice;
      const token = funcData?.reference; // Server returns Snap token as 'reference'
      const paymentUrl = funcData?.paymentUrl; // Server returns redirect_url

      if (!token && !paymentUrl) {
        throw new Error('Midtrans Snap Token atau tautan checkout tidak ditemukan.');
      }

      setCheckoutStatus('Mendaftarkan invoice Anda di database...');

      // Periksa apakah order dengan invoice ini sudah dibuat oleh Edge Function secara otomatis
      if (returnedInvoice) {
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('invoice', returnedInvoice)
          .maybeSingle();

        if (!existingOrder) {
          // STEP 2: Create ORDER di Supabase table orders menggunakan invoice resmi jika belum ada
          const { error: orderError } = await supabase
            .from('orders')
            .insert({
              user_id: user.id,
              product_id: product.id,
              amount: product.price,
              status: 'PENDING',
              invoice: returnedInvoice
            });

          if (orderError) console.error("Gagal insert local pesanan status:", orderError);
        }
      }

      // Dispatch global database update event to update the header badge instantly
      window.dispatchEvent(new Event('tjs_db_update'));

      setCheckoutStatus('Membuka Midtrans Popup...');
      
      // Inject Midtrans Snap script dynamically if not present
      const isProd = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true' || import.meta.env.VITE_MIDTRANS_ENV === 'production';
      const snapScriptUrl = isProd 
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js';
      const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY || 'SB-Mid-client-gqOVsh7Vcbo-i_h4';

      let script = document.querySelector('script[data-midtrans="snap"]') as HTMLScriptElement;
      
      const openMidtransPopup = () => {
        setCheckoutLoading(false);
        if (window.snap && token) {
          window.snap.pay(token, {
            onSuccess: function(result: any) {
              console.log("Pembayaran Sukses", result);
              showToast('Pembayaran berhasil dikonfirmasi!', 'success');
              navigate('/orders');
            },
            onPending: function(result: any) {
              console.log("Menunggu Pembayaran", result);
              showToast('Menunggu Anda menyelesaikan pembayaran', 'success');
              navigate('/orders');
            },
            onError: function(result: any) {
              console.error("Pembayaran Gagal", result);
              setSystError('Pembayaran gagal dilakukan. Silakan coba metode pembayaran lain.');
            },
            onClose: function() {
              console.log('Customer closed the popup without finishing the payment');
              showToast('Transaksi dibatalkan. Anda belum melakukan pembayaran.', 'error');
              navigate('/orders');
            }
          });
        } else if (paymentUrl) {
          // Fallback to full page redirect if window.snap failed to load or token is invalid
          window.location.href = paymentUrl;
        } else {
          setSystError("Midtrans Snap Token tidak tersedia.");
        }
      };

      if (!script) {
        script = document.createElement('script');
        script.src = snapScriptUrl;
        script.setAttribute('data-client-key', clientKey);
        script.setAttribute('data-midtrans', 'snap');
        script.onload = () => {
          openMidtransPopup();
        };
        script.onerror = () => {
          console.error("Gagal mengambil script Snap Midtrans");
          setCheckoutLoading(false);
          if (paymentUrl) window.location.href = paymentUrl; // fallback
        };
        document.body.appendChild(script);
      } else {
        openMidtransPopup();
      }

    } catch (err: any) {
      setCheckoutLoading(false);
      setSystError(err.message || String(err));
    }
  };

  // Helper lists matching original static content style for OLX
  const INDONESIAN_CITIES = [
    'Semua Lokasi',
    'Jakarta Selatan',
    'Bandung',
    'Surabaya',
    'Medan',
    'Yogyakarta',
    'Semarang',
    'Tangerang',
    'Makassar',
    'Denpasar',
    'Malang'
  ];

  const CATEGORIES = [
    { id: 'all', name: 'Semua', icon: 'Grid' },
    { id: 'Otomotif', name: 'Mobil & Motor', icon: 'Car' },
    { id: 'Elektronik', name: 'Elektronik', icon: 'Laptop' },
    { id: 'Handphone', name: 'HP & Gadget', icon: 'Smartphone' },
    { id: 'Properti', name: 'Properti & Kost', icon: 'Home' },
    { id: 'Fashion', name: 'Fashion & Baju', icon: 'Shirt' },
    { id: 'Hobi & Olahraga', name: 'Olahraga & Hobi', icon: 'Bike' },
    { id: 'Buku & Tulis', name: 'Buku & Tulis', icon: 'Book' },
    { id: 'Mainan Anak', name: 'Mainan & Anak', icon: 'Toy' },
    { id: 'Peralatan Rumah Tangga', name: 'Alat Rumah Tangga', icon: 'Home' },
    { id: 'Lain-lain', name: 'Lain-lain', icon: 'Box' }
  ];

  // Map & Filter products
  const enrichedProducts = products.map(p => {
    const details = getProductDetails(p.name, p.id, p.category);
    
    // Parse any JSON string of images array or fallback
    let imageList: string[] = [];
    if (p.images && Array.isArray(p.images) && p.images.length > 0) {
      imageList = p.images;
    } else if (p.image || p.image_url) {
      const rawUrl = p.image || p.image_url;
      if (rawUrl && typeof rawUrl === 'string') {
        if (rawUrl.startsWith('[')) {
          try {
            imageList = JSON.parse(rawUrl);
          } catch (e) {
            imageList = [rawUrl];
          }
        } else if (rawUrl.includes(',')) {
          imageList = rawUrl.split(',').map((s: string) => s.trim()).filter(Boolean);
        } else {
          imageList = [rawUrl];
        }
      }
    }

    const firstImage = imageList[0] || p.image || p.image_url || details.image;

    return {
      ...p,
      ...details,
      image: firstImage
    };
  });

  const filteredProducts = enrichedProducts.filter(p => {
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLocation = selectedLocation === 'Semua Lokasi' || p.location === selectedLocation;
    
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;

    const priceNum = p.price;
    const matchesMinPrice = !minPrice || priceNum >= Number(minPrice);
    const matchesMaxPrice = !maxPrice || priceNum <= Number(maxPrice);

    return matchesSearch && matchesLocation && matchesCategory && matchesMinPrice && matchesMaxPrice;
  });

  // Hot limited deals for top banner
  const hotDeals = enrichedProducts.slice(0, 3);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="flex-1 bg-[#f8f7f4] pb-16">
      {/* Checkout Processing Loader */}
      {checkoutLoading && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-2xl border border-gray-100 flex flex-col items-center">
            <Loader className="w-10 h-10 text-[#C9A84C] animate-spin" />
            <h3 className="font-display font-black text-lg text-slate-900">Pembayaran Aman Terverifikasi</h3>
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{checkoutStatus}</p>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#C9A84C] h-1.5 rounded-full animate-pulse w-3/4"></div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Visual Banner (OLX-style) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="rounded-2xl overflow-hidden bg-[#0A1628] text-white p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-md border border-slate-800 premium-shine-bar relative">
          <div className="space-y-4 max-w-xl text-left">
            <h1 className="font-display font-black text-2xl md:text-4xl text-white tracking-tight leading-none">
              Barang Bekas Berkualitas,<br />
              <span className="text-[#C9A84C]">Transaksi Dijamin Aman</span>
            </h1>
            <p className="text-[#8a9ab5] text-xs md:text-sm leading-relaxed">
              Temukan ribuan barang second pilihan dari seluruh Indonesia.
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1.5">
              <motion.button
                onClick={() => {
                  setSelectedCategory('all');
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
                animate={{
                  scale: [1, 1.05, 1, 1.05, 1],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  repeatType: "loop",
                  ease: "easeInOut"
                }}
                className="bg-[#C9A84C] hover:bg-[#b0923f] text-[#0A1628] font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                Jelajahi Produk →
              </motion.button>
            </div>
          </div>

          {/* Quick Hot Deals */}
          {hotDeals.length > 0 && (
            <div className="hidden lg:block bg-white/5 rounded-xl p-4 border border-white/10 w-80 text-left shrink-0">
              <span className="text-[10px] text-[#C9A84C] font-extrabold mb-2.5 block uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 fill-[#C9A84C] text-[#C9A84C]" />
                Rekomendasi Populer Hari Ini
              </span>
              <div className="space-y-3">
                {hotDeals.map((p) => (
                  <div
                     key={p.id}
                     onClick={() => navigate(`/product/${p.id}`)}
                     className="flex gap-2.5 items-center cursor-pointer hover:bg-white/5 p-1.5 rounded-lg transition"
                  >
                    <img src={p.image} referrerPolicy="no-referrer" alt="" className="w-10 h-10 object-cover rounded-lg border border-white/10 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs truncate leading-none text-white">{p.name}</p>
                      <p className="font-mono text-[11px] text-[#C9A84C] font-black mt-1">
                        {formatRupiah(p.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Bar Search & Filters Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 text-left">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3 items-center">
          {/* Location Picker */}
          <div className="relative w-full md:w-60">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-800 pointer-events-none">
              <MapPin className="w-4 h-4" />
            </span>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full bg-[#f2f4f5] border-2 border-transparent focus:border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 outline-none font-bold appearance-none cursor-pointer"
            >
              {INDONESIAN_CITIES.map((city) => (
                <option key={city} value={city}>
                  {city === 'Semua Lokasi' ? 'Seluruh Indonesia' : city}
                </option>
              ))}
            </select>
          </div>

          {/* Keyword Search Input */}
          <div className="relative flex-1 w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Cari Mobil Avanza, iPhone Bekas, Laptop Asus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-[#f2f4f5] border-2 border-transparent focus:border-slate-800 rounded-xl text-xs outline-none font-medium transition"
            />
          </div>

          {/* Toggle advance filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-2 rounded-xl text-xs font-bold font-mono transition cursor-pointer w-full md:w-auto justify-center ${
              showFilters ? 'bg-slate-900 border-slate-900 text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filter Harga
          </button>
        </div>

        {/* Advance price inputs */}
        {showFilters && (
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mt-3 flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full">
              <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Harga Minimum (IDR)</label>
              <input
                type="number"
                placeholder="cth. 1000000"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full bg-[#f2f4f5] p-2.5 rounded-xl text-xs outline-none border-2 border-transparent focus:border-slate-800 transition"
              />
            </div>
            <div className="w-full">
              <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Harga Maksimum (IDR)</label>
              <input
                type="number"
                placeholder="cth. 15000000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full bg-[#f2f4f5] p-2.5 rounded-xl text-xs outline-none border-2 border-transparent focus:border-slate-800 transition"
              />
            </div>
            <button
              onClick={() => {
                setMinPrice('');
                setMaxPrice('');
              }}
              className="w-full sm:w-auto sm:mt-5 text-gray-500 hover:text-red-500 font-bold text-xs p-2.5 whitespace-nowrap uppercase tracking-wider"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* Styled Horizontal Category Quick Carousel */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 text-left">
        <h3 className="font-display font-black text-sm text-slate-900 mb-3 uppercase tracking-wider">
          Telusuri Kategori Terpopuler
        </h3>
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
                selectedCategory === cat.id
                  ? 'bg-slate-950 border-slate-950 text-white shadow-sm'
                  : 'bg-white border-transparent text-gray-700 hover:bg-gray-50 shadow-xs'
              }`}
            >
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Products Catalog Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 text-left">
        {session && role === 'admin' && (
          <div className="bg-white border border-[#e8e4dc] rounded-2xl p-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-[#f8f7f4] text-[#C9A84C] shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#C9A84C]" />
              </span>
              <div>
                <h4 className="text-sm font-extrabold text-[#0A1628] uppercase tracking-wide">Konsol Pintar Administrator Toko Jaya Sampurna</h4>
                <p className="text-xs text-[#6b7280] mt-0.5 font-medium">Anda memiliki otorisasi penuh untuk menambah katalog, mengedit stok/harga, serta menghapus iklan yang tidak layak.</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={() => navigate('/admin')}
                className="flex-1 sm:flex-none inline-flex justify-center items-center gap-1 bg-[#0A1628] hover:bg-[#1a2c47] text-white text-xs font-bold px-4 py-2.5 rounded-xl uppercase tracking-wider transition cursor-pointer shadow-xs border border-transparent"
              >
                Panel Admin
              </button>
              <button
                onClick={() => navigate('/admin', { state: { openNewProduct: true } })}
                className="flex-1 sm:flex-none inline-flex justify-center items-center gap-1 bg-[#C9A84C] hover:bg-[#b0923f] text-[#0A1628] text-xs font-extrabold px-4 py-2.5 rounded-xl uppercase tracking-widest transition cursor-pointer shadow-xs border border-transparent"
              >
                <Plus className="w-4 h-4 text-[#0A1628]" />
                Tambah Barang Baru
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-display font-black text-[#0A1628] tracking-tight">
              Rekomendasi Terkini Barang Jual-Beli
            </h2>
            <p className="text-xs text-[#6b7280] mt-1">
              Menampilkan {filteredProducts.length} iklan baris bekas aman terverifikasi daerah <b className="text-[#0A1628]">{selectedLocation}</b>
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-2xl border border-[#e8e4dc] p-4 h-96 animate-pulse flex flex-col justify-between">
                <div>
                  <div className="bg-gray-200 h-40 rounded-xl mb-4"></div>
                  <div className="bg-gray-200 h-5 w-3/4 rounded-md mb-2"></div>
                  <div className="bg-gray-200 h-4 w-1/2 rounded-md"></div>
                </div>
                <div className="bg-gray-200 h-10 w-full rounded-md mt-4"></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-[#e8e4dc] p-16 text-center text-[#9ca3af] max-w-xl mx-auto py-16 px-6">
            <span className="text-5xl block mb-4">📦</span>
            <h4 className="font-display font-extrabold text-[#0A1628] text-base">Katalog Produk Toko Masih Kosong</h4>
            <p className="text-xs text-[#6b7280] mt-2 leading-relaxed max-w-md mx-auto">
              Sistem tidak mendeteksi katalog barang di database. Anda dapat secara instan membuat <b>6 Produk Contoh Terpopuler</b> siap jual dengan klik tombol di bawah untuk mempermudah uji coba transaksi.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={handleSeedProducts}
                disabled={seedLoading}
                className="bg-[#C9A84C] hover:bg-[#b0923f] text-[#0A1628] text-[11px] font-black px-6 py-2.5 rounded-xl uppercase tracking-wider shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {seedLoading ? (
                  <>
                    <Loader className="w-3.5 h-3.5 animate-spin" /> Sedang Mengisi Contoh...
                  </>
                ) : (
                  'Inisialisasi 6 Produk Contoh'
                )}
              </button>
              <button
                onClick={() => navigate('/add-product')}
                className="bg-white hover:bg-gray-50 text-[#0A1628] border-2 border-[#0A1628] text-[11px] font-black px-6 py-2 rounded-xl uppercase tracking-wider cursor-pointer"
              >
                Tambah Produk Manual
              </button>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e8e4dc] p-16 text-center text-[#9ca3af] max-w-lg mx-auto py-16 px-6">
            <span className="text-5xl block mb-4">🔍</span>
            <h4 className="font-display font-extrabold text-[#0A1628] text-base">Iklan produk tidak ditemukan</h4>
            <p className="text-xs text-[#6b7280] mt-2 leading-relaxed max-w-sm mx-auto">
              Silakan bersihkan kata kunci filter, setel ulang harga maksimum, atau sesuaikan filter lokasi daerah pencarian Anda.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedLocation('Semua Lokasi');
                setSelectedCategory('all');
                setMinPrice('');
                setMaxPrice('');
              }}
              className="mt-4 bg-[#0A1628] hover:bg-[#1a2c47] text-white text-xs font-black px-6 py-3 rounded-xl uppercase tracking-wider shadow-md cursor-pointer"
            >
              Ulang Pencarian
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => !soldProductIds.includes(p.id) && navigate(`/product/${p.id}`)}
                className={`group relative bg-white rounded-2xl border border-[#e8e4dc] overflow-hidden cursor-pointer transition-all duration-300 shadow-md hover:shadow-2xl hover:-translate-y-2 flex flex-col h-full ${
                  soldProductIds.includes(p.id) ? 'opacity-90' : ''
                }`}
              >
                {/* Visual Image container */}
                <div className="relative aspect-video bg-gray-50 overflow-hidden">
                  <img
                    src={p.image}
                    alt={p.name}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover transition-transform duration-500 ${
                      (soldProductIds.includes(p.id) || p.stock <= 0) ? 'scale-105 blur-sm grayscale-[50%]' : 'group-hover:scale-105'
                    }`}
                  />
                  {(soldProductIds.includes(p.id) || p.stock <= 0) && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-20">
                      <div className="bg-black/80 text-white font-display font-black text-xs md:text-sm px-6 py-2 rounded-full flex items-center gap-2 border border-white/20 shadow-2xl backdrop-blur-md rotate-[-5deg] transform scale-110">
                        <span className="text-red-500">❌</span> 
                        {soldProductIds.includes(p.id) ? 'TERJUAL' : 'HABIS'}
                      </div>
                    </div>
                  )}
                  {/* Category marker on top-left to avoid overlap */}
                  <span className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-xs text-[10px] font-bold px-2 py-0.5 rounded-md text-[#6b7280] shadow-xs border border-[#e8e4dc]/50 z-10">
                    {p.category}
                  </span>
                  {/* Premium verification badge on top-right of image */}
                  <span className="absolute top-2.5 right-2.5 bg-white border-[1.5px] border-[#C9A84C] text-[#C9A84C] text-[10px] font-black rounded-xl px-2 py-0.5 shadow-xs z-10">
                    Terverifikasi
                  </span>
                </div>

                {/* Body Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Price and verified status */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-display font-extrabold text-base text-[#0A1628]">
                        {formatRupiah(p.price)}
                      </span>
                      <span className="text-[#C9A84C] bg-[#C9A84C]/10 p-1 rounded-full text-xs" title="Penjual Terverifikasi">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className={`text-xs font-bold text-[#0A1628] line-clamp-2 leading-relaxed ${soldProductIds.includes(p.id) ? 'line-through text-gray-400' : 'group-hover:text-[#C9A84C]'} transition-colors`}>
                      {p.name}
                    </h3>
                    <p className="text-[11px] text-[#6b7280] line-clamp-2 mt-1 select-none">
                      {p.description}
                    </p>
                  </div>

                  {/* Pricing and Action triggers */}
                  <div className="space-y-2 border-t border-[#e8e4dc] pt-3 mt-4">
                    {/* Location */}
                    <div className="flex justify-between items-center text-[10px] text-[#9ca3af]">
                      <span className="font-semibold text-[#6b7280] truncate max-w-[120px]">📍 {p.location}</span>
                      <span>{p.dateStr}</span>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        disabled={soldProductIds.includes(p.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!soldProductIds.includes(p.id)) {
                            navigate(`/product/${p.id}`);
                          }
                        }}
                        className={`text-[10px] font-black uppercase tracking-wider py-2.5 rounded-lg text-center transition ${
                          soldProductIds.includes(p.id) 
                            ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-55' 
                            : 'border border-[#0A1628] hover:bg-[#0A1628]/5 text-[#0A1628] cursor-pointer'
                        }`}
                      >
                        Detail
                      </button>
                      <button
                        disabled={p.stock <= 0 || soldProductIds.includes(p.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!soldProductIds.includes(p.id)) {
                            handleBuyNow(e, p);
                          }
                        }}
                        className={`text-[10px] font-black uppercase tracking-widest py-2.5 rounded-lg text-center shadow-xs transition ${
                          soldProductIds.includes(p.id)
                            ? 'bg-red-50 text-red-500 border border-red-200 cursor-not-allowed opacity-55'
                            : pendingOrders.some(o => o.product_id === p.id)
                              ? 'bg-[#0A1628] hover:bg-[#1a2c47] border border-transparent text-white cursor-pointer'
                              : 'bg-[#C9A84C] hover:bg-[#b0923f] text-[#0A1628] disabled:bg-[#e8e4dc] disabled:text-gray-400 cursor-pointer'
                        }`}
                      >
                        {soldProductIds.includes(p.id) ? (
                          'Terjual'
                        ) : (
                          <>
                            <ShoppingCart className="w-3.5 h-3.5 inline-block" />
                            {pendingOrders.some(o => o.product_id === p.id) ? ' Bayar' : ' Beli'}
                          </>
                        )}
                      </button>
                    </div>

                    {/* Admin quick actions - only visible to admin */}
                    {session && role === 'admin' && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed border-[#e8e4dc] mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/admin', { state: { editProductId: p.id } });
                          }}
                          className="bg-[#C9A84C] hover:bg-[#b0923f] text-[#0A1628] text-[10px] font-extrabold uppercase tracking-wider py-2.5 rounded-lg text-center transition cursor-pointer"
                        >
                          Edit Produk
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmProd({ id: p.id, name: p.name });
                          }}
                          className="bg-[#0A1628] hover:bg-[#1a2c47] text-white text-[10px] font-extrabold uppercase tracking-wider py-2.5 rounded-lg text-center transition cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Custom Confirmation Modal for Deletion */}
        {deleteConfirmProd && (
          <div className="fixed inset-0 bg-[#0A1628]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[#e8e4dc] transform scale-100 transition-all">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-[#C9A84C]/10 text-[#C9A84C] rounded-full flex items-center justify-center mb-4 border border-[#C9A84C]/20 animate-bounce">
                  <AlertCircle className="w-8 h-8" />
                </div>
                
                <h3 className="text-lg font-black text-[#0A1628] mb-2 uppercase tracking-wide leading-tight">
                  Yakin mau di hapus??
                </h3>
                
                <p className="text-xs text-[#6b7280] mb-6 leading-relaxed">
                  Apakah Anda benar-benar yakin ingin menghapus produk <strong className="text-[#0A1628] font-extrabold font-serif">"{deleteConfirmProd.name}"</strong>? 
                  Tindakan ini tidak dapat dibatalkan dan semua riwayat checkout terkait akan dihapus.
                </p>

                <div className="grid grid-cols-2 gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmProd(null)}
                    className="w-full border border-[#e8e4dc] text-[#6b7280] font-extrabold text-[11px] py-3 text-center rounded-xl uppercase tracking-wider hover:bg-gray-50 transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(deleteConfirmProd.id)}
                    className="w-full bg-[#0A1628] text-white font-black py-3 rounded-xl text-[11px] uppercase tracking-widest hover:bg-[#1a2c47] transition cursor-pointer flex items-center justify-center gap-1 shadow-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Elegant Custom Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 bg-[#0A1628] text-white rounded-2xl px-4 py-3 shadow-xl border border-slate-800 flex items-center gap-2 max-w-sm animate-fade-in font-medium text-xs">
            {toast.type === 'success' ? (
              <span className="text-[#C9A84C] font-bold">✓</span>
            ) : (
              <span className="text-amber-500 font-bold">⚠</span>
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* System Error Modal Popup instead of Standard Browser Alerts */}
        <SystemErrorModal
          isOpen={!!systError}
          message={systError || ""}
          isAdmin={role === 'admin'}
          onClose={() => setSystError(null)}
        />

      </div>
    </div>
  );
}
