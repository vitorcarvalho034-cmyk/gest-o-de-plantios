export const ABSENCE_MARKER = "Ausente";

export function absenceLabel(reason: string | null | undefined): string {
  const value = reason?.trim();
  if (!value) return "Ausente";
  if (/^(ausente|ausência|ausencia|sem justificativa)$/i.test(value)) return "Ausente";
  return `Ausente: ${value}`;
}
