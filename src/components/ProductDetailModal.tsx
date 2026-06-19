/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, MessageSquare, ShieldCheck, Eye, MapPin, Calendar, Info, Share2, Star, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { Product } from '../types';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  isLiked: boolean;
  onLikeToggle: (id: string) => void;
  onOpenChat: (product: Product) => void;
  onCheckout: (product: Product) => void;
}

export default function ProductDetailModal({
  product,
  isOpen,
  onClose,
  isLiked,
  onLikeToggle,
  onOpenChat,
  onCheckout,
}: ProductDetailModalProps) {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleNextImage = () => {
    if (!product) return;
    setActiveImageIdx((prev) => (prev + 1) % product.images.length);
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handlePrevImage = () => {
    if (!product) return;
    setActiveImageIdx((prev) => (prev - 1 + product.images.length) % product.images.length);
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
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

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
  };

  // Reset states on product/open changes
  useEffect(() => {
    if (isOpen) {
      setActiveImageIdx(0);
      setIsZoomOpen(false);
      setZoomScale(1);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [isOpen, product]);

  // Key listeners inside the interactive Zoom Lightbox
  useEffect(() => {
    if (!isOpen || !product) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isZoomOpen) {
        if (e.key === 'Escape') {
          setIsZoomOpen(false);
          setZoomScale(1);
          setPanOffset({ x: 0, y: 0 });
        } else if (e.key === 'ArrowRight') {
          handleNextImage();
        } else if (e.key === 'ArrowLeft') {
          handlePrevImage();
        } else if (e.key === '=' || e.key === '+') {
          handleZoomIn();
        } else if (e.key === '-') {
          handleZoomOut();
        }
      } else {
        if (e.key === 'Escape') {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isZoomOpen, activeImageIdx, product]);

  if (!isOpen || !product) return null;

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getConditionStyle = (cond: Product['condition']) => {
    switch (cond) {
      case 'Baru':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Seperti Baru':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Bekas Bagus':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#f2f4f5] rounded-2xl w-full max-w-5xl h-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        
        {/* Top interactive Header bar */}
        <div className="bg-white px-5 py-4 border-b border-gray-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">
              PasarBekas.id &gt; Kategori &gt; {product.category}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onLikeToggle(product.id)}
              className="p-2 hover:bg-gray-100 rounded-full transition text-gray-600 hover:text-red-500"
              title="Simpan"
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Tautan halaman iklan ini berhasil disalin ke clipboard!');
              }}
              className="p-2 hover:bg-gray-100 rounded-full transition text-gray-600"
              title="Bagikan"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition text-olx-dark"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Layout Content Columns */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left / Middle: Photo Lightbox & Description Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Aspect box containing main image & indicators */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden relative shadow-sm">
              <div 
                onClick={() => setIsZoomOpen(true)}
                className="relative aspect-video flex items-center justify-center bg-zinc-950 cursor-zoom-in group/img overflow-hidden"
              >
                <img
                  src={product.images[activeImageIdx] || product.images[0]}
                  alt={product.title}
                  referrerPolicy="no-referrer"
                  className="max-h-[400px] object-contain w-full transition-transform duration-300 group-hover/img:scale-[1.02]"
                />
                
                {/* Visual indicator overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors duration-300 flex items-center justify-center pointer-events-none">
                  <span className="bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 select-none">
                    <ZoomIn className="w-3.5 h-3.5 text-[#23e5db]" />
                    <span>Ketuk untuk Memperbesar</span>
                  </span>
                </div>

                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-xs text-white p-2 rounded-lg opacity-65 group-hover/img:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <Maximize2 className="w-4 h-4 text-white" />
                </div>
                
                {product.isSold && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center">
                    <span className="font-display font-black text-2xl text-white uppercase tracking-widest border-4 border-white px-6 py-2 rotate-[-8deg] rounded-lg shadow-lg">
                      SUDAH TERJUAL
                    </span>
                  </div>
                )}
              </div>

              {/* Alt carousels if multiple images are provided */}
              {product.images.length > 1 && (
                <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex justify-center gap-2">
                  {product.images.map((imgUrl, idx) => (
                    <button
                      key={imgUrl}
                      onClick={() => setActiveImageIdx(idx)}
                      className={`w-14 h-10 rounded border overflow-hidden transition ${
                        activeImageIdx === idx ? 'border-olx-accent scale-105' : 'border-transparent opacity-60'
                      }`}
                    >
                      <img src={imgUrl} alt="Thumbnail" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
              <h3 className="font-display font-bold text-lg text-olx-dark border-b pb-2">Deskripsi Barang</h3>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {product.description}
              </p>
            </div>

            {/* Platform Advice safety box */}
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 text-xs text-amber-900 flex gap-3">
              <span className="text-lg">🛡️</span>
              <div>
                <p className="font-bold">Hati-hati modus penipuan transfer langsung!</p>
                <p className="mt-0.5 leading-relaxed text-amber-800 font-medium">
                  Jangan pernah melakukan transfer dana ke rekening pribadi penjual sebelum bertemu langsung atau barang diterima. Gunakan sistem <b>Checkout Safe-Trade Pengiriman</b> di bawah agar dana Anda aman ditahan rekening bersama PasarBekas sampai barang lolos pengecekan kurir!
                </p>
              </div>
            </div>

          </div>

          {/* Right Column: Key Details, Prices, and Action buttons */}
          <div className="space-y-6">
            
            {/* Core Info Block (Price, title, date) */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="font-display font-black text-2xl text-emerald-700 leading-none">
                  {formatRupiah(product.price)}
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 border rounded-full ${getConditionStyle(product.condition)}`}>
                  {product.condition}
                </span>
              </div>

              <h1 className="font-sans font-extrabold text-lg text-olx-dark leading-snug">
                {product.title}
              </h1>

              <div className="flex justify-between items-center text-xs text-gray-500 pt-4 border-t border-gray-100">
                <span className="flex items-center gap-1 font-medium">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {product.location}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {product.date}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2 bg-emerald-50/50 -mx-6 -mb-6 p-4 rounded-b-xl border-t text-xs text-emerald-800 font-semibold">
                <Eye className="w-4 h-4 text-emerald-600" />
                <span>Iklan ini telah dilihat sebanyak <b>{product.views} kali</b></span>
              </div>
            </div>

            {/* Seller Info Block */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
              <h3 className="font-display font-bold text-gray-700 text-xs tracking-wider uppercase">Detail Profil Penjual</h3>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-600 text-white font-extrabold rounded-full flex items-center justify-center text-lg">
                  {product.sellerName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-sm text-olx-dark truncate">{product.sellerName}</h4>
                    <span className="bg-emerald-100 text-emerald-800 p-0.5 rounded-full text-[10px]" title="Terverifikasi">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium">Bergabung sejak Mei 2024</p>
                </div>
              </div>

              {/* Verified Seller banner */}
              {product.isVerified && (
                <div className="bg-emerald-50 text-emerald-800 text-[11px] p-2.5 rounded-lg border border-emerald-100 flex items-center gap-1.5 font-medium">
                  <span className="text-emerald-700">✓</span>
                  <span>Akun Terverifikasi via KTP & Email Seluler</span>
                </div>
              )}
            </div>

            {/* Action buttons (Checkout vs Chatting) */}
            <div className="space-y-3">
              {product.isSold ? (
                <div className="w-full bg-gray-200 text-gray-500 rounded-xl py-4 text-center font-bold text-sm shadow-xs cursor-not-allowed">
                  Barang Sudah Laku Terjual
                </div>
              ) : (
                <>
                  {/* Secure Buy Flow checkout CTA */}
                  <button
                    onClick={() => onCheckout(product)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 transition text-white font-bold text-base py-3.5 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 border border-emerald-700"
                  >
                    <span>⚡ Beli & Checkout</span>
                  </button>

                  {/* Informal negotiation chats */}
                  <button
                    onClick={() => {
                      onOpenChat(product);
                    }}
                    className="w-full bg-white hover:bg-gray-50 active:scale-98 transition text-olx-dark font-bold text-sm py-3 rounded-xl border border-olx-dark cursor-pointer flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Diskusi Chat dng Penjual</span>
                  </button>

                  <div className="text-center">
                    <a
                      href={`https://wa.me/${product.sellerPhone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-500 font-medium hover:text-emerald-700 transition"
                    >
                      Hubungi WA: <span className="font-mono text-emerald-800 font-bold">{product.sellerPhone}</span>
                    </a>
                  </div>
                </>
              )}
            </div>

          </div>

        </div>

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
                <div className="text-white font-sans text-xs md:text-sm font-semibold flex items-center gap-2 max-sm:max-w-[150px] truncate">
                  <span className="bg-emerald-500 w-2 h-2 rounded-full animate-pulse shrink-0" />
                  <span className="truncate">{product.title}</span>
                  <span className="text-white/40 font-mono shrink-0">
                    ({activeImageIdx + 1}/{product.images.length})
                  </span>
                </div>

                {/* Main Zoom Controller Panel */}
                <div className="flex items-center gap-1.5 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 p-1 rounded-full shadow-lg">
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
                {/* Navigation Arrows (if multi-image) */}
                {product.images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevImage();
                      }}
                      className="absolute left-4 md:left-8 z-15 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-white p-3 rounded-full transition transform active:scale-95 cursor-pointer max-sm:p-2"
                      title="Sebelumnya"
                    >
                      <ChevronLeft className="w-6 h-6 max-sm:w-5 max-sm:h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextImage();
                      }}
                      className="absolute right-4 md:right-8 z-15 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-white p-3 rounded-full transition transform active:scale-95 cursor-pointer max-sm:p-2"
                      title="Berikutnya"
                    >
                      <ChevronRight className="w-6 h-6 max-sm:w-5 max-sm:h-5" />
                    </button>
                  </>
                )}

                {/* Real-time pointer draggable scalable representation */}
                <div 
                  className="w-full h-full flex items-center justify-center select-none"
                  style={{ touchAction: 'none' }}
                >
                  <img
                    src={product.images[activeImageIdx] || product.images[0]}
                    alt={product.title}
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
                  <span>Hubungkan pointer & Seret untuk memindahkan gambar • Ketuk tombol reset di atas</span>
                ) : (
                  <span>Gunakan roda mouse atau klik tombol di atas untuk melakukan zoom</span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
