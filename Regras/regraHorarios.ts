import { normalizeDateToISO, toLocalISO } from "./regraDatas";
import type { CalendarEvent } from "../calendarApi";

// Horários fixos de trabalho (segunda a sábado)
export const WORK_SLOTS = [
    "08:00",
    "09:00",
    "10:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
];

export const VALID_STATUSES = new Set(["agendado", "reagendado"]);

// Verifica se um dia está totalmente lotado
export function isDayFullyBooked(
    isoDate: string,
    events: CalendarEvent[]
): boolean {
if (!isoDate) return false;

const busyForDay = new Set<string>();

for (const e of events) {
    const normalized = normalizeDateToISO(e.dia_marcado);
    if (!normalized || normalized !== isoDate) continue;

    if (!e.hora_marcada) continue;

    const status = (e.status || "").toLowerCase();
    if (!VALID_STATUSES.has(status)) continue;

    const hhmm = e.hora_marcada.slice(0, 5);
    busyForDay.add(hhmm);
}

let relevantSlots = WORK_SLOTS;

const todayIso = toLocalISO(new Date());
if (isoDate === todayIso) {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const current = `${hh}:${mm}`;
    relevantSlots = WORK_SLOTS.filter((slot) => slot > current);
}

if (relevantSlots.length === 0) return true;

let bookedCount = 0;
for (const slot of relevantSlots) {
    if (busyForDay.has(slot)) bookedCount++;
}

return bookedCount >= relevantSlots.length;
}

// Fallback local
export function getAvailableSlotsForDate(
isoDate: string,
events: CalendarEvent[]
): string[] {
if (!isoDate) return WORK_SLOTS;

const busy = new Set<string>();

for (const e of events) {
    const normalized = normalizeDateToISO(e.dia_marcado);
    if (!normalized || normalized !== isoDate) continue;

    if (!e.hora_marcada) continue;

    const status = (e.status || "").toLowerCase();
    if (!VALID_STATUSES.has(status)) continue;

    const hhmm = e.hora_marcada.slice(0, 5);
    busy.add(hhmm);
}

let freeSlots = WORK_SLOTS.filter((slot) => !busy.has(slot));

const todayIso = toLocalISO(new Date());
if (isoDate === todayIso) {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const current = `${hh}:${mm}`;
    freeSlots = freeSlots.filter((slot) => slot > current);
}

return freeSlots;
}