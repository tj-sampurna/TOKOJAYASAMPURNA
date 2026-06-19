import { createClient } from '@supabase/supabase-js';

const rawUrl = (((import.meta as any).env.VITE_SUPABASE_URL) || 'https://kufswozbhliavxtxgvtv.supabase.co').trim();
const rawKey = (((import.meta as any).env.VITE_SUPABASE_ANON_KEY) || '').trim();

const createRealClient = () => {
  let client = createClient(rawUrl, rawKey);
  const originalFunctionsHandler = client.functions;
  const originalInvoke = originalFunctionsHandler.invoke.bind(originalFunctionsHandler);

  // Wraps functions.invoke for create-payment to bypass standard SSL sandbox errors
  const wrappedFunctions = {
    ...originalFunctionsHandler,
    invoke: async (functionName: string, options?: any) => {
      if (functionName === 'create-payment') {
        const maxRetries = 3;
        console.log("[Supabase][Wrapper] Calling Edge Function 'create-payment' with robust retry fallback loops");

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          const controller = new AbortController();
          const tid = setTimeout(() => controller.abort(), 12000); // 12 seconds abort limits

          try {
            const result = await originalInvoke(functionName, {
              ...options,
              signal: controller.signal
            });
            clearTimeout(tid);

            if (result.error) {
              throw typeof result.error === 'object' && result.error.message ? result.error : new Error(String(result.error));
            }
            return result;
          } catch (realErr: any) {
            clearTimeout(tid);
            console.warn(`[Supabase][Wrapper][Vite-Remote Fail - ${attempt}/${maxRetries}]`, realErr);

            if (attempt === maxRetries) {
              console.warn("[Supabase][Wrapper] Edge Function failed 3 times. Automatically proxying to local Express route /api/create-payment.");
              try {
                const localRes = await fetch('/api/create-payment', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(options?.body || {})
                });
                if (!localRes.ok) {
                  const parseText = await localRes.text().catch(() => '');
                  let finalErr = `HTTP Error ${localRes.status}: ${localRes.statusText}`;
                  try {
                    const parseObj = JSON.parse(parseText);
                    finalErr = parseObj.error || parseObj.message || finalErr;
                  } catch (pe) {}
                  return { data: null, error: new Error(finalErr) };
                }
                const resData = await localRes.json();
                return { data: resData, error: null };
              } catch (proxyErr: any) {
                return { data: null, error: new Error(`Gateway Connection Error: ${realErr.message || realErr}`) };
              }
            }
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }
      return originalInvoke(functionName, options);
    }
  };

  Object.defineProperty(client, 'functions', {
    get() {
      return wrappedFunctions;
    },
    configurable: true,
    enumerable: true
  });

  return client;
};

export const supabase = createRealClient();
