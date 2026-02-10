"use client";

export type AnnualLeaveBasis = "hire" | "fiscal";

export type AnnualLeaveEvent = {
  type: "monthly" | "annual";
  days: number;
  accrualDate: string;
  expiryDate: string;
  label: string;
  highlight?: boolean;
};

export type AnnualLeaveResult = {
  ok: boolean;

  serviceDays: number;
  serviceYearsApprox: number;

  serviceYMDText: string; // "N년 M개월 D일"
  serviceFullYears: number; // N (꽉 채운 년수)

  currentLeaveDays: number; // 연차만이면 연차, 둘다면 합계
  currentLeaveLabel: string; // "월차 N일 (YYYY-MM-DD 소멸) · 연차(비례) X일" 등

  schedule: AnnualLeaveEvent[];
  noteAfter23: string;
};

function toDate(v: string) {
  const [y, m, d] = (v || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  return Number.isFinite(dt.getTime()) ? dt : null;
}
function start(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}
function fmt(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fmtMMDD(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}-${day}`;
}

function addMonths(d: Date, m: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + m);
  return x;
}
function addYears(d: Date, y: number) {
  const x = new Date(d);
  x.setFullYear(x.getFullYear() + y);
  return x;
}
function diffDaysInclusive(a: Date, b: Date) {
  const ms = 86400000;
  return Math.floor((start(b).getTime() - start(a).getTime()) / ms) + 1;
}
function daysInYear(year: number) {
  const d0 = new Date(year, 0, 1, 12);
  const d1 = new Date(year + 1, 0, 1, 12);
  return Math.round((d1.getTime() - d0.getTime()) / 86400000);
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}

// date 시점에 입사 후 몇 년을 완전히 채웠냐
function fullYearsBetween(employmentStart: Date, date: Date) {
  const es = start(employmentStart);
  const d = start(date);

  let y = d.getFullYear() - es.getFullYear();
  const annivThisYear = start(new Date(d.getFullYear(), es.getMonth(), es.getDate(), 12));
  if (d.getTime() < annivThisYear.getTime()) y -= 1;
  return Math.max(0, y);
}

function annualDaysByYears(y: number) {
  if (y < 1) return 0;
  return Math.min(25, 15 + Math.floor((y - 1) / 2));
}

// 월차 11개를 “구간 1줄”
function buildMonthlySummary(employmentStart: Date) {
  const acc1 = start(addMonths(employmentStart, 1));
  const acc11 = start(addMonths(employmentStart, 11));
  const dayOfMonth = String(employmentStart.getDate()).padStart(2, "0");

  return {
    type: "monthly" as const,
    days: 11,
    accrualDate: `${fmt(acc1)} ~ ${fmt(acc11)} (매월 ${dayOfMonth}일 1일 부여)`,
    expiryDate: fmt(start(addYears(employmentStart, 1))),
    label: "1년 미만 월차(최대 11일)",
  };
}

// 근무기간(년/월/일)
function diffYMD(a: Date, b: Date) {
  let y = b.getFullYear() - a.getFullYear();
  let m = b.getMonth() - a.getMonth();
  let d = b.getDate() - a.getDate();

  if (d < 0) {
    const prevMonthLastDay = new Date(b.getFullYear(), b.getMonth(), 0, 12);
    d += prevMonthLastDay.getDate();
    m -= 1;
  }
  if (m < 0) {
    m += 12;
    y -= 1;
  }
  return { y: Math.max(0, y), m: Math.max(0, m), d: Math.max(0, d) };
}
function ymdText(ymd: { y: number; m: number; d: number }) {
  return `${ymd.y}년 ${ymd.m}개월 ${ymd.d}일`;
}

// 1년 미만 월차 누적
function monthsAccruedUnderOneYear(es: Date, cd: Date) {
  let count = 0;
  for (let k = 1; k <= 11; k++) {
    const acc = start(addMonths(es, k));
    if (acc.getTime() <= cd.getTime()) count++;
  }
  return count;
}

// ✅ "상단 요약"을 규칙대로 계산 (+ 월차 소멸일 표시)
function summaryByRule(es: Date, cd: Date, basis: AnnualLeaveBasis) {
  const oneYearAnniv = start(addYears(es, 1));
  const monthlyExpiry = fmt(oneYearAnniv);

  const monthlyAccrued =
    cd.getTime() < oneYearAnniv.getTime() ? monthsAccruedUnderOneYear(es, cd) : 0;

  const monthlyLabel =
    monthlyAccrued > 0 ? `월차 ${monthlyAccrued}일 (${monthlyExpiry} 소멸)` : "";

  // ===== hire: 무조건 둘 중 하나만 =====
  if (basis === "hire") {
    // 1주년 전: 월차만
    if (cd.getTime() < oneYearAnniv.getTime()) {
      return { days: monthlyAccrued, label: monthlyLabel || "월차 0일" };
    }

    // 1주년부터: 연차만
    const fy = fullYearsBetween(es, cd);
    const annualDays = annualDaysByYears(fy);
    return { days: annualDays, label: `연차 ${annualDays}일` };
  }

  // ===== fiscal: 공존 가능 =====
  const hireYear = es.getFullYear();
  const y = cd.getFullYear();
  const accThisYear = start(new Date(y, 0, 1, 12));
  const firstFiscalAcc = start(new Date(hireYear + 1, 0, 1, 12));

  // 입사 다음해 1/1 전: 연차 없음 -> 월차만
  if (cd.getTime() < firstFiscalAcc.getTime()) {
    return { days: monthlyAccrued, label: monthlyLabel || "월차 0일" };
  }

  // 연차 계산
  let annualDays = 0;
  let annualPart = "";

  // 입사 다음해 1/1: 비례
  if (y === hireYear + 1) {
    const endOfHireYear = start(new Date(hireYear, 11, 31, 12));
    const workedDaysInHireYear =
      es.getTime() > endOfHireYear.getTime() ? 0 : diffDaysInclusive(es, endOfHireYear);
    const denom = daysInYear(hireYear);
    const prorated = denom > 0 ? (workedDaysInHireYear / denom) * 15 : 0;
    annualDays = round1(prorated);
    annualPart = `연차(비례) ${annualDays}일`;
  } else {
    const fy = fullYearsBetween(es, accThisYear);
    annualDays = annualDaysByYears(fy);
    annualPart = `연차 ${annualDays}일`;
  }

  // 공존/단독 라벨 조립
  if (monthlyAccrued > 0) {
    return {
      days: monthlyAccrued + annualDays,
      label: `${monthlyLabel} · ${annualPart}`,
    };
  }

  return {
    days: annualDays,
    label: annualPart,
  };
}

export function calculateAnnualLeave(
  employmentStart: string,
  calcDate: string,
  basis: AnnualLeaveBasis
): AnnualLeaveResult {
  const es0 = toDate(employmentStart);
  const cd0 = toDate(calcDate);

  if (!es0 || !cd0) {
    return {
      ok: false,
      serviceDays: 0,
      serviceYearsApprox: 0,
      serviceYMDText: "",
      serviceFullYears: 0,
      currentLeaveDays: 0,
      currentLeaveLabel: "",
      schedule: [],
      noteAfter23: "",
    };
  }

  const es = start(es0);
  const cd = start(cd0);

  const serviceDays = Math.max(0, diffDaysInclusive(es, cd));
  const serviceYearsApprox = serviceDays / 365;

  const ymd = diffYMD(es, cd);
  const serviceYMDText = ymdText(ymd);
  const serviceFullYears = fullYearsBetween(es, cd);

  const schedule: AnnualLeaveEvent[] = [];

  // ✅ 표는 전체 보여주기 그대로
  schedule.push({ ...buildMonthlySummary(es), highlight: true });

  if (basis === "hire") {
    for (let y = 1; y <= 23; y++) {
      const acc = start(addYears(es, y));
      const days = annualDaysByYears(y);
      const exp = start(addYears(acc, 1));

      schedule.push({
        type: "annual",
        days,
        accrualDate: fmt(acc),
        expiryDate: fmt(exp),
        label: `${y}년차`,
        highlight: false,
      });
    }
  } else {
    const hireYear = es.getFullYear();

    const fiscalAcc1 = start(new Date(hireYear + 1, 0, 1, 12));
    const endOfHireYear = start(new Date(hireYear, 11, 31, 12));

    const workedDaysInHireYear =
      es.getTime() > endOfHireYear.getTime() ? 0 : diffDaysInclusive(es, endOfHireYear);

    const denom = daysInYear(hireYear);
    const prorated = denom > 0 ? (workedDaysInHireYear / denom) * 15 : 0;
    const proratedDays = round1(prorated);

    schedule.push({
      type: "annual",
      days: proratedDays,
      accrualDate: fmt(fiscalAcc1),
      expiryDate: fmt(start(addYears(fiscalAcc1, 1))),
      label: "입사 다음년도(회계) 비례연차 (작년도 재직일수/365×15)",
      highlight: true,
    });

    for (let year = hireYear + 2; year <= hireYear + 60; year++) {
      const acc = start(new Date(year, 0, 1, 12));
      const fy = fullYearsBetween(es, acc);
      if (fy <= 0) continue;
      if (fy > 23) break;

      const days = annualDaysByYears(fy);
      schedule.push({
        type: "annual",
        days,
        accrualDate: fmt(acc),
        expiryDate: fmt(start(addYears(acc, 1))),
        label: `${fy}년차`,
        highlight: false,
      });
    }
  }

  schedule.sort((a, b) => {
    const firstDate = (s: string) => (s.includes("~") ? s.split("~")[0].trim() : s.trim());
    const da = toDate(firstDate(a.accrualDate))?.getTime() ?? 0;
    const db = toDate(firstDate(b.accrualDate))?.getTime() ?? 0;
    return da - db;
  });

  const cur = summaryByRule(es, cd, basis);

  const noteAfter23 = "※ 23년차부터는 매년 연차 25일로 동일. (표는 전체 일정 표시)";

  return {
    ok: true,
    serviceDays,
    serviceYearsApprox,
    serviceYMDText,
    serviceFullYears,
    currentLeaveDays: cur.days,
    currentLeaveLabel: cur.label,
    schedule,
    noteAfter23,
  };
}
