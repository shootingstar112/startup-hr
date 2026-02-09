"use client";

export type DismissalPayInput = {
  employmentStart: string;
  dismissalDate: string;

  monthlyBasePay: number;
  monthlyFixedAllowance: number;
  annualBonus: number;

  mode: "simple" | "weekly";

  // simple 모드 입력
  weeklyWorkDays: number;
  dailyWorkHours: number;

  // weekly 모드 입력 (✅ 주휴 제외 "주 소정근로시간" 1개만)
  weeklyHours: number;
};

export type DismissalPayOutput = {
  ok: boolean;

  serviceDays: number;
  serviceMonthsApprox: number;

  monthlyOrdinaryWage: number;

  monthlyHoursRaw: number;
  monthlyHours: number;

  hourlyOrdinaryWageRaw: number;
  hourlyOrdinaryWage: number;
  dailyOrdinaryWageRaw: number;
  dailyOrdinaryWage: number;

  payableNoticeDays: number;
  dismissalPayRaw: number;
  dismissalPay: number;
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

// ✅ 월 환산: 연평균 주수(365/7)/12 → 208/209 스타일
function weeklyToMonthlyHours(weeklyHours: number) {
  const wh = Math.max(0, weeklyHours);
  return (wh * (365 / 7)) / 12;
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(n || 0)));
}

// ✅ 공통: 주휴 자동 반영(비례) - 주소정/5, 주15h 미만이면 0
function addWeeklyHolidayHours(weeklyWorkHours: number) {
  const w = Math.max(0, weeklyWorkHours);
  const weeklyHolidayHours = w >= 15 ? w / 5 : 0;
  return {
    weeklyWorkHours: w,
    weeklyHolidayHours,
    weeklyPaidHours: w + weeklyHolidayHours,
  };
}

function calcWeeklyFromSimple(weeklyWorkDays: number, dailyWorkHours: number) {
  const wd = clampInt(weeklyWorkDays, 0, 7);
  const dh = Math.max(0, Math.floor(dailyWorkHours || 0));
  const weeklyWorkHours = wd * dh;
  const withHoliday = addWeeklyHolidayHours(weeklyWorkHours);

  return {
    weeklyPaidHours: withHoliday.weeklyPaidHours,
    dailyHoursForCalc: dh, // simple은 입력값으로 일임금 계산
  };
}

// ✅ weekly 모드도 "주휴 제외 주 소정시간"만 받으면 됨. 주휴는 여기서 자동으로 더함.
function calcWeeklyFromWeeklyInput(weeklyWorkHoursInput: number) {
  const weeklyWorkHours = Math.max(0, Number(weeklyWorkHoursInput) || 0);
  const withHoliday = addWeeklyHolidayHours(weeklyWorkHours);

  return {
    weeklyPaidHours: withHoliday.weeklyPaidHours,
    dailyHoursForCalc: 8, // weekly는 일시간 애매 → 8h 기준 표시/계산
  };
}

export function calculateDismissalPay(input: DismissalPayInput): DismissalPayOutput {
  const es = toDate(input.employmentStart);
  const dd = toDate(input.dismissalDate);

  const monthlyBasePay = Math.max(0, Math.floor(input.monthlyBasePay || 0));
  const monthlyFixedAllowance = Math.max(0, Math.floor(input.monthlyFixedAllowance || 0));
  const annualBonus = Math.max(0, Math.floor(input.annualBonus || 0));

  const bonusMonthly = Math.floor(annualBonus / 12);
  const monthlyOrdinaryWage = Math.max(0, monthlyBasePay + monthlyFixedAllowance + bonusMonthly);

  if (!es || !dd) {
    return {
      ok: false,
      serviceDays: 0,
      serviceMonthsApprox: 0,
      monthlyOrdinaryWage: 0,
      monthlyHoursRaw: 0,
      monthlyHours: 0,
      hourlyOrdinaryWageRaw: 0,
      hourlyOrdinaryWage: 0,
      dailyOrdinaryWageRaw: 0,
      dailyOrdinaryWage: 0,
      payableNoticeDays: 30,
      dismissalPayRaw: 0,
      dismissalPay: 0,
    };
  }

  const serviceDays = Math.max(0, diffDaysInclusive(es, dd));
  const serviceMonthsApprox = serviceDays / 30;

  const mode = input.mode === "weekly" ? "weekly" : "simple";

  const calc =
    mode === "weekly"
      ? calcWeeklyFromWeeklyInput(input.weeklyHours)
      : calcWeeklyFromSimple(input.weeklyWorkDays, input.dailyWorkHours);

  const monthlyHoursRaw = weeklyToMonthlyHours(calc.weeklyPaidHours);
  const monthlyHours = Math.max(0, Math.round(monthlyHoursRaw));

  const hourlyOrdinaryWageRaw = monthlyHoursRaw > 0 ? monthlyOrdinaryWage / monthlyHoursRaw : 0;
  const hourlyOrdinaryWage = Math.max(0, Math.round(hourlyOrdinaryWageRaw));

  const dailyHoursForCalc = Math.max(0, calc.dailyHoursForCalc);
  const dailyOrdinaryWageRaw = hourlyOrdinaryWageRaw * dailyHoursForCalc;
  const dailyOrdinaryWage = Math.max(0, Math.round(dailyOrdinaryWageRaw));

  const payableNoticeDays = 30;
  const dismissalPayRaw = dailyOrdinaryWageRaw * payableNoticeDays;
  const dismissalPay = Math.max(0, Math.round(dismissalPayRaw));

  const ok = monthlyOrdinaryWage > 0 && monthlyHoursRaw > 0 && serviceDays > 0;

  return {
    ok,
    serviceDays,
    serviceMonthsApprox,
    monthlyOrdinaryWage,
    monthlyHoursRaw,
    monthlyHours,
    hourlyOrdinaryWageRaw,
    hourlyOrdinaryWage,
    dailyOrdinaryWageRaw,
    dailyOrdinaryWage,
    payableNoticeDays,
    dismissalPayRaw,
    dismissalPay,
  };
}
