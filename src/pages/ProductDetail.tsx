/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getProductDetails, parseSupabaseDate } from '../utils/productHelper';
import { deleteProduct } from '../utils/productService';
import { getErrorMessage } from '../utils/supabaseError';
import SystemErrorModal from '../components/SystemErrorModal';
import { ShieldCheck, ArrowLeft, Heart, ShoppingBag, Eye, MessageSquare, Sparkles, Loader, ShoppingCart, Info, Trash2, AlertCircle, ZoomIn, ZoomOut, RotateCcw, X, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DBProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string;
  image?: string;
  image_url?: string;
  images?: string[];
  category?: string;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<DBProduct | null>(null);
  const [isSold, setIsSold] = useState(false);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<string>('user');

  // Checkout loading
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState('');

  // Deletion modals & Custom notifications
  const [deleteConfirmProd, setDeleteConfirmProd] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [systError, setSystError] = useState<string | null>(null);

  // Track pending orders for duplicate-check & auto-expiry cleanup
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Zoom overlay states
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Carousel & Touch Swipe gestures
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const onTouchEnd = (finalImagesLength: number) => {
    if (touchStartX === null || touchEndX === null || finalImagesLength <= 1) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 50;
    if (distance > minSwipeDistance) {
      // swipe left (next)
      setActiveImageIndex((prev) => (prev + 1) % finalImagesLength);
    } else if (distance < -minSwipeDistance) {
      // swipe right (prev)
      setActiveImageIndex((prev) => (prev - 1 + finalImagesLength) % finalImagesLength);
    }
  };

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (zoomScale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Keyboard shortcut listeners for the zoom stage
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isZoomOpen) return;
      if (e.key === 'Escape') {
        setIsZoomOpen(false);
        setZoomScale(1);
        setPanOffset({ x: 0, y: 0 });
      } else if (e.key === '=' || e.key === '+') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomOpen]);

  const navigate = useNavigate();

  // Load session
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
    if (id) {
      try {
        const { data: paidOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('product_id', id)
          .eq('status', 'PAID')
          .limit(1);
        if (paidOrders && paidOrders.length > 0) {
          setIsSold(true);
        } else {
          setIsSold(false);
        }
      } catch (e) {
        console.error(e);
      }
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
              
            // Restore stock
            if (ord.product_id) {
              try {
                const { data: currentProduct } = await supabase
                  .from('products')
                  .select('stock')
                  .eq('id', ord.product_id)
                  .maybeSingle();

                if (currentProduct) {
                  const quantityToRestore = ord.quantity || 1;
                  await supabase
                    .from('products')
                    .update({ stock: currentProduct.stock + quantityToRestore })
                    .eq('id', ord.product_id);
                }
              } catch (e) {
                console.error("Failed to restore stock on expiration:", e);
              }
            }
          } else {
            remainingPending.push(ord);
          }
        }
        setPendingOrders(remainingPending);
      }
    } catch (err) {
      console.error('Error running detail auto-expiry cleanup:', err);
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
  }, [session, id]);

  const handleDeleteProduct = async () => {
    if (!product) return;
    setLoading(true);
    try {
      const { error } = await deleteProduct(product.id);

      if (error) throw error;
      showToast('Produk berhasil dihapus.');
      navigate('/');
    } catch (err: any) {
      showToast(`Gagal menghapus produk: ${err.message}`, 'error');
      setLoading(false);
    } finally {
      setDeleteConfirmProd(null);
    }
  };

  // Fetch specific product by ID
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error(error);
          setProduct(null);
        } else {
          let imageList: string[] = [];
          if (data.images && Array.isArray(data.images) && data.images.length > 0) {
            imageList = data.images;
          } else if (data.image_url) {
            const rawUrl = data.image_url;
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
          if (imageList.length === 0 && (data.image || data.image_url)) {
            imageList = [data.image || data.image_url];
          }

          const normalized = {
            ...data,
            name: data.name || data.title || '',
            image: data.image || data.image_url || '',
            images: imageList.slice(0, 3)
          };
          setProduct(normalized);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Core Beli Sekarang trigger
  const handleBuyNow = async () => {
    if (!product) return;

    // STEP 1: Verify login status
    if (!session) {
      navigate('/login');
      return;
    }

    // Check duplicate check - prevent multiple orders for same product before completion
    const existingPending = pendingOrders.find(o => o.product_id === product.id);
    if (existingPending) {
      showToast('Anda sudah memiliki pesanan pending untuk produk ini. Mengalihkan ke transaksi...', 'error');
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

  if (loading) {
    return (
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center space-y-4">
        <Loader className="w-10 h-10 text-blue-600 animate-spin" />
        <span className="text-sm text-gray-400">Memuat detail iklan pilihan...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex-1 max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <span className="text-5xl block">⚠️</span>
        <h3 className="text-lg font-display font-black text-slate-950 uppercase tracking-tight">Iklan Tidak Ditemukan</h3>
        <p className="text-xs text-gray-500">Iklan produk baris ini kemungkinan sudah laku terjual habis atau dihapus oleh pemilik toko pelapak.</p>
        <Link to="/" className="inline-block bg-slate-900 text-white text-xs font-black px-5 py-2.5 rounded-xl uppercase tracking-wider">
          Kembali Ke Katalog
        </Link>
      </div>
    );
  }

  const details = getProductDetails(product.name, product.id, product.category);
  
  const finalImages: string[] = [];
  if (product) {
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      finalImages.push(...product.images);
    } else if (product.image) {
      finalImages.push(product.image);
    } else if (product.image_url) {
      finalImages.push(product.image_url);
    }
  }
  if (finalImages.length === 0) {
    finalImages.push(details.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80');
  }

  const formattedPrice = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(product.price);

  return (
    <div className="flex-1 bg-[#f4f8fc] pb-16">
      {/* Checkout Processing Overlay */}
      {checkoutLoading && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-2xl border border-gray-100 flex flex-col items-center">
            <Loader className="w-10 h-10 text-blue-600 animate-spin" />
            <h3 className="font-display font-black text-lg text-slate-900">Pembayaran Aman Terverifikasi</h3>
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{checkoutStatus}</p>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-1.5 rounded-full animate-pulse w-3/4 animate-ping"></div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 text-left">
        {/* Back navigation anchor */}
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs font-black text-slate-900 hover:text-blue-700 bg-white border border-gray-200/60 px-4 py-2.5 rounded-xl shadow-xs transition mb-6 uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali Ke Beranda Catalog
        </button>

        {/* Double Column Presentation layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Large Cover Column */}
          <div className="lg:col-span-7 bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-4">
            <div 
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={() => onTouchEnd(finalImages.length)}
              className="relative aspect-video bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 group/img select-none"
            >
              {/* Image Transition slide using motion */}
              <AnimatePresence mode="popLayout">
                <motion.img
                  key={activeImageIndex}
                  src={finalImages[activeImageIndex]}
                  alt={`${product.name} - ${activeImageIndex + 1}`}
                  referrerPolicy="no-referrer"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  onClick={() => setIsZoomOpen(true)}
                  className={`w-full h-full object-cover cursor-zoom-in ${(isSold || product.stock <= 0) ? 'scale-105 blur-sm grayscale-[50%]' : ''}`}
                />
              </AnimatePresence>

              {/* Prev icon overlay arrow */}
              {finalImages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex((prev) => (prev - 1 + finalImages.length) % finalImages.length);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 p-2.5 rounded-full shadow-md hover:scale-105 active:scale-95 transition cursor-pointer z-10"
                  aria-label="Previous image"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Next icon overlay arrow */}
              {finalImages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex((prev) => (prev + 1) % finalImages.length);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 p-2.5 rounded-full shadow-md hover:scale-105 active:scale-95 transition cursor-pointer z-10"
                  aria-label="Next image"
                >
                  <ArrowLeft className="w-3.5 h-3.5 transform rotate-180" />
                </button>
              )}
              
              {/* Removed old tap to zoom div to prevent overlap with sold overlay */}
              {!(isSold || product.stock <= 0) && (
                <div 
                  onClick={() => setIsZoomOpen(true)}
                  className="absolute inset-0 bg-transparent flex items-center justify-center cursor-zoom-in"
                >
                  <span className="bg-black/80 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 select-none pointer-events-none">
                    <ZoomIn className="w-3.5 h-3.5 text-blue-400" />
                    <span>Ketuk untuk Memperbesar</span>
                  </span>
                </div>
              )}

              {!(isSold || product.stock <= 0) && (
                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-xs text-white p-2 rounded-lg opacity-60 group-hover/img:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                  <Maximize2 className="w-4 h-4 text-white" />
                </div>
              )}

              {(isSold || product.stock <= 0) && (
                 <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-20">
                   <div className="bg-black/80 text-white font-display font-black text-lg md:text-2xl px-10 py-4 rounded-full flex items-center gap-3 border border-white/20 shadow-2xl backdrop-blur-md rotate-[-5deg] transform scale-110">
                     <span className="text-red-500">❌</span> 
                     {isSold ? 'TERJUAL' : 'HABIS'}
                   </div>
                 </div>
              )}
            </div>

            {/* Thumbnail Manual dot navigation slides indicators row */}
            {finalImages.length > 1 && (
              <div className="flex gap-2 justify-center pt-2">
                {finalImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition ${idx === activeImageIndex ? 'border-blue-600 scale-105' : 'border-gray-200/70 opacity-60 hover:opacity-100'}`}
                  >
                    <img src={imgUrl} alt="Thumbnail" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="p-2 space-y-4">
              <div>
                <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase border border-gray-200/50">
                  {details.category}
                </span>
                <h1 className="text-xl md:text-2xl font-display font-black text-slate-950 mt-2 tracking-tight leading-snug">
                  {product.name}
                </h1>
              </div>

              <div className="border-t border-gray-100 pt-4 text-left">
                <h3 className="font-display font-black text-xs text-slate-900 uppercase tracking-wider block mb-2">Deskripsi Lengkap Produk</h3>
                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed whitespace-pre-line select-text">
                  {product.description || 'Pelapak tidak menambahkan informasi detail tambahan untuk iklan baris ini.'}
                </p>
              </div>
            </div>
          </div>

          {/* Right Action Widgets Column */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Widget pricing block */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
              <div>
                <span className="text-gray-400 text-xs font-mono uppercase tracking-widest block font-bold">Harga Penawaran</span>
                <h2 className="text-3xl font-display font-extrabold text-[#001f3f] mt-1 select-all">
                  {formattedPrice}
                </h2>
              </div>

              <div className="space-y-2 border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-medium">Kondisi Barang</span>
                  <span className="font-bold text-slate-800">Bekas Bagus / Mulus</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-medium">Kota Penjual</span>
                  <span className="font-bold text-slate-800">📍 {details.location}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-medium">Sisa Stok</span>
                  <span className={`font-bold ${product.stock > 0 ? 'text-blue-700' : 'text-red-500'}`}>
                    {product.stock > 0 ? `${product.stock} Unit Tersedia` : 'Semua Habis'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-medium">Diposting Pada</span>
                  <span className="font-bold text-gray-500">{details.dateStr}</span>
                </div>
              </div>

              {/* Direct Purchase Button */}
              <button
                disabled={product.stock <= 0 || isSold}
                onClick={handleBuyNow}
                className={`w-full font-black py-4 rounded-xl text-xs uppercase tracking-widest disabled:bg-red-50 disabled:text-red-500 shadow-sm transition duration-200 mt-2 flex items-center justify-center gap-2 ${
                  isSold
                    ? 'bg-red-50 text-red-650 border border-red-200 cursor-not-allowed opacity-55'
                    : pendingOrders.some(o => o.product_id === product.id)
                      ? 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer'
                      : 'bg-[#0066cc] hover:bg-blue-700 text-white cursor-pointer'
                }`}
              >
                {isSold ? (
                  <span>❌ PRODUK INI SUDAH TERJUAL</span>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    {pendingOrders.some(o => o.product_id === product.id) ? 'Selesaikan Bayar' : 'Beli Sekarang'}
                  </>
                )}
              </button>

              {/* Admin Actions Sector - only visible to admin */}
              {session && role === 'admin' && (
                <div className="pt-4 mt-2 border-t border-dashed border-gray-100 space-y-2 text-left">
                  <span className="text-[10px] font-extrabold uppercase text-amber-650 flex items-center gap-1 font-mono">
                    🛡️ Menu Admin Tersembunyi:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      disabled={isSold}
                      onClick={() => !isSold && navigate('/admin', { state: { editProductId: product.id } })}
                      className={`text-[10px] font-extrabold uppercase tracking-wide py-3 rounded-lg text-center transition ${
                        isSold
                          ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-55'
                          : 'bg-amber-500 hover:bg-amber-600 border border-transparent text-white cursor-pointer'
                      }`}
                    >
                      Edit Detail Iklan
                    </button>
                    <button
                      disabled={isSold}
                      onClick={() => !isSold && setDeleteConfirmProd({ id: product.id, name: product.name })}
                      className={`text-[10px] font-extrabold uppercase tracking-wide py-3 rounded-lg text-center transition ${
                        isSold
                          ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-55'
                          : 'bg-red-600 hover:bg-red-700 border border-transparent text-white cursor-pointer'
                      }`}
                    >
                      Hapus Iklan Ini
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Widget Seller safety hints badge */}
            <div className="bg-[#001f3f] text-white p-6 rounded-3xl space-y-4 text-left">
              <div className="flex items-center gap-2 text-blue-300">
                <ShieldCheck className="w-6 h-6 shrink-0" />
                <h4 className="font-display font-black text-xs uppercase tracking-widest">Tips Belanja Safe-Trade</h4>
              </div>
              <ul className="text-xs text-slate-300 space-y-2.5 leading-relaxed">
                <li className="flex gap-2.5 items-start">
                  <span className="text-blue-300">•</span>
                  <span>Setiap transaksi di Toko Jaya Sampurna dilindungi rekening escrow bersama berteknologi tinggi.</span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="text-blue-300">•</span>
                  <span>Gunakan tombol **"Beli Sekarang"** untuk melakukan pemesanan resmi yang terhubung dengan payment gateway demi menjaga keamanan uang Anda.</span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="text-blue-300">•</span>
                  <span>Jangan tergiur transaksi mentransfer saldo langsung ke penjual di luar platform ini.</span>
                </li>
              </ul>
            </div>

            {/* General technical assistance */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-start gap-3">
              <Info className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
              <div className="text-xs text-gray-500 leading-relaxed">
                Butuh bantuan teknis terkait callback? Hubungi technical specialist kami di tim support@tokojayasampurna
              </div>
            </div>

          </div>
        </div>

        {/* Custom Confirmation Modal for Deletion */}
        {deleteConfirmProd && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-center">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 transform scale-100 transition-all">
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-100 animate-bounce">
                  <AlertCircle className="w-8 h-8" />
                </div>
                
                <h3 className="text-lg font-black text-slate-900 mb-2 uppercase tracking-wide leading-tight">
                  Yakin mau di hapus??
                </h3>
                
                <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                  Apakah Anda benar-benar yakin ingin menghapus produk <strong className="text-slate-900 font-extrabold font-serif">"{deleteConfirmProd.name}"</strong>? 
                  Tindakan ini tidak dapat dibatalkan dan semua riwayat checkout terkait akan dihapus.
                </p>

                <div className="grid grid-cols-2 gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmProd(null)}
                    className="w-full border border-gray-300 text-gray-700 font-extrabold text-[11px] py-3 text-center rounded-xl uppercase tracking-wider hover:bg-gray-50 transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteProduct}
                    className="w-full bg-red-600 text-white font-black py-3 rounded-xl text-[11px] uppercase tracking-widest hover:bg-red-700 transition cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-red-100"
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
          <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white rounded-2xl px-4 py-3 shadow-xl border border-slate-800 flex items-center gap-2 max-w-sm animate-fade-in font-medium text-xs">
            {toast.type === 'success' ? (
              <span className="text-emerald-400 font-extrabold">✓</span>
            ) : (
              <span className="text-red-400 font-extrabold">⚠</span>
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Full screen Lightbox zoom overlay */}
        <AnimatePresence>
          {isZoomOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xs flex flex-col items-center justify-center select-none overflow-hidden"
            >
              {/* Lightbox Status bar */}
              <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center z-10 gap-4">
                <div className="text-white font-sans text-xs md:text-sm font-semibold flex items-center gap-2 max-sm:max-w-[150px] truncate-ellipsis">
                  <span className="bg-emerald-500 w-2 h-2 rounded-full animate-pulse shrink-0" />
                  <span className="truncate">{product.name}</span>
                </div>

                {/* Main Zoom Controller Panel */}
                <div className="flex items-center gap-1.5 bg-zinc-900/90 backdrop-blur-md border border-zinc-850 p-1 rounded-full shadow-lg">
                  <button
                    onClick={handleZoomOut}
                    disabled={zoomScale <= 1}
                    className="p-1.5 hover:bg-zinc-800 disabled:opacity-35 disabled:hover:bg-transparent rounded-full transition text-white"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-white text-xs font-mono font-bold px-2.5 min-w-[40px] text-center">
                    {zoomScale.toFixed(1)}x
                  </span>
                  <button
                    onClick={handleZoomIn}
                    disabled={zoomScale >= 4}
                    className="p-1.5 hover:bg-zinc-800 disabled:opacity-35 disabled:hover:bg-transparent rounded-full transition text-white"
                    title="Zoom In (+)"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <div className="w-[1px] h-4 bg-zinc-800 mx-1" />
                  <button
                    onClick={handleResetZoom}
                    className="p-1.5 hover:bg-zinc-800 rounded-full transition text-white"
                    title="Reset Fit"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => {
                    setIsZoomOpen(false);
                    setZoomScale(1);
                    setPanOffset({ x: 0, y: 0 });
                  }}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white p-2 rounded-full transition border border-zinc-800 cursor-pointer"
                  title="Tutup (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Central Interactive Image stage */}
              <div className="relative w-full h-full flex items-center justify-center p-4">
                {/* Real-time pointer draggable scalable representation */}
                <div 
                  className="w-full h-full flex items-center justify-center select-none"
                  style={{ touchAction: 'none' }}
                >
                  <img
                    src={finalImages[activeImageIndex]}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className="max-w-full max-h-full object-contain pointer-events-auto select-none rounded-lg"
                    style={{
                      transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                      cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                      willChange: 'transform',
                      transition: isDragging ? 'none' : 'transform 0.15s ease-out'
                    }}
                  />
                </div>
              </div>

              {/* Overlay instructional advice */}
              <div className="absolute bottom-6 bg-zinc-900/40 border border-white/5 backdrop-blur-xs px-4 py-1.5 rounded-full text-[11px] text-gray-400 pointer-events-none select-none max-sm:hidden">
                {zoomScale > 1 ? (
                  <span>Seret gambar untuk memindahkan • Ketuk tombol reset di atas</span>
                ) : (
                  <span>Gunakan roda mouse atau klik tombol di atas untuk melakukan zoom</span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
