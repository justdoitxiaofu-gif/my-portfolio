import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { Section, Work } from "@/lib/types";

const VISIBLE_REFRESH_MIN_INTERVAL = 30000;

export function useHomeDataRefresh({
  initialIntro,
  initialTagline,
  initialWorks,
  initialSections,
  initialLoadError,
  defaultTagline,
}: {
  initialIntro: string;
  initialTagline: string;
  initialWorks: Work[];
  initialSections: Section[];
  initialLoadError: boolean;
  defaultTagline: string;
}) {
  const [intro, setIntro] = useState(initialIntro);
  const [tagline, setTagline] = useState(initialTagline || defaultTagline);
  const [detailSections, setDetailSections] = useState<Section[]>(initialSections);
  const [loadError, setLoadError] = useState(initialLoadError);
  const [loadingWorks, setLoadingWorks] = useState(initialWorks.length === 0 && !initialLoadError);
  const [expandedSection, setExpandedSection] = useState<string | null>(initialSections[0]?.id ?? null);
  const [works, setWorks] = useState<Work[]>(initialWorks);
  const refreshInFlightRef = useRef(false);
  const lastRefreshAtRef = useRef(0);

  const refreshData = useCallback(async (options?: { force?: boolean }) => {
    const now = Date.now();
    if (refreshInFlightRef.current) return;
    if (!options?.force && now - lastRefreshAtRef.current < VISIBLE_REFRESH_MIN_INTERVAL) return;
    refreshInFlightRef.current = true;

    try {
      const [introRes, sectionsRes, worksRes] = await Promise.all([fetch("/api/intro"), fetch("/api/detail-sections"), fetch("/api/works")]);
      if (!introRes.ok || !sectionsRes.ok || !worksRes.ok) {
        throw new Error("refresh failed");
      }
      const [introData, nextSections, nextWorks] = await Promise.all([
        introRes.json() as Promise<{ content?: string; tagline?: string }>,
        sectionsRes.json() as Promise<Section[]>,
        worksRes.json() as Promise<Work[]>,
      ]);
      setIntro(introData.content || "");
      setTagline((introData.tagline || "").trim() || defaultTagline);
      setDetailSections(nextSections);
      setExpandedSection((current) => {
        if (nextSections.length === 0) return null;
        if (!current) return nextSections[0].id;
        return nextSections.some((section) => section.id === current) ? current : nextSections[0].id;
      });
      setWorks(nextWorks);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      lastRefreshAtRef.current = Date.now();
      refreshInFlightRef.current = false;
      setLoadingWorks(false);
    }
  }, [defaultTagline]);

  useEffect(() => { const iv = setInterval(refreshData, 300000); return () => clearInterval(iv); }, [refreshData]);

  useEffect(() => {
    if (!initialLoadError) {
      lastRefreshAtRef.current = Date.now();
    }
  }, [initialLoadError]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") refreshData(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshData]);

  return {
    intro,
    tagline,
    detailSections,
    loadError,
    loadingWorks,
    expandedSection,
    setExpandedSection,
    works,
    refreshData,
  };
}

export function useCustomCursor(
  cursorRef: RefObject<HTMLDivElement | null>,
  ringRef: RefObject<HTMLDivElement | null>
) {
  useEffect(() => {
    document.body.classList.add("home-vignette");
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (finePointer && !reducedMotion) {
      document.body.style.cursor = "none";
    }
    return () => {
      document.body.style.cursor = "";
      document.body.classList.remove("home-vignette");
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reducedMotion) return;
    const cursor = cursorRef.current, ring = ringRef.current;
    if (!cursor || !ring) return;
    let mx = 0, my = 0, rx = 0, ry = 0;
    let hasRingPosition = false;
    const setCursorVisibility = (visible: boolean) => {
      const opacity = visible ? "1" : "0";
      cursor.style.opacity = opacity;
      ring.style.opacity = opacity;
    };
    const syncRing = (x: number, y: number) => {
      rx = x; ry = y;
      ring.style.left = rx + "px";
      ring.style.top = ry + "px";
    };
    const onScroll = () => {
      if (!hasRingPosition) return;
      setCursorVisibility(false);
    };
    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY;
      cursor.style.left = mx + "px";
      cursor.style.top = my + "px";
      if (!hasRingPosition || Math.hypot(mx - rx, my - ry) > 180) {
        hasRingPosition = true;
        syncRing(mx, my);
      }
      setCursorVisibility(true);
      const hovering = (e.target as HTMLElement).closest(".work-card, a, button, [data-hover]");
      if (hovering) { cursor.classList.add("hover"); ring.classList.add("hover"); }
      else { cursor.classList.remove("hover"); ring.classList.remove("hover"); }
    };
    setCursorVisibility(false);
    const animate = () => {
      if (!hasRingPosition) {
        raf = requestAnimationFrame(animate);
        return;
      }
      rx += (mx - rx) * 0.15;
      ry += (my - ry) * 0.15;
      ring.style.left = rx + "px";
      ring.style.top = ry + "px";
      raf = requestAnimationFrame(animate);
    };
    let raf = requestAnimationFrame(animate);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [cursorRef, ringRef]);
}

export function useActiveHomeSection(worksLength: number, detailSectionLength: number) {
  const [activeSection, setActiveSection] = useState<"works" | "about" | "contact">("works");

  useEffect(() => {
    const sections = ["works", "about", "contact"] as const;
    let raf = 0;

    const updateActiveSection = () => {
      const scrollBottom = window.scrollY + window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const marker = window.scrollY + Math.max(180, window.innerHeight * 0.4);
      let nextActive: "works" | "about" | "contact" = "works";

      if (scrollBottom >= docHeight - 24) {
        setActiveSection((current) => (current === "contact" ? current : "contact"));
        raf = 0;
        return;
      }

      for (const id of sections) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top + window.scrollY <= marker) nextActive = id;
      }

      setActiveSection((current) => (current === nextActive ? current : nextActive));
      raf = 0;
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [worksLength, detailSectionLength]);

  return activeSection;
}

export function useBackToTopVisibility() {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const updateVisibility = () => {
      setShowBackToTop(window.scrollY > Math.max(280, window.innerHeight * 0.55));
    };
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);
    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, []);

  return showBackToTop;
}
