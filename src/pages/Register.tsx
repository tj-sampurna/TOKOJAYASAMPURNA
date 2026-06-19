/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Sparkles, Mail, Lock, User, AlertCircle, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import TJSLogo from '../components/TJSLogo';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Harap isi semua kolom wajib.');
      return;
    }

    if (password.length < 6) {
      setError('Kata sandi harus minimal 6 karakter.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const determinedRole = email.toLowerCase().includes('admin') ? 'admin' : 'user';

      // 🔥 REGISTER AUTH DULU
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: determinedRole
          }
        }
      })

      // ❌ JIKA ERROR
      if (error) {
        console.log(error.message)
        setError(error.message)
        return
      }

      // ✅ AMBIL USER DARI AUTH
      const user = data?.user

      // 🔥 CEK USER ADA
      if (!user) {
        console.log("User tidak ditemukan")
        setError("User tidak ditemukan")
        return
      }

      // ✅ BARU INSERT KE TABLE USERS
      const { error: userError } = await supabase
        .from("users")
        .insert({
          id: user.id,
          email: email,
          role: determinedRole
        })

      if (userError) {
        console.log(userError.message)
        setError(userError.message)
        return
      }

      console.log("Register berhasil")
      setSuccess('Registrasi berhasil! Silakan masuk dengan akun baru Anda.');
      
      setTimeout(() => {
        navigate('/login');
      }, 1800);
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f4f5] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-gray-100 shadow-lg text-left">
        <div className="text-center">
          <div className="inline-flex mb-3">
            <TJSLogo size="lg" className="border border-gray-100 shadow-sm" />
          </div>
          <h2 className="text-2xl font-display font-extrabold text-slate-900 tracking-tight">
            Daftar Akun Baru
          </h2>
          <p className="mt-2 text-xs text-gray-500">
            Bergabung dengan jutaan pembeli & penjual barang bekas di Toko Jaya Sampurna Indonesia
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-start gap-2 text-xs">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleRegister}>
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
              Nama Lengkap
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="cth. Dedé Suherman"
                className="w-full pl-9 pr-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:border-slate-900 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
              Alamat Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full pl-9 pr-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:border-slate-900 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
              Kata Sandi (min. 6 Karakter)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="●●●●●●●●"
                className="w-full pl-9 pr-10 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:border-slate-900 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-slate-900 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Guide Note regarding dynamic role allocation */}
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-left">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              ℹ️ Informasi Akses Admin:
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Database memisahkan hak akses secara otomatis. Untuk mendaftar sebagai <b>Administrator</b> (mengakses Admin Panel, mengelola katalog, menerima verifikasi penawaran, & memantau escrow), harap gunakan alamat email yang mengandung kata <b>"admin"</b> (contoh: <code>admin@gmail.com</code> atau <code>tokojaya_admin@tjs.id</code>).
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-slate-800 disabled:bg-slate-300 transition duration-150 flex items-center justify-center gap-2 mt-4 cursor-pointer shadow-md"
          >
            {loading ? 'Mendaftarkan Akun...' : 'Daftar Sekarang'}
          </button>
        </form>

        <div className="text-center text-xs text-gray-500 mt-4">
          Sudah punya akun?{' '}
          <Link to="/login" className="text-emerald-600 font-bold hover:underline">
            Masuk Di Sini
          </Link>
        </div>
      </div>
    </div>
  );
}
