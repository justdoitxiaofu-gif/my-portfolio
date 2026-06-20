"use client";

import { useCallback } from "react";

export default function BackToWorksButton() {
  const handleBack = useCallback(() => {
    try {
      const savedY = sessionStorage.getItem("portfolioScrollY");
      if (savedY) sessionStorage.setItem("portfolioRestoreScroll", "1");
    } catch {
      // Ignore storage failures and fall back to anchor navigation.
    }

    window.location.href = "/#works";
  }, []);

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex min-h-12 items-center justify-center gap-2 bg-surface/90 backdrop-blur-sm border border-accent/70 px-5 py-3 text-[0.72rem] md:text-xs tracking-[0.2em] uppercase text-accent hover:bg-accent hover:text-bg hover:border-accent transition-colors"
      aria-label="返回作品集"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
      返回作品集
    </button>
  );
}
