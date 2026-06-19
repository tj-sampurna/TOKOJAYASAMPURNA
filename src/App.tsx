/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ProductDetail from './pages/ProductDetail';
import Orders from './pages/Orders';
import Admin from './pages/Admin';
import AddProduct from './pages/AddProduct';
import { Sparkles, ShoppingBag, LogOut, Key, User, Plus, Grid, ArrowRight, ShieldCheck } from 'lucide-react';
import TJSLogo from './components/TJSLogo';
import CustomerServiceBot from './components/CustomerServiceBot';

function Navigation() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>('user');
  const [ordersCount, setOrdersCount] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  // Load auth state and listen for session switches
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch true user-role from database table
  useEffect(() => {
    let active = true;
    const fetchRoleFromDatabase = async () => {
      if (!user) {
        setRole('user');
        return;
      }
      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        if (active) {
          if (!error && data) {
            setRole(data.role || 'user');
          } else {
            setRole(user.user_metadata?.role ?? 'user');
          }
        }
      } catch (err) {
        if (active) {
          setRole(user.user_metadata?.role ?? 'user');
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
  }, [user]);

  // Fetch running aggregate count of orders
  useEffect(() => {
    let active = true;
    const getOrdersCount = async () => {
      if (!user) {
        setOrdersCount(0);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'PENDING');
        if (!error && data && active) {
          setOrdersCount(data.length);
        }
      } catch (err) {
        console.error(err);
      }
    };

    getOrdersCount();
    
    // Set a slow interval & instant event listeners to update badge values dynamically
    const interval = setInterval(getOrdersCount, 12000);
    window.addEventListener('tjs_db_update', getOrdersCount);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener('tjs_db_update', getOrdersCount);
    };
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (isAuthPage) return null;

  return (
    <header className="sticky top-0 z-40 bg-[#0A1628] border-b border-[#0A1628]/10 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex items-center justify-between gap-4">
          
          {/* Brand Logo link to Home */}
          <Link to="/" className="flex items-center gap-2 cursor-pointer shrink-0">
            <TJSLogo size="md" className="border border-slate-800 shadow-xs" />
            <span className="font-display font-black text-base sm:text-2xl tracking-tight text-white">
              Toko Jaya <span className="text-[#C9A84C]">Sampurna</span>
            </span>
          </Link>

          {/* Dynamic header options */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0 font-sans">
            
            {/* Orders Shortcut */}
            {user && (
              <Link
                to="/orders"
                className="relative p-2.5 text-[#8a9ab5] hover:text-white hover:bg-white/10 rounded-xl transition flex items-center gap-1.5 font-bold text-xs uppercase"
                title="Transaksi Saya"
              >
                <ShoppingBag className="w-5 h-5 text-[#8a9ab5]" />
                <span className="hidden md:inline">Transaksi</span>
                {ordersCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#C9A84C] text-[#0A1628] text-[10px] font-mono font-bold w-4.5 h-4.5 flex items-center justify-center rounded-full border border-[#0A1628]">
                    {ordersCount}
                  </span>
                )}
              </Link>
            )}

            {/* Admin Panel shortcut */}
            {user && role === 'admin' && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1 bg-[#C9A84C] hover:bg-[#b0923f] text-[#0A1628] font-black text-[10px] uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition shadow-xs"
              >
                <ShieldCheck className="w-4 h-4 text-[#0A1628]" />
                Admin Panel
              </Link>
            )}

            {/* Profile trigger or Sign-in button */}
            {user ? (
              <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
                <div 
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 border border-slate-700 select-all"
                  title={user.email}
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="max-w-[100px] truncate text-[#C9A84C]">
                    {user.user_metadata?.full_name || user.email.split('@')[0]}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2.5 text-gray-400 hover:bg-slate-800 hover:text-white rounded-xl transition cursor-pointer"
                  title="Keluar dari Akun"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1 bg-[#C9A84C] hover:bg-[#b0923f] text-[#0A1628] font-extrabold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
              >
                Masuk / Daftar
                <ArrowRight className="w-4 h-4 ml-0.5 text-[#0A1628]" />
              </Link>
            )}

          </div>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#f8f7f4] flex flex-col font-sans">
        
        {/* Top Navbar segment */}
        <Navigation />

        {/* Dynamic Route Handler */}
        <div className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/add-product" element={<AddProduct />} />
            {/* Fallback navigation to Home */}
            <Route path="*" element={<Home />} />
          </Routes>
        </div>

        {/* Universal high contrast footer */}
        <footer className="bg-white border-t border-[#e8e4dc] py-10 text-left">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <TJSLogo size="sm" className="border border-gray-150 shadow-xs" />
              </div>
              <p className="text-xs text-[#6b7280] leading-relaxed max-w-sm">
                Portal modern perantara jual beli barang bekas terverifikasi se-Indonesia. Dilengkapi dengan sistem Escrow otomatis untuk menciptakan ekosistem niaga yang aman, transparan, dan bebas dari risiko penipuan.
              </p>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-display font-black text-xs text-[#0A1628] uppercase tracking-widest">Ketentuan Perlindungan Konsumen</h4>
              <ul className="text-xs text-[#6b7280] space-y-2.5 leading-relaxed">
                <li className="flex gap-2"><span>✓</span> barang yang sudah di cek oleh tim ahli kami dan sudah terverifikasi.</li>
                <li className="flex gap-2"><span>✓</span> jika barang tidak sampai maka uang akan kami kembalikan 100%</li>
                <li className="flex gap-2"><span>✓</span> jika ada kendala di pengiriman maka kami akan mengganti nya syarat dan ketentuan berlaku</li>
              </ul>
            </div>

            <div className="space-y-2 text-xs text-[#6b7280]">
              <h4 className="font-display font-black text-[#0A1628] uppercase tracking-widest block mb-1">Hubungi Bantuan Konsumen</h4>
              <p>Mengalami kendala teknis terkait transaksi, sistem pembayaran, atau integrasi? Tim dukungan kami siap membantu Anda.</p>
              <div className="pt-1.5 space-y-1">
                <p className="font-bold text-[#0A1628]">Alamat Kantor:</p>
                <p className="leading-relaxed">Sahid Sudirman Center, Level 23, Jl. Jend. Sudirman Kav. 86, 10220</p>
              </div>
              <p className="text-[#C9A84C] font-bold">Jam Layanan: 09:00 - 18:00 WIB (Setiap Hari)</p>
              <p className="font-bold text-[#0A1628]">Call Centre : 021 27889222</p>
              <p className="text-[#9ca3af]">Surel: support@tokojayasampurna.store</p>
            </div>
          </div>
          
          <div className="border-t border-[#e8e4dc] mt-8 pt-6 text-center text-[11px] text-[#9ca3af] max-w-7xl mx-auto px-4 leading-relaxed font-mono">
            <p>© 2026 Toko Jaya Sampurna Indonesia. Seluruh hak cipta dilindungi undang-undang. Dikembangkan sebagai platform niaga barang bekas modern dengan standar keamanan transaksi tertinggi.</p>
          </div>
        </footer>

        {/* Global floating helpdesk auto-reply AI support bot */}
        <CustomerServiceBot />

      </div>
    </BrowserRouter>
  );
}
