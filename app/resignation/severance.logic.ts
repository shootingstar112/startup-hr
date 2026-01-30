"use client";

export type SeveranceInput = {
  employmentStart: string;
  employmentEnd: string;
  last3mStart: string;
  last3mEnd: string;
  last3mWages: number;
  excludeDays: number;
};

export type SeveranceOutput = {
  ok: boolean;
  serviceDays: number;
  serviceYears: number;
  last3mDays: number;
  last3mDaysCounted: number;
  avgDailyWage: number;
  severance: number;
};

function toDate(v: string) {
  const d = new Date(v + "T00:00:00");
  return Number.isFinite(d.getTime()) ? d : null;
}

function diffDaysInclusive(a: Date, b: Date) {
  const ms = 24 * 60 * 60 * 1000;
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.floor((end - start) / ms) + 1;
}

export function addMonths(d: Date, months: number) {
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();

  const first = new Date(y, m + months, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  first.setDate(Math.min(day, lastDay));
  return first;
}

export function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function calculateSeverance(input: SeveranceInput): SeveranceOutput {
  const es = toDate(input.employmentStart);
  const ee = toDate(input.employmentEnd);
  const ls = toDate(input.last3mStart);
  const le = toDate(input.last3mEnd);

  const last3mWages = Math.max(0, Math.floor(input.last3mWages || 0));
  const excludeDays = Math.max(0, Math.floor(input.excludeDays || 0));

  if (!es || !ee || !ls || !le) {
    return {
      ok: false,
      serviceDays: 0,
      serviceYears: 0,
      last3mDays: 0,
      last3mDaysCounted: 0,
      avgDailyWage: 0,
      severance: 0,
    };
  }

  const serviceDays = Math.max(0, diffDaysInclusive(es, ee));
  const last3mDays = Math.max(0, diffDaysInclusive(ls, le));
  const last3mDaysCounted = Math.max(0, last3mDays - excludeDays);

  const serviceYears = serviceDays / 365;
  const avgDailyWage = last3mDaysCounted > 0 ? Math.floor(last3mWages / last3mDaysCounted) : 0;
  const severance = Math.max(0, Math.floor(avgDailyWage * 30 * serviceYears));

  return {
    ok: serviceDays > 0 && last3mDaysCounted > 0 && last3mWages > 0,
    serviceDays,
    serviceYears,
    last3mDays,
    last3mDaysCounted,
    avgDailyWage,
    severance,
  };
}
