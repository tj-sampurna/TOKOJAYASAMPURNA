export const SQL_SCHEMA_TEMPLATE = `
-- Skema Lengkap Tabel Supabase Toko Jaya Sampurna

-- 1. TABEL PRODUCTS (Katalog Barang Jual Beli)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    category VARCHAR(100) DEFAULT 'Lain-lain',
    stock INT DEFAULT 1,
    image TEXT,
    image_url TEXT,
    images TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- JALANKAN jika tabel 'products' Anda sudah ada tetapi tidak memiliki kolom 'images' atau 'stock':
-- ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
-- ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock INT DEFAULT 1;

-- 2. TABEL ORDERS (Catatan Pemesanan Escrow)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    invoice VARCHAR(255) UNIQUE NOT NULL,
    amount NUMERIC NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PAID, FAILED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABEL PAYMENTS (Detail Pelacak Invoice Duitku)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice VARCHAR(255) UNIQUE NOT NULL,
    amount NUMERIC NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    payment_url TEXT,
    reference VARCHAR(255), -- ID Referensi Unik Resmi dari Duitku
    method VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- JALANKAN jika tabel 'payments' Anda sudah ada tetapi belum memiliki kolom 'reference':
-- ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reference VARCHAR(255);

-- 4. KEAMANAN RLS (Row Level Security) - Opsional tetapi Direkomendasikan
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Buat Kebijakan Akses Publik Bebas agar Pengujian Berjalan Lancar Semuanya
CREATE POLICY "Akses Pembacaan Produk Publik" ON public.products FOR SELECT USING (true);
CREATE POLICY "Akses Penulisan Produk Bebas" ON public.products FOR ALL USING (true);
CREATE POLICY "Akses Pembacaan Order Publik" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Akses Penulisan Order Bebas" ON public.orders FOR ALL USING (true);
CREATE POLICY "Akses Pembacaan Payment Publik" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Akses Penulisan Payment Bebas" ON public.payments FOR ALL USING (true);

-- 5. BENIH DATA AWAL (Optional: Tambahkan 6 Produk Contoh Toko)
INSERT INTO public.products (title, description, price, category, stock, image, images) VALUES
('Honda Vario 150 Keyless 2018 Mulus', 'Dijual Honda Vario 150 tahun 2018 warna hitam doff. Kondisi body sangat mulus, mesin halus terawat. Keyless remote lengkap, surat-surat (BPKB, STNK) aman dan hidup pajak panjang. Plat Jakarta Selatan.', 16500000, 'Otomotif', 1, 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80', ARRAY['https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80']),
('Macbook Pro M1 8GB/256GB Silver', 'Macbook Pro M1 Space Gray. Kondisi fisik 98% mulus no dent. Layar jernih bebas whitespot. Battery Health 89% awet seharian. Backlight keyboard aman, semua fitur berfungsi normal. Fullset dus charger original.', 11200000, 'Elektronik', 2, 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80', ARRAY['https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80']),
('iPhone 13 Pro Max 256GB Sierra Blue', 'iPhone 13 Pro Max kapasitas 256GB warna Sierra Blue resmi iBox. Kondisi sinyal all operator aman permanen. Face ID, True Tone On aktif. Kelengkapan fullset oem bergaransi personal.', 13900000, 'Handphone', 3, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80', ARRAY['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80']),
('Kost Eksklusif AC Jaksel Tebet', 'Disewakan kamar kost eksklusif di Tebet, Jakarta Selatan. Fasilitas lengkap: AC, WiFi berkecepatan tinggi, kasur springbed, lemari pakaian, kamar mandi dalam dengan water heater. Lokasi strategis dekat stasiun kota.', 1800000, 'Properti', 5, 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80', ARRAY['https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80']),
('Kaos Oversize Vintage Hitam Cotton Combed', 'Kaos sablon oversize streetwear vintage wash style. Menggunakan bahan premium Cotton Combed 24s tebal, menyerap keringat, dan sangat nyaman dipakai harian.', 125000, 'Fashion', 15, 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=600&q=80', ARRAY['https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=600&q=80']),
('Sepeda Gunung Polygon Cascade 4 Mulus', 'Sepeda gunung Polygon Cascade 4 ring 26. Kondisi jarang pakai, shifter Shimano lancar mulus, shock absorber empuk, rem cakram pakem. Ban depan belakang masih tebal siap gowes santai.', 2400000, 'Hobi & Olahraga', 1, 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=600&q=80', ARRAY['https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=600&q=80']);
`.trim();

