/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Heart, ShieldCheck, Eye } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  key?: React.Key;
  product: Product;
  onSelect: (product: Product) => void;
  isLiked: boolean;
  onLikeToggle: (e: React.MouseEvent, id: string) => void;
}

export default function ProductCard({
  product,
  onSelect,
  isLiked,
  onLikeToggle,
}: ProductCardProps) {
  // Format price as IDR
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
    <div
      id={`prod-card-${product.id}`}
      onClick={() => onSelect(product)}
      className={`group relative bg-white rounded-xl border overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg olx-shadow bg-card hover:-translate-y-1 ${
        product.isFeatured ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-gray-200'
      }`}
    >
      {/* Featured Badge */}
      {product.isFeatured && (
        <span className="absolute top-3 left-3 z-10 bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md shadow-sm tracking-wider flex items-center gap-1">
          ★ SOROTAN
        </span>
      )}

      {/* Condition label */}
      <span className={`absolute top-3 right-3 z-10 text-[11px] font-bold px-2 py-0.5 border rounded-full shadow-sm ${getConditionStyle(product.condition)}`}>
        {product.condition}
      </span>

      {/* Image container */}
      <div className="relative aspect-video bg-gray-50 overflow-hidden">
        <img
          src={product.images[0]}
          alt={product.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {product.isSold && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
            <span className="font-display font-black text-xl text-white uppercase tracking-widest border-4 border-white px-4 py-1.5 rotate-[-8deg] rounded-lg">
              TERJUAL
            </span>
          </div>
        )}
      </div>

      {/* Body details */}
      <div className="p-4 flex flex-col justify-between h-44">
        <div>
          {/* Price & verified mark */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-display font-bold text-[17px] text-olx-dark leading-tight">
              {formatRupiah(product.price)}
            </span>
            <div className="flex items-center gap-2">
              {product.isVerified && (
                <span className="text-emerald-600 bg-emerald-50 p-1 rounded-full text-xs" title="Penjual Terverifikasi">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className="text-sm font-medium text-gray-800 line-clamp-2 leading-relaxed group-hover:text-emerald-700 transition-colors">
            {product.title}
          </h3>
        </div>

        {/* Footer detailing: Location & date metadata */}
        <div className="flex items-center justify-between text-[11px] text-gray-500 border-t border-gray-100 pt-3 mt-3">
          <div className="flex flex-col">
            <span className="font-semibold text-gray-700">{product.location}</span>
            <span>{product.date}</span>
          </div>

          {/* Interactive like toggle and view indicator */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 opacity-70">
              <Eye className="w-3.5 h-3.5" />
              <span>{product.views}</span>
            </span>
            <button
              id={`like-btn-${product.id}`}
              onClick={(e) => onLikeToggle(e, product.id)}
              className={`p-1.5 rounded-full hover:bg-gray-100 transition duration-300 transform active:scale-125`}
            >
              <Heart
                className={`w-5 h-5 transition-colors duration-300 ${
                  isLiked ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-500'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
