export type MaternityInput = {
  monthlyWage: number; // 원
  isMultiple: boolean; // 다태아
  isPriorityCompany: boolean; // 우선지원대상기업(환급/지원 포함 여부)
};

/**
 * 정책값은 여기서만 관리
 * - 일할: 월/30 가정
 * - 상한만 적용(월 220만)
 * - ✅ 하한(70만원 등) 강제 로직 제거: 입력한 월급 그대로 비례 계산
 */
export const POLICY = {
  SINGLE_TOTAL_DAYS: 90,
  MULTIPLE_TOTAL_DAYS: 120,

  SINGLE_EMPLOYER_DAYS: 60,
  SINGLE_GOVT_DIRECT_DAYS: 30,

  MULTIPLE_EMPLOYER_DAYS: 75,
  MULTIPLE_GOVT_DIRECT_DAYS: 45,

  MONTHLY_CAP: 2_200_000,
  DAYS_IN_MONTH_FOR_DAILY: 30,
} as const;

export type MaternityOutput = {
  totalDays: number;

  dailyWage: number;
  dailyCap: number;
  govtDaily: number; // ✅ 상한만 적용된 고용보험 일급

  employerPayDays: number;
  govtDirectDays: number;
  govtRefundDays: number;

  employerPayToEmployee: number;
  govtPayToEmployee: number;
  govtRefundToEmployer: number;
  employerNetCost: number;
  govtTotalBurden: number;
  workerTotalTakeHome: number;
};

function floorWon(n: number) {
  return Math.floor(Number.isFinite(n) ? n : 0);
}

export function calculateMaternityLeave(input: MaternityInput): MaternityOutput {
  const monthlyWage = Math.max(0, floorWon(input.monthlyWage));

  const totalDays = input.isMultiple ? POLICY.MULTIPLE_TOTAL_DAYS : POLICY.SINGLE_TOTAL_DAYS;

  const employerPayDays = input.isMultiple ? POLICY.MULTIPLE_EMPLOYER_DAYS : POLICY.SINGLE_EMPLOYER_DAYS;
  const govtDirectDays = input.isMultiple ? POLICY.MULTIPLE_GOVT_DIRECT_DAYS : POLICY.SINGLE_GOVT_DIRECT_DAYS;

  const dailyWage = floorWon(monthlyWage / POLICY.DAYS_IN_MONTH_FOR_DAILY);
  const dailyCap = floorWon(POLICY.MONTHLY_CAP / POLICY.DAYS_IN_MONTH_FOR_DAILY);

  // ✅ 고용보험 일급: 상한만 적용(하한 제거)
  const govtDaily = Math.min(dailyCap, dailyWage);

  // 근로자에게 실제로 들어오는 돈(너가 말한 고정 룰)
  const employerPayToEmployee = dailyWage * employerPayDays;
  const govtPayToEmployee = govtDaily * govtDirectDays;

  // 우선지원: 회사 구간 환급(상한만 적용)
  const govtRefundDays = input.isPriorityCompany ? employerPayDays : 0;

  // ✅ 환급이 회사 실지급액을 초과하지 않도록 캡(이거 없으면 숫자 뒤집힘)
  const rawRefund = govtDaily * govtRefundDays;
  const govtRefundToEmployer = Math.min(employerPayToEmployee, rawRefund);

  const employerNetCost = Math.max(0, employerPayToEmployee - govtRefundToEmployer);
  const govtTotalBurden = govtPayToEmployee + govtRefundToEmployer;
  const workerTotalTakeHome = employerPayToEmployee + govtPayToEmployee;

  return {
    totalDays,
    dailyWage,
    dailyCap,
    govtDaily,

    employerPayDays,
    govtDirectDays,
    govtRefundDays,

    employerPayToEmployee,
    govtPayToEmployee,
    govtRefundToEmployer,
    employerNetCost,
    govtTotalBurden,
    workerTotalTakeHome,
  };
}
