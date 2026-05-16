// calendarApi.ts

// ================== EVENTOS POR TELEFONE ==================

export interface PhoneEventsResponse {
  clientPhone: string;
  hasEvents: boolean;
  events: any[];
}

const DEFAULT_BASE_URL = "https://webhook.autohost.shop/webhook";
const API_BASE_URL =
  (import.meta as any)?.env?.VITE_N8N_BASE_URL?.trim() || DEFAULT_BASE_URL;

/**
 * Verifica se já existem eventos associados a um número de telefone.
 * `phone` deve ser enviado só com dígitos (ex: "11999990000").
 */
export async function getEventsByPhone(
  phone: string
): Promise<PhoneEventsResponse> {
  const url = new URL(`${API_BASE_URL}/barber/availability-v1`);
  url.searchParams.set("clientPhone", phone);

  const res = await fetch(url.toString(), {
    method: "GET",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if ((import.meta as any).env?.DEV) console.error("[DEBUG] HTTP erro em /events/by-phone:", res.status, text);
    throw new Error("Erro ao buscar eventos pelo telefone no calendário");
  }

  const data = (await res.json()) as PhoneEventsResponse;
  return data;
}

// ================== PROFISSIONAIS ==================

export interface Professional {
  id: number;
  nome: string;
  cor: string | null;
  ativo: boolean;
}

interface ProfessionalsResponse {
  total: number;
  professionals: Professional[];
}

/*Busca todos os profissionais ativos. */

export async function getProfessionals(): Promise<Professional[]> {
  const url = new URL(`${API_BASE_URL}/professionals`);

  const res = await fetch(url.toString(), {
    method: "GET",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if ((import.meta as any).env?.DEV) console.error("[DEBUG] HTTP erro em /professionals:", res.status, text);
    throw new Error("Erro ao buscar profissionais no calendário");
  }

  const data = (await res.json()) as ProfessionalsResponse;

  const list = (data.professionals || []).filter(
    (p) => p.ativo !== false // se não tiver campo, consideramos ativo
  );

  return list;
}

// ================== EVENTOS POR PROFISSIONAL ==================

export interface CalendarEvent {
  id: number;
  telefone: string | null;
  cliente: string | null;
  profissional: string | null;
  servico: string | null;
  dia_marcado: string; // "2025-12-03" ou "2025-12-03T00:00:00.000Z"
  hora_marcada: string; // "09:00:00"
  status: string | null;
  source?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ProfessionalEventsResponse {
  professionalId: number;
  hasEvents: boolean;
  events: CalendarEvent[];
}

/**
 * Busca todos os eventos de um profissional.
 * Depois o front decide o que está livre/ocupado.
 */
export async function getEventsByProfessional(
  professionalId: number | string
): Promise<CalendarEvent[]> {
  const url = new URL(`${API_BASE_URL}/barber/availability-v1`);
  url.searchParams.set("professionalId", String(professionalId));

  if ((import.meta as any).env?.DEV) console.log("[DEBUG] URL getEventsByProfessional:", url.toString());

  const res = await fetch(url.toString(), {
    method: "GET",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(
      "[DEBUG] HTTP erro em /events/by-professional:",
      res.status,
      text
    );
    throw new Error("Erro ao buscar eventos por profissional no calendário");
  }

  const data = (await res.json()) as ProfessionalEventsResponse;

  if ((import.meta as any).env?.DEV) console.log("[DEBUG] getEventsByProfessional resposta:", data);

  return data.events || [];
}

// ================== CRIAÇÃO DE EVENTO (POST) ==================

export interface CreateEventPayload {
  telefone: string;
  cliente: string;
  profissional: string;
  servico: string;
  dia_marcado: string; // "2025-12-20"
  hora_marcada: string; // "15:00"
  status?: string; // ex: "agendado"
  source?: string; // ex: "app-etapas"
}

// depende de como você montou a resposta no n8n;
// deixamos flexível e tipamos o básico
export interface CreateEventResponse {
  id?: number;
  message?: string;
  event?: CalendarEvent;
  [key: string]: any;
}

/**
 * ✅ Cria um novo agendamento chamando o N8N no caminho "book".
 * Isso bate no Webhook /barber/availability-v1 (POST) com step: "book",
 * para o Switch rotear para o branch de Agendamento Padrão.
 */
export async function createCalendarEvent(
  payload: CreateEventPayload
): Promise<CreateEventResponse> {
  const url = new URL(`${API_BASE_URL}/barber/availability-v1`);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      step: "book",
      ...payload,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if ((import.meta as any).env?.DEV) console.error("[DEBUG] HTTP erro em POST /barber/availability-v1 (book):", res.status, text);
    throw new Error(text || "Erro ao criar evento via n8n (book).");
  }

  const data = (await res.json()) as CreateEventResponse;
  return data;
}
