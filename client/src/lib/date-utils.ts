/**
 * Centralized Date Utilities for standardizing DD/MM/YYYY format across the application
 */

/**
 * Formats any date input (ISO string, timestamp, Date object) to DD/MM/YYYY
 * Example: "2026-09-22T00:00:00.000Z" -> "22/09/2026"
 */
export function formatDate(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return "TBD";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "TBD";
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "TBD";
  }
}

/**
 * Formats date input to DD/MM/YYYY HH:mm
 */
export function formatDateWithTime(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return "-";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "-";
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  } catch {
    return "-";
  }
}

/**
 * Formats date to short DD/MM/YYYY or DD/MM for cards
 */
export function formatDateShort(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return "Sin fecha";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "Sin fecha";
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "Sin fecha";
  }
}
