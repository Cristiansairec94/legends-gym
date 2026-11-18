"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AppShellHeader,
  type AppRole,
} from "@/app/components/app-shell-header";
import type { ShiftSession } from "@/app/components/cash-closures-panel";
import { ClosureIncidentsPanel } from "@/app/components/closure-incidents-panel";

type PosContext = {
  role: AppRole;
  activeSession: ShiftSession | null;
};

async function readContext(response: Response): Promise<PosContext> {
  let payload: PosContext & { error?: string };
  try {
    payload = (await response.json()) as PosContext & { error?: string };
  } catch {
    throw new Error("No se pudo leer el perfil actual.");
  }
  if (!response.ok) {
    throw new Error(payload.error || "No se pudo cargar el panel de incidencias.");
  }
  return payload;
}

export default function ClosureIncidentsPage() {
  const [data, setData] = useState<PosContext | null>(null);
  const [loadError, setLoadError] = useState("");

  const loadContext = useCallback(async () => {
    try {
      setLoadError("");
      const response = await fetch("/api/pos", { cache: "no-store" });
      setData(await readContext(response));
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el panel de incidencias.",
      );
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
          currentSection="incidents"
        />

        <div className="page-content module-page-content">
          <header className="module-page-heading">
            <div>
              <p className="eyebrow">Administración por excepción</p>
              <h2>Incidencias de cierres</h2>
              <p>
                Revisa solo entregas con diferencias, conserva la evidencia original
                y registra cada aclaración, corrección y validación en su historial.
              </p>
            </div>
            {/* Vinext beta requiere navegación completa en el worker de Cloudflare. */}
            <a className="secondary-button module-back-link" href="/cierre-caja">
              Ir a Cierre de caja
            </a>
          </header>

          {loadError ? (
            <div className="page-alert" role="alert">
              <div>
                <strong>No pudimos cargar las incidencias</strong>
                <span>{loadError}</span>
              </div>
              <button type="button" onClick={() => void loadContext()}>
                Reintentar
              </button>
            </div>
          ) : null}

          {role === "admin" ? (
            <ClosureIncidentsPanel />
          ) : role === "sales" ? (
            <section className="module-access-card" aria-labelledby="incidents-access-title">
              <p className="eyebrow">Acceso administrativo</p>
              <h2 id="incidents-access-title">
                Este módulo requiere el perfil Administrador
              </h2>
              <p>
                Ventas entrega el turno; Administración revisa y valida sus
                incidencias sin bloquear el turno siguiente.
              </p>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a className="secondary-button module-back-link" href="/">
                Volver a Nueva venta
              </a>
            </section>
          ) : !loadError ? (
            <div className="module-loading" role="status" aria-busy="true">
              Preparando incidencias…
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}
