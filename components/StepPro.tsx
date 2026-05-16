import React, { useEffect, useMemo, useState } from "react";
import { callN8N } from "../n8n";
import GlobalLoading, { Loading } from "./GlobalLoading";
import { callWithRetry } from "../retry";

function extractDisableDays(resp: any): string[] {
  if (!resp || typeof resp !== "object") return [];

  const candidates = [
    resp.DisableDays,
    resp.disableDays,
    resp.disabledDays,
    resp.daysDisabled,
    resp.disable_days,
    resp.disableDaysList,
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) {
      return c.filter((x: any) => typeof x === "string");
    }
  }

  return [];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeParseSelectedPro(selectedPro: string | null): {
  id?: string;
  name?: string;
} {
  if (!selectedPro) return {};
  try {
    const obj = JSON.parse(selectedPro);
    if (obj && typeof obj === "object") return obj;
    return {};
  } catch {
    return { name: selectedPro };
  }
}

interface StepProProps {
  selectedPro: string | null;
  setSelectedPro: (p: string | null) => void;
  back: () => void;
  next: () => void;
}

export default function StepPro({
  selectedPro,
  setSelectedPro,
  back,
  next,
}: StepProProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const professional = useMemo(
    () => ({ nome: "Moisés", cor: "#ff3e3eff", id: "pro_1" }),
    [],
  );

  const parsed = useMemo(
    () => safeParseSelectedPro(selectedPro),
    [selectedPro],
  );
  const alreadySelectedThisPro = parsed?.id === professional.id;

  useEffect(() => {
    let active = true;

    if (alreadySelectedThisPro) {
      setLoading(false);
      // Promise.resolve() adia next() por um microtask, permitindo que o
      // cleanup do React StrictMode marque active=false antes de disparar.
      Promise.resolve().then(() => { if (active) next(); });
      return () => { active = false; };
    }

    (async () => {
      setError(null);
      setLoading(true);
      Loading.show();

      const startedAt = Date.now();

      try {
        const resp = await callWithRetry(
          () =>
            callN8N("barber/availability-v1", {
              step: "professional",
              professional: professional.id,
            }),
          { attempts: 3, timeoutMs: 5000, delayMs: 3000 },
        );

        if (!active) return;

        const DisableDays = extractDisableDays(resp);

        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, 2000 - elapsed);
        if (remaining > 0) await sleep(remaining);

        if (!active) return;

        setSelectedPro(
          JSON.stringify({
            id: professional.id,
            name: professional.nome,
            DisableDays,
          }),
        );

        next();
        setTimeout(() => Loading.hide(), 250);
      } catch (err) {
        if (!active) return;
        console.error(err);
        setError("Erro ao verificar disponibilidade do profissional.");
        setLoading(false);
        Loading.hide();
      }
    })();

    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  return (
    <section id="step-pro" className="step">
      {loading && (
        <div className="step-pro-loading">
          <GlobalLoading label="Carregando calendário" />
        </div>
      )}

      {error && !loading && (
        <p className="text-xs text-red-400 text-center mt-2 max-w-xs mx-auto">
          {error}
        </p>
      )}

      {error && !loading && (
        <div className="flex justify-center gap-3 mt-4">
          <button className="liquid-btn back" onClick={back}>
            Voltar
          </button>
          <button
            className="liquid-btn enabled"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Tentar novamente
          </button>
        </div>
      )}
    </section>
  );
}
