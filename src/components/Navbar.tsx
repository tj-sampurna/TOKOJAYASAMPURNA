/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, MapPin, Plus, Heart, MessageSquare, User, Sparkles, ShoppingBag } from 'lucide-react';
import { Category, Product } from '../types';
import { INDONESIAN_CITIES } from '../data/initialData';

interface NavbarProps {
  onSearch: (query: string) => void;
  onLocationChange: (loc: string) => void;
  selectedLocation: string;
  onPostAdClick: () => void;
  favoritesCount: number;
  onFavoritesClick: () => void;
  onMyAdsClick: () => void;
  onHomeClick: () => void;
  onChatClick: () => void;
  hasUnreadChats: boolean;
  currentUser: { name: string; email: string };
  myOrdersCount: number;
  onMyOrdersClick: () => void;
}

export default function Navbar({
  onSearch,
  onLocationChange,
  selectedLocation,
  onPostAdClick,
  favoritesCount,
  onFavoritesClick,
  onMyAdsClick,
  onHomeClick,
  onChatClick,
  hasUnreadChats,
  currentUser,
  myOrdersCount,
  onMyOrdersClick,
}: NavbarProps) {
  const [searchInput, setSearchInput] = useState('');
  const [showLocDropdown, setShowLocDropdown] = useState(false);

  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchInput);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      {/* Top Banner with Micro-labels */}
      <div className="bg-olx-dark text-white text-xs py-1.5 px-4 hidden md:flex justify-between items-center sm:px-6 lg:px-8">
        <div className="flex items-center gap-1.5 font-medium">
          <Sparkles className="w-3 hot-color text-olx-accent animate-pulse" />
          <span>Platform Barang Bekas Terbesar di Indonesia #PastiLaku</span>
        </div>
        <div className="flex gap-4 items-center text-gray-300">
          <span>Situs Resmi PasarBekas</span>
          <span>•</span>
          <span>Bantuan & Panduan Transaksi Safe-Trade</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div 
            onClick={onHomeClick} 
            className="flex items-center gap-2 cursor-pointer shrink-0"
          >
            <div className="bg-olx-dark text-olx-accent p-2 rounded-xl flex items-center justify-center font-display font-bold text-xl tracking-tight leading-none">
              PB<span className="text-white text-sm font-sans font-medium hover:text-olx-accent transition-colors">.id</span>
            </div>
            <span className="hidden sm:inline font-display font-extrabold text-2xl tracking-tighter text-olx-dark">
              Pasar<span className="text-emerald-600">Bekas</span>
            </span>
          </div>

          {/* Location Selector (OLX style) */}
          <div className="relative shrink-0 hidden md:block w-52">
            <div 
              onClick={() => setShowLocDropdown(!showLocDropdown)}
              className="flex items-center gap-2 border-2 border-olx-dark rounded-md px-3 py-2 bg-white cursor-pointer hover:bg-gray-50 transition"
            >
              <MapPin className="w-5 h-5 text-olx-dark shrink-0" />
              <span className="text-sm font-medium truncate text-olx-dark">
                {selectedLocation === 'Semua Lokasi' ? 'Semua Indonesia' : selectedLocation}
              </span>
            </div>
            {showLocDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl max-h-60 overflow-y-auto z-50">
                {INDONESIAN_CITIES.map((city) => (
                  <button
                    key={city}
                    onClick={() => {
                      onLocationChange(city);
                      setShowLocDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition ${
                      selectedLocation === city ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    {city === 'Semua Lokasi' ? '🇮🇩 Indonesia (Semua)' : city}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Bar Form (Full Width style) */}
          <form 
            onSubmit={handleSubmitSearch}
            className="flex items-center flex-1 border-2 border-olx-dark rounded-md overflow-hidden bg-white hover:border-emerald-600 transition"
          >
            <input
              type="text"
              placeholder="Cari Mobil, Handphone, Elektronik murah..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full px-4 py-2.5 text-sm outline-none text-olx-dark placeholder-gray-400"
            />
            <button 
              type="submit" 
              className="bg-olx-dark text-white p-3 hover:bg-emerald-800 transition aspect-square"
            >
              <Search className="w-5 h-5 font-bold" />
            </button>
          </form>

          {/* Action Icons Panel */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* My Orders Button */}
            <button
              onClick={onMyOrdersClick}
              className="relative p-2 text-olx-dark hover:text-emerald-700 transition rounded-full hover:bg-gray-100"
              title="Pesanan Saya"
            >
              <ShoppingBag className="w-6 h-6" />
              {myOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                  {myOrdersCount}
                </span>
              )}
            </button>

            {/* Favorites Icon */}
            <button
              onClick={onFavoritesClick}
              className="relative p-2 text-olx-dark hover:text-red-500 transition rounded-full hover:bg-gray-100"
              title="Favorit"
            >
              <Heart className={`w-6 h-6 ${favoritesCount > 0 ? 'fill-red-500 text-red-500' : ''}`} />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Chat Icon */}
            <button
              onClick={onChatClick}
              className="relative p-2 text-olx-dark hover:text-emerald-700 transition rounded-full hover:bg-gray-100"
              title="Diskusi & Chat"
            >
              <MessageSquare className="w-6 h-6" />
              {hasUnreadChats && (
                <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full ring-2 ring-white animate-pulse"></span>
              )}
            </button>

            {/* User Profile tab shortcut (Desktop Only) */}
            <button
              onClick={onMyAdsClick}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-gray-100 transition text-sm font-medium text-olx-dark"
              title="Kelola Iklan"
            >
              <div className="w-7 h-7 bg-emerald-600 text-white font-bold rounded-full flex items-center justify-center text-xs">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <span className="max-w-[70px] truncate">{currentUser.name.split(' ')[0]}</span>
            </button>

            {/* Iconic OLX gradient border 'Jual' button */}
            <button
              onClick={onPostAdClick}
              className="group relative inline-flex items-center justify-center p-0.5 rounded-full overflow-hidden font-bold text-sm text-olx-dark bg-gradient-to-r from-yellow-400 via-emerald-500 to-sky-400 hover:text-white focus:ring-4 focus:outline-none focus:ring-emerald-200 transition shadow-md"
            >
              <span className="relative flex items-center gap-1.5 px-4 py-2 transition-all ease-in duration-75 bg-white rounded-full group-hover:bg-opacity-0 text-olx-dark group-hover:text-white">
                <Plus className="w-4 h-4 text-emerald-600 group-hover:text-white" />
                <span className="font-semibold uppercase tracking-wider text-xs">JUAL</span>
              </span>
            </button>
          </div>
        </div>

        {/* Categories/Subheader links for mobile view */}
        <div className="mt-3 flex gap-2 md:hidden">
          <div className="relative w-full">
            <select
              value={selectedLocation}
              onChange={(e) => onLocationChange(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-xs text-olx-dark outline-none font-medium appearance-none"
            >
              {INDONESIAN_CITIES.map((city) => (
                <option key={city} value={city}>
                  {city === 'Semua Lokasi' ? '🌐 Seluruh Indonesia' : `📍 ${city}`}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
              <MapPin className="w-3.5 h-3.5" />
            </div>
          </div>
          <button
            onClick={onMyAdsClick}
            className="bg-white border text-xs border-gray-300 rounded-md px-3 py-2 text-olx-dark whitespace-nowrap font-medium hover:bg-gray-50"
          >
            Iklan Saya
          </button>
        </div>
      </div>
    </header>
  );
}
