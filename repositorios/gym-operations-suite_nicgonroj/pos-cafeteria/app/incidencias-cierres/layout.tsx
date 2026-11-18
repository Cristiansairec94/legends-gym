import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Incidencias de cierres — Demo Gym Ops",
  description: "Control, aclaración y validación de diferencias de caja e inventario.",
  openGraph: {
    title: "Incidencias de cierres — Demo Gym Ops",
    description: "Control, aclaración y validación de diferencias de caja e inventario.",
    images: [],
  },
  twitter: {
    title: "Incidencias de cierres — Demo Gym Ops",
    description: "Control, aclaración y validación de diferencias de caja e inventario.",
    images: [],
  },
};

export default function ClosureIncidentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
