import { useState, useEffect } from "react";
import { getEventsByProfessional, CalendarEvent } from "../calendarApi";
import { callN8N } from "../n8n";
import { toLocalISO } from "../Regras/regraDatas";
import {
  isDayFullyBooked,
  getAvailableSlotsForDate,
} from "../Regras/regraHorarios";
import { extractAvailableSlots } from "../Regras/regraDisponibilidade";

interface UseCalendarOptions {
  professionalId: string | null;
  setStep: (n: number) => void;
}

export function useCalendar({ professionalId, setStep }: UseCalendarOptions) {
  const [proEvents, setProEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedTimeSelectedAt, setSelectedTimeSelectedAt] = useState<number | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [disableDays, setDisableDays] = useState<string[]>([]);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  const todayIso = toLocalISO(new Date());
  const minMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() - 2,
    1,
  );

  const monthTitle = new Date(viewYear, viewMonth).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  useEffect(() => {
    if (!professionalId) {
      setProEvents([]);
      setSelectedDate("");
      setSelectedTime("");
      setSelectedTimeSelectedAt(null);
      setAvailableSlots([]);
      setAvailabilityMessage(null);
      setDisableDays([]);
      return;
    }

    (async () => {
      try {
        const events = await getEventsByProfessional(professionalId);
        setProEvents(events);
      } catch {
        setProEvents([]);
      }
    })();
  }, [professionalId]);

  function getDays() {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const arr: { date: string; isCurrentMonth: boolean; disabled: boolean }[] =
      [];

    for (let i = 0; i < startWeekday; i++) {
      arr.push({ date: "", isCurrentMonth: false, disabled: true });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const current = new Date(viewYear, viewMonth, d);
      const iso = toLocalISO(current);

      let disabled = false;
      if (current.getDay() === 0) disabled = true;
      if (iso < todayIso) disabled = true;

      if (professionalId && !disabled) {
        if (isDayFullyBooked(iso, proEvents)) disabled = true;
      }

      arr.push({ date: iso, isCurrentMonth: true, disabled });
    }

    return arr;
  }

  const days = getDays();

  function onPrevMonth() {
    const prev = new Date(viewYear, viewMonth - 1, 1);
    if (prev >= minMonth) {
      setViewYear(prev.getFullYear());
      setViewMonth(prev.getMonth());
    }
  }

  function onNextMonth() {
    const next = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  async function loadSlotsForDate(date: string) {
    const MIN_LOADING_MS = 2300;
    const startedAt = Date.now();

    const waitRemaining = () => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
      return remaining > 0
        ? new Promise<void>((r) => setTimeout(r, remaining))
        : Promise.resolve();
    };

    if (!professionalId) {
      await waitRemaining();
      setSlotsLoading(false);
      return;
    }

    try {
      const resp = await callN8N("barber/availability-v1", {
        step: "availability",
        professionalId,
        date,
      });
      setAvailableSlots(extractAvailableSlots(resp));
    } catch {
      setAvailableSlots(getAvailableSlotsForDate(date, proEvents));
    } finally {
      await waitRemaining();
      setSlotsLoading(false);
    }
  }

  async function onSelectDay(date: string) {
    if (!date) return;

    setSelectedDate(date);
    setSelectedTime("");
    setSelectedTimeSelectedAt(null);
    setAvailableSlots([]);
    setAvailabilityMessage(null);
    setSlotsLoading(true);
    setStep(5);
    await loadSlotsForDate(date);
  }

  function onSelectTime(t: string) {
    setSelectedTime(t);
    setSelectedTimeSelectedAt(Date.now());
    setAvailabilityMessage(null);
    setStep(6);
  }

  function clearSelectedTime(message?: string) {
    setSelectedTime("");
    setSelectedTimeSelectedAt(null);
    if (message) setAvailabilityMessage(message);
  }

  async function refreshSelectedDateSlots(message?: string) {
    if (!selectedDate) return;
    clearSelectedTime(message);
    setAvailableSlots([]);
    setSlotsLoading(true);
    await loadSlotsForDate(selectedDate);
  }


  return {
    selectedDate,
    selectedTime,
    selectedTimeSelectedAt,
    disableDays,
    setDisableDays,
    availableSlots,
    availabilityMessage,
    slotsLoading,
    monthTitle,
    weekdays,
    days,
    onPrevMonth,
    onNextMonth,
    onSelectDay,
    onSelectTime,
    clearSelectedTime,
    refreshSelectedDateSlots,
  };
}
