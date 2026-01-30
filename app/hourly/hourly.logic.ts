// app/hourly/hourly.logic.ts

export type TaxMode = "none" | "basic_9_71" | "simple_3_3";
export type PeriodMode = "monthly" | "annual";

export type HourlyInput = {
  // ✅ 항상 시급 입력
  hourlyWage: number; // 원

  // 근무시간(1일)
  dailyHours: number;
  dailyMinutes: number;

  // 근무일수 기준
  dayType: "week" | "month"; // 주/월
  daysCount: number; // 주면 0~7, 월이면 0~31

  // 월 연장근무(분)
  overtimeHours: number;
  overtimeMinutes: number;

  // 주휴수당
  includeWeeklyRestPay: boolean;

  // 세금(간단 프리셋)
  taxMode: TaxMode;

  // 수습(단순 90%)
  probation: boolean;
};

export type HourlyOutput = {
  // 시간(분)
  dailyWorkMinutes: number;
  weeklyWorkMinutes: number;
  weeklyRestMinutes: number;

  monthlyWorkMinutes: number;
  monthlyOvertimeMinutes: number;

  // ✅ 추가: UI에서 “주휴 분”을 월 기준으로 정확히 쓰기 위해 노출
  monthlyRestMinutes: number;

  monthlyPaidMinutes: number;

  // 금액(세전/세후)
  dailyGross: number;
  weeklyGross: number;
  monthlyGross: number;
  annualGross: number;

  taxMonthly: number;
  netMonthly: number;
  netAnnual: number;

  // 표시용(환산)
  hourlyWage: number;
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

// 월 환산: 52주 / 12개월 (일반 계산기들이 쓰는 값)
const WEEKS_PER_MONTH = 52 / 12;

export function calculateHourly(input: HourlyInput): HourlyOutput {
  const hourlyWage = Math.max(0, floorInt(input.hourlyWage, 0));

  const dailyWorkMinutes = toMinutes(input.dailyHours, input.dailyMinutes);

  const daysCountRaw = floorInt(input.daysCount, 0);
  const daysCount = clamp(daysCountRaw, 0, input.dayType === "week" ? 7 : 31);

  // 주/월 근로시간(분)
  const weeklyWorkMinutes = input.dayType === "week" ? dailyWorkMinutes * daysCount : 0;

  const monthlyWorkMinutes =
    input.dayType === "month"
      ? dailyWorkMinutes * daysCount
      : Math.round(weeklyWorkMinutes * WEEKS_PER_MONTH);

  // 연장근무(월)
  const monthlyOvertimeMinutes = toMinutes(input.overtimeHours, input.overtimeMinutes);

  // ✅ 주휴(단순 모델)
  // 주 15시간 이상일 때만 지급
  const weeklyWorkMinutesForEligibility =
    input.dayType === "week"
      ? weeklyWorkMinutes
      : Math.round(monthlyWorkMinutes / WEEKS_PER_MONTH);

  const eligibleWeeklyRest = weeklyWorkMinutesForEligibility >= 15 * 60;

  // 주휴 유급시간 = “하루 근무시간 1일치” (단순화)
  const weeklyRestMinutes =
    input.includeWeeklyRestPay && eligibleWeeklyRest ? dailyWorkMinutes : 0;

  const monthlyRestMinutes = Math.round(weeklyRestMinutes * WEEKS_PER_MONTH);

  // ✅ 월 유급시간 = 근로 + 주휴 + 연장
  const monthlyPaidMinutes = monthlyWorkMinutes + monthlyRestMinutes + monthlyOvertimeMinutes;

  // ✅ 세전 금액들 (표시용: daily/weekly는 “그 기간 기준” 단순 계산)
  const dailyGross = roundWon(hourlyWage * hoursFromMinutes(dailyWorkMinutes));

  const weeklyGross =
    input.dayType === "week"
      ? roundWon(hourlyWage * hoursFromMinutes(weeklyWorkMinutes + weeklyRestMinutes))
      : roundWon(
          hourlyWage *
            hoursFromMinutes(
              Math.round((monthlyWorkMinutes + monthlyRestMinutes) / WEEKS_PER_MONTH)
            )
        );

  let monthlyGross = hourlyWage * hoursFromMinutes(monthlyPaidMinutes);

  // 수습 90%
  if (input.probation) monthlyGross *= 0.9;

  monthlyGross = roundWon(monthlyGross);

  const annualGross = roundWon(monthlyGross * 12);

  // ✅ 세금(간단 프리셋)
  let taxRate = 0;
  if (input.taxMode === "basic_9_71") taxRate = 0.0971;
  if (input.taxMode === "simple_3_3") taxRate = 0.033;

  const taxMonthly = roundWon(monthlyGross * taxRate);
  const netMonthly = monthlyGross - taxMonthly;
  const netAnnual = roundWon(netMonthly * 12);

  return {
    hourlyWage,

    dailyWorkMinutes,
    weeklyWorkMinutes,
    weeklyRestMinutes,

    monthlyWorkMinutes,
    monthlyOvertimeMinutes,
    monthlyRestMinutes,
    monthlyPaidMinutes,

    dailyGross,
    weeklyGross,
    monthlyGross,
    annualGross,

    taxMonthly,
    netMonthly,
    netAnnual,
  };
}
