import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, UploadCloud, CheckCircle2, ChevronRight, Inbox } from "lucide-react";

export default function AddProduct() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // =========================
      // VALIDASI
      // =========================
      if (!title || !description || !price || !category) {
        alert("Lengkapi semua data");
        return;
      }

      if (files.length === 0) {
        alert("Upload minimal 1 foto");
        return;
      }

      if (files.length > 5) {
        alert("Maksimal 5 foto");
        return;
      }

      setLoading(true);

      // =========================
      // UPLOAD IMAGES
      // =========================
      const imageUrls: string[] = [];

      for (const file of files) {
        const fileName = `${Date.now()}-${Math.random()}-${file.name}`;
        let finalUrl = "";

        try {
          const { error: uploadError } = await supabase.storage
            .from("products")
            .upload(fileName, file);

          if (uploadError) {
            throw new Error(`Upload gagal: ${uploadError.message}`);
          }

          const { data } = supabase.storage
            .from("products")
            .getPublicUrl(fileName);
          finalUrl = data?.publicUrl;

          if (!finalUrl) {
              throw new Error("Gagal mendapatkan URL gambar publik dari Supabase Storage.");
          }
        } catch (uploadException: any) {
          throw new Error(`Gagal mengupload gambar ke daftar produk: ${uploadException.message}`);
        }

        imageUrls.push(finalUrl);
      }

      // =========================
      // INSERT PRODUCT
      // =========================
      const { error } = await supabase
        .from("products")
        .insert({
          title,
          description,
          price: Number(price),
          category,
          images: imageUrls
        });

      if (error) {
        console.log(error.message);
        alert("Gagal menyimpan produk: " + error.message);
        setLoading(false);
        return;
      }

      // =========================
      // SUCCESS
      // =========================
      alert("Produk berhasil ditambahkan");

      // Notify updates across tabs
      window.dispatchEvent(new Event("tjs_db_update"));

      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("");
      setFiles([]);
      setLoading(false);
      
      // Go back to admin dashboard
      navigate("/admin");

    } catch (err: any) {
      console.log(err);
      alert("Terjadi kesalahan: " + (err.message || err));
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8 font-sans">
      
      {/* Navigation aid */}
      <div className="mb-6 flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-150 shadow-xs">
        <Link 
          to="/admin" 
          className="inline-flex items-center gap-2 text-xs font-bold uppercase text-slate-800 hover:text-emerald-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Admin Panel</span>
        </Link>
        <span className="text-[10px] font-black uppercase text-gray-400 font-mono tracking-widest">
          Sistem Multi-Upload Storage
        </span>
      </div>

      <div className="bg-white rounded-3xl border border-gray-150 overflow-hidden shadow-sm">
        
        {/* Banner with style matching Toko Jaya Sampurna */}
        <div className="p-6 sm:p-8 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest w-fit">
              <Sparkles className="w-3 h-3 text-[#23e5db] animate-pulse" />
              <span>Multi-Photo Uploader Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight">
              Tambah Produk Baru
            </h1>
            <p className="text-xs text-gray-400 max-w-lg">
              Isi data detail iklan serta unggah berkas foto langsung ke bucket penyimpanan Supabase Storage berkualitas tinggi.
            </p>
          </div>
        </div>

        <form onSubmit={handleAddProduct} className="p-6 sm:p-8 space-y-6">
          
          {/* Judul Produk */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-gray-500 block tracking-wider">
              Nama Produk *
            </label>
            <input
              type="text"
              placeholder="cth. HP Samsung Galaxy S23 Ultra Bekas Lengkap"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-[#f2f4f5]/80 px-4 py-3 rounded-xl text-xs sm:text-sm outline-none border-2 border-transparent focus:border-slate-800 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Harga */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-500 block tracking-wider">
                Harga Barang (IDR) *
              </label>
              <input
                type="number"
                placeholder="cth. 14500000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="w-full bg-[#f2f4f5]/80 px-4 py-3 rounded-xl text-xs sm:text-sm outline-none border-2 border-transparent focus:border-slate-800 transition"
              />
            </div>

            {/* Kategori */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-500 block tracking-wider">
                Pilih Kategori *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full bg-[#f2f4f5]/80 px-4 py-3 rounded-xl text-xs sm:text-sm outline-none border-2 border-transparent focus:border-slate-800 transition font-sans cursor-pointer text-slate-800"
              >
                <option value="">Pilih Kategori</option>
                <option value="Otomotif">Otomotif</option>
                <option value="Elektronik">Elektronik</option>
                <option value="Handphone">HP & Gadget</option>
                <option value="Properti">Properti</option>
                <option value="Fashion">Fashion & Baju</option>
                <option value="Hobi & Olahraga">Olahraga, Hobi, & Alat Musik</option>
                <option value="Lain-lain">Lain-lain / Lainnya</option>
              </select>
            </div>

          </div>

          {/* Deskripsi */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-gray-500 block tracking-wider">
              Deskripsi Produk Selengkapnya *
            </label>
            <textarea
              placeholder="Tuliskan kelengkapan, garansi, kondisi fisik, cacat pemakaian, dsb secara jujur..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
              className="w-full bg-[#f2f4f5]/80 p-4 rounded-xl text-xs sm:text-sm outline-none border-2 border-transparent focus:border-slate-800 transition resize-none leading-relaxed"
            />
          </div>

          {/* File input dengan multiple selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-500 block tracking-wider">
              Unggah Foto Produk (Minimal 1, Maksimal 5 Foto) *
            </label>
            
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-250 hover:border-slate-800 rounded-2xl p-6 sm:p-8 cursor-pointer transition text-center bg-[#f2f4f5]/30 hover:bg-white relative">
              <UploadCloud className="w-10 h-10 text-emerald-600 mb-2.5 animate-bounce" />
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-0.5">
                Pilih atau Tarik File Foto
              </span>
              <span className="text-[10px] text-gray-400">
                Pilih beberapa file sekaligus (PNG, JPG, JPEG)
              </span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files) {
                    setFiles(Array.from(e.target.files));
                  }
                }}
                className="hidden"
              />
            </label>

            {/* List previews if loaded */}
            {files.length > 0 && (
              <div className="mt-3 bg-slate-50 border border-gray-150 p-4 rounded-2xl">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[11px] font-black text-slate-800 uppercase tracking-wide">
                    File Terpilih ({files.length}) :
                  </span>
                  {files.length > 5 && (
                    <span className="bg-red-50 text-red-600 border border-red-100 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase animate-pulse">
                      Terlalu Banyak Foto (Maksimal 5)
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-3">
                  {files.map((file, idx) => {
                    const localUrl = URL.createObjectURL(file);
                    return (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-white">
                        <img src={localUrl} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute top-1 left-1 bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                          {idx + 1}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Upload Button */}
          <div className="pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl text-xs sm:text-sm font-black uppercase text-white tracking-widest shadow-sm transition flex items-center justify-center gap-2 ${
                loading 
                  ? "bg-slate-400 cursor-not-allowed" 
                  : "bg-slate-950 hover:bg-slate-800 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4.5 h-4.5 border-t-2 border-r-2 border-white rounded-full animate-spin" />
                  <span>Sedang Mengunggah & Memproses ({files.length} Foto)...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Upload & Terbitkan Produk</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>

    </div>
  );
}
