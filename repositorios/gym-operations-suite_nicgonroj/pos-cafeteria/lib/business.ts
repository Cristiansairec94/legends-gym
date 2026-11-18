export const COLLABORATORS = [
  "Andrés Lagos",
  "Bárbara Vega",
  "Hernán Silva",
  "Matías Muñoz",
  "Eva Soto",
  "Camilo Reyes",
  "Irene Paredes",
] as const;

export const SHIFTS = ["am", "pm"] as const;

export const INVENTORY_DIFFERENCE_REASONS = [
  "venta_no_registrada",
  "consumo_no_registrado",
  "merma",
  "error_conteo",
  "reposicion_no_registrada",
  "otro",
] as const;

export const INVENTORY_DIFFERENCE_REASON_LABELS = {
  venta_no_registrada: "Venta no registrada",
  consumo_no_registrado: "Consumo no registrado",
  merma: "Merma",
  error_conteo: "Error de conteo",
  reposicion_no_registrada: "Reposición no registrada",
  otro: "Otro",
} as const satisfies Record<InventoryDifferenceReason, string>;

export type Collaborator = (typeof COLLABORATORS)[number];
export type Shift = (typeof SHIFTS)[number];
export type InventoryDifferenceReason =
  (typeof INVENTORY_DIFFERENCE_REASONS)[number];

export function isCollaborator(value: unknown): value is Collaborator {
  return (
    typeof value === "string" &&
    COLLABORATORS.includes(value as Collaborator)
  );
}

export function isShift(value: unknown): value is Shift {
  return typeof value === "string" && SHIFTS.includes(value as Shift);
}

export function isInventoryDifferenceReason(
  value: unknown,
): value is InventoryDifferenceReason {
  return (
    typeof value === "string" &&
    INVENTORY_DIFFERENCE_REASONS.includes(value as InventoryDifferenceReason)
  );
}
