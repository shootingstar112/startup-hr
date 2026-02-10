// app/hourly/minwage.logic.ts

export type MinWageMode = "daily" | "weekly" | "monthly" | "annual";
export type DayType = "week" | "month";
export type TaxMode = "none" | "basic_9_71" | "simple_3_3";
export type AmountBasis = "net" | "gross";

export const MIN_WAGE_2026 = 10320;
export const WEEKS_PER_MONTH = 52 / 12;

export type MinWageInput = {
  mode: MinWageMode;

  // 입력 금액
  amount: number;

  // 입력 기준: 실수령(net) / 세전(gross)
  amountBasis: AmountBasis;

  // 기본 근무시간(1일)
  dailyHours: number;
  dailyMinutes: number;

  // 근무일수 기준(weekly/monthly/annual에서 필요)
  dayType: DayType;
  daysCount: number;

  // 주휴수당 포함 여부(단순 모델)
  includeWeeklyRestPay: boolean;

  // 연장근무(해당 기간 기준)
  overtimeHours: number;
  overtimeMinutes: number;

  // 수습(90%)
  probation: boolean;

  // 세금 모드
  taxMode: TaxMode;
};

export type MinWageOutput = {
  mode: MinWageMode;

  // 입력/역산 금액(표시용)
  amountBasis: AmountBasis;
  inputAmount: number; // 사용자가 입력한 값
  grossAmount: number; // 계산 기준 세전(=수습 전)
  netAmount: number; // 표시용 실수령(최종)

  // 환산에 사용된 시간(분)
  periodBaseMinutes: number;
  periodRestMinutes: number;
  periodOvertimeMinutes: number;

  // 최저임금 비교는 “가중 유급시간”으로 나눔: base + rest + overtime*1.5
  weightedPaidMinutes: number;

  impliedHourlyWage: number;
  minHourlyWageToCompare: number;
  isUnderMin: boolean;

  taxRate: number;
  probationRate: number;

  // =========================
  // ✅ “표”에 바로 쓰는 금액들
  // =========================
  basePayGross: number; // 기본 금액(세전) = 총세전 * (base+rest)/weighted
  overtimePayGross: number; // 연장 수당(세전) = 총세전 - basePayGross
  expectedGross: number; // 예상 금액(세전) = grossAmount

  probationDeduction: number; // - 수습(표용)
  grossAfterProbation: number; // 수습 적용 후(세전)

  taxAmount: number; // - 세금
  finalNet: number; // 최종 실수령(계산값) = grossAfterProbation - tax
};

function n(v: unknown, fallback = 0) {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : fallback;
}
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
function floorInt(v: unknown, fallback = 0) {
  return Math.floor(n(v, fallback));
}
function roundWon(x: number) {
  return Math.round(x);
}
function toMinutes(h: number, m: number) {
  const hh = clamp(n(h, 0), 0, 24);
  const mm = clamp(n(m, 0), 0, 59);
  return Math.floor(hh * 60 + mm);
}
function hoursFromMinutes(mins: number) {
  return mins / 60;
}
function getTaxRate(mode: TaxMode) {
  if (mode === "basic_9_71") return 0.0971;
  if (mode === "simple_3_3") return 0.033;
  return 0;
}

