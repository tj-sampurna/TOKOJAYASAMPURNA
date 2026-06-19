/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Trash2, Heart, ExternalLink, CheckCircle, FileText, ShoppingBag, ShieldCheck } from 'lucide-react';
import { Product, Order } from '../types';

interface MyAdsTabProps {
  isOpen: boolean;
  onClose: () => void;
  userProducts: Product[];
  favoritedProducts: Product[];
  myOrders: Order[];
  onMarkAsSold: (id: string) => void;
  onDeleteProduct: (id: string) => void;
  onRemoveFavorite: (id: string) => void;
  onCheckoutProduct: (product: Product) => void;
  onShowOrderReceipt: (order: Order) => void;
}

type SubTab = 'my-ads' | 'my-favorites' | 'my-orders';

export default function MyAdsTab({
  isOpen,
  onClose,
  userProducts,
  favoritedProducts,
  myOrders,
  onMarkAsSold,
  onDeleteProduct,
  onRemoveFavorite,
  onCheckoutProduct,
  onShowOrderReceipt,
}: MyAdsTabProps) {
  const [activeTab, setActiveTab] = useState<SubTab>('my-ads');

  if (!isOpen) return null;

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end animate-fade-in">
      <div className="bg-white w-full max-w-4xl h-full flex flex-col shadow-2xl overflow-hidden">
        
        {/* Banner header title */}
        <div className="p-5 bg-olx-dark text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-display font-bold text-xl text-white">Hub Akun Saya</h2>
            <p className="text-xs text-olx-accent mt-0.5">Kelola iklan baris, simpan barang favorit, & lacak checkout Anda</p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded bg-white/10 hover:bg-white/20 transition text-white"
          >
            Tutup
          </button>
        </div>

        {/* Tab switcher buttons bar */}
        <div className="flex border-b border-gray-200 bg-gray-50 shrink-0">
          <button
            onClick={() => setActiveTab('my-ads')}
            className={`flex-1 text-center py-3.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'my-ads'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            Iklan Saya ({userProducts.length})
          </button>
          <button
            onClick={() => setActiveTab('my-favorites')}
            className={`flex-1 text-center py-3.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'my-favorites'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            Suka / Favorit ({favoritedProducts.length})
          </button>
          <button
            onClick={() => setActiveTab('my-orders')}
            className={`flex-1 text-center py-3.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'my-orders'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            Transaksi Beli ({myOrders.length})
          </button>
        </div>

        {/* Dynamic content scroll frame */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          
          {/* TAB 1: User Postings */}
          {activeTab === 'my-ads' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-extrabold text-olx-dark tracking-wide uppercase">Daftar Iklan Barang Jualan Anda</h3>
                <span className="text-xs text-gray-500">Iklan Anda bertahan selamanya secara gratis</span>
              </div>

              {userProducts.length === 0 ? (
                <div className="bg-white border rounded-xl p-12 text-center text-gray-500 max-w-md mx-auto mt-10">
                  <span className="text-4xl block mb-3">📦</span>
                  <p className="font-semibold text-gray-800">Anda belum memasang iklan</p>
                  <p className="text-xs text-gray-500 mt-1">Mulai jual barang bekas menumpuk Anda untuk dijadikan cuan instan!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {userProducts.map((p) => (
                    <div key={p.id} className="bg-white border rounded-xl p-4 flex gap-4 items-center shadow-xs">
                      <img
                        src={p.images[0]}
                        alt={p.title}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 object-cover rounded-lg border shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex gap-2 items-center">
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            {p.category.toUpperCase()}
                          </span>
                          {p.isSold && (
                            <span className="text-xs font-extrabold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                              TERJUAL
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-gray-800 truncate mt-1">{p.title}</h4>
                        <p className="font-mono text-xs text-olx-dark font-semibold mt-0.5">
                          {formatRupiah(p.price)}
                        </p>
                      </div>

                      {/* Control buttons */}
                      <div className="flex items-center gap-2">
                        {!p.isSold && (
                          <button
                            onClick={() => onMarkAsSold(p.id)}
                            className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded transition whitespace-nowrap"
                          >
                            Set Terjual
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteProduct(p.id)}
                          className="p-2 border border-red-100 hover:bg-red-50 text-red-600 rounded transition"
                          title="Hapus Iklan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Loved items */}
          {activeTab === 'my-favorites' && (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-olx-dark tracking-wide uppercase">Iklan yang Anda Sukai</h3>

              {favoritedProducts.length === 0 ? (
                <div className="bg-white border rounded-xl p-12 text-center text-gray-500 max-w-md mx-auto mt-10">
                  <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-semibold text-gray-800">Tidak ada favorit</p>
                  <p className="text-xs text-gray-500 mt-1">Tekan lambang hati pada iklan untuk menyimpannya di sini.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {favoritedProducts.map((p) => (
                    <div key={p.id} className="bg-white border rounded-xl p-4 flex gap-4 items-center shadow-sm">
                      <img
                        src={p.images[0]}
                        alt={p.title}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 object-cover rounded-lg border shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">{p.location}</span>
                        <h4 className="font-bold text-sm text-gray-800 truncate leading-tight mt-0.5">{p.title}</h4>
                        <p className="font-mono text-xs text-olx-dark font-bold mt-1">
                          {formatRupiah(p.price)}
                        </p>
                      </div>

                      {/* Purchase Shortcut / Removal */}
                      <div className="flex items-center gap-2 shrink-0">
                        {p.isSold ? (
                          <span className="text-xs bg-gray-100 text-gray-400 font-bold px-3 py-1.5 rounded">
                            Sudah Terjual
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              onCheckoutProduct(p);
                              onClose();
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded transition"
                          >
                            Beli Langsung
                          </button>
                        )}
                        <button
                          onClick={() => onRemoveFavorite(p.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-50 rounded transition border border-gray-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Transactions purchase ledger */}
          {activeTab === 'my-orders' && (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-olx-dark tracking-wide uppercase">Pembelian & Rekber Aman</h3>

              {myOrders.length === 0 ? (
                <div className="bg-white border rounded-xl p-12 text-center text-gray-500 max-w-md mx-auto mt-10">
                  <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-semibold text-gray-800">Belum ada transaksi</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Coba lakukan pelunasan checkout barang impian Anda untuk melihat histori kuitansi di sini.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myOrders.map((o) => (
                    <div key={o.id} className="bg-white border rounded-xl p-4 shadow-sm">
                      <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-3">
                        <div>
                          <p className="text-xs text-gray-500 font-medium">No. Invoice: <span className="font-mono text-olx-dark font-bold">{o.id}</span></p>
                          <p className="text-[11px] text-gray-400 font-mono mt-0.5">{o.orderDate}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {o.status === 'success' || o.status === 'shipped' || o.status === 'cod_confirmed' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-100">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Lunas / Berhasil
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-100 animate-pulse">
                              Pending Pembayaran
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-4 items-center">
                        <img
                          src={o.product.images[0]}
                          alt={o.product.title}
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 object-cover rounded-lg border shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-gray-800 truncate">{o.product.title}</h4>
                          <p className="text-xs text-gray-500 mt-1">Metode: <span className="font-medium text-gray-700 capitalize">{o.deliveryType === 'cod' ? 'COD (Ketemuan)' : 'Pengiriman Rekber'}</span></p>
                          {o.resi && (
                            <p className="text-xs text-emerald-700 font-mono mt-0.5">No. Resi ({o.courier}): <span className="font-bold">{o.resi}</span></p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="text-[11px] text-gray-400 uppercase font-medium">Total Harga</p>
                          <p className="font-mono text-sm font-black text-emerald-800">
                            {formatRupiah(o.totalPrice)}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center bg-gray-50 -mx-4 -mb-4 px-4 py-3 rounded-b-xl border-t border-gray-100 mt-4">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span className="text-[11px] font-semibold text-gray-500">Transaksional Dilindungi Garansi Safe-Trade</span>
                        </div>
                        
                        <button
                          onClick={() => onShowOrderReceipt(o)}
                          className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                        >
                          <FileText className="w-4 h-4" />
                          Detail Invoice Saya
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
