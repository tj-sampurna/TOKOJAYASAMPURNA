/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, X, Copy, Check, Server, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SystemErrorModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onClose: () => void;
  isAdmin?: boolean;
}

export default function SystemErrorModal({
  isOpen,
  title = "Kesalahan Sistem (System Error)",
  message,
  onClose,
  isAdmin = false
}: SystemErrorModalProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayTitle = isAdmin ? title : "Pembayaran Terkendala Sementara";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          {/* Backdrop wrapper animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative border border-red-50 overflow-hidden flex flex-col z-10 font-sans"
          >
            {/* Header with Red Warning Accent */}
            <div className="bg-gradient-to-r from-red-650 to-red-600 text-white px-6 py-5 flex items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-xl">
                  <ShieldAlert className="w-5 h-5 text-red-100" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight text-white leading-none uppercase">
                    {displayTitle}
                  </h3>
                  <p className="text-[10px] text-red-200 uppercase tracking-widest font-mono font-black mt-1">
                    {isAdmin ? "MIDTRANS & SUPABASE SYNC ERROR" : "Layanan Pembayaran Sibuk"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-red-200 hover:text-white transition duration-150 p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-6 text-left space-y-4">
              {isAdmin ? (
                <>
                  {/* Main warning text alert for Admins */}
                  <div className="bg-red-50/50 border border-red-150 p-4 rounded-2xl space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-red-600 font-extrabold flex items-center gap-1">
                      <Server className="w-3.5 h-3.5" /> DETAIL MASALAH / ERROR LOG:
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed font-semibold font-mono whitespace-pre-line bg-white p-3 rounded-xl border border-red-100 max-h-40 overflow-y-auto">
                      {message}
                    </p>
                  </div>

                  {/* Troubleshooting Instructions Card for Admins */}
                  <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <HelpCircle className="w-4 h-4 text-slate-500" /> Langkah Penyelesaian untuk Administrator:
                    </h4>
                    <ul className="text-[11px] text-slate-600 space-y-1.5 list-disc pl-4 font-medium leading-relaxed">
                      <li>
                        Pastikan Anda telah menyetel environment secrets baru di <b>.env</b> Anda: <code className="bg-slate-200 text-slate-800 px-1 rounded font-mono">MIDTRANS_SERVER_KEY</code> dan <code className="bg-slate-200 text-slate-800 px-1 rounded font-mono">MIDTRANS_CLIENT_KEY</code>.
                      </li>
                      <li>
                        Verifikasi bahwa URL Callback dan Return terkonfigurasi pada <code className="bg-slate-200 text-slate-800 px-1 rounded font-mono">https://...</code> yang valid.
                      </li>
                      <li>
                        Pastikan Edge Function <code className="bg-slate-200 text-slate-800 px-1 rounded font-mono">create-payment</code> telah dideploy dengan sukses ke project Supabase aktif Anda.
                      </li>
                    </ul>
                  </div>
                </>
              ) : (
                /* User-Friendly Message for standard Users */
                <div className="space-y-4 py-2 text-center sm:text-left">
                  <div className="text-4xl text-center select-none py-1">⚠️</div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      Gagal Memproses Transaksi Belanja
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Maaf, terjadi ketidakstabilan koneksi jaringan saat menghubungkan ke payment gateway Midtrans. Pembayaran Anda tidak berhasil terbuat.
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed font-semibold bg-slate-50 border border-slate-100 p-3 rounded-xl mt-2">
                      💡 <b>Solusi:</b> Silakan coba melakukan transaksi beberapa saat lagi, atau hubungi <b>Customer Service Bot</b> di pojok kanan bawah jika Anda membutuhkan bantuan pendaftaran manual.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2.5">
              {isAdmin ? (
                <>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500" />
                        <span>Salin Kode Error</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-md shadow-red-200 flex items-center justify-center cursor-pointer"
                  >
                    Tutup & Selesaikan
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-[#1e293b] hover:bg-slate-800 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center cursor-pointer"
                >
                  Dimengerti & Tutup
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
