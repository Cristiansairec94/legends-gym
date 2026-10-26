import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reportes de ventas — Demo Gym Ops",
  description: "Análisis diario, historial y exportación de ventas de Cafetería Demo Gym.",
  openGraph: {
    title: "Reportes de ventas — Demo Gym Ops",
    description: "Análisis diario, historial y exportación de ventas de Cafetería Demo Gym.",
    images: [],
  },
  twitter: {
    title: "Reportes de ventas — Demo Gym Ops",
    description: "Análisis diario, historial y exportación de ventas de Cafetería Demo Gym.",
    images: [],
  },
};

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
