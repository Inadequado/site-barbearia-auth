// n8n.ts
const DEFAULT_BASE_URL = "https://webhook.autohost.shop/webhook";

// Vite: se existir VITE_N8N_BASE_URL, ele ganha
const API_BASE_URL =
  (import.meta as any)?.env?.VITE_N8N_BASE_URL?.trim() || DEFAULT_BASE_URL;

export type CallN8NOptions = {
  timeoutMs?: number; // padrão 8000
  signal?: AbortSignal;
  baseUrl?: string; // opcional: override pontual
};

// lê JSON quando possível, senão texto (sem explodir)
async function safeReadBody(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      // cai pro texto
    }
  }
  return await res.text().catch(() => "");
}

// extrai msg útil do body (json/texto) sem quebrar
function extractMessage(body: any) {
  if (!body) return "";
  if (typeof body === "string") return body;
  if (typeof body?.message === "string") return body.message;
  if (typeof body?.error === "string") return body.error;
  if (typeof body?.msg === "string") return body.msg;
  try {
    return JSON.stringify(body);
  } catch {
    return String(body);
  }
}

export async function callN8N<T = any>(
  endpoint: string,
  data: any,
  options: CallN8NOptions = {}
): Promise<T> {
  const baseUrl = String(options.baseUrl || API_BASE_URL).replace(/\/+$/, "");
  const path = String(endpoint || "").replace(/^\/+/, "");
  const url = `${baseUrl}/${path}`;

  const timeoutMs = options.timeoutMs ?? 8000;

  // AbortController com timeout + cancelamento externo
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  const externalSignal = options.signal;
  const abortFromExternal = () => controller.abort();

  try {
    if (externalSignal?.aborted) controller.abort();
    else if (externalSignal) {
      externalSignal.addEventListener("abort", abortFromExternal, { once: true });
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify(data ?? {}),
      signal: controller.signal,
    });

    const body = await safeReadBody(res);

    if (!res.ok) {
      const msg = extractMessage(body);
      throw new Error(
        msg || `Erro ao conectar ao n8n (HTTP ${res.status} ${res.statusText}).`
      );
    }

    return body as T;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error("n8n-timeout");
    }
    throw err;
  } finally {
    window.clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", abortFromExternal);
    }
  }
}
