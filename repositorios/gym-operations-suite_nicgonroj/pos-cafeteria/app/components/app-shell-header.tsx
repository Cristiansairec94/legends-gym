"use client";

export type AppRole = "admin" | "sales";

type HeaderSession = {
  shift: "am" | "pm";
  responsible: string;
} | null;

type AppSection = "sales" | "closure" | "incidents" | "reports";

type AppShellHeaderProps = {
  role?: AppRole;
  activeSession: HeaderSession;
  currentSection: AppSection;
  onManageProducts?: () => void;
};

export function AppShellHeader({
  role,
  activeSession,
  currentSection,
  onManageProducts,
}: AppShellHeaderProps) {
  function switchProfile() {
    if (!role) return;
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const url = new URL("/api/auth/switch-profile", window.location.href);
    url.searchParams.set("returnTo", returnTo);
    window.location.assign(url.toString());
  }

  const navigation = [
    { id: "sales" as const, href: "/", label: "Nueva venta" },
    { id: "closure" as const, href: "/cierre-caja", label: "Cierre de caja" },
    ...(role === "admin"
      ? [
          {
            id: "incidents" as const,
            href: "/incidencias-cierres",
            label: "Incidencias",
          },
          { id: "reports" as const, href: "/reportes", label: "Reportes" },
        ]
      : []),
  ];

  return (
    <header className="topbar">
      {/* Vinext beta currently breaks client-side Link navigation in the Cloudflare worker. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a className="brand-lockup brand-link" href="/" aria-label="Ir a Nueva venta">
        <span className="brand-mark" aria-hidden="true">DG</span>
        <div>
          <p className="eyebrow">Demo Gym Ops</p>
          <h1>Cafetería &amp; Protein Bar</h1>
        </div>
      </a>

      <div className="topbar-actions">
        <div
          className={`shift-status ${activeSession ? "shift-status-open" : role ? "shift-status-closed" : "shift-status-pending"}`}
          role="status"
        >
          <span className="status-dot" aria-hidden="true" />
          {!role
            ? "Verificando turno…"
            : activeSession
              ? `Turno ${activeSession.shift.toUpperCase()} · ${activeSession.responsible}`
              : "Sin turno abierto"}
        </div>
        <div
          className={`profile-chip ${role ? `profile-chip-${role}` : ""}`}
          aria-busy={!role}
        >
          <span className="status-dot" aria-hidden="true" />
          {role === "admin"
            ? "Perfil Administrador"
            : role === "sales"
              ? "Perfil Ventas"
              : "Verificando perfil…"}
        </div>
        <button
          className="quiet-button profile-switch-button"
          type="button"
          onClick={switchProfile}
          disabled={!role}
        >
          {role === "admin"
            ? "Cambiar a Ventas"
            : role === "sales"
              ? "Cambiar a Admin"
              : "Cambiar perfil"}
        </button>
        {role === "admin" && onManageProducts ? (
          <button className="secondary-button" type="button" onClick={onManageProducts}>
            Inventario y productos
          </button>
        ) : null}
      </div>

      <nav className="app-navigation" aria-label="Módulos principales">
        {navigation.map((item) => (
          <a
            className={currentSection === item.id ? "app-navigation-active" : ""}
            href={item.href}
            aria-current={currentSection === item.id ? "page" : undefined}
            key={item.id}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
