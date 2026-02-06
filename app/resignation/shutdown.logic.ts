"use client";

export type ShutdownPayInput = {
  last3mStart: string;
  last3mEnd: string;
  last3mWages: number;      // 최근 3개월 임금총액(세전)
  excludeDays: number;      // 제외일수
  shutdownDays: number;     // 휴업일수(지급 대상 일수)
  rate: number;             // 지급률(기본 0.7)
};

export type ShutdownPayOutput = {
  ok: boolean;

  last3mDays: number;
  last3mDaysCounted: number;

  avgDailyWageRaw: number;
  avgDailyWage: number;           // 표시용(버림)

  shutdownPayDailyRaw: number;
  shutdownPayDaily: number;       // 표시용(버림)

  shutdownPayTotal: number;       // 표시용(버림)
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

export function calculateShutdownPay(input: ShutdownPayInput): ShutdownPayOutput {
  const ls = toDate(input.last3mStart);
  const le = toDate(input.last3mEnd);

  const wages = Math.max(0, Math.floor(input.last3mWages || 0));
  const excludeDays = Math.max(0, Math.floor(input.excludeDays || 0));
  const shutdownDays = Math.max(0, Math.floor(input.shutdownDays || 0));

  const rate =
    Number.isFinite(input.rate) && input.rate > 0 ? Math.min(1, input.rate) : 0.7;

  if (!ls || !le) {
    return {
      ok: false,
      last3mDays: 0,
      last3mDaysCounted: 0,
      avgDailyWageRaw: 0,
      avgDailyWage: 0,
      shutdownPayDailyRaw: 0,
      shutdownPayDaily: 0,
      shutdownPayTotal: 0,
    };
  }

  const last3mDays = Math.max(0, diffDaysInclusive(ls, le));
  const last3mDaysCounted = Math.max(0, last3mDays - excludeDays);

  const avgDailyWageRaw = last3mDaysCounted > 0 ? wages / last3mDaysCounted : 0;

  // ✅ 버림은 마지막 표시에서만
  const avgDailyWage = Math.floor(avgDailyWageRaw);

  const shutdownPayDailyRaw = avgDailyWageRaw * rate;
  const shutdownPayDaily = Math.floor(shutdownPayDailyRaw);

  const shutdownPayTotal = Math.max(0, Math.floor(shutdownPayDailyRaw * shutdownDays));

  return {
    ok: last3mDaysCounted > 0 && wages > 0 && shutdownDays > 0,
    last3mDays,
    last3mDaysCounted,
    avgDailyWageRaw,
    avgDailyWage,
    shutdownPayDailyRaw,
    shutdownPayDaily,
    shutdownPayTotal,
  };
}
