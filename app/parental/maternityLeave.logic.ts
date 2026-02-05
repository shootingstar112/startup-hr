// app/maternity/maternityLeave.logic.ts

export type MaternityInput = {
  monthlyWage: number; // 원
  isMultiple: boolean; // 다태아
  isPriorityCompany: boolean; // 우선지원대상기업(가정)
  govtDays?: number; // 정부지원일수(직접 지정 옵션)
};

/**
 * ⚠️ 정책값은 여기서만 관리
 * - 월 상한/하한은 너가 원하면 바꿔 끼우면 됨
 * - 일할은 "월/30" 가정 (너 스샷이 4,000,000 -> 133,333원이라 이 기준)
 */
export const POLICY = {
  SINGLE_DAYS: 90,
  MULTIPLE_DAYS: 120,

  // 예시값: 너 스샷(일 상한 73,333원)이면 월 상한이 2,200,000원 기준임.
  // 필요하면 여기만 수정.
  MONTHLY_CAP: 2_200_000,
  MONTHLY_FLOOR: 700_000,

  DAYS_IN_MONTH_FOR_DAILY: 30,
};

/**
 * 정부지원일수 기본값(가정)
 * - 여기만 바꾸면 "정부/회사 분담" 결과가 싹 바뀜
 *
 * 추천:
 * 1) 일단 우선지원=전체기간, 아니면 30일 같은 "placeholder"로 두고
 * 2) 실제 요구사항 확정되면 여기 로직 고정
 */
function defaultGovtDays(totalDays: number, isPriorityCompany: boolean) {
  return isPriorityCompany ? totalDays : Math.min(30, totalDays);
}

export type MaternityOutput = {
  totalDays: number;

  dailyWage: number; // 원
  dailyCap: number; // 원
  dailyFloor: number; // 원

  // 총액(추정)
  govtPay: number; // 원 (정부 지급)
  companyPayGross: number; // 원 (회사가 “지급”하는 총액 가정)
  companyNetBurden: number; // 원 (회사 순부담 = gross - govtPay)

  // 참고용
  govtDays: number;
};

function floorWon(n: number) {
  return Math.floor(Number.isFinite(n) ? n : 0);
}
function clampInt(n: number, min: number, max: number) {
  const v = Math.floor(Number.isFinite(n) ? n : min);
  return Math.max(min, Math.min(max, v));
}

export function calculateMaternityLeave(input: MaternityInput): MaternityOutput {
  const monthlyWage = Math.max(0, floorWon(input.monthlyWage));
  const totalDays = input.isMultiple ? POLICY.MULTIPLE_DAYS : POLICY.SINGLE_DAYS;

  const dailyWage = floorWon(monthlyWage / POLICY.DAYS_IN_MONTH_FOR_DAILY);
  const dailyCap = floorWon(POLICY.MONTHLY_CAP / POLICY.DAYS_IN_MONTH_FOR_DAILY);
  const dailyFloor = floorWon(POLICY.MONTHLY_FLOOR / POLICY.DAYS_IN_MONTH_FOR_DAILY);

  const govtDays =
    input.govtDays == null
      ? defaultGovtDays(totalDays, input.isPriorityCompany)
      : clampInt(input.govtDays, 0, totalDays);

  // 정부: 일 상/하한 적용 + 통상임금 100% 가정
  const govtDaily = Math.max(dailyFloor, Math.min(dailyCap, dailyWage));
  const govtPay = govtDaily * govtDays;

  // 회사 지급(총액): “회사가 통상임금 100% 지급한다” 가정
  // (실무에서 회사 지급 방식이 다르면 여기만 바꾸면 됨)
  const companyPayGross = dailyWage * totalDays;

  // 회사 순부담 = 회사지급 - 정부지급(환급/지원 가정)
  const companyNetBurden = Math.max(0, companyPayGross - govtPay);

  return {
    totalDays,
    dailyWage,
    dailyCap,
    dailyFloor,

    govtPay,
    companyPayGross,
    companyNetBurden,

    govtDays,
  };
}
