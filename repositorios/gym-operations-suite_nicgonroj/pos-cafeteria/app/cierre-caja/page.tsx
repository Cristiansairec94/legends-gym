"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AppShellHeader,
  type AppRole,
} from "@/app/components/app-shell-header";
import {
  CashClosuresPanel,
  type ShiftSession,
} from "@/app/components/cash-closures-panel";

type PosContext = {
  role: AppRole;
  activeSession: ShiftSession | null;
};

async function readContext(response: Response) {
  let payload: PosContext & { error?: string };
  try {
    payload = (await response.json()) as PosContext & { error?: string };
  } catch {
    throw new Error("No se pudo leer el estado de la caja.");
  }
  if (!response.ok) throw new Error(payload.error || "No se pudo cargar el cierre de caja.");
  return payload;
}

export default function CashClosurePage() {
  const [data, setData] = useState<PosContext | null>(null);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshSignal, setRefreshSignal] = useState(0);

  const loadContext = useCallback(async () => {
    try {
      setLoadError("");
      const response = await fetch("/api/pos", { cache: "no-store" });
      setData(await readContext(response));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudo cargar el cierre de caja.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadContext(), 0);
    return () => window.clearTimeout(timer);
  }, [loadContext]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const role = data?.role;
  const activeSession = data?.activeSession ?? null;

  return (
    <>
      <a className="skip-link" href="#main-content">Ir al contenido principal</a>
      <main className="pos-shell" id="main-content">
        <AppShellHeader
          role={role}
          activeSession={activeSession}
          currentSection="closure"
        />

        <div className="page-content module-page-content">
          <header className="module-page-heading">
            <div>
              <p className="eyebrow">Operación del turno</p>
              <h2>Cierre de caja</h2>
              <p>
                Concilia el dinero, registra gastos reales de caja chica y cuenta solo
                vitrina, stock simple e insumos. La entrega crea un recibo inmutable;
                su revisión administrativa posterior no bloquea el siguiente turno.
              </p>
            </div>
            {/* Use a full navigation while Vinext client routing is unavailable. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="secondary-button module-back-link" href="/">
              Volver a Nueva venta
            </a>
          </header>

          {loadError ? (
            <div className="page-alert" role="alert">
              <div>
                <strong>No pudimos cargar la cuadratura</strong>
                <span>{loadError}</span>
              </div>
              <button type="button" onClick={() => void loadContext()}>Reintentar</button>
            </div>
          ) : null}

          {role ? (
            <CashClosuresPanel
              activeSession={activeSession}
              canManageClosures
              showHistory={role === "admin"}
              refreshSignal={refreshSignal}
              onSessionChanged={(message) => {
                setNotice(message);
                setRefreshSignal((current) => current + 1);
                void loadContext();
              }}
            />
          ) : !loadError ? (
            <div className="module-loading" role="status" aria-busy="true">
              Preparando el cierre de caja…
            </div>
          ) : null}
        </div>
      </main>
      {notice ? <div className="toast" role="status">{notice}</div> : null}
    </>
  );
}
