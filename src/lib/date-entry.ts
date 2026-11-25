import { format, isValid, parse } from "date-fns";

export type DateParts = { day: string; month: string; year: string };

export function datePartsToISO(parts: DateParts, today = new Date()): string | null {
  if (!/^\d{2}$/.test(parts.day) || !/^\d{2}$/.test(parts.month) || !/^\d{4}$/.test(parts.year)) return null;
  const text = `${parts.day}/${parts.month}/${parts.year}`;
  const date = parse(text, "dd/MM/yyyy", today);
  if (!isValid(date) || format(date, "dd/MM/yyyy") !== text) return null;
  const iso = format(date, "yyyy-MM-dd");
  return iso <= format(today, "yyyy-MM-dd") ? iso : null;
}

export function parsePastedDate(text: string): DateParts | null {
  const match = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(text.trim());
  return match ? { day: match[1], month: match[2], year: match[3] } : null;
}