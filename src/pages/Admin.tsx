/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getProductDetails } from '../utils/productHelper';
import { uploadImage } from '../utils/uploadImage';
import { updateProduct, deleteProduct, addProduct, seedProducts } from '../utils/productService';
import { ShieldCheck, Plus, Pencil, Trash2, Coins, Calendar, Package, ShoppingBag, Eye, RefreshCw, AlertCircle, TrendingUp, Filter, Key, Check, Loader, User, CheckCircle2, XCircle, X } from 'lucide-react';
import { CATEGORIES } from '../data/initialData';
import { motion, AnimatePresence } from 'motion/react';
import { SQL_SCHEMA_TEMPLATE, CREATE_PAYMENT_EDGE_TEMPLATE, MIDTRANS_CALLBACK_TEMPLATE } from '../utils/codeTemplates';

interface DBProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string;
  image?: string | null;
  image_url?: string | null;
  images?: string[] | null;
  category?: string;
}

interface Order {
  id: string;
  user_id: string;
  product_id: string;
  invoice: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED';
  created_at: string;
}

interface Payment {
  id: string;
  user_id: string;
  invoice: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED';
  payment_url: string;
  method: string;
  created_at: string;
}

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab ] = useState<'dashboard' | 'products' | 'orders' | 'payments' | 'duitku'>('dashboard');

  // Supabase Data
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Product Modals & Forms
  const [showProductModal, setShowProductModal] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    price: 0,
    stock: 1,
    description: '',
    image: '',
    category: 'Elektronik'
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  // Multiple images tracking (max 3 slots)
  const [slotPreviews, setSlotPreviews] = useState<string[]>(['', '', '']);
  const [slotFiles, setSlotFiles] = useState<(File | null)[]>([null, null, null]);

  // State to track double-click deletion (bypasses browser alert blocking inside sandbox iframes)
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal confirm deletion
  const [deleteConfirmProd, setDeleteConfirmProd] = useState<{ id: string; name: string } | null>(null);

  // Custom Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; action?: 'add' | 'edit' | 'delete' | 'info' } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success', action?: 'add' | 'edit' | 'delete' | 'info') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    // Automatically detect action type if not explicitly provided
    let detectedAction = action;
    if (!detectedAction) {
      const lower = message.toLowerCase();
      if (lower.includes('hapus') || lower.includes('delete')) {
        detectedAction = 'delete';
      } else if (lower.includes('perbarui') || lower.includes('ubah') || lower.includes('edit')) {
        detectedAction = 'edit';
      } else if (lower.includes('tambah') || lower.includes('upload') || lower.includes('tambahkan')) {
        detectedAction = 'add';
      } else {
        detectedAction = 'info';
      }
    }

    setToast({ message, type, action: detectedAction });

    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Filter conditions
  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'FAILED'>('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'FAILED'>('ALL');

  const navigate = useNavigate();
  const location = useLocation();

  // Validate admin identity role metadata
  const checkAdminRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Query database users table for verified role field
      let role = user.user_metadata?.role;
      const { data: dbUser, error: dbUserError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (!dbUserError && dbUser) {
        role = dbUser.role;
      }

      if (role === 'admin') {
        setIsAdmin(true);
        // fetch initial aggregates
        await fetchAllData();
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdminRole();
  }, []);

  const lastProcessedRef = useRef<{ editProductId?: string | null; openNewProduct?: boolean }>({});

  // Listen to navigation states to trigger edit modal or new product modal dynamically
  useEffect(() => {
    if (products.length > 0 && location.state) {
      const stateObj = location.state as any;
      let handled = false;
      
      const editProductIdStr = stateObj.editProductId || null;
      const openNewProductVal = !!stateObj.openNewProduct;

      // Check if we already handled this specific navigation state
      if (
        editProductIdStr !== lastProcessedRef.current.editProductId ||
        openNewProductVal !== lastProcessedRef.current.openNewProduct
      ) {
        // Record as processed
        lastProcessedRef.current = {
          editProductId: editProductIdStr,
          openNewProduct: openNewProductVal
        };

        if (stateObj.editProductId) {
          const prodToEdit = products.find(p => p.id === stateObj.editProductId);
          if (prodToEdit) {
            handleEditClick(prodToEdit);
            setActiveTab('products');
            handled = true;
          }
        } else if (stateObj.openNewProduct) {
          setProductForm({ name: '', price: 0, stock: 1, description: '', image: '', category: 'elektronik' });
          setImagePreview('');
          setImageFile(null);
          setEditProductId(null);
          setShowProductModal(true);
          setActiveTab('products');
          handled = true;
        }
        
        if (handled || stateObj.editProductId || stateObj.openNewProduct) {
          // Clear navigation state so it doesn't pop up again on subsequent tab or route changes
          navigate(location.pathname, { replace: true, state: {} });
        }
      }
    }
  }, [products, location.state, navigate]);

  const fetchAllData = async () => {
    setRefreshing(true);
    try {
      // 1. Fetch products
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select('*');
      if (prodError) throw prodError;
      
      const normalizedProducts = (prodData || []).map((p: any) => {
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
        
        const finalImage = imageList[0] || p.image || p.image_url || '';

        return {
          ...p,
          name: p.name || p.title || '',
          image: finalImage,
          images: imageList.length > 0 ? imageList : (finalImage ? [finalImage] : [])
        };
      });
      
      // Sort normalized items by name
      normalizedProducts.sort((a, b) => a.name.localeCompare(b.name));
      setProducts(normalizedProducts);

      // 2. Fetch orders
      const { data: ordData, error: ordError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (ordError) throw ordError;
      setOrders(ordData || []);

      // 3. Fetch payments
      const { data: payData, error: payError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });
      if (payError) throw payError;
      setPayments(payData || []);

    } catch (err: any) {
      console.error('Error loading admin tables:', err.message);
    } finally {
      setRefreshing(false);
    }
  };

  // Manage Products CRUD: Add / Update
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || productForm.price <= 0) {
      showToast('Nama dan Harga produk wajib diisi.', 'error');
      return;
    }

    setRefreshing(true);
    setUploadingImage(true);

    try {
      const finalImages: string[] = [];
      for (let i = 0; i < 3; i++) {
        const file = slotFiles[i];
        if (file) {
          const uploadedUrl = await uploadImage(file);
          if (uploadedUrl) {
            finalImages.push(uploadedUrl);
          } else {
            throw new Error(`Gagal mengunggah gambar slot ${i + 1}.`);
          }
        } else if (slotPreviews[i]) {
          finalImages.push(slotPreviews[i]);
        }
      }

      if (finalImages.length === 0) {
        finalImages.push('https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80');
      }

      const mainImage = finalImages[0];

      if (editProductId) {
        // Edit Mode
        const { error } = await updateProduct(editProductId, {
          title: productForm.name,
          name: productForm.name,
          price: Number(productForm.price),
          stock: Number(productForm.stock),
          description: productForm.description,
          image_url: mainImage,
          image: mainImage,
          images: finalImages,
          category: productForm.category
        });

        if (error) throw error;
        showToast('Produk berhasil diperbarui.');
      } else {
        // Create Mode
        const { error } = await addProduct(
          productForm.name,
          productForm.description,
          Number(productForm.price),
          null,
          productForm.category,
          finalImages,
          Number(productForm.stock)
        );

        if (error) throw error;
        showToast('Produk baru berhasil ditambahkan.');
      }

      // Reset form
      setProductForm({ name: '', price: 0, stock: 1, description: '', image: '', category: 'Elektronik' });
      setImageFile(null);
      setImagePreview('');
      setSlotFiles([null, null, null]);
      setSlotPreviews(['', '', '']);
      setEditProductId(null);
      setShowProductModal(false);
      await fetchAllData();
    } catch (err: any) {
      showToast(`Gagal menyimpan produk: ${err.message}`, 'error');
    } finally {
      setUploadingImage(false);
      setRefreshing(false);
    }
  };

  const handleEditClick = (prod: DBProduct) => {
    setProductForm({
      name: prod.name,
      price: prod.price,
      stock: prod.stock,
      description: prod.description || '',
      image: prod.image || '',
      category: prod.category || 'Elektronik'
    });
    setEditProductId(prod.id);
    setImagePreview(prod.image || '');
    setImageFile(null);
    
    // Parse up to 3 images from database
    let initialImages: string[] = [];
    if (prod.images && Array.isArray(prod.images)) {
      initialImages = prod.images;
    } else if (prod.image) {
      initialImages = [prod.image];
    } else if (prod.image_url) {
      initialImages = [prod.image_url];
    }

    const previews = ['', '', ''];
    for (let i = 0; i < 3; i++) {
      previews[i] = initialImages[i] || '';
    }
    setSlotPreviews(previews);
    setSlotFiles([null, null, null]);
    
    setShowProductModal(true);
  };

  // Manage Products: Delete
  const handleDeleteProduct = async (id: string) => {
    setRefreshing(true);
    try {
      const { error } = await deleteProduct(id);

      if (error) throw error;
      showToast('Produk berhasil dihapus.');
      await fetchAllData();
    } catch (err: any) {
      showToast(`Gagal menghapus produk: ${err.message}`, 'error');
    } finally {
      setRefreshing(false);
      setDeleteConfirmProd(null);
    }
  };

  const handleSeedProducts = async () => {
    setSeedLoading(true);
    try {
      const { error } = await seedProducts();
      if (error) throw error;
      showToast('6 Produk Contoh Toko berhasil diinisialisasi!', 'success', 'add');
      await fetchAllData();
    } catch (err: any) {
      showToast(`Gagal menambahkan produk contoh: ${err.message}`, 'error');
    } finally {
      setSeedLoading(false);
    }
  };

  // Calculations for Dash Stats
  const totalProducts = products.length;
  const totalOrders = orders.length;

  const paidOrders = orders.filter(o => o.status === 'PAID');
  const totalRevenue = paidOrders.reduce((acc, current) => acc + current.amount, 0);

  // Filters
  const filteredOrders = orders.filter(o => {
    return orderStatusFilter === 'ALL' || o.status === orderStatusFilter;
  });

  const filteredPayments = payments.filter(p => {
    return paymentStatusFilter === 'ALL' || p.status === paymentStatusFilter;
  });

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Render access denied page if role is mismatch
  if (loading) {
    return (
      <div className="flex-1 max-w-7xl mx-auto px-4 py-32 flex flex-col items-center justify-center space-y-4">
        <Loader className="w-10 h-10 text-emerald-600 animate-spin" />
        <span className="text-sm text-gray-400">Memeriksa hak akses administrator...</span>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="flex-1 max-w-md mx-auto px-4 py-16 flex flex-col justify-center items-center text-center space-y-6">
        <div className="bg-red-50 text-red-700 p-5 rounded-full border border-red-200">
          <Key className="w-10 h-10 text-red-600" />
        </div>
        <h2 className="text-xl font-display font-black text-slate-900 uppercase tracking-tight">
          Akses Panel Ditolak
        </h2>
        <p className="text-xs text-gray-500 leading-relaxed max-w-sm">
          Akun Anda saat ini tidak dikonfigurasi sebagai **Administrator**. Silakan logout lalu buat akun baru dengan menyalakan opsi **"Daftar sebagai Admin"** pada menu registrasi.
        </p>
        <div className="flex gap-3">
          <Link
            to="/register"
            className="bg-slate-900 text-white font-bold text-xs px-5 py-3 rounded-xl uppercase tracking-wider shadow-md hover:bg-slate-800 transition"
          >
            Daftar Akun Admin
          </Link>
          <button
            onClick={() => {
              supabase.auth.signOut().then(() => navigate('/login'));
            }}
            className="border-2 border-slate-900 text-slate-00 hover:bg-gray-50 text-slate-900 text-xs font-bold px-4 py-2.5 rounded-xl uppercase tracking-wider transition cursor-pointer"
          >
            Masuk Ulang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#f2f4f5] pb-16 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Banner metadata */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <span className="bg-slate-950 text-[#23e5db] font-extrabold uppercase text-[10px] tracking-widest px-2.5 py-1 rounded-sm flex items-center gap-1.5 w-fit">
              <ShieldCheck className="w-3.5 h-3.5" />
              Sistem Konsol Admin Utama
            </span>
            <h1 className="text-2xl font-display font-black text-slate-900 tracking-tight leading-none mt-1 uppercase">
              Toko Jaya Sampurna Administrator
            </h1>
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchAllData}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-gray-50 text-slate-900 border border-gray-200 text-xs font-bold px-4 py-2.5 rounded-xl uppercase tracking-wider transition cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-700 ${refreshing ? 'animate-spin' : ''}`} />
              Segarkan Database
            </button>
            <button
              onClick={() => {
                navigate('/add-product');
              }}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2.5 rounded-xl uppercase tracking-widest transition cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Barang Baru
            </button>
          </div>
        </div>

        {/* Aggregate statistics cards rows */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-left">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest block font-bold">Produk Tersimpan</span>
              <h2 className="text-3xl font-display font-extrabold text-slate-900 select-all">{totalProducts}</h2>
              <span className="text-[10px] text-gray-400 font-medium">Mitra pelapak terdaftar</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
              <Package className="w-6 h-6 text-slate-700" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest block font-bold">Total Pemesanan</span>
              <h2 className="text-3xl font-display font-extrabold text-slate-900 select-all">{totalOrders}</h2>
              <span className="text-[10px] text-gray-400 font-medium">Semua status (Pending / Lunas)</span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100/50">
              <ShoppingBag className="w-6 h-6 text-emerald-700" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-[#23e5db]/20 bg-gradient-to-br from-white to-emerald-50/20 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-emerald-800 text-[10px] font-black uppercase tracking-widest block font-bold">Pemasukan Bersih Escrow</span>
              <h2 className="text-2xl font-display font-black text-emerald-700 select-all">{formatRupiah(totalRevenue)}</h2>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                Duitku PAID order saja
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#23e5db]/10 border border-[#23e5db]/20">
              <Coins className="w-6 h-6 text-[#17b5ae]" />
            </div>
          </div>
        </div>

        {/* Tabs Control Row */}
        <div className="flex border-b border-gray-200 gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
          {([
            { id: 'dashboard', label: 'Monitor Penjualan' },
            { id: 'products', label: 'Kelola Katalog Produk' },
            { id: 'orders', label: 'Kelola Semua Order' },
            { id: 'payments', label: 'Pemantau Pembayaran Midtrans' },
            { id: 'duitku', label: 'Integrasi Midtrans (Panduan)' }
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 font-mono transition cursor-pointer ${
                activeTab === tab.id
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-gray-400 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Ringkasan Dashboard monitor */}
        {activeTab === 'dashboard' && (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-6 text-left">
            <div>
              <h3 className="font-display font-black text-sm text-slate-950 uppercase tracking-wide">Ringkasan Grafik Penjualan Indonesia</h3>
              <p className="text-xs text-gray-500 mt-1">Status dan kesehatan log pembayaran escrow Toko Jaya Sampurna nasional.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-gray-100 p-4 rounded-2xl space-y-2">
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">Status Order pending (Escrow Menahan)</span>
                <span className="font-display font-black text-lg text-slate-800 block">
                  {orders.filter(o => o.status === 'PENDING').length} Transaksi
                </span>
                <span className="text-[10px] text-gray-400 font-medium">Menunggu pelunasan pembeli via transfer</span>
              </div>
              <div className="border border-gray-100 p-4 rounded-2xl space-y-2">
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">Konversi Keberhasilan Transaksi</span>
                <span className="font-display font-black text-lg text-[#17b5ae] block">
                  {orders.length > 0 
                    ? `${Math.round((orders.filter(o => o.status === 'PAID').length / orders.length) * 100)}%` 
                    : '0%'}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">Persentase invoice lari ke Duitku PAID</span>
              </div>
            </div>

            {/* Explanatory notes detailing supabase RLS */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-500 space-y-1.5 leading-relaxed">
              <b className="font-extrabold uppercase text-[10px] text-slate-800 tracking-wider block">📢 Catatan Pengoperasian Supabase:</b>
              <p>
                Sesuai dengan ketentuan basis data, transaksi callback webhook akan menyinkronkan status <b>"orders"</b> dan <b>"payments"</b> secara bersamaan demi meminimalisasi selisih angka. Setiap perubahan status pembayaran secara instan tersalurkan ke pelapak.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Manage Products Katalog */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xs text-left">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-gray-500">
                <thead className="text-[10px] text-gray-400 uppercase tracking-widest bg-slate-50 border-b border-gray-100 font-mono font-black">
                  <tr>
                    <th scope="col" className="px-6 py-4">Foto / Nama Barang</th>
                    <th scope="col" className="px-6 py-4">Harga Unit</th>
                    <th scope="col" className="px-6 py-4">Sisa Stok</th>
                    <th scope="col" className="px-6 py-4 text-center">Tindakan Kelola</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400 select-none space-y-3">
                        <p className="text-sm font-semibold text-gray-500">Katalog produk kosong di database Supabase Anda.</p>
                        <p className="text-xs text-gray-400 max-w-lg mx-auto leading-relaxed">
                          Anda dapat menambahkan barang baru secara manual atau mengklik tombol di bawah untuk mengisi database dengan 6 produk contoh terpopuler secara otomatis.
                        </p>
                        <div className="pt-2">
                          <button
                            onClick={handleSeedProducts}
                            disabled={seedLoading}
                            className="inline-flex items-center gap-2 bg-[#002f34] hover:bg-slate-800 text-white text-[11px] font-black uppercase tracking-wider px-5 py-2.5 rounded-xl cursor-pointer disabled:opacity-50"
                          >
                            {seedLoading ? (
                              <>
                                <Loader className="w-3.5 h-3.5 animate-spin" /> Sedang Mengisi Contoh...
                              </>
                            ) : (
                              'Isi 6 Produk Contoh Otomatis'
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    products.map((prod) => {
                      const details = getProductDetails(prod.name, prod.id, prod.category);
                      return (
                        <tr key={prod.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4 font-semibold text-slate-950 flex items-center gap-3">
                            <img src={details.image} alt="" className="w-10 h-10 object-cover rounded-lg border border-gray-100 shrink-0" />
                            <div className="min-w-0">
                              <span className="block font-bold truncate max-w-sm sm:max-w-md">{prod.name}</span>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[10px] text-gray-400 font-medium font-mono">{prod.id}</span>
                                {prod.category && (
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9.5px] px-1.5 py-0.5 rounded-full font-semibold">
                                    {CATEGORIES.find(c => c.id === prod.category)?.name || prod.category}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono font-extrabold text-[#002f34]">
                            {formatRupiah(prod.price)}
                          </td>
                          <td className="px-6 py-4 font-semibold">
                            <span className={prod.stock > 0 ? 'text-emerald-700' : 'text-red-500'}>
                              {prod.stock} Unit
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => handleEditClick(prod)}
                                className="p-2 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition border border-gray-100 cursor-pointer"
                                title="Edit Detail"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmProd({ id: prod.id, name: prod.name })}
                                className="p-2 text-slate-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition border border-gray-100 cursor-pointer flex items-center gap-1 font-bold"
                                title="Hapus Produk"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Manage Orders panel */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Status filtering panel */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3 flex-wrap">
              <span className="font-mono text-[10px] font-black uppercase text-gray-400 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter Status Iklan Order:
              </span>
              <div className="flex gap-2.5 overflow-x-auto pb-0.5">
                {(['ALL', 'PENDING', 'PAID', 'FAILED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition cursor-pointer ${
                      orderStatusFilter === st
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {st === 'ALL' ? 'Semua' : st}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xs text-left">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-gray-500">
                  <thead className="text-[10px] text-gray-400 uppercase tracking-widest bg-slate-50 border-b border-gray-100 font-mono font-black">
                    <tr>
                      <th scope="col" className="px-6 py-4">Kode Invoice</th>
                      <th scope="col" className="px-6 py-4">User ID Pemesan</th>
                      <th scope="col" className="px-6 py-4">Nominal Transaksi</th>
                      <th scope="col" className="px-6 py-4">Status Bayar</th>
                      <th scope="col" className="px-6 py-4">Waktu Pemesanan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 select-none">
                          Tidak ada riwayat pemesanan yang cocok dengan filter status saat ini.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4 font-mono font-black text-slate-950 uppercase">
                            {ord.invoice}
                          </td>
                          <td className="px-6 py-4 font-mono select-all">
                            {ord.user_id}
                          </td>
                          <td className="px-6 py-4 font-mono font-extrabold text-[#002f34]">
                            {formatRupiah(ord.amount)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${
                              ord.status === 'PAID'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : ord.status === 'FAILED'
                                ? 'bg-red-50 border-red-200 text-red-800'
                                : 'bg-amber-50 border-amber-200 text-amber-800'
                            }`}>
                              {ord.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-400">
                            {new Date(ord.created_at).toLocaleString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Payments Monitor Log */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3 flex-wrap">
              <span className="font-mono text-[10px] font-black uppercase text-gray-400 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter Log Transaksi Midtrans:
              </span>
              <div className="flex gap-2.5 overflow-x-auto pb-0.5">
                {(['ALL', 'PENDING', 'PAID', 'FAILED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setPaymentStatusFilter(st)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition cursor-pointer ${
                      paymentStatusFilter === st
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {st === 'ALL' ? 'Semua' : st}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xs text-left">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-gray-500">
                  <thead className="text-[10px] text-gray-400 uppercase tracking-widest bg-slate-50 border-b border-gray-100 font-mono font-black">
                    <tr>
                      <th scope="col" className="px-6 py-4">Invoice</th>
                      <th scope="col" className="px-6 py-4">Nominal</th>
                      <th scope="col" className="px-6 py-4">Status Midtrans</th>
                      <th scope="col" className="px-6 py-4">Metode Bayar</th>
                      <th scope="col" className="px-6 py-4">Url Link</th>
                      <th scope="col" className="px-6 py-4">Keterangan Waktu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400 select-none">
                          Log data pembayaran Midtrans kosong / aman.
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4 font-mono font-bold text-slate-950 uppercase">
                            {pay.invoice}
                          </td>
                          <td className="px-6 py-4 font-mono font-black text-[#002f34]">
                            {formatRupiah(pay.amount)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${
                              pay.status === 'PAID'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : pay.status === 'FAILED'
                                ? 'bg-red-50 border-red-200 text-red-800'
                                : 'bg-amber-50 border-amber-200 text-amber-800'
                            }`}>
                              {pay.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-700 capitalize">
                            {pay.method || 'Transfer Bank'}
                          </td>
                          <td className="px-6 py-4">
                            {pay.payment_url ? (
                              <a
                                href={pay.payment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-600 font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
                              >
                                Tautan Bayar
                                <Plus className="w-3 h-3 border rotate-45" />
                              </a>
                            ) : (
                              <span className="text-gray-400 font-mono">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-400">
                            {new Date(pay.created_at).toLocaleString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Midtrans Integration & Sync Guide */}
        {activeTab === 'duitku' && (
          <div className="space-y-6 text-left">
            
            {/* Elegant Header Hero Cards */}
            <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <span className="bg-emerald-500 font-black text-xs px-2.5 py-1 uppercase tracking-wider rounded-sm select-none">
                  midtrans pg
                </span>
                <span className="text-xs text-slate-400 font-mono font-bold uppercase tracking-widest select-none">
                  • Arsitektur Developer
                </span>
              </div>
              <h3 className="font-display font-black text-xl sm:text-2xl uppercase tracking-tight">
                Sinkronisasi Sempurna Gerbang Pembayaran Midtrans & Supabase Backend
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans max-w-2xl">
                Halaman ini menyajikan tutorial teknis, arsitektur sinkronisasi, dan kode produksi untuk menghubungkan <b>Midtrans (Payment Gateway)</b> dengan <b>Supabase (Database & Auth Backend)</b> serta aplikasi <b>Frontend React</b> Anda secara aman.
              </p>
            </div>

            {/* Core Synchronization Architecture Process Flow Chart */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
              <h4 className="font-display font-extrabold text-[#002f34] text-xs uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Diagram Alur Sinkronisasi Transaksi
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-50 p-4 rounded-xl border border-gray-150 space-y-1">
                  <span className="text-lg">🛒</span>
                  <div className="text-[11px] font-black uppercase text-slate-800 leading-none">1. Frontend</div>
                  <p className="text-[10px] text-gray-400 font-medium pt-1">Pengguna klik "Beli", buat order PENDING di Supabase, dapati invoice aman.</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-gray-150 space-y-1">
                  <span className="text-lg">⚡</span>
                  <div className="text-[11px] font-black uppercase text-slate-800 leading-none">2. Supabase Cloud</div>
                  <p className="text-[10px] text-gray-400 font-medium pt-1">Memanggil Edge Function `create-payment`, kirim ke API Midtrans Snap.</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-gray-150 space-y-1">
                  <span className="text-lg">💳</span>
                  <div className="text-[11px] font-black uppercase text-slate-800 leading-none">3. Midtrans PG</div>
                  <p className="text-[10px] text-gray-400 font-medium pt-1">Terima registrasi invoice, berikan URL Checkout aman, diredireksi dari Frontend.</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-gray-150 space-y-1">
                  <span className="text-lg">🚀</span>
                  <div className="text-[11px] font-black uppercase text-slate-800 leading-none">4. Webhook Callback</div>
                  <p className="text-[10px] text-gray-400 font-medium pt-1">Settle otomatis! Midtrans ping balik ke Supabase webhook untuk set PAID/Lunas aman.</p>
                </div>
              </div>
            </div>

            {/* Step 1 Database Schema Tables Config SQL */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h4 className="font-display font-extrabold text-[#002f34] text-xs uppercase tracking-wider">
                  Langkah 1: Skema Database (Database Schema SQL)
                </h4>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(SQL_SCHEMA_TEMPLATE);
                    showToast('SQL Skema disalin ke clipboard!', 'success', 'info');
                  }}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-900 border border-gray-250 font-black text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer"
                >
                  Salin SQL Skema
                </button>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Jalankan kueri SQL di bawah ini di dalam bagian <b>SQL Editor</b> di Dashboard Supabase untuk mengonfigurasi tabel transaksi <code>orders</code> dan pelacak detail <code>payments</code> luar:
              </p>
              <pre className="bg-slate-900 text-emerald-400 p-4 rounded-2xl overflow-x-auto text-xs font-mono select-all leading-relaxed shadow-inner max-h-60">
                {SQL_SCHEMA_TEMPLATE}
              </pre>
            </div>

            {/* Step 2 Supabase Edge Function create-payment */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h4 className="font-display font-extrabold text-[#002f34] text-xs uppercase tracking-wider">
                  Langkah 2: Kode Supabase Edge Function `create-payment`
                </h4>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(CREATE_PAYMENT_EDGE_TEMPLATE);
                    showToast('Kode Server disalin!', 'success', 'info');
                  }}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-900 border border-gray-250 font-black text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer"
                >
                  Salin Kode Server Edge
                </button>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Pasang dan deploy Deno Edge Function ini ke server Supabase Anda menggunakan Supabase CLI: 
                <code className="bg-slate-100 text-[#002f34] px-1.5 py-0.5 rounded-sm ml-1 select-all font-mono font-bold">supabase functions deploy create-payment</code>
              </p>

              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl">
                <p className="text-xs text-amber-900 font-extrabold flex items-center gap-2">
                  ⚠️ PENTING UNTUK PROSES PEMBAYARAN DINAMIS:
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed mt-1">
                  Pastikan Anda telah menyalin dan men-deploy kembali kode Edge Function <code className="bg-amber-100 px-1 rounded font-mono font-bold">create-payment</code> terbaru di bawah ke dalam Supabase Dashboard Anda. Modifikasi ini memastikan parameter diteruskan dengan presisi ke gerbang inquiry Midtrans.
                </p>
              </div>
              <pre className="bg-slate-900 text-emerald-400 p-4 rounded-2xl overflow-x-auto text-xs font-mono select-all leading-relaxed shadow-inner max-h-72">
                {CREATE_PAYMENT_EDGE_TEMPLATE}
              </pre>
            </div>

            {/* Step 3 Handler Webhook Callback and Signature Verification */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h4 className="font-display font-extrabold text-[#002f34] text-xs uppercase tracking-wider">
                  Langkah 3: Kode Webhook Callback Receiver (Settle Lunas)
                </h4>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(MIDTRANS_CALLBACK_TEMPLATE);
                    showToast('Kode Callback disalin!', 'success', 'info');
                  }}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-900 border border-gray-250 font-black text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer"
                >
                  Salin Kode Callback
                </button>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Buat dan daftarkan Edge Function berlabel <code>midtrans-callback</code> di dalam Dashboard Midtrans Server Key:
              </p>
              <pre className="bg-slate-900 text-emerald-400 p-4 rounded-2xl overflow-x-auto text-xs font-mono select-all leading-relaxed shadow-inner max-h-72">
                {MIDTRANS_CALLBACK_TEMPLATE}
              </pre>
            </div>

            {/* Step 4 Environment Configuration Checklist */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
              <h4 className="font-display font-extrabold text-[#002f34] text-xs uppercase tracking-wider">
                Langkah 4: Konfigurasi Variabel Lingkungan
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Integrasi memerlukan dua variabel utama di pengaturan rahasia (.env):
              </p>
              <div className="space-y-2 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-gray-150/60 font-sans">
                  <div className="font-mono text-slate-800 font-bold">MIDTRANS_SERVER_KEY</div>
                  <div className="text-gray-400 mt-0.5 font-medium">Diambil dari dashboard Midtrans bagian Settings {"->"} Access Keys (Server Key).</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-gray-150/60 font-sans">
                  <div className="font-mono text-slate-800 font-bold">MIDTRANS_IS_PRODUCTION</div>
                  <div className="text-gray-400 mt-0.5 font-medium flex items-center gap-1.5 flex-wrap">
                    <span>Isi dengan</span>
                    <code className="bg-white border text-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px]">false</code>
                    <span>untuk mode sandbox/pengujian, atau</span>
                    <code className="bg-white border text-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px]">true</code>
                    <span>untuk transaksi sungguhan (production).</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Modal edit/add product dialog form overlay */}
        {showProductModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl border border-gray-100 max-w-md w-full p-6 space-y-4 shadow-2xl text-left max-h-[90vh] overflow-y-auto my-auto">
              <div>
                <h3 className="font-display font-black text-sm text-slate-900 uppercase tracking-wider">
                  {editProductId ? 'Edit Detil Produk' : 'Tambah Iklan Produk Baru'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">Isi formulir lengkap sesuai dengan database produk Supabase.</p>
              </div>

              <form onSubmit={productFormSubmit => handleProductSubmit(productFormSubmit)} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Nama Barang</label>
                  <input
                    type="text"
                    required
                    placeholder="cth. Avanza G Manual Bekas"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full bg-[#f2f4f5] p-2.5 rounded-xl text-xs outline-none border-2 border-transparent focus:border-slate-800 transition"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Kategori Barang</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full bg-[#f2f4f5] p-2.5 rounded-xl text-xs outline-none border-2 border-transparent focus:border-slate-800 transition text-slate-800 font-medium font-sans cursor-pointer"
                  >
                    {[
                      { id: 'Otomotif', name: 'Mobil & Motor' },
                      { id: 'Elektronik', name: 'Elektronik' },
                      { id: 'Handphone', name: 'HP & Gadget' },
                      { id: 'Properti', name: 'Properti & Kost' },
                      { id: 'Fashion', name: 'Fashion & Baju' },
                      { id: 'Hobi & Olahraga', name: 'Olahraga & Hobi' },
                      { id: 'Buku & Tulis', name: 'Buku & Tulis' },
                      { id: 'Mainan Anak', name: 'Mainan & Anak' },
                      { id: 'Peralatan Rumah Tangga', name: 'Alat Rumah Tangga' },
                      { id: 'Lain-lain', name: 'Lain-lain' }
                    ].map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Harga (IDR)</label>
                    <input
                      type="number"
                      required
                      placeholder="cth. 12500000"
                      value={productForm.price || ''}
                      onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                      className="w-full bg-[#f2f4f5] p-2.5 rounded-xl text-xs outline-none border-2 border-transparent focus:border-slate-800 transition"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Stok Tersedia</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={productForm.stock}
                      onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                      className="w-full bg-[#f2f4f5] p-2.5 rounded-xl text-xs outline-none border-2 border-transparent focus:border-slate-800 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Keterangan Deskripsi</label>
                  <textarea
                    rows={4}
                    placeholder="Tuliskan kelengkapan, garansi, kondisi fisik, dsb..."
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    className="w-full bg-[#f2f4f5] p-2.5 rounded-xl text-xs outline-none border-2 border-transparent focus:border-slate-800 transition resize-none"
                  />
                </div>

                {/* Storage Image Upload supporting up to 3 images with slot management */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-500 block font-bold">Foto Barang Iklan (Maksimal 3 Foto, Geser/Slide didukung)</label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[0, 1, 2].map((index) => (
                      <div key={index} className="bg-[#f8f9fa] border border-gray-200/60 p-3 rounded-2xl space-y-2.5 relative flex flex-col justify-between" id={`slot-img-${index}`}>
                        <div className="flex justify-between items-center pb-1 border-b border-gray-150">
                          <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">
                            Foto {index + 1} {index ===  0 && <span className="text-emerald-600 text-[9px] font-black lowercase">(utama)</span>}
                          </span>
                          {slotPreviews[index] && (
                            <button
                              type="button"
                              onClick={() => {
                                const newPreviews = [...slotPreviews];
                                const newFiles = [...slotFiles];
                                newPreviews[index] = '';
                                newFiles[index] = null;
                                setSlotPreviews(newPreviews);
                                setSlotFiles(newFiles);
                              }}
                              className="text-red-500 bg-red-50 hover:bg-red-100 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition cursor-pointer"
                              title="Hapus"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {/* Image Preview or Blank Icon */}
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-100 bg-slate-100 flex items-center justify-center">
                          {slotPreviews[index] ? (
                            <img
                              src={slotPreviews[index]}
                              alt={`Foto ${index + 1}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center p-2">
                              <span className="text-[9px] text-gray-400 font-medium block">Kosong</span>
                            </div>
                          )}
                        </div>

                        {/* Upload file + Import input */}
                        <div className="space-y-1.5 pt-1">
                          <label className="block w-full text-center border border-dashed border-gray-350 hover:border-slate-800 bg-white hover:bg-slate-50 rounded-xl py-1.5 cursor-pointer transition text-[9px] font-black uppercase text-slate-800 tracking-wider">
                            Unggah File
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const newFiles = [...slotFiles];
                                  const newPreviews = [...slotPreviews];
                                  newFiles[index] = file;
                                  newPreviews[index] = URL.createObjectURL(file);
                                  setSlotFiles(newFiles);
                                  setSlotPreviews(newPreviews);
                                }
                              }}
                            />
                          </label>

                          <input
                            type="text"
                            placeholder="Atau tempel URL..."
                            value={slotPreviews[index] && !slotFiles[index] ? slotPreviews[index] : ''}
                            onChange={(e) => {
                              const newPreviews = [...slotPreviews];
                              const newFiles = [...slotFiles];
                              newPreviews[index] = e.target.value;
                              newFiles[index] = null;
                              setSlotPreviews(newPreviews);
                              setSlotFiles(newFiles);
                            }}
                            className="w-full bg-white px-2 py-1 rounded-lg text-[9px] placeholder-gray-400 border border-gray-200 focus:outline-none focus:border-slate-800"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {uploadingImage && (
                    <p className="text-[10px] text-emerald-600 font-bold animate-pulse text-center">
                      ⏳ Sedang memproses unggah beberapa berkas foto ke Supabase Storage...
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProductModal(false);
                      setEditProductId(null);
                    }}
                    className="w-full border border-gray-300 text-gray-700 font-extrabold text-[11px] py-3 text-center rounded-xl uppercase tracking-wider hover:bg-gray-50 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="w-full bg-slate-900 text-white font-black py-3 rounded-xl text-[11px] uppercase tracking-widest hover:bg-slate-800 transition cursor-pointer"
                  >
                    Simpan Data
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Custom Confirmation Modal for Deletion */}
        {deleteConfirmProd && (
          <div className="fixed inset-0 bg-[#002f34]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 transform scale-100 transition-all">
              <div className="flex flex-col items-center text-center">
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
                    onClick={() => handleDeleteProduct(deleteConfirmProd.id)}
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

        {/* Elegant Custom Toast with AnimatePresence */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="fixed top-6 right-6 z-[100] bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 shadow-2xl flex items-start gap-4 max-w-sm font-sans w-[calc(100vw-3rem)] sm:w-96 overflow-hidden"
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === 'error' ? (
                  <div className="bg-red-500/15 p-2 rounded-xl border border-red-500/25">
                    <XCircle className="w-5 h-5 text-red-500 animate-bounce" />
                  </div>
                ) : (
                  <>
                    {toast.action === 'add' && (
                      <div className="bg-emerald-500/15 p-2 rounded-xl border border-emerald-500/25">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 animate-pulse" />
                      </div>
                    )}
                    {toast.action === 'edit' && (
                      <div className="bg-amber-500/15 p-2 rounded-xl border border-amber-500/25">
                        <Pencil className="w-5 h-5 text-amber-500" />
                      </div>
                    )}
                    {toast.action === 'delete' && (
                      <div className="bg-rose-500/15 p-2 rounded-xl border border-rose-500/25">
                        <Trash2 className="w-5 h-5 text-rose-500" />
                      </div>
                    )}
                    {toast.action === 'info' && (
                      <div className="bg-blue-500/15 p-2 rounded-xl border border-blue-500/25">
                        <AlertCircle className="w-5 h-5 text-blue-500" />
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] uppercase font-black tracking-widest text-gray-500">
                    {toast.type === 'error' ? 'Gagal' : 'Berhasil'}
                  </span>
                  <span className="text-gray-700 text-xs">•</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#23e5db]">
                    {toast.action === 'add' && 'Ditambahkan'}
                    {toast.action === 'edit' && 'Diperbarui'}
                    {toast.action === 'delete' && 'Dihapus'}
                    {toast.action === 'info' && 'Info'}
                  </span>
                </div>
                <p className="text-xs text-gray-200 font-medium leading-relaxed">{toast.message}</p>
              </div>

              <button
                onClick={() => setToast(null)}
                className="shrink-0 text-gray-500 hover:text-white transition p-1 hover:bg-white/5 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Progress dynamic line indicator */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 4.5, ease: 'linear' }}
                className={`absolute bottom-0 left-0 h-[3px] ${
                  toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'
                }`}
              />
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
