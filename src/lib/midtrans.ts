// src/lib/duitku.ts
// Helper terpusat untuk semua komunikasi dengan Supabase Edge Functions Duitku

import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateInvoiceParams {
  invoice: string;
  amount: number;
  paymentMethod: string;
  productDetails: string;
  customerName: string;
  customerEmail: string;
  userId?: string;
  productId?: string;
  quantity?: number;
  phoneNumber?: string;
  expiryPeriod?: number;
}

export interface CreateInvoiceResult {
  success: boolean;
  invoice?: string;
  reference?: string;
  paymentUrl?: string | null;
  vaNumber?: string | null;
  qrString?: string | null;
  amount?: number;
  expiryTime?: string;
  status?: string;
  error?: string;
}

export interface CheckStatusResult {
  success: boolean;
  source?: 'duitku_api' | 'local_db';
  data?: {
    invoice: string;
    reference: string;
    amount: number;
    fee?: number;
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
    label: string;
    statusCode: string;
    statusMessage: string;
    customerName?: string;
    customerEmail?: string;
    method?: string;
    vaNumber?: string | null;
    qrString?: string | null;
    expiryTime?: string;
    createdAt?: string;
  };
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate nomor invoice unik: INV-{timestamp}-{random4digit}
 */
export function generateInvoiceId(): string {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${ts}-${rand}`;
}

/**
 * Format Rupiah ke string yang mudah dibaca
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Edge Function Callers ────────────────────────────────────────────────────

/**
 * Buat invoice baru via Supabase Edge Function `duitku-create-invoice`.
 * Otomatis fallback ke /api/create-payment jika edge function gagal.
 */
export async function createDuitkuInvoice(
  params: CreateInvoiceParams,
): Promise<CreateInvoiceResult> {
  // Coba Edge Function dulu
  try {
    const { data, error } = await supabase.functions.invoke('duitku-create-invoice', {
      body: params,
    });

    if (!error && data?.success) {
      return data as CreateInvoiceResult;
    }

    // Jika edge function tidak ada / error, log dan lanjut ke fallback
    if (error) {
      console.warn('[duitku] Edge function duitku-create-invoice gagal, mencoba fallback:', error);
    }
  } catch (edgeErr) {
    console.warn('[duitku] Edge function exception:', edgeErr);
  }

  // Fallback: local Express proxy /api/create-payment
  const localRes = await fetch('/api/create-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invoice:        params.invoice,
      amount:         params.amount,
      paymentMethod:  params.paymentMethod,
      productDetails: params.productDetails,
      customerName:   params.customerName,
      customerEmail:  params.customerEmail,
      userId:         params.userId,
      productId:      params.productId,
      quantity:       params.quantity,
      phoneNumber:    params.phoneNumber,
      expiryPeriod:   params.expiryPeriod,
      // compat keys yang ada di modal lama
      user_id:        params.userId,
      email:          params.customerEmail,
      customer_name:  params.customerName,
      product_id:     params.productId,
      productName:    params.productDetails,
    }),
  });

  if (!localRes.ok) {
    const txt = await localRes.text().catch(() => '');
    let msg = `HTTP ${localRes.status}`;
    try {
      const j = JSON.parse(txt);
      msg = j.error || j.message || msg;
    } catch (_) {}
    return { success: false, error: msg };
  }

  const json = await localRes.json();
  return json as CreateInvoiceResult;
}

/**
 * Cek status transaksi via Supabase Edge Function `duitku-check-status`.
 * Fallback ke /api/check-payment jika gagal.
 */
export async function checkDuitkuStatus(invoice: string): Promise<CheckStatusResult> {
  // Coba Edge Function
  try {
    const { data, error } = await supabase.functions.invoke('duitku-check-status', {
      body: { invoice, syncDb: true },
    });

    if (!error && data?.success) {
      return data as CheckStatusResult;
    }
  } catch (_) {}

  // Fallback: local GET endpoint
  try {
    const res = await fetch(
      `/api/check-payment?invoice=${encodeURIComponent(invoice)}`,
    );
    if (res.ok) {
      const json = await res.json();
      // Normalize local response ke format CheckStatusResult
      if (json.success && json.status) {
        return {
          success: true,
          source: 'local_db',
          data: {
            invoice,
            reference:     json.reference || '',
            amount:        json.amount || 0,
            status:        json.status as any,
            label:         json.status,
            statusCode:    json.statusCode || '',
            statusMessage: json.statusMessage || json.status,
          },
        };
      }
    }
  } catch (_) {}

  return { success: false, error: 'Gagal mengambil status pembayaran' };
}

/**
 * Map status Duitku / lokal ke status UI yang digunakan modal
 */
export function normalizePaymentStatus(
  raw: string,
): 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED' {
  const s = raw.toUpperCase();
  if (s === 'SUCCESS' || s === 'PAID') return 'PAID';
  if (s === 'PENDING') return 'PENDING';
  if (s === 'EXPIRED') return 'EXPIRED';
  if (s === 'CANCELLED') return 'CANCELLED';
  return 'FAILED';
}
