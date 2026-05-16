import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { gsap } from "gsap";

import StepName from "./components/StepName";
import StepPhone from "./components/StepPhone";
import StepPro from "./components/StepPro";
import StepCalendar from "./components/StepCalendar";
import StepTime from "./components/StepTime";
import StepReview from "./components/StepReview";
import StepSuccess from "./components/StepSuccess";
import { StepDots } from "./components/StepDots";

import { useCalendar } from "./hooks/useCalendar";
import { useBooking } from "./hooks/useBooking";
import { getServiceByName, getServiceBySlug } from "./services";

import { normalizeDisableDays } from "./Regras/regraDisponibilidade";
import { WORK_SLOTS } from "./Regras/regraHorarios";

export default function App() {
  const [step, setStep] = useState(1);
  const [displayStep, setDisplayStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const stepContainerRef = useRef<HTMLDivElement>(null);
  const pendingStepRef = useRef(1);
  const directionRef = useRef(1);            // 1 = avançando, -1 = voltando
  const navigationActiveRef = useRef(false); // true só quando uma navegação está em andamento
  const transitionTypeRef = useRef<"slide" | "fade">("fade");

  const next = () => { directionRef.current = 1;  setStep((s) => s + 1); };
  const back = () => { directionRef.current = -1; setStep((s) => s - 1); };

  // ====== DADOS DO FORM ======
  const location = useLocation();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [professionalName, setProfessionalName] = useState("");
  const [selectedService] = useState(() => {
    const state = location.state as { servico?: string; serviceSlug?: string } | null;
    const params = new URLSearchParams(window.location.search);
    const slugService = getServiceBySlug(state?.serviceSlug ?? params.get("servico"));
    if (slugService) return slugService;
    return getServiceByName(state?.servico ?? params.get("servico"));
  });
  const service = selectedService?.name ?? "";
  const hasService = !!selectedService;

  // ====== HOOKS ======
  const calendar = useCalendar({ professionalId, setStep });

  const booking = useBooking({
    name,
    phone,
    professionalName,
    professionalId,
    service,
    selectedDate: calendar.selectedDate,
    selectedTime: calendar.selectedTime,
    selectedTimeSelectedAt: calendar.selectedTimeSelectedAt,
    onSlotUnavailable: (message) => {
      void calendar.refreshSelectedDateSlots(message);
      setStep(5);
      setDisplayStep(5);
    },
  });

  // ====== TRANSIÇÃO PARA A TELA DE SUCESSO ======
  useEffect(() => {
    if (!booking.bookingDone) return;
    const el = stepContainerRef.current;
    if (el) {
      gsap.to(el, {
        opacity: 0,
        y: -10,
        duration: 0.3,
        ease: "power2.in",
        overwrite: true,
        onComplete: () => setShowSuccess(true),
      });
    } else {
      setShowSuccess(true);
    }
  }, [booking.bookingDone]);

  const handleSuccessBack = () => {
    booking.resetBooking();
    setName("");
    setPhone("");
    setProfessionalId(null);
    setProfessionalName("");
    setShowSuccess(false);
    setStep(1);
    setDisplayStep(1);
  };

  // ====== GSAP TRANSITIONS — slide direcional (só 1↔2) + fade ======
  useEffect(() => {
    pendingStepRef.current = step;
    if (step === displayStep) return;

    const el = stepContainerRef.current;
    if (!el) { setDisplayStep(step); return; }

    const isSlide = (displayStep === 1 && step === 2) || (displayStep === 2 && step === 1);
    transitionTypeRef.current = isSlide ? "slide" : "fade";
    navigationActiveRef.current = true;

    gsap.to(el, {
      opacity: 0,
      x: isSlide ? directionRef.current * -28 : 0,
      duration: 0.35,
      ease: "sine.in",
      overwrite: true,
      onComplete: () => setDisplayStep(pendingStepRef.current),
    });
  }, [step]);

  useLayoutEffect(() => {
    if (!navigationActiveRef.current) return;
    navigationActiveRef.current = false;

    const el = stepContainerRef.current;
    if (!el) return;

    const isSlide = transitionTypeRef.current === "slide";
    gsap.fromTo(
      el,
      { opacity: 0, x: isSlide ? directionRef.current * 28 : 0 },
      { opacity: 1, x: 0, duration: 0.35, ease: "sine.out", overwrite: true },
    );
  }, [displayStep]);

  // ====== RENDER ======
  if (!hasService) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="overlay">
      <div className="form">
        {showSuccess ? (
          <StepSuccess name={name} onBack={handleSuccessBack} />
        ) : (
        <>
        {displayStep < 6 && <StepDots total={6} page={displayStep - 1} />}
        <div ref={stepContainerRef}>

          {displayStep === 1 && (
            <StepName name={name} setName={setName} next={next} />
          )}

          {displayStep === 2 && (
            <StepPhone
              phone={phone}
              setPhone={setPhone}
              back={back}
              next={next}
            />
          )}

          {displayStep === 3 && (
            <StepPro
              selectedPro={professionalName || null}
              setSelectedPro={(payload) => {
                if (!payload) {
                  setProfessionalId(null);
                  setProfessionalName("");
                  calendar.setDisableDays([]);
                  return;
                }

                try {
                  const parsed = JSON.parse(payload);
                  if (parsed.id) setProfessionalId(String(parsed.id));
                  if (parsed.name) setProfessionalName(parsed.name);

                  const incoming =
                    parsed.DisableDays ??
                    parsed.disableDays ??
                    parsed.disable_days ??
                    parsed.disabledDays ??
                    [];

                  calendar.setDisableDays(normalizeDisableDays(incoming));
                } catch {
                  setProfessionalId(String(payload));
                  calendar.setDisableDays([]);
                }
              }}
              back={back}
              next={next}
            />
          )}

          {displayStep === 4 && (
            <StepCalendar
              monthTitle={calendar.monthTitle}
              week={calendar.weekdays}
              days={calendar.days}
              back={() => setStep(2)}
              onPrevMonth={calendar.onPrevMonth}
              onNextMonth={calendar.onNextMonth}
              onSelectDay={calendar.onSelectDay}
              disabledDates={calendar.disableDays}
              workSlots={WORK_SLOTS}
            />
          )}

          {displayStep === 5 && (
            <StepTime
              slots={calendar.availableSlots}
              loading={calendar.slotsLoading}
              message={calendar.availabilityMessage}
              back={() => setStep(4)}
              onSelectTime={calendar.onSelectTime}
            />
          )}

          {displayStep === 6 && (
            <StepReview
              name={name}
              phone={phone}
              professional={professionalName}
              service={service}
              date={calendar.selectedDate}
              time={calendar.selectedTime}
              back={() => setStep(1)}
              onConfirm={booking.onConfirm}
              bookingStatus={booking.bookingStatus}
              bookingInProgress={booking.bookingInProgress}
              bookingDone={booking.bookingDone}
            />
          )}

        </div>
        </>
      )}
      </div>
    </div>
  );
}
