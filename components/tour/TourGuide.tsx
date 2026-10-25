"use client";

import React, { useState, useEffect, useCallback } from "react";

export interface TourStep {
  targetSelector: string; // CSS selector of element to highlight
  titleHe: string;
  titleEn: string;
  descHe: string;
  descEn: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
  icon?: string;
}

interface Props {
  tourId: string; // Unique identifier for localStorage (e.g. 'container_builder_tour')
  steps: TourStep[];
  lang?: "he" | "en";
  autoStart?: boolean;
}

export default function TourGuide({
  tourId,
  steps,
  lang = "he",
  autoStart = false,
}: Props) {
  const isHe = lang === "he";
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  const STORAGE_KEY = `fdx_tour_completed_${tourId}`;

  // Start tour if not completed and autoStart is true
  useEffect(() => {
    try {
      const completed = localStorage.getItem(STORAGE_KEY);
      if (!completed && autoStart) {
        // slight delay to allow DOM elements to render
        const t = setTimeout(() => {
          startTour();
        }, 1200);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [tourId, autoStart, STORAGE_KEY]);

  const updateHighlight = useCallback((index: number) => {
    const step = steps[index];
    if (!step) return;

    if (step.targetSelector === "center") {
      setHighlightRect(null);
      return;
    }

    const el = document.querySelector(step.targetSelector);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const rect = el.getBoundingClientRect();
      setHighlightRect(rect);
    } else {
      setHighlightRect(null);
    }
  }, [steps]);

  const startTour = () => {
    setCurrentStepIndex(0);
    setIsOpen(true);
    setTimeout(() => {
      updateHighlight(0);
    }, 150);
  };

  const closeTour = () => {
    setIsOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
  };

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      updateHighlight(nextIdx);
    } else {
      closeTour();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      updateHighlight(prevIdx);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeTour();
      else if (e.key === "ArrowRight") {
        isHe ? prevStep() : nextStep();
      } else if (e.key === "ArrowLeft") {
        isHe ? nextStep() : prevStep();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStepIndex, isHe]);

  // Recalculate on resize/scroll
  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => {
      updateHighlight(currentStepIndex);
    };
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize);
    return () => {
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize);
    };
  }, [isOpen, currentStepIndex, updateHighlight]);

  const currentStep = steps[currentStepIndex];

  return (
    <>
      {/* Floating Trigger Button to launch/relaunch the tour anytime */}
      <button
        type="button"
        onClick={startTour}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-orange-400 hover:text-orange-300 border border-orange-500/30 hover:border-orange-500/60 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-md transition group"
        title={isHe ? "הפעל סיור מודרך אינטראקטיבי" : "Start interactive tour walkthrough"}
      >
        <span className="text-base group-hover:rotate-45 transition-transform duration-300">🧭</span>
        <span>{isHe ? "איך זה עובד? (סיור מודרך)" : "Interactive Guide"}</span>
      </button>

      {/* Tour Active Modal / Overlay */}
      {isOpen && currentStep && (
        <div className="fixed inset-0 z-50 pointer-events-auto">
          {/* Dark Backdrop with Spotlight Hole if rect exists */}
          <div
            onClick={closeTour}
            className="fixed inset-0 bg-black/75 backdrop-blur-[2px] transition-opacity duration-300"
          />

          {/* Glowing Target Spotlight Box */}
          {highlightRect && (
            <div
              style={{
                top: `${highlightRect.top - 8}px`,
                left: `${highlightRect.left - 8}px`,
                width: `${highlightRect.width + 16}px`,
                height: `${highlightRect.height + 16}px`,
              }}
              className="fixed rounded-2xl border-2 border-orange-400 shadow-[0_0_25px_rgba(249,115,22,0.6)] pointer-events-none transition-all duration-300 z-50 animate-pulse"
            />
          )}

          {/* Centered or Targeted Tooltip Popover */}
          <div
            dir={isHe ? "rtl" : "ltr"}
            className="fixed inset-x-4 bottom-8 sm:bottom-auto sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 max-w-lg w-full bg-slate-900 border border-orange-500/50 rounded-3xl p-6 shadow-2xl z-50 text-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header with Step Counter & Close */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentStep.icon || "💡"}</span>
                <span className="text-xs font-mono font-bold text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2.5 py-0.5 rounded-full">
                  {isHe
                    ? `שלב ${currentStepIndex + 1} מתוך ${steps.length}`
                    : `Step ${currentStepIndex + 1} of ${steps.length}`}
                </span>
              </div>
              <button
                onClick={closeTour}
                className="text-slate-400 hover:text-white text-lg p-1 transition"
                title={isHe ? "סגור סיור" : "Close Tour"}
              >
                ✕
              </button>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {isHe ? currentStep.titleHe : currentStep.titleEn}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {isHe ? currentStep.descHe : currentStep.descEn}
              </p>
            </div>

            {/* Progress Dots */}
            <div className="flex items-center justify-center gap-1.5 py-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStepIndex
                      ? "w-6 bg-orange-500"
                      : "w-1.5 bg-slate-700"
                  }`}
                />
              ))}
            </div>

            {/* Footer Navigation Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={closeTour}
                className="text-slate-400 hover:text-slate-200 text-xs underline-offset-4 hover:underline"
              >
                {isHe ? "דלג על הסיור" : "Skip Tour"}
              </button>

              <div className="flex items-center gap-2">
                {currentStepIndex > 0 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition"
                  >
                    {isHe ? "הקודם" : "Back"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={nextStep}
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 transition flex items-center gap-1.5"
                >
                  <span>
                    {currentStepIndex === steps.length - 1
                      ? isHe
                        ? "סיום והתחלת עבודה 🚀"
                        : "Finish & Get Started 🚀"
                      : isHe
                      ? "הבא"
                      : "Next"}
                  </span>
                  {currentStepIndex < steps.length - 1 && <span>&rarr;</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
