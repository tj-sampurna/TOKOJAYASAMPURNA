/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Sparkles, Sparkle, Tag, Plus } from 'lucide-react';
import { Product, Category } from '../types';
import { CATEGORIES, INDONESIAN_CITIES } from '../data/initialData';

interface PostAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: Omit<Product, 'id' | 'date' | 'views' | 'saves' | 'isSold'>) => void;
}

// Preset modern images in Indonesia context
const MOCK_PRESET_IMAGES = [
  {
    category: 'elektronik',
    title: 'Samsung Galaxy / HP',
    url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=600&q=80',
  },
  {
    category: 'elektronik',
    title: 'Kamera DSLR Canon',
    url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80',
  },
  {
    category: 'otomotif',
    title: 'Motor Matic Honda Vario',
    url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80',
  },
  {
    category: 'otomotif',
    title: 'Mobil Keluarga Innova',
    url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80',
  },
  {
    category: 'rumah-tangga',
    title: 'Sofa Kain Minimalis',
    url: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=600&q=80',
  },
  {
    category: 'fashion',
    title: 'Sepatu Jordan / Sneaker',
    url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
  },
  {
    category: 'olahraga',
    title: 'Sepeda Gunung Xtrada',
    url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=600&q=80',
  },
  {
    category: 'properti',
    title: 'Rumah Tingkat / Kost',
    url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80',
  },
];

export default function PostAdModal({ isOpen, onClose, onAddProduct }: PostAdModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('elektronik');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<Product['condition']>('Bekas Bagus');
  const [location, setLocation] = useState('Jakarta Selatan');
  const [description, setDescription] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [selectedPresetUrl, setSelectedPresetUrl] = useState(MOCK_PRESET_IMAGES[0].url);
  const [sellerName, setSellerName] = useState('Dedé Suherman');
  const [sellerPhone, setSellerPhone] = useState('0812-3456-7890');
  const [isFeatured, setIsFeatured] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !price || !sellerName || !sellerPhone) {
      alert('Mohon isi semua field wajib!');
      return;
    }

    const finalImage = customImageUrl.trim() || selectedPresetUrl;

    onAddProduct({
      title,
      category,
      price: Number(price),
      condition,
      location,
      description,
      images: [finalImage],
      sellerName,
      sellerPhone,
      isVerified: true,
      isFeatured,
    });

    // Reset Form
    setTitle('');
    setCategory('elektronik');
    setPrice('');
    setCondition('Bekas Bagus');
    setDescription('');
    setCustomImageUrl('');
    onClose();
  };

  const activePresets = MOCK_PRESET_IMAGES.filter((img) => img.category === category);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header toolbar */}
        <div className="p-5 bg-olx-dark text-white flex justify-between items-center shrink-0 border-b">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-olx-accent" />
            <h2 className="font-display font-bold text-lg">Mulai Pasang Iklan Baris Gratis</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-full transition text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable form fields */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          
          {/* Section 1: Kategori & Judul */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <Sparkle className="w-3.5 h-3.5" />
              1. Detail Iklan Utama
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Kategori Barang *</label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    // Autofill preset image for new category
                    const matched = MOCK_PRESET_IMAGES.find((img) => img.category === e.target.value);
                    if (matched) setSelectedPresetUrl(matched.url);
                  }}
                  className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-olx-dark outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Lokasi Utama *</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-olx-dark outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {INDONESIAN_CITIES.filter((c) => c !== 'Semua Lokasi').map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Judul Iklan *</label>
              <input
                type="text"
                required
                maxLength={70}
                placeholder="Contoh: Honda Vario 150 Keyless 2018 Mulus Siap Pakai"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-olx-dark outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400 font-medium"
              />
              <span className="text-[10px] text-gray-400 mt-1 block text-right">{title.length}/70 Karakter</span>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Section 2: Harga & Kondisi */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              2. Harga & Kondisi Fisik
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Harga Jual (Rupiah) *</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 font-bold text-sm text-gray-500">Rp</span>
                  <input
                    type="number"
                    required
                    min={1000}
                    placeholder="Masukkan angka saja..."
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm text-olx-dark font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Kondisi Barang *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Seperti Baru', 'Bekas Bagus', 'Bekas Layak'] as Product['condition'][]).map((cond) => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setCondition(cond)}
                      className={`text-xs py-2.5 rounded-lg border font-semibold transition ${
                        condition === cond
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-slate-50'
                      }`}
                    >
                      {cond}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Section 3: Foto Iklan */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">3. Foto Unggulan Barang Bekas</h3>
            
            {/* Presets Grid */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Pilih dari katalog gambar terpopuler yang sesuai dengan barang dlm kategori :</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {activePresets.map((img) => (
                  <div
                    key={img.url}
                    onClick={() => {
                      setSelectedPresetUrl(img.url);
                      setCustomImageUrl(''); // clear custom url to use preset
                    }}
                    className={`relative rounded-lg overflow-hidden h-16 border-2 cursor-pointer transition ${
                      selectedPresetUrl === img.url && !customImageUrl
                        ? 'border-emerald-600 ring-2 ring-emerald-400/20 scale-102'
                        : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img src={img.url} alt={img.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-end p-1">
                      <span className="text-[9px] font-bold text-white leading-tight truncate w-full">{img.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Manual Image URL */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Atau Masukkan URL Link Foto Kustom Anda</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/photo-..."
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                className="w-full bg-slate-50 border border-gray-300 rounded-lg px-4 py-2.5 text-xs text-olx-dark outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400 font-mono"
              />
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Section 4: Deskripsi */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Deskripsi Lengkap Barang Bekas *</label>
            <textarea
              required
              rows={4}
              placeholder="Sebutkan alasan dijual, masa pemakaian, kelengkapan (Fullset / Batangan), lecet lecet/minus, spesifikasi garansi iBox/resmi, dsb."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-gray-300 rounded-lg p-3.5 text-sm text-olx-dark outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
            />
          </div>

          {/* Section 5: Seller Profile info and Bump */}
          <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-emerald-800 uppercase mb-1">Nama Penjual *</label>
              <input
                type="text"
                required
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded px-3 py-1.5 text-xs text-olx-dark font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-emerald-800 uppercase mb-1">No. WhatsApp Hubungi *</label>
              <input
                type="text"
                required
                value={sellerPhone}
                onChange={(e) => setSellerPhone(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded px-3 py-1.5 text-xs text-olx-dark font-medium"
              />
            </div>

            <div className="md:col-span-2 pt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="feat-checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 cursor-pointer text-emerald-600 rounded"
              />
              <label htmlFor="feat-checkbox" className="text-xs text-gray-700 font-medium cursor-pointer select-none">
                Gunakan fitur 🌟 <b className="text-amber-700">IKLAN SOROTAN (Featured)</b> untuk meletakkan iklan di paling atas agar dilirik ribuan orang.
              </label>
            </div>
          </div>

          {/* Action buttons footer */}
          <div className="pt-4 flex justify-end gap-3 shrink-0 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-gray-300 font-semibold text-sm hover:bg-slate-50 text-gray-700 transition"
            >
              Batalkan
            </button>
            <button
              type="submit"
              className="bg-olx-dark text-white font-bold text-sm px-6 py-2.5 rounded-lg hover:bg-emerald-800 transition flex items-center gap-1.5 shadow-md"
            >
              <Sparkles className="w-4 h-4 text-olx-accent" />
              Pasang Iklan Sekarang
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
