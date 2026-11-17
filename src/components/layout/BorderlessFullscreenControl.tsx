import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface BorderlessFullscreenControlProps {
  /** Changing this value (e.g. login state transition) triggers a brief reveal of the quick-access control. */
  revealKey?: string | boolean;
  /** Aligns pill over the open navbar gap on authenticated desktop views so it never overlaps the clock or corner controls. */
  alignNavbarGap?: boolean;
}

/**
 * Floating auto-hiding quick-access control for borderless fullscreen mode.
 * Appears smoothly at the top edge when needed (top-edge cursor proximity, F11, or brief reveal)
 * and completely disappears with pointer-events disabled when idle so corners and UI controls stay unobstructed.
 */
export const BorderlessFullscreenControl: React.FC<BorderlessFullscreenControlProps> = ({
  revealKey,
  alignNavbarGap = false,
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const isVisibleRef = useRef(false);
  const isHoveringRef = useRef(false);
  const isClosingSoonRef = useRef(false);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    isClosingSoonRef.current = false;
  }, []);

  const scheduleHide = useCallback(
    (delayMs: number, markQuickClose = false) => {
      clearHideTimer();
      isClosingSoonRef.current = markQuickClose;
      hideTimerRef.current = window.setTimeout(() => {
        hideTimerRef.current = null;
        isClosingSoonRef.current = false;
        if (!isHoveringRef.current) {
          setIsVisible(false);
        }
      }, delayMs);
    },
    [clearHideTimer]
  );

  const showTemporarily = useCallback(
    (durationMs = 3200) => {
      setIsVisible(true);
      scheduleHide(durationMs, false);
    },
    [scheduleHide]
  );

  // Sync fullscreen state with Electron IPC and browser Fullscreen API
  useEffect(() => {
    const syncBrowserState = () => {
      const electronApi = (window as any).electronAPI;
      if (!electronApi?.isFullScreen) {
        setIsFullScreen(Boolean(document.fullscreenElement));
      }
    };

    document.addEventListener('fullscreenchange', syncBrowserState);
    document.addEventListener('webkitfullscreenchange', syncBrowserState);

    const electronApi = (window as any).electronAPI;
    let removeListener: (() => void) | undefined;

    if (electronApi?.onFullscreenChange) {
      removeListener = electronApi.onFullscreenChange((full: boolean) => {
        setIsFullScreen(Boolean(full));
        showTemporarily(2500);
      });
    }

    if (electronApi?.isFullScreen) {
      electronApi
        .isFullScreen()
        .then((full: boolean) => setIsFullScreen(Boolean(full)))
        .catch(() => {});
    }

    return () => {
      document.removeEventListener('fullscreenchange', syncBrowserState);
      document.removeEventListener('webkitfullscreenchange', syncBrowserState);
      if (removeListener) removeListener();
    };
  }, [showTemporarily]);

  // Brief quick-access reveal on initial load or workspace transitions, then auto-hide cleanly
  useEffect(() => {
    showTemporarily(3200);
    return () => clearHideTimer();
  }, [revealKey, showTemporarily, clearHideTimer]);

  const toggleFullScreen = useCallback(() => {
    const electronApi = (window as any).electronAPI;
    if (electronApi?.toggleFullScreen) {
      electronApi.toggleFullScreen();
      showTemporarily(2500);
      return;
    }

    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => {
          setIsFullScreen(true);
          showTemporarily(2500);
        })
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => {
          setIsFullScreen(false);
          showTemporarily(2500);
        })
        .catch(() => {});
    }
  }, [showTemporarily]);

  // Top-edge proximity detector + browser F11 fallback
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const vw = window.innerWidth || 1280;
      const inTopTriggerZone = e.clientX >= vw * 0.15 && e.clientX <= vw * 0.85;
      const nearTopEdge = e.clientY <= 6 || (inTopTriggerZone && e.clientY <= 18);

      if (nearTopEdge) {
        if (!isHoveringRef.current) {
          showTemporarily(3200);
        } else {
          clearHideTimer();
          setIsVisible(true);
        }
      } else if (
        isVisibleRef.current &&
        !isHoveringRef.current &&
        e.clientY > 56 &&
        !isClosingSoonRef.current
      ) {
        // Hide quickly once cursor leaves the top zone without resetting mid-movement
        scheduleHide(450, true);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const electronApi = (window as any).electronAPI;
      if (!electronApi?.toggleFullScreen && e.key === 'F11' && !e.repeat) {
        e.preventDefault();
        toggleFullScreen();
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [clearHideTimer, scheduleHide, showTemporarily, toggleFullScreen]);

  const positionClass = alignNavbarGap
    ? 'top-3 max-lg:left-1/2 lg:left-[308px] 2xl:left-[35%] -translate-x-1/2'
    : 'top-2 left-1/2 -translate-x-1/2';

  return (
    <div
      aria-hidden={!isVisible}
      onMouseEnter={() => {
        isHoveringRef.current = true;
        clearHideTimer();
        setIsVisible(true);
      }}
      onMouseLeave={() => {
        isHoveringRef.current = false;
        scheduleHide(450, true);
      }}
      className={`fixed ${positionClass} z-[90] transition-all duration-300 ease-out ${
        isVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}
    >
      <button
        type="button"
        tabIndex={isVisible ? 0 : -1}
        onClick={toggleFullScreen}
        className={`flex items-center gap-1 2xl:gap-2 ${
          alignNavbarGap ? 'px-2 py-1 text-[11px] 2xl:px-3.5 2xl:py-1.5 2xl:text-xs' : 'px-3.5 py-1.5 text-xs'
        } rounded-full backdrop-blur-xl border font-bold shadow-[0_10px_30px_rgba(0,0,0,0.85)] transition-all cursor-pointer select-none ${
          isFullScreen
            ? 'bg-zinc-950/90 hover:bg-black text-emerald-300 border-emerald-400/60 hover:border-emerald-300'
            : 'bg-zinc-950/90 hover:bg-black text-white border-amber-400/50 hover:border-amber-300'
        }`}
        title={
          isFullScreen
            ? 'Salir de Pantalla Completa Sin Bordes (ESC o F11)'
            : 'Activar Pantalla Completa Sin Bordes (F11)'
        }
      >
        {isFullScreen ? (
          <>
            <Minimize2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="whitespace-nowrap">Salir</span>
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-mono font-black text-emerald-300">
              ESC
            </span>
          </>
        ) : (
          <>
            <Maximize2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="whitespace-nowrap">
              {alignNavbarGap ? (
                <>
                  <span className="2xl:hidden">Expandir</span>
                  <span className="hidden 2xl:inline">Pantalla Completa Sin Bordes</span>
                </>
              ) : (
                'Pantalla Completa Sin Bordes'
              )}
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-white/10 border border-white/15 text-[10px] font-mono font-black text-amber-300">
              F11
            </span>
          </>
        )}
      </button>
    </div>
  );
};
