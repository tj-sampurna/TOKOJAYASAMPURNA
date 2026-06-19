/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Sparkles, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import TJSLogo from '../components/TJSLogo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email dan Password wajib diisi.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
      } else {
        setSuccess('Login berhasil! Mengalihkan...');
        setTimeout(() => {
          navigate('/');
        }, 1200);
      }
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
            Selamat Datang Kembali
          </h2>
          <p className="mt-2 text-xs text-gray-500">
            Masuk untuk menjelajahi, membeli, dan pasang iklan di Toko Jaya Sampurna
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

        <form className="mt-6 space-y-4" onSubmit={handleLogin}>
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
              Kata Sandi
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-slate-800 disabled:bg-slate-300 transition duration-150 flex items-center justify-center gap-2 mt-4 cursor-pointer shadow-md"
          >
            {loading ? 'Menghubungkan...' : 'Masuk Sekarang'}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <span className="relative bg-white px-3 text-[11px] text-gray-400 uppercase tracking-widest">
            Baru di Toko Jaya Sampurna?
          </span>
        </div>

        <Link
          to="/register"
          className="w-full block border-2 border-slate-900 text-slate-900 font-extrabold text-xs py-3 text-center rounded-xl uppercase tracking-wider hover:bg-slate-50 transition duration-150"
        >
          Daftar Akun Baru
        </Link>

        {/* Developer Sandbox Sandbox info */}
        <div className="mt-6 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 leading-relaxed">
          <b className="text-slate-800 uppercase block mb-1 font-extrabold tracking-wider text-[10px]">
            💡 Panduan Pengujian Akun Supabase:
          </b>
          Daftarkan akun baru melalui menu daftar di atas. Gunakan alamat email yang mengandung kata 
          <b> "admin"</b> (contoh: <code>admin@gmail.com</code>) untul masuk otomatis sebagai Administrator 
          guna menguji pengelolaan katalog serta verifikasi penawaran nasional.
        </div>
      </div>
    </div>
  );
}
