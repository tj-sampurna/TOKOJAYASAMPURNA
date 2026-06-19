import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env
dotenv.config();

// Initialize backend Supabase client if keys are present (for DB direct synchronization)
const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://kufswozbhliavxtxgvtv.supabase.co").trim();

const hasServiceKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.length > 20);
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();
const isSupabaseConfigured = !!(supabaseUrl && supabaseKey && typeof supabaseKey === "string" && !supabaseKey.includes("placeholder") && supabaseKey.length > 20);

const supabaseAdmin = isSupabaseConfigured ? createClient(supabaseUrl, supabaseKey) : null;
const supabase = supabaseAdmin;

if (isSupabaseConfigured) {
  if (hasServiceKey) {
    console.log(`[Server] Supabase DB Admin Mode is ACTIVE using SUPABASE_SERVICE_ROLE_KEY. RLS bypass enabled, synchronization with tables is fully active.`);
  } else {
    console.warn(`[Server] WARNING: Server is using VITE_SUPABASE_ANON_KEY to interact with Supabase because SUPABASE_SERVICE_ROLE_KEY is missing in environment variables (.env). This will fail on database write/update operations (like storing orders/payments or processing webhook callbacks) due to Row-Level Security (RLS) policies. Please provide SUPABASE_SERVICE_ROLE_KEY in .env for server-side operations.`);
  }
} else {
  console.log(`[Server] Supabase Admin credentials placeholder or missing. Falling back to local internal memory state and client-side simulation storage.`);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Basic Security Header Protection (Manual Lightweight Helmet Alternative)
  app.use((req, res, next) => {
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
    next();
  });

  // 2. Custom CORS Access Control
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey");
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // 3. Custom In-Memory Rate Limiter (Safety guarding against API Spam)
  const ipLimits = new Map<string, { count: number; resetTime: number }>();
  const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
  const MAX_REQUESTS_PER_WINDOW = 120; // 120 max requests per window
  
  app.use((req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || "anonymous";
    const now = Date.now();
    const limit = ipLimits.get(ip);
    
    if (!limit || now > limit.resetTime) {
      ipLimits.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
      return next();
    }
    
    limit.count++;
    if (limit.count > MAX_REQUESTS_PER_WINDOW) {
      console.warn(`[RateLimit][Blocked] IP: ${ip} exceeded limits.`);
      return res.status(429).json({ 
        success: false, 
        error: "Terlalu banyak permintaan (Rate limit exceeded). Mohon tunggu 1 menit sebelum mencoba kembali." 
      });
    }
    next();
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // In-Memory Synchronous State Store to avoid any frontend/backend race conditions or loading stucks
  const activeInMemoryPayments = new Map<string, {
    invoice: string;
    amount: number;
    paymentMethod: string;
    productName: string;
    paymentUrl: string;
    qrString: string | null;
    reference: string | null;
    status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
    updatedAt: string;
  }>();

  // Helper to save pending order and payment session to Supabase
  async function savePaymentAndOrder(dbData: {
    user_id: any;
    product_id: any;
    invoice: string;
    amount: number;
    payment_method: string;
    payment_url: string;
    reference: string | null;
    va_number: string | null;
    qr_string: string | null;
    raw_response: any;
    customer_name: string;
    customer_email: string;
  }) {
    try {
      if (!supabase) {
        console.warn("[Supabase][savePaymentAndOrder] Supabase is not configured (missing keys or placeholder). Skipping database record insertion.");
        return;
      }
      console.log(`[Supabase][savePaymentAndOrder] Inserting invoice: ${dbData.invoice}`);
      
      const isUUID = (str: any) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      const validUserId = isUUID(dbData.user_id) ? dbData.user_id : null;
      const validProductId = typeof dbData.product_id === 'string' && dbData.product_id.length > 5 ? dbData.product_id : null;
      const amountParsed = Math.round(Number(dbData.amount || 0));

      // 1. Prepare base order payload
      const orderPayload: any = {
        invoice: dbData.invoice,
        amount: amountParsed
      };
      if (dbData.payment_method) orderPayload.payment_method = dbData.payment_method;
      if (validUserId) orderPayload.user_id = validUserId;
      if (validProductId) orderPayload.product_id = validProductId;

      // Insert into orders table
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert([orderPayload])
        .select()
        .single();

      let orderId = null;
      if (orderError) {
        console.error("[Supabase][orders] Error inserting order database record:", JSON.stringify(orderError));
        // If order insertion fails due to foreign key constraints, try inserting without product/user keys
        console.log("[Supabase][orders] Attempting fallback order insertion without user_id and product_id...");
        delete orderPayload.user_id;
        delete orderPayload.product_id;
        
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("orders")
          .insert([orderPayload])
          .select()
          .single();
        if (!fallbackError) {
           orderId = fallbackData?.id;
           console.log("[Supabase][orders] Successfully inserted fallback order without relational keys.");
        } else {
           console.error("[Supabase][orders] Fallback order insertion also failed:", JSON.stringify(fallbackError));
        }
      } else {
        console.log("[Supabase][orders] Successfully inserted pending order record.");
        orderId = orderData?.id;
      }

      // 2. Insert into payments table
      const expiryTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      if (orderId) { // Only proceed to payment if order was successfully inserted
        const paymentPayload: any = {
            order_id: orderId,
            invoice: dbData.invoice,
            amount: amountParsed,
            payment_method: dbData.payment_method || 'midtrans_snap',
            expiry_time: expiryTime
        };
        if (dbData.payment_url) paymentPayload.payment_url = dbData.payment_url;
        if (dbData.reference) paymentPayload.reference = dbData.reference;
        if (dbData.qr_string) paymentPayload.qr_string = dbData.qr_string;

        const { error: paymentError } = await supabase
          .from("payments")
          .insert([paymentPayload]);

        if (paymentError) {
          console.error("[Supabase][payments] Error inserting payment database record:", JSON.stringify(paymentError));
        } else {
          console.log("[Supabase][payments] Successfully inserted pending payment record.");
        }

        // --- STOCK DECREMENT LOGIC ---
        if (validProductId) {
          try {
            const { data: currentProduct, error: fetchProdErr } = await supabase
              .from("products")
              .select("stock")
              .eq("id", validProductId)
              .single();
              
            if (!fetchProdErr && currentProduct) {
              const requestedQuantity = 1;
              const newStock = Math.max(0, currentProduct.stock - requestedQuantity);
              await supabase
                .from("products")
                .update({ stock: newStock })
                .eq("id", validProductId);
              console.log(`[Supabase][products] Decremented stock for product ${validProductId} by ${requestedQuantity} to ${newStock} (Order Created)`);
            }
          } catch (e) {
            console.error("[Supabase][products] Failed to decrement product stock:", e);
          }
        }
        // ------------------------------

      } else {
        console.error("[Supabase][payments] Skipping payment record insertion because order insertion completely failed.");
      }
    } catch (err) {
      console.error("[Supabase][savePaymentAndOrder] Critical insert error:", err);
    }
  }

  // Helper fetch with Timeout & Auto Retry
  async function fetchWithRetryAndTimeout(url: string, options: any, retries = 3, timeoutMs = 30000): Promise<Response> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        console.log(`[GatewayFetch] Attempt ${attempt}/${retries} to url: ${url}`);
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        clearTimeout(id);
        return response;
      } catch (err: any) {
        clearTimeout(id);
        const isTimeout = err.name === 'AbortError';
        console.warn(`[GatewayFetch][Failed - Attempt ${attempt}/${retries}] Error:`, isTimeout ? "Request Timeout (30s)" : err.message);
        
        if (attempt === retries) {
          throw new Error(isTimeout ? `Koneksi ke Duitku Gateway Timeout setelah ${timeoutMs}ms.` : err.message);
        }
        // Small backup block delay before retry
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    throw new Error("Gagal menghubungi gateway.");
  }

  // API Check Status Endpoint (Frontend polls this every 5 seconds)
  app.get("/api/check-payment", async (req, res) => {
    try {
      const invoiceId = (req.query.invoice as string || "").trim();
      if (!invoiceId) {
        return res.status(400).json({ success: false, error: "Parameter 'invoice' wajib disediakan." });
      }

      console.log(`[Server][check-payment] Polling check for invoice: ${invoiceId}`);

      // First check local in-memory store
      let paymentInfo = activeInMemoryPayments.get(invoiceId);

      // Second check: query Supabase if active
      if (supabaseAdmin) {
        const { data, error } = await supabaseAdmin
          .from("orders")
          .select("*")
          .eq("invoice", invoiceId)
          .maybeSingle();

        if (!error && data) {
          console.log(`[Server][check-payment] Found status in Supabase DB: ${data.status} for ${invoiceId}`);
          const currentStatus = (data.status || 'PENDING').toUpperCase() as any;
          
          if (!paymentInfo) {
            // Reconstruct matching memory info
            paymentInfo = {
              invoice: invoiceId,
              amount: data.amount,
              paymentMethod: data.payment_method || "MIDTRANS",
              productName: `Product ID: ${data.product_id}`,
              paymentUrl: data.payment_url || "",
              qrString: null,
              reference: data.duitku_reference || null,
              status: currentStatus,
              updatedAt: data.updated_at || new Date().toISOString()
            };
            activeInMemoryPayments.set(invoiceId, paymentInfo);
          } else if (paymentInfo.status !== currentStatus) {
            paymentInfo.status = currentStatus;
            paymentInfo.updatedAt = new Date().toISOString();
          }
        }
      }

      // Check direct Midtrans status in case webhooks are delayed
      const midtransServerKey = (process.env.MIDTRANS_SERVER_KEY || "").trim();
      const midtransIsProd = (process.env.VITE_MIDTRANS_IS_PRODUCTION === "true" || process.env.MIDTRANS_IS_PRODUCTION === "true" || process.env.MIDTRANS_ENV === "production");
      const isMidtransConfigured = midtransServerKey && !midtransServerKey.includes("placeholder") && midtransServerKey.length > 5;

      if (isMidtransConfigured && paymentInfo && paymentInfo.status === "PENDING") {
        try {
          console.log(`[Server][check-payment] Midtrans configured. Querying direct transaction status for orderId: ${invoiceId}`);
          const statusUrl = midtransIsProd
            ? `https://api.midtrans.com/v2/${invoiceId}/status`
            : `https://api.sandbox.midtrans.com/v2/${invoiceId}/status`;

          const authString = Buffer.from(`${midtransServerKey}:`).toString("base64");
          
          const response = await fetch(statusUrl, {
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json",
              "Authorization": `Basic ${authString}`
            }
          });

          if (response.ok) {
            const mStatus = await response.json();
            console.log(`[Server][check-payment] Direct Midtrans response status:`, mStatus.transaction_status);

            const tStatus = (mStatus.transaction_status || "").toLowerCase();
            let resolvedStatus = "PENDING";
            if (tStatus === "settlement" || tStatus === "capture") {
              resolvedStatus = "SUCCESS";
            } else if (tStatus === "pending") {
              resolvedStatus = "PENDING";
            } else if (["deny", "cancel", "expire", "failure"].includes(tStatus)) {
              resolvedStatus = "FAILED";
            }

            const finalStatus: 'PAID' | 'PENDING' | 'FAILED' = 
              resolvedStatus === "SUCCESS" ? "PAID" : 
              resolvedStatus === "PENDING" ? "PENDING" : "FAILED";

            if (paymentInfo.status !== finalStatus) {
              paymentInfo.status = finalStatus;
              paymentInfo.updatedAt = new Date().toISOString();
              activeInMemoryPayments.set(invoiceId, paymentInfo);

              // Update database status immediately
              if (supabase) {
                // --- STOCK RESTORATION LOGIC ---
                if (finalStatus === "FAILED" && paymentInfo.status !== "FAILED") {
                  try {
                    const { data: currentOrder, error: checkErr } = await supabase
                      .from("orders")
                      .select("status, product_id")
                      .eq("invoice", invoiceId)
                      .maybeSingle();

                    if (!checkErr && currentOrder && currentOrder.status !== "FAILED" && currentOrder.product_id) {
                      const { data: currentProduct } = await supabase
                        .from("products")
                        .select("stock")
                        .eq("id", currentOrder.product_id)
                        .maybeSingle();

                      if (currentProduct) {
                        const quantityToRestore = 1;
                        await supabase
                          .from("products")
                          .update({ stock: currentProduct.stock + quantityToRestore })
                          .eq("id", currentOrder.product_id);
                        console.log(`[Server][check-payment] Restored stock for product ${currentOrder.product_id} by ${quantityToRestore} due to FAILED payment.`);
                      }
                    }
                  } catch (e) {
                    console.error("[Server][check-payment] Stock restoration error:", e);
                  }
                }
                // --------------------------------

                await supabase.from("orders").update({ status: finalStatus, payment_method: mStatus.payment_type || mStatus.payment_method }).eq("invoice", invoiceId);
                await supabase.from("payments").update({ status: finalStatus, method: mStatus.payment_type || mStatus.payment_method }).eq("invoice", invoiceId);
              }
            }
          }
        } catch (apiErr: any) {
          console.warn("[Server][check-payment] Direct check status threw error:", apiErr.message);
        }
      }

      if (!paymentInfo) {
        return res.json({
          success: true,
          invoice: invoiceId,
          status: "PENDING",
          message: "Invoice terdaftar di sistem client, menunggu sinkronisasi callback Midtrans."
        });
      }

      return res.json({
        success: true,
        invoice: paymentInfo.invoice,
        paymentUrl: paymentInfo.paymentUrl,
        qrString: paymentInfo.qrString,
        reference: paymentInfo.reference,
        status: paymentInfo.status,
        updatedAt: paymentInfo.updatedAt
      });
    } catch (err: any) {
      console.error("[Server][check-payment] Exception:", err);
      return res.status(500).json({ success: false, error: err.message || "Internal Server Error" });
    }
  });

  // GET Endpoint for Simulated Callback Gateway (Sandbox Simulation Interaktif)
  app.get("/api/simulation-payment", (req, res) => {
    const invoiceId = (req.query.invoice as string || "").trim();
    const payAmt = Number(req.query.amount) || 0;
    res.send(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Midtrans Demo Sandbox Simulator</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-slate-900 text-white min-h-screen flex items-center justify-center font-sans p-4">
        <div class="bg-slate-800 border-2 border-amber-500 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-amber-500/15 text-amber-500 rounded-full mb-6 border-2 border-amber-500/20 animate-pulse">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <h1 class="text-2xl font-black text-amber-400 mb-2">Simulasi Gerbang Pembayaran</h1>
          <p class="text-slate-400 text-xs mb-6 px-3">Metode sandbox simulasi berjalan karena Anda belum mengkonfigurasi kunci rahasia <b>MIDTRANS_SERVER_KEY</b> di Secrets / .env Anda.</p>
          
          <div class="bg-slate-750 border border-slate-700 rounded-2xl p-4 mb-6 text-left space-y-3 font-mono text-xs text-slate-300">
            <div class="flex justify-between border-b border-slate-700 pb-2">
              <span>Nomor Invoice:</span>
              <span class="text-white font-bold">${invoiceId}</span>
            </div>
            <div class="flex justify-between pb-2 border-b border-slate-700">
              <span>Mata Uang:</span>
              <span class="text-indigo-300 font-bold">IDR (Rupiah)</span>
            </div>
            <div class="flex justify-between">
              <span>Jumlah Tagihan:</span>
              <span class="text-rose-400 font-extrabold text-sm">Rp ${Number(payAmt).toLocaleString('id-ID')}</span>
            </div>
          </div>
          
          <div class="space-y-3">
            <button onclick="payNow()" id="payBtn" class="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all text-slate-950 font-black py-3.5 px-6 rounded-xl uppercase tracking-wider text-xs cursor-pointer">
              Selesaikan Pembayaran (LUNAS)
            </button>
            <button onclick="failNow()" id="failBtn" class="w-full bg-red-500/10 text-red-400 hover:bg-red-500/20 font-bold py-3 px-6 rounded-xl uppercase tracking-wider text-xs cursor-pointer">
              Batalkan / Set Gagal
            </button>
          </div>
          
          <p class="text-[10px] text-slate-500 mt-6 leading-relaxed">Menutup halaman ini akan kembali secara aman ke aplikasi. Transaksi Anda terekam instan dalam basis data offline dan cloud Supabase.</p>
          
          <script>
            async function payNow() {
              const btn = document.getElementById('payBtn');
              btn.disabled = true;
              btn.innerText = 'MEMPROSES CALLBACK SINKRONISASI...';
              try {
                const res = await fetch('/api/midtrans-callback', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    order_id: "${invoiceId}",
                    status_code: "200",
                    transaction_status: "settlement",
                    gross_amount: "${payAmt}",
                    payment_type: "sim_qris"
                  })
                });
                if (res.ok) {
                  alert('Sinkronisasi callback sukses! Sesi pembayaran Lunas.');
                  window.close();
                } else {
                  alert('Gagal mengirim callback ke server.');
                }
              } catch(e) {
                alert('Error: ' + e.message);
              } finally {
                btn.disabled = false;
                btn.innerText = 'Selesaikan Pembayaran (LUNAS)';
              }
            }
            
            async function failNow() {
              const btn = document.getElementById('failBtn');
              btn.disabled = true;
              try {
                const res = await fetch('/api/midtrans-callback', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    order_id: "${invoiceId}",
                    status_code: "407",
                    transaction_status: "deny",
                    gross_amount: "${payAmt}",
                    payment_type: "sim_qris"
                  })
                });
                if (res.ok) {
                  alert('Sukses membatalkan transaksi.');
                  window.close();
                } else {
                  alert('Gagal membatalkan.');
                }
              } catch(e) {
                alert('Error: ' + e.message);
              } finally {
                btn.disabled = false;
              }
            }
          </script>
        </div>
      </body>
      </html>
    `);
  });

  // API Route for create-payment (Proxies directly to Midtrans Snap with 100% stable fallbacks)
  app.post("/api/create-payment", async (req, res) => {
    try {
      console.log("[Server][create-payment] Received request body:", req.body);
      const { amount, user_id, email, invoice, paymentMethod, customer_name, productId, product_id, productName, quantity } = req.body;
      const targetProductId = product_id || productId;
      const requestedQuantity = Number(quantity) || 1;

      // 1. INPUTS STRICT VALIDATIONS (Prevent payment injection vulnerabilities)
      if (amount === undefined || amount === null || isNaN(Number(amount))) {
        return res.status(400).json({ success: false, error: "Jumlah pembayaran 'amount' wajib berupa angka/number." });
      }
      if (!paymentMethod || typeof paymentMethod !== 'string') {
        return res.status(400).json({ success: false, error: "Metode pembayaran 'paymentMethod' wajib diisi (string)." });
      }
      if (!invoice || typeof invoice !== 'string') {
        return res.status(400).json({ success: false, error: "Invoice ID 'invoice' wajib disediakan (string)." });
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const validEmail = (email && typeof email === 'string' && emailRegex.test(email)) 
        ? email.trim() 
        : "pembeli@tokojayampsurna.co.id";

      const paymentAmount = Math.round(Number(amount));
      const orderId = invoice.trim();
      const details = productName || `TJS Used Goods - Invoice ${orderId}`;
      const buyerName = customer_name ? String(customer_name).trim() : "Pembeli Toko Jaya Sampurna";

      // Ensure no duplicate invoice is recreated in same payment window
      const existingActive = activeInMemoryPayments.get(orderId);
      if (existingActive && existingActive.status === 'PAID') {
        return res.status(400).json({ 
          success: false, 
          error: "Transaksi untuk Invoice ini sudah selesai dibayarkan (LUNAS)." 
        });
      }

      // Check if order invoice already registered in Supabase DB to prevent race conditional duplicate records
      if (supabaseAdmin) {
        const { data: dbOrder } = await supabaseAdmin
          .from("orders")
          .select("status")
          .eq("invoice", orderId)
          .maybeSingle();

        if (dbOrder && dbOrder.status === 'PAID') {
          return res.status(400).json({
            success: false,
            error: "Transaksi untuk Invoice ini terdeteksi LUNAS (PAID) di database."
          });
        }
      }

      // 2. Read Midtrans keys & env toggles
      const midtransServerKey = (process.env.MIDTRANS_SERVER_KEY || "").trim();
      const midtransIsProd = (process.env.VITE_MIDTRANS_IS_PRODUCTION === "true" || process.env.MIDTRANS_IS_PRODUCTION === "true" || process.env.MIDTRANS_ENV === "production");
      const isMidtransConfigured = midtransServerKey && !midtransServerKey.includes("placeholder") && midtransServerKey.length > 5;

      // Sandbox simulator fallback routing if keys are missing
      if (!isMidtransConfigured) {
        console.log(`[Server][create-payment] Midtrans server key missing or placeholder. Serving local simulation fallback...`);
        const simulatedUrl = `${req.protocol}://${req.get("host")}/api/simulation-payment?invoice=${orderId}&amount=${paymentAmount}`;
        
        const stateData = {
          invoice: orderId,
          amount: paymentAmount,
          paymentMethod: paymentMethod,
          productName: details,
          paymentUrl: simulatedUrl,
          qrString: null,
          reference: `SIM-TOKEN-${Date.now()}`,
          status: "PENDING" as const,
          updatedAt: new Date().toISOString()
        };

        activeInMemoryPayments.set(orderId, stateData);

        // Save pending records to Supabase
        await savePaymentAndOrder({
          user_id,
          product_id: targetProductId || null,
          invoice: orderId,
          amount: paymentAmount,
          payment_method: paymentMethod,
          payment_url: simulatedUrl,
          reference: stateData.reference,
          va_number: null,
          qr_string: null,
          raw_response: { info: "Simulated Midtrans Sandbox Session", token: stateData.reference },
          customer_name: buyerName,
          customer_email: validEmail
        });

        return res.json({
          success: true,
          invoice: orderId,
          paymentUrl: simulatedUrl,
          qrString: null,
          reference: stateData.reference,
          status: "PENDING",
          info: "Fallback Simulator Mode (Offline Keys)"
        });
      }

      // Real Midtrans integration API
      const snapUrl = midtransIsProd
        ? "https://app.midtrans.com/snap/v1/transactions"
        : "https://app.sandbox.midtrans.com/snap/v1/transactions";

      console.log(`[Server][create-payment] Conforming payment requests via Midtrans under: ${midtransIsProd ? "Production" : "Sandbox"}`);

      const authString = Buffer.from(`${midtransServerKey}:`).toString("base64");

      const midtransBody = {
        transaction_details: {
          order_id: orderId,
          gross_amount: paymentAmount
        },
        credit_card: {
          secure: true
        },
        customer_details: {
          first_name: buyerName.split(" ")[0] || "Pembeli",
          last_name: buyerName.split(" ").slice(1).join(" ") || "TJS",
          email: validEmail
        }
      };

      try {
        const response = await fetchWithRetryAndTimeout(snapUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Basic ${authString}`
          },
          body: JSON.stringify(midtransBody)
        }, 1, 30000);

        const responseText = await response.text();

        if (!response.ok) {
          console.error(`[Server][create-payment] Midtrans error response statusCode ${response.status}: ${responseText}`);
          throw new Error(`Midtrans API HTTP status ${response.status}: ${responseText}`);
        }

        const midtransResult = JSON.parse(responseText);
        console.log("[Server][create-payment] Midtrans Snap API Response Success:", midtransResult);

        if (midtransResult.token && midtransResult.redirect_url) {
          const stateData = {
            invoice: orderId,
            amount: paymentAmount,
            paymentMethod: paymentMethod,
            productName: details,
            paymentUrl: midtransResult.redirect_url,
            qrString: null,
            reference: midtransResult.token,
            status: "PENDING" as const,
            updatedAt: new Date().toISOString()
          };

          activeInMemoryPayments.set(orderId, stateData);

          // Synchronize database records
          await savePaymentAndOrder({
            user_id,
            product_id: targetProductId || null,
            invoice: orderId,
            amount: paymentAmount,
            payment_method: paymentMethod,
            payment_url: midtransResult.redirect_url,
            reference: midtransResult.token,
            va_number: null,
            qr_string: null,
            raw_response: midtransResult,
            customer_name: buyerName,
            customer_email: validEmail
          });

          return res.json({
            success: true,
            invoice: orderId,
            paymentUrl: midtransResult.redirect_url,
            qrString: null,
            reference: midtransResult.token,
            status: "PENDING"
          });
        } else {
          throw new Error("Midtrans Snap API did not return token or redirect_url properly.");
        }
      } catch (apiErr: any) {
        console.error("[Server][create-payment] Real Midtrans call exception:", apiErr.message);
        return res.status(400).json({
          success: false,
          error: `Midtrans Gateway Error: ${apiErr.message}`
        });
      }

    } catch (err: any) {
      console.error("[Server][create-payment][Fatal Exception]:", err);
      return res.status(500).json({ 
        success: false, 
        error: err.message || "Terdapat gangguan tidak terdokumentasi pada server pelunas." 
      });
    }
  });

  // Webhook Callback handler function for Midtrans
  async function handleMidtransWebhook(req: any, res: any) {
    try {
      console.log("[Webhook][Callback] Received headers:", req.headers);
      console.log("[Webhook][Callback] Received body payload:", req.body);

      const { order_id, transaction_status, status_code, gross_amount, signature_key } = req.body;

      if (!order_id) {
        console.warn("[Webhook][Callback] Rejected: missing order_id.");
        return res.status(400).send("Bad Request: missing order_id");
      }

      const midtransServerKey = (process.env.MIDTRANS_SERVER_KEY || "").trim();
      const hasRealKey = midtransServerKey && !midtransServerKey.includes("placeholder") && midtransServerKey.length > 5;

      // Verify signatures for genuine incoming webhooks
      if (hasRealKey && signature_key) {
        const hashSource = `${order_id}${status_code}${gross_amount}${midtransServerKey}`;
        const computedSignature = crypto.createHash("sha512").update(hashSource).digest("hex");

        if (signature_key !== computedSignature) {
          console.error(`[Webhook][Callback] Validation Signature Mismatch! Remote: ${signature_key}, Computed: ${computedSignature}`);
          return res.status(401).send("Unauthorized Webhook signature verification mismatch.");
        }
        console.log("[Webhook][Callback] Midtrans signature verified successfully.");
      } else {
        console.log("[Webhook][Callback] Signature check bypassed. Sandbox / Simulator mode active.");
      }

      // Determine statuses
      let resolvedStatus = "PENDING";
      const tStatus = (transaction_status || "").toLowerCase();
      
      if (tStatus === "settlement" || tStatus === "capture") {
        resolvedStatus = "SUCCESS";
      } else if (tStatus === "pending") {
        resolvedStatus = "PENDING";
      } else if (["deny", "cancel", "expire", "failure"].includes(tStatus)) {
        resolvedStatus = "FAILED";
      }

      const finalStatus: 'PAID' | 'PENDING' | 'FAILED' = 
        resolvedStatus === "SUCCESS" ? "PAID" : 
        resolvedStatus === "PENDING" ? "PENDING" : "FAILED";

      console.log(`[Webhook][Callback] Midtrans code ${order_id} resolved to => ${resolvedStatus}`);

      // 1. Update in-memory state
      const existingMemory = activeInMemoryPayments.get(order_id);
      if (existingMemory) {
        existingMemory.status = finalStatus;
        existingMemory.updatedAt = new Date().toISOString();
        activeInMemoryPayments.set(order_id, existingMemory);
      } else {
        activeInMemoryPayments.set(order_id, {
          invoice: order_id,
          amount: Number(gross_amount) || 0,
          paymentMethod: req.body.payment_type || "MIDTRANS",
          productName: `Sync from Webhook`,
          paymentUrl: "",
          qrString: null,
          reference: req.body.transaction_id || null,
          status: finalStatus,
          updatedAt: new Date().toISOString()
        });
      }

      // 2. Direct DB synchronization on both tables
      console.log(`[Webhook][Callback] Direct DB Sync: Updating Supabase database tables...`);

      if (supabase) {
        // --- STOCK RESTORATION LOGIC ---
        try {
           if (finalStatus === "FAILED") {
             // Fetch existing order to see if it's already failed and to get product_id
             const { data: currentOrder, error: checkErr } = await supabase
               .from("orders")
               .select("status, product_id")
               .eq("invoice", order_id)
               .maybeSingle();

             if (!checkErr && currentOrder && currentOrder.status !== "FAILED" && currentOrder.product_id) {
               // Proceed to increment stock back
               const { data: currentProduct } = await supabase
                 .from("products")
                 .select("stock")
                 .eq("id", currentOrder.product_id)
                 .maybeSingle();

               if (currentProduct) {
                 const quantityToRestore = 1;
                 await supabase
                   .from("products")
                   .update({ stock: currentProduct.stock + quantityToRestore })
                   .eq("id", currentOrder.product_id);
                 console.log(`[Webhook][Callback] Restored stock for product ${currentOrder.product_id} by ${quantityToRestore} due to FAILED payment.`);
               }
             }
           }
        } catch(e) {
             console.error("[Webhook] Stock restoration error:", e);
        }
        // --------------------------------

        // Update orders table
        const { error: orderPatchErr } = await supabase
          .from("orders")
          .update({
            status: finalStatus,
            payment_method: req.body.payment_type || req.body.payment_method || null
          })
          .eq("invoice", order_id);

        if (orderPatchErr) {
          console.error(`[Webhook][Callback] Failed updating orders table:`, orderPatchErr);
        } else {
          console.log(`[Webhook][Callback] Supabase database order ${order_id} status successfully synchronized to ${finalStatus}.`);
        }

        // Update payments table
        const { error: paymentPatchErr } = await supabase
          .from("payments")
          .update({
            status: finalStatus,
            payment_method: req.body.payment_type || req.body.payment_method || null,
            reference: req.body.transaction_id || null
          })
          .eq("invoice", order_id);

        if (paymentPatchErr) {
          console.error(`[Webhook][Callback] Failed updating payments table:`, paymentPatchErr);
        } else {
          console.log(`[Webhook][Callback] Supabase database payment ${order_id} status successfully synchronized to ${finalStatus}.`);
        }
      } else {
        console.warn(`[Webhook][Callback] Supabase is not configured. Skipping database status sync.`);
      }

      // 3. Transactions Audit Log sync
      if (supabaseAdmin) {
        try {
          const { data: existingOrder } = await supabaseAdmin
            .from("orders")
            .select("id")
            .eq("invoice", order_id)
            .maybeSingle();

          if (existingOrder) {
            await supabaseAdmin
              .from("transactions")
              .insert({
                order_id: existingOrder.id,
                invoice: order_id,
                payer_email: req.body.email || "callback@pembeli.id",
                payment_method: req.body.payment_type || req.body.payment_method || "MIDTRANS",
                amount: Number(gross_amount) || 0,
                reference_id: req.body.transaction_id || null,
                status: resolvedStatus,
                raw_gateway_payload: req.body
              });
          }
        } catch (audErr) {
          console.warn("[Webhook][Callback] Optional transactions log skipped:", audErr);
        }
      }

      return res.status(200).send("OK");
    } catch (err: any) {
      console.error("[Webhook][Callback] Webhook exception execution fault:", err);
      return res.status(500).send("Exception Webhook processing failed: " + err.message);
    }
  }

  // Endpoints pointing to webhook
  app.post("/api/payment-callback", handleMidtransWebhook);
  app.post("/api/midtrans-callback", handleMidtransWebhook);
  app.post("/api/midtrans-callback", handleMidtransWebhook);

  // Vite development middleware vs Static Production files
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use((err: any, req: any, res: any, next: any) => {
    console.error("[Server][Global Error Handler] Caught:", err);
    res.status(500).json({ success: false, error: "Internal Server crash secured." });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