export function calculateMinWage(input: MinWageInput): MinWageOutput {
  const inputAmount = Math.max(0, floorInt(input.amount, 0));

  const taxRate = getTaxRate(input.taxMode);
  const probationRate = input.probation ? 0.9 : 1;

  // net = gross * probationRate * (1 - taxRate)
  // gross = net / (probationRate * (1 - taxRate))
  const denom = probationRate * (1 - taxRate);

  const grossAmount =
    input.amountBasis === "gross"
      ? inputAmount
      : denom > 0
      ? roundWon(inputAmount / denom)
      : 0;

  const dailyWorkMinutes = toMinutes(input.dailyHours, input.dailyMinutes);

  const daysCountRaw = floorInt(input.daysCount, 0);
  const daysCount = clamp(daysCountRaw, 0, input.dayType === "week" ? 7 : 31);

  // weekly/monthly 기본 근로(분)
  const weeklyWorkMinutes =
    input.dayType === "week" ? dailyWorkMinutes * daysCount : 0;

  const monthlyWorkMinutes =
    input.dayType === "month"
      ? dailyWorkMinutes * daysCount
      : Math.round(weeklyWorkMinutes * WEEKS_PER_MONTH);

  // 주휴(단순): 주 15시간 이상 + 하루 1일치
  const weeklyWorkMinutesForEligibility =
    input.dayType === "week"
      ? weeklyWorkMinutes
      : Math.round(monthlyWorkMinutes / WEEKS_PER_MONTH);

  const eligibleWeeklyRest = weeklyWorkMinutesForEligibility >= 15 * 60;

  const weeklyRestMinutes =
    input.includeWeeklyRestPay && eligibleWeeklyRest ? dailyWorkMinutes : 0;

  const monthlyRestMinutes = Math.round(weeklyRestMinutes * WEEKS_PER_MONTH);

  // 연장근무(해당 기간 기준 입력)
  const periodOvertimeMinutesRaw = toMinutes(
    input.overtimeHours,
    input.overtimeMinutes
  );

  // mode별 “해당 기간의 base/rest/ot 분”
  let periodBaseMinutes = 0;
  let periodRestMinutes = 0;
  let periodOvertimeMinutes = 0;

  if (input.mode === "daily") {
    periodBaseMinutes = dailyWorkMinutes;
    periodRestMinutes = 0;
    periodOvertimeMinutes = periodOvertimeMinutesRaw;
  } else if (input.mode === "weekly") {
    const base =
      input.dayType === "week"
        ? weeklyWorkMinutes
        : Math.round(monthlyWorkMinutes / WEEKS_PER_MONTH);

    const rest =
      input.dayType === "week"
        ? weeklyRestMinutes
        : Math.round(monthlyRestMinutes / WEEKS_PER_MONTH);

    periodBaseMinutes = base;
    periodRestMinutes = rest;
    periodOvertimeMinutes = periodOvertimeMinutesRaw;
  } else if (input.mode === "monthly") {
    periodBaseMinutes = monthlyWorkMinutes;
    periodRestMinutes = monthlyRestMinutes;
    periodOvertimeMinutes = periodOvertimeMinutesRaw;
  } else {
    // ✅ annual: 연봉 환산은 연장근무 제외 (기본 기준)
    periodBaseMinutes = monthlyWorkMinutes * 12;
    periodRestMinutes = monthlyRestMinutes * 12;
    periodOvertimeMinutes = 0; // ❗연봉은 연장 미반영
  }

  // 가중 유급시간(연장 1.5배 환산)
  const weightedPaidMinutes =
    periodBaseMinutes +
    periodRestMinutes +
    Math.round(periodOvertimeMinutes * 1.5);

  const paidHours = hoursFromMinutes(weightedPaidMinutes);

  // ✅ 시급 환산은 세전 총액(gross) 기준
  const impliedHourlyWage = paidHours > 0 ? grossAmount / paidHours : 0;

  // 수습이면 비교 기준 최저시급도 90%
  const minHourlyWageToCompare = input.probation
    ? MIN_WAGE_2026 * 0.9
    : MIN_WAGE_2026;

  const isUnderMin = impliedHourlyWage + 1e-9 < minHourlyWageToCompare;

  // =========================
  // ✅ “표”용 금액 breakdown
  // =========================
  const expectedGross = grossAmount;

  const grossAfterProbation = roundWon(expectedGross * probationRate);
  const taxAmount = roundWon(grossAfterProbation * taxRate);
  const finalNet = Math.max(0, grossAfterProbation - taxAmount);

  const probationDeduction = Math.max(0, expectedGross - grossAfterProbation);

  // 기본/연장 금액 분리(시간 비율로 분배)
  // baseMinutes = 기본 + 주휴
  const baseMinutes = periodBaseMinutes + periodRestMinutes;
  const denomMinutes = weightedPaidMinutes;

  const baseShare = denomMinutes > 0 ? baseMinutes / denomMinutes : 0;

  const basePayGross = roundWon(expectedGross * baseShare);
  const overtimePayGross = Math.max(0, expectedGross - basePayGross);

  // 표시용 netAmount:
  // - 사용자가 net 입력이면 "입력값"을 그대로 보여주기
  // - gross 입력이면 계산된 최종 실수령을 보여주기
  const netAmount = input.amountBasis === "net" ? inputAmount : finalNet;

  return {
    mode: input.mode,

    amountBasis: input.amountBasis,
    inputAmount,
    grossAmount,
    netAmount,

    periodBaseMinutes,
    periodRestMinutes,
    periodOvertimeMinutes,

    weightedPaidMinutes,

    impliedHourlyWage: roundWon(impliedHourlyWage),
    minHourlyWageToCompare: roundWon(minHourlyWageToCompare),
    isUnderMin,

    taxRate,
    probationRate,

    basePayGross,
    overtimePayGross,
    expectedGross,

    probationDeduction,
    grossAfterProbation,

    taxAmount,
    finalNet,
  };
}