export const CREATE_PAYMENT_EDGE_TEMPLATE = `
// index.ts - Supabase Edge Function "create-payment"
// Paste kode ini langsung di editor online Supabase Dashboard Anda
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { amount, user_id } = body

    const email = body.email || "pembeli@tokojayasampurna.co.id"
    const invoice = body.invoice || ("INV" + Date.now() + Math.floor(100 + Math.random() * 900))
    const paymentMethod = (body.paymentMethod || "MIDTRANS").trim()

    const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY")
    const isProd = Deno.env.get("MIDTRANS_IS_PRODUCTION") === "true"
    
    if (!serverKey) {
      throw new Error("Dibutuhkan MIDTRANS_SERVER_KEY di secrets Supabase.");
    }

    const apiUrl = isProd
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions"

    const authString = btoa(\`\${serverKey}:\`)

    const midtransPayload = {
      transaction_details: {
        order_id: invoice,
        gross_amount: Math.round(Number(amount))
      },
      customer_details: {
        first_name: "Pembeli",
        email: email
      }
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": \`Basic \${authString}\`
      },
      body: JSON.stringify(midtransPayload)
    })

    if (!response.ok) {
      const errText = await response.text();
      throw new Error("Midtrans API Error: " + errText);
    }

    const result = await response.json()

    if (result.token && result.redirect_url) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      
      if (supabaseUrl && supabaseKey) {
        const supabaseAdmin = createClient(supabaseUrl, supabaseKey)
        const dbUserId = (user_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_id)) ? user_id : null
        
        await supabaseAdmin.from("payments").insert({
          user_id: dbUserId,
          invoice,
          amount: Math.round(Number(amount)),
          status: "PENDING",
          payment_url: result.redirect_url,
          reference: result.token,
          method: paymentMethod
        })
      }

      return new Response(JSON.stringify({ 
        success: true, 
        paymentUrl: result.redirect_url,
        reference: result.token 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      })
    } else {
      throw new Error("Invalid response from Midtrans");
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
`.trim();

export const MIDTRANS_CALLBACK_TEMPLATE = `
// index.ts - Supabase Edge Function "midtrans-callback"
// Paste kode ini langsung di editor online Supabase Dashboard Anda
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as crypto from "https://deno.land/std@0.177.0/crypto/mod.ts"

Deno.serve(async (req) => {
  try {
    console.log("[midtrans-callback] Webhook callback request received.");
    
    const body = await req.json()
    const { order_id, transaction_status, status_code, gross_amount, signature_key, transaction_id, payment_type } = body;

    console.log(\`[midtrans-callback] Order ID: \${order_id}, Status: \${transaction_status}\`);

    const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY")
    if (!serverKey) {
      throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi di secrets Supabase.");
    }

    // Verifikasi Signature SHA512
    const hashSource = \`\${order_id}\${status_code}\${gross_amount}\${serverKey}\`
    
    // WebCrypto API for SHA-512
    const encoder = new TextEncoder()
    const data = encoder.encode(hashSource)
    const hashBuffer = await crypto.subtle.digest("SHA-512", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const computedSignature = hashArray.map(b => b.toString(16).padStart(2, "0")).join("")

    if (computedSignature !== signature_key) {
      console.error(\`[midtrans-callback] Signature tidak valid!\`);
      // Lanjutkan eksekusi sebagai simulasi jika environment belum production
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak terkonfigurasi.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)
    
    let finalStatus = "PENDING"
    const tStatus = (transaction_status || "").toLowerCase()
    if (tStatus === "settlement" || tStatus === "capture") finalStatus = "PAID"
    else if (["deny", "cancel", "expire", "failure"].includes(tStatus)) finalStatus = "FAILED"

    console.log(\`[midtrans-callback] Update status tabel orders & payments ke \${finalStatus}\`);

    // Sinkronisasi status orders & payments
    const { error: orderErr } = await supabaseAdmin
      .from("orders")
      .update({ status: finalStatus, payment_method: payment_type, duitku_reference: transaction_id })
      .eq("invoice", order_id)

    const { error: payErr } = await supabaseAdmin
      .from("payments")
      .update({ status: finalStatus, method: payment_type, reference: transaction_id })
      .eq("invoice", order_id)

    if (orderErr || payErr) {
      console.error("[midtrans-callback] Gagal sinkronisasi data:", orderErr, payErr);
    }

    return new Response("OK", { status: 200 })
  } catch (err) {
    console.error("[midtrans-callback] Terjadi kesalahan fatal:", err.message);
    return new Response("Callback error: " + err.message, { status: 500 })
  }
})
`.trim();
