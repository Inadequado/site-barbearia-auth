import React from "react";

interface StepCalendarProps {
  monthTitle: string;
  week: string[];
  days: { date: string; isCurrentMonth: boolean; disabled?: boolean }[];
  back: () => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDay: (date: string) => void;

  // ✅ NOVO: datas que o n8n mandou para bloquear (DisableDays)
  disabledDates?: string[];

  // ✅ NOVO: horários do expediente (para bloquear "hoje" quando não sobrar nenhum horário)
  workSlots?: string[];
}

// Utilitário -> AAAA-MM-DD em horário local
function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalizeDateToISO(dateValue: string | null | undefined): string | null {
  if (!dateValue) return null;
  const trimmed = String(dateValue).trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed.slice(0, 10);

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) return toLocalISO(parsed);

  return null;
}

// Extrai apenas o "dia" (DD) de uma string AAAA-MM-DD
function getDayNumber(dateStr: string): number {
  const parts = dateStr.split("-");
  const dayPart = parts[2] ?? "1";
  return Number(dayPart);
}

export default function StepCalendar({
  monthTitle,
  week,
  days,
  back,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
  disabledDates = [],
  workSlots = [],
}: StepCalendarProps) {
  const todayIso = toLocalISO(new Date());

  // Descobre se o mês exibido é anterior ao mês atual (YYYY-MM)
  const currentMonthDate = days.find((d) => d.isCurrentMonth && d.date)?.date;
  const currentMonthKey = currentMonthDate?.slice(0, 7);
  const todayMonthKey = todayIso.slice(0, 7);
  const monthInPast = !!currentMonthKey && currentMonthKey < todayMonthKey;

  // ✅ Set de disableDays vindos do n8n (normalizado)
  const disabledSet = new Set(
    disabledDates
      .map((x) => normalizeDateToISO(x))
      .filter(Boolean) as string[]
  );

  // ✅ Bloqueia "hoje" se não existir mais nenhum slot futuro
  const now = new Date();
  const currentHH = String(now.getHours()).padStart(2, "0");
  const currentMM = String(now.getMinutes()).padStart(2, "0");
  const currentHHMM = `${currentHH}:${currentMM}`;

  const todayHasFutureSlots =
    workSlots.length === 0 ? true : workSlots.some((s) => s > currentHHMM);

  return (
    <section id="step-schedule" className="step">
      <label className="label calendar-title">Escolha a data:</label>

      <div className="calendar">
        {/* Cabeçalho */}
        <div className="cal-head">
          <button
            id="cal-prev"
            type="button"
            className="cal-nav"
            onClick={onPrevMonth}
          >
            <span className="cal-arrow">‹</span>
          </button>

          <div id="cal-title" className="cal-title-strong">
            {monthTitle}
          </div>

          <button
            id="cal-next"
            type="button"
            className="cal-nav"
            onClick={onNextMonth}
          >
            <span className="cal-arrow">›</span>
          </button>
        </div>

        {/* Semana */}
        <div id="cal-week" className="cal-grid">
          {week.map((d) => (
            <div key={d} className="week-day">
              {d}
            </div>
          ))}
        </div>

        {/* Dias */}
        <div id="cal-days" className="cal-grid">
          {days.map((d, index) => {
            const hasDate = !!d.date;

            // ✅ motivo extra de bloqueio via n8n
            const isBlockedByN8n = hasDate ? disabledSet.has(d.date) : false;

            // ✅ motivo extra de bloqueio: hoje sem slots futuros
            const isToday = hasDate && d.date === todayIso;
            const isBlockedTodayByTime = isToday && !todayHasFutureSlots;

            // ✅ disabled final
            const isDisabled =
              !hasDate || !!d.disabled || isBlockedByN8n || isBlockedTodayByTime;

            let label: React.ReactNode = "";
            let isXMark = false;
            if (hasDate) {
              const isPast = d.date < todayIso;
              const dayNumber = getDayNumber(d.date);

              // Regra do "X" (mantida): só para dias passados desabilitados
              const shouldShowX =
                isDisabled && isPast && (monthInPast || !d.isCurrentMonth);
              isXMark = shouldShowX;

              label = shouldShowX ? "╳" : dayNumber;
            }

            const baseClass = `day-cell ${
              d.isCurrentMonth ? "current-month" : "other-month"
            } ${isDisabled ? "day-disabled" : ""} ${isToday ? "day-today" : ""} ${
              isXMark ? "x-mark" : ""
            }`;

            const style: React.CSSProperties | undefined = isDisabled
              ? {
                  color: label === "╳" ? "#9E72FF" : undefined,
                }
              : undefined;

            return (
              <button
                key={index}
                type="button"
                className={baseClass}
                style={style}
                disabled={isDisabled}
                onClick={!isDisabled && hasDate ? () => onSelectDay(d.date) : undefined}
                aria-label={hasDate ? `Selecionar dia ${d.date}` : "Dia indisponível"}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* BOTÃO VOLTAR */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: "0px", /* mudar a distancia do botãose precisar */
        }}
      >
        <button
          id="back-to-pro"
          className="liquid-btn back cal-back-btn"
          onClick={back}
        >
          Voltar
        </button>
      </div>
    </section>
  );
}
