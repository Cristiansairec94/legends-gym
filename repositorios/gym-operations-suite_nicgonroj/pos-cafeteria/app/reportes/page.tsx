"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AppShellHeader,
  type AppRole,
} from "@/app/components/app-shell-header";
import type { ShiftSession } from "@/app/components/cash-closures-panel";
import { SalesReportsPanel } from "@/app/components/sales-reports-panel";

type PosContext = {
  role: AppRole;
  activeSession: ShiftSession | null;
};

async function readContext(response: Response) {
  let payload: PosContext & { error?: string };
  try {
    payload = (await response.json()) as PosContext & { error?: string };
  } catch {
    throw new Error("No se pudo leer el perfil actual.");
  }
  if (!response.ok) throw new Error(payload.error || "No se pudo cargar el módulo de reportes.");
  return payload;
}

export default function ReportsPage() {
  const [data, setData] = useState<PosContext | null>(null);
  const [loadError, setLoadError] = useState("");

  const loadContext = useCallback(async () => {
    try {
      setLoadError("");
      const response = await fetch("/api/pos", { cache: "no-store" });
      setData(await readContext(response));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudo cargar el módulo de reportes.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadContext(), 0);
    return () => window.clearTimeout(timer);
  }, [loadContext]);

  const role = data?.role;
  const activeSession = data?.activeSession ?? null;

  return (
    <>
      <a className="skip-link" href="#main-content">Ir al contenido principal</a>
      <main className="pos-shell" id="main-content">
        <AppShellHeader
          role={role}
          activeSession={activeSession}
          currentSection="reports"
        />

        <div className="page-content module-page-content">
          <header className="module-page-heading">
            <div>
              <p className="eyebrow">Administración</p>
              <h2>Análisis y reportes de ventas</h2>
              <p>
                Consulta el resumen diario, revisa el detalle histórico y exporta la
                información aplicada a Excel.
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
                <strong>No pudimos cargar los reportes</strong>
                <span>{loadError}</span>
              </div>
              <button type="button" onClick={() => void loadContext()}>Reintentar</button>
            </div>
          ) : null}

          {role === "admin" ? (
            <SalesReportsPanel refreshSignal={0} />
          ) : role === "sales" ? (
            <section className="module-access-card" aria-labelledby="reports-access-title">
              <p className="eyebrow">Acceso administrativo</p>
              <h2 id="reports-access-title">Este módulo requiere el perfil Administrador</h2>
              <p>Los reportes generales y el historial administrativo permanecen protegidos.</p>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a className="secondary-button module-back-link" href="/">Volver a Nueva venta</a>
            </section>
          ) : !loadError ? (
            <div className="module-loading" role="status" aria-busy="true">
              Preparando reportes…
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}
