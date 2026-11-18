import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cierre de caja — Demo Gym Ops",
  description: "Cuadratura y entrega del turno de Cafetería Demo Gym.",
  openGraph: {
    title: "Cierre de caja — Demo Gym Ops",
    description: "Cuadratura y entrega del turno de Cafetería Demo Gym.",
    images: [],
  },
  twitter: {
    title: "Cierre de caja — Demo Gym Ops",
    description: "Cuadratura y entrega del turno de Cafetería Demo Gym.",
    images: [],
  },
};

export default function CashClosureLayout({ children }: { children: React.ReactNode }) {
  return children;
}
