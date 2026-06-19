// src/utils/supabaseError.ts
// Konversi berbagai tipe error dari Supabase / fetch ke string yang bisa ditampilkan user

/**
 * Ekstrak pesan error yang mudah dibaca dari berbagai sumber:
 * - Supabase FunctionsHttpError
 * - Error JS biasa
 * - String
 * - Object apapun
 */
export async function getErrorMessage(error: unknown): Promise<string> {
  if (!error) return 'Terjadi kesalahan tidak diketahui.';

  // Supabase FunctionsHttpError — punya method .context.json()
  if (
    typeof error === 'object' &&
    error !== null &&
    'context' in error
  ) {
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        return body?.message || body?.error || JSON.stringify(body);
      }
    } catch (_) {}
  }

  // Error JS standar
  if (error instanceof Error) {
    return error.message;
  }

  // String langsung
  if (typeof error === 'string') {
    return error;
  }

  // Object dengan field message / error
  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>;
    if (typeof e.message === 'string') return e.message;
    if (typeof e.error === 'string') return e.error;
    try {
      return JSON.stringify(error);
    } catch (_) {}
  }

  return 'Terjadi kesalahan tidak diketahui.';
}

/**
 * Helper cepat (sync) untuk kasus non-async
 */
export function getErrorMessageSync(error: unknown): string {
  if (!error) return 'Terjadi kesalahan tidak diketahui.';
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>;
    if (typeof e.message === 'string') return e.message;
    if (typeof e.error === 'string') return e.error;
  }
  return 'Terjadi kesalahan tidak diketahui.';
}
