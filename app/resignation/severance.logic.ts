"use client";

export type SeveranceInput = {
  employmentStart: string;
  employmentEnd: string;

  last3mStart: string;
  last3mEnd: string;

  // 기본 3개월 임금총액(사용자 입력)
  last3mWages: number;

  // 추가 항목(연간 입력)
  annualBonus: number; // 연간상여금(연)
  annualLeavePay: number; // 연차수당(연)

  // 산정기간 제외일수
  excludeDays: number;
};

export type SeveranceOutput = {
  ok: boolean;

  serviceDays: number;
  serviceYears: number;

  last3mDays: number;
  last3mDaysCounted: number;

  // 평균임금(1일) 표시용(버림)
  avgDailyWage: number;

  // 참고용: 평균임금 원값(소수 포함, 계산에 사용)
  avgDailyWageRaw: number;

  // 세전/세후
  severanceGross: number;
  retirementIncomeTax: number;
  localIncomeTax: number;
  taxTotal: number;
  severanceNet: number;
  effectiveTaxRate: number;

  // 표시용: 1년 평균 퇴직금(세전)
  avgYearSeveranceGross: number;

  // 3개월 반영액
  bonusCountedIn3m: number;
  leavePayCountedIn3m: number;
  last3mWagesTotal: number;
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

// =====================
// 퇴직소득세(간이)
// =====================

function serviceYearIntForTax(serviceDays: number) {
  // ✅ 핵심: 올림(ceil) 금지
  // 1년 + 1일을 2년으로 튀게 만들면 세금이 0으로 떨어지는 이상값이 생길 수 있음.
  const yi = Math.floor(serviceDays / 365);
  return Math.max(1, yi);
}

function calcLengthOfServiceDeduction(yearsInt: number) {
  if (yearsInt <= 5) return yearsInt * 1_000_000;
  if (yearsInt <= 10) return 5_000_000 + (yearsInt - 5) * 2_000_000;
  if (yearsInt <= 20) return 15_000_000 + (yearsInt - 10) * 2_500_000;
  return 40_000_000 + (yearsInt - 20) * 3_000_000;
}

function calcConvertedSalaryDeduction(convertedSalary: number) {
  const x = Math.max(0, Math.floor(convertedSalary));
  if (x <= 8_000_000) return x;
  if (x <= 70_000_000) return 8_000_000 + Math.floor((x - 8_000_000) * 0.6);
  if (x <= 100_000_000) return 45_200_000 + Math.floor((x - 70_000_000) * 0.55);
  if (x <= 300_000_000) return 61_700_000 + Math.floor((x - 100_000_000) * 0.45);
  return 151_700_000 + Math.floor((x - 300_000_000) * 0.35);
}

function calcProgressiveIncomeTax(taxBase: number) {
  const x = Math.max(0, Math.floor(taxBase));
  if (x <= 14_000_000) return Math.floor(x * 0.06);
  if (x <= 50_000_000) return Math.floor(x * 0.15) - 1_260_000;
  if (x <= 88_000_000) return Math.floor(x * 0.24) - 5_760_000;
  if (x <= 150_000_000) return Math.floor(x * 0.35) - 15_440_000;
  if (x <= 300_000_000) return Math.floor(x * 0.38) - 19_940_000;
  if (x <= 500_000_000) return Math.floor(x * 0.40) - 25_940_000;
  if (x <= 1_000_000_000) return Math.floor(x * 0.42) - 35_940_000;
  return Math.floor(x * 0.45) - 65_940_000;
}

function calcRetirementIncomeTax(severanceGross: number, serviceDays: number) {
  const pay = Math.max(0, Math.floor(severanceGross));
  if (pay <= 0) return { incomeTax: 0, localTax: 0 };

  const yearsInt = serviceYearIntForTax(serviceDays);

  const retirementIncomeAmount = pay;
  const lengthDeduction = calcLengthOfServiceDeduction(yearsInt);

  // 과세표준 계산 흐름상 음수는 0으로
  const convertedSalary = Math.floor(((retirementIncomeAmount - lengthDeduction) / yearsInt) * 12);

  const convertedSalaryDeduction = calcConvertedSalaryDeduction(convertedSalary);
  const taxBase = Math.max(0, Math.floor(convertedSalary - convertedSalaryDeduction));

  const convertedTax = Math.max(0, calcProgressiveIncomeTax(taxBase));
  const incomeTax = Math.max(0, Math.floor((convertedTax / 12) * yearsInt));
  const localTax = Math.max(0, Math.floor(incomeTax * 0.1));

  return { incomeTax, localTax };
}

export function calculateSeverance(input: SeveranceInput): SeveranceOutput {
  const es = toDate(input.employmentStart);
  const ee = toDate(input.employmentEnd);
  const ls = toDate(input.last3mStart);
  const le = toDate(input.last3mEnd);

  const last3mWages = Math.max(0, Math.floor(input.last3mWages || 0));
  const annualBonus = Math.max(0, Math.floor(input.annualBonus || 0));
  const annualLeavePay = Math.max(0, Math.floor(input.annualLeavePay || 0));
  const excludeDays = Math.max(0, Math.floor(input.excludeDays || 0));

  if (!es || !ee || !ls || !le) {
    return {
      ok: false,
      serviceDays: 0,
      serviceYears: 0,
      last3mDays: 0,
      last3mDaysCounted: 0,
      avgDailyWage: 0,
      avgDailyWageRaw: 0,
      severanceGross: 0,
      retirementIncomeTax: 0,
      localIncomeTax: 0,
      taxTotal: 0,
      severanceNet: 0,
      effectiveTaxRate: 0,
      avgYearSeveranceGross: 0,
      bonusCountedIn3m: 0,
      leavePayCountedIn3m: 0,
      last3mWagesTotal: 0,
    };
  }

  const serviceDays = Math.max(0, diffDaysInclusive(es, ee));
  const last3mDays = Math.max(0, diffDaysInclusive(ls, le));
  const last3mDaysCounted = Math.max(0, last3mDays - excludeDays);

  const serviceYears = serviceDays / 365;

  // ✅ 둘 다 똑같이 1/4
  const bonusCountedIn3m = Math.floor(annualBonus / 4);
  const leavePayCountedIn3m = Math.floor(annualLeavePay / 4);

  const last3mWagesTotal = Math.max(0, last3mWages + bonusCountedIn3m + leavePayCountedIn3m);

  const avgDailyWageRaw = last3mDaysCounted > 0 ? last3mWagesTotal / last3mDaysCounted : 0;

  // 표시용
  const avgDailyWage = Math.floor(avgDailyWageRaw);

  // ✅ 핵심: 일당을 미리 버리고 곱하면 2~3만원 손해 나는 케이스가 생김
  // 마지막에만 버림 1번
// ✅ 기준 세전값 = 1년치 퇴직금(세전)
const avgYearSeveranceGross = Math.max(0, Math.floor(avgDailyWageRaw * 30));

// ✅ severanceGross도 같은 값을 쓰도록 통일
const severanceGross = avgYearSeveranceGross;

// 세금 계산도 이 기준값으로 계산
const { incomeTax: retirementIncomeTax, localTax: localIncomeTax } = calcRetirementIncomeTax(
  severanceGross,
  serviceDays
);

const taxTotal = retirementIncomeTax + localIncomeTax;
const severanceNet = Math.max(0, severanceGross - taxTotal);
const effectiveTaxRate = severanceGross > 0 ? taxTotal / severanceGross : 0;



  return {
    ok: serviceDays > 0 && last3mDaysCounted > 0 && last3mWagesTotal > 0,
    serviceDays,
    serviceYears,
    last3mDays,
    last3mDaysCounted,
    avgDailyWage,
    avgDailyWageRaw,
    severanceGross,
    retirementIncomeTax,
    localIncomeTax,
    taxTotal,
    severanceNet,
    effectiveTaxRate,
    avgYearSeveranceGross,
    bonusCountedIn3m,
    leavePayCountedIn3m,
    last3mWagesTotal,
  };
}
