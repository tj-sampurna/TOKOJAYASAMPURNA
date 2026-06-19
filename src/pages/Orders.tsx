/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getProductDetails, parseSupabaseDate } from '../utils/productHelper';
import { getErrorMessage } from '../utils/supabaseError';
import SystemErrorModal from '../components/SystemErrorModal';
import { ShoppingBag, RefreshCw, Calendar, CreditCard, ChevronRight, AlertCircle, ShieldAlert, BadgeCheck, Clock, ExternalLink, ArrowRight } from 'lucide-react';

interface DBProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string;
}

interface Order {
  id: string;
  user_id: string;
  product_id: string;
  invoice: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED';
  created_at: string;
  productDetail?: DBProduct;
  visuals?: any;
}

interface CountdownTimerProps {
  createdAt: string;
  onExpire: () => void;
}

function CountdownTimer({ createdAt, onExpire }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const createdTime = parseSupabaseDate(createdAt).getTime();
      const expirationTime = createdTime + 5 * 60 * 1000; // 5 minutes
      const remaining = expirationTime - Date.now();
      return Math.max(0, remaining);
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        onExpire(); // Trigger refresh
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [createdAt, onExpire]);

  if (timeLeft <= 0) {
    return (
      <span className="text-red-500 font-bold font-mono text-[10px] sm:text-xs">
        ⏱️ KEDALUWARSA (5 Menit Lewat)
      </span>
    );
  }

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="inline-flex items-center gap-1.5 text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-mono text-[10px] sm:text-xs font-bold leading-none select-none mt-1 shadow-2xs">
      <Clock className="w-3.5 h-3.5 animate-pulse text-amber-500 shrink-0" />
      <span>Sisa Waktu Bayar: {formattedTime}</span>
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [systError, setSystError] = useState<string | null>(null);
  const [role, setRole] = useState<string>('user');

  const navigate = useNavigate();
  const pollingInterval = useRef<any>(null);

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

  // Authenticate session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (!s) {
        navigate('/login');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sessionState) => {
      setSession(sessionState);
      if (!sessionState) {
        navigate('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [navigate]);

  // Fetch orders data
  const fetchOrdersAndProducts = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) return;

      const user = currentSession.user;

      // 1. Fetch user specific orders
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (orderError) {
        throw orderError;
      }

      if (orderData && orderData.length > 0) {
        // --- AUTO EXPIRY SCAN TRIGGER ---
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        let expiredFound = false;

        for (const ord of orderData) {
          if (ord.status === 'PENDING') {
            const createdAt = parseSupabaseDate(ord.created_at).getTime();
            if (now - createdAt > fiveMinutes) {
              expiredFound = true;
              // Expire order in Supabase table orders
              await supabase
                .from('orders')
                .update({ status: 'FAILED' })
                .eq('id', ord.id);
              // Also sync in payments table too
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
            }
          }
        }

        // If any were expired, refetch to get updated list
        if (expiredFound) {
          const { data: refreshedOrderData, error: refreshError } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          
          if (!refreshError && refreshedOrderData) {
            orderData.splice(0, orderData.length, ...refreshedOrderData);
          }
          // Dispatch global update so other components update immediately too
          window.dispatchEvent(new Event('tjs_db_update'));
        }
        // ---------------------------------

        // 2. Fetch products to resolve details
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*');

        if (productError) throw productError;

        // 3. Map together in memory
        const resolvedOrders = orderData.map((ord: any) => {
          const associatedProduct = productData?.find((p: any) => p.id === ord.product_id);
          const nameToUse = associatedProduct ? (associatedProduct.name || associatedProduct.title || 'Mobil / Barang Antik') : 'Mobil / Barang Antik';
          const visuals = getProductDetails(nameToUse, ord.product_id, associatedProduct?.category);
          const imageToUse = associatedProduct ? (associatedProduct.image || associatedProduct.image_url) : null;
          if (imageToUse) {
            visuals.image = imageToUse;
          }
          
          return {
            ...ord,
            productDetail: associatedProduct || {
              id: ord.product_id,
              name: nameToUse,
              price: ord.amount,
              stock: 0,
              description: 'Barang Toko Jaya Sampurna.'
            },
            visuals
          };
        });

        setOrders(resolvedOrders);
      } else {
        setOrders([]);
      }
    } catch (err: any) {
      console.error('Error fetching user transactions list:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Run initial fetch on mount/session check
  useEffect(() => {
    if (session) {
      fetchOrdersAndProducts();

      // Realtime Polling loop: Refetch orders status every 5 seconds to capture callback status changes from Midtrans / Supabase edge
      pollingInterval.current = setInterval(() => {
        fetchOrdersAndProducts();
      }, 5000);
    }

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [session]);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getStatusStyle = (status: Order['status']) => {
    switch (status) {
      case 'PAID':
        return {
          bg: 'bg-blue-50 border-blue-200 text-blue-850',
          dot: 'bg-blue-500',
          label: 'Lunas / Berhasil',
          icon: <BadgeCheck className="w-4 h-4 text-blue-600" />
        };
      case 'FAILED':
        return {
          bg: 'bg-red-50 border-red-200 text-red-800',
          dot: 'bg-red-500',
          label: 'Pembayaran Gagal',
          icon: <ShieldAlert className="w-4 h-4 text-red-600" />
        };
      default:
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-800',
          dot: 'bg-amber-500',
          label: 'Menunggu Pembayaran',
          icon: <Clock className="w-4 h-4 text-amber-600" />
        };
    }
  };

  // Launch checkout on same invoice or redirect to Midtrans window
  const handleRetryPayment = async (order: Order) => {
    setRefreshing(true);
    try {
      // Fetch corresponding payment status from Supabase payments table
      const { data: payData, error: payError } = await supabase
        .from('payments')
        .select('*')
        .eq('invoice', order.invoice)
        .maybeSingle();

      const openSnap = (token: string, fallbackUrl?: string) => {
        const isProd = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true' || import.meta.env.VITE_MIDTRANS_ENV === 'production';
        const snapScriptUrl = isProd 
          ? 'https://app.midtrans.com/snap/snap.js'
          : 'https://app.sandbox.midtrans.com/snap/snap.js';
        const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY || 'SB-Mid-client-gqOVsh7Vcbo-i_h4';
        
        let script = document.querySelector('script[data-midtrans="snap"]') as HTMLScriptElement;
        
        const triggerSnap = () => {
          setRefreshing(false);
          if (window.snap && token) {
            window.snap.pay(token, {
              onSuccess: () => { fetchOrdersAndProducts(true); },
              onPending: () => { fetchOrdersAndProducts(true); },
              onError: () => { setSystError('Pembayaran Gagal. Silakan coba lagi.'); },
              onClose: () => { console.log('Closed snap'); fetchOrdersAndProducts(true); }
            });
          } else if (fallbackUrl) {
            window.location.href = fallbackUrl;
          }
        };

        if (!script) {
          script = document.createElement('script');
          script.src = snapScriptUrl;
          script.setAttribute('data-client-key', clientKey);
          script.setAttribute('data-midtrans', 'snap');
          script.onload = triggerSnap;
          script.onerror = () => { if (fallbackUrl) window.location.href = fallbackUrl; };
          document.body.appendChild(script);
        } else {
          triggerSnap();
        }
      };

      if (payData && payData.reference && !payData.reference.startsWith('SIM-TOKEN')) {
         openSnap(payData.reference, payData.payment_url);
      } else if (payData && payData.payment_url) {
        window.location.href = payData.payment_url;
      } else {
        const user = session?.user;
        const customerName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Pelanggan Toko';

        // Trigger payment again if url is missing with new customized payload keys
        const response = await fetch('/api/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: order.user_id,
            product_id: order.product_id,
            productName: `Pesanan ${order.invoice || 'TJS'}`,
            amount: order.amount,
            quantity: 1,
            invoice: order.invoice,
            paymentMethod: 'midtrans_snap',
            customer_name: customerName,
            email: user?.email || 'test@gmail.com'
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

        const paymentUrl = funcData?.paymentUrl;
        const returnedInvoice = funcData?.invoice || order.invoice;
        const token = funcData?.reference;

        if (paymentUrl || token) {
          // Sinkronisasikan kolom invoice pada baris orders tabel dengan invoice baru jika dihasilkan oleh Edge Function berbeda
          if (returnedInvoice && returnedInvoice !== order.invoice) {
            await supabase
              .from('orders')
              .update({ invoice: returnedInvoice })
              .eq('id', order.id);
          }
          
          if (token && !token.startsWith('SIM-TOKEN')) {
             openSnap(token, paymentUrl);
          } else if (paymentUrl) {
             window.location.href = paymentUrl;
          }
        } else {
          throw new Error('Gagal mendapatkan tautan pembayaran aman baru dari server.');
        }
      }
    } catch (err: any) {
      setSystError(err.message || String(err));
      setRefreshing(false);
    }
  };

  return (
    <div className="flex-1 bg-[#f4f8fc] pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 text-left">
        
        {/* Header title block */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="text-left">
            <h1 className="text-2xl font-display font-black text-slate-900 tracking-tight leading-none uppercase">
              Riwayat Transaksi Saya
            </h1>
            <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
              Data transaksi escrow pembayaran terverifikasi diperbarui otomatis setiap 5 detik.
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
            </p>
          </div>

          <button
            onClick={() => fetchOrdersAndProducts(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-slate-900 border border-gray-200 text-xs font-bold px-4 py-2.5 rounded-xl uppercase tracking-wider transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-700 ${refreshing ? 'animate-spin' : ''}`} />
            Segarkan Status
          </button>
        </div>

        {loading ? (
          <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center flex flex-col items-center justify-center space-y-4 shadow-xs">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="text-xs text-gray-400">Menghubungkan ke server data...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white p-16 rounded-3xl border border-gray-100/60 text-center max-w-md mx-auto py-16 px-6 shadow-sm flex flex-col items-center space-y-4">
            <div className="bg-slate-50 p-4 rounded-full text-4xl select-none text-gray-400">🛍️</div>
            <h3 className="font-display font-extrabold text-slate-950 text-sm uppercase tracking-wide">Belum Ada Transaksi Belanja</h3>
            <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
              Seluruh histori order belanja terverifikasi Anda akan dipajang secara otomatis di halaman daftar ringkasan tersinkronisasi ini.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-3 rounded-xl uppercase tracking-wider transition shadow-md cursor-pointer"
            >
              Mulai Belanja Iklan Bekas
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = getStatusStyle(order.status);
              
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-gray-100/60 p-4 sm:p-6 shadow-xs relative flex flex-col md:flex-row justify-between gap-4"
                >
                  {/* Left Column information info */}
                  <div className="flex gap-4 items-start text-left min-w-0 flex-1">
                    <img
                      src={order.visuals?.image}
                      alt={order.productDetail?.name || ''}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-gray-100 shrink-0"
                    />

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] font-black uppercase text-slate-800 bg-slate-100 px-2 py-0.5 rounded-sm">
                          {order.invoice}
                        </span>
                        <span className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 border rounded-full flex items-center gap-1 ${status.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                          {status.label}
                        </span>
                      </div>

                      <h3 className="font-display font-bold text-sm sm:text-base text-slate-950 truncate max-w-sm sm:max-w-md">
                        {order.productDetail?.name}
                      </h3>

                      {order.status === 'PENDING' && (
                        <div className="pt-0.5">
                          <CountdownTimer
                            createdAt={order.created_at}
                            onExpire={() => fetchOrdersAndProducts()}
                          />
                        </div>
                      )}

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {parseSupabaseDate(order.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span className="flex items-center gap-1 select-all font-semibold text-slate-700">
                          <CreditCard className="w-3.5 h-3.5" />
                          {formatRupiah(order.amount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column billing callback options */}
                  <div className="flex items-center justify-end border-t border-gray-50 md:border-t-0 pt-3 md:pt-0 shrink-0">
                    {order.status === 'PENDING' ? (
                      <button
                        onClick={() => handleRetryPayment(order)}
                        className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black uppercase tracking-widest px-4 py-2.5 rounded-lg text-center shadow-xs transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        Bayar Sekarang
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    ) : order.status === 'PAID' ? (
                      <div className="text-right text-xs text-blue-700 space-y-1 bg-blue-50/50 p-2 rounded-xl border border-blue-100 uppercase tracking-wider font-extrabold w-full md:w-auto px-4 py-2 text-center select-none">
                        <span className="block text-[11px]">🛡️ Transaksi Berhasil</span>
                        <span className="block text-[9px] font-medium text-gray-500 normal-case">Stok dipotong & pesanan diproses</span>
                      </div>
                    ) : (
                      <div className="text-right text-xs text-red-500 space-y-1 bg-red-50/50 p-2 rounded-xl border border-red-100 uppercase tracking-wider font-extrabold w-full md:w-auto px-4 py-2 text-center select-none">
                        <span className="block text-[11px]">Pembayaran Gagal</span>
                        <span className="block text-[9px] font-medium text-gray-500 normal-case">Invoice kedaluwarsa / dibatalkan</span>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* System Error Modal Popup instead of Standard Browser Alerts */}
      <SystemErrorModal
        isOpen={!!systError}
        message={systError || ""}
        isAdmin={role === 'admin'}
        onClose={() => setSystError(null)}
      />

    </div>
  );
}
