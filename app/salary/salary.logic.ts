import taxTable from "./tax_table_2026.json";

export type SalaryInput = {
  annualSalary: number; // 연봉(총액)
  monthlyNonTax: number; // 월 비과세 합계
  dependents: number; // 공제대상가족 수(본인 포함) 1~
  u20Children: number; // 8~20세 자녀 수(홈택스 규칙)
};

export type SalaryOutput = {
  monthlyGross: number; // 월 세전(총액)
  monthlyTaxable: number; // 월급여(비과세 제외) = 간이세액표 조회용
  pension: number;
  health: number;
  care: number;
  employment: number;
  incomeTax: number; // 간이세액표 결과(자녀공제 반영)
  localTax: number; // 지방소득세(10%)
  totalDeduction: number;
  monthlyNet: number;
};

function clampInt(n: number, min: number, max: number) {
  const v = Math.floor(Number.isFinite(n) ? n : min);
  return Math.max(min, Math.min(max, v));
}

function roundWon(n: number) {
  return Math.round(n);
}

/**
 * 2026 4대보험(근로자 부담) 기본값
 * - 실제 100% 일치엔 상/하한, 회사별 기준소득월액 보정/반올림 규칙 등이 들어갈 수 있음
 * - 우선 MVP: 월급여(비과세 제외) 기준으로 계산
 */
const INS_2026 = {
  pensionEmp: 0.045, // 국민연금 근로자 4.5%
  healthEmp: 0.03595, // 건강보험 근로자 3.595%
  careOverHealth: 0.13, // 장기요양 = 건강보험료 * 비율(연도별 고시로 교체)
  employmentEmp: 0.009, // 고용보험 근로자 0.9%
};

// ====== 간이세액표(조견표) lookup (구간형) ======

type TaxRow = {
  max: number; // 미만(원)
  [k: string]: number; // "1"~"11"
};

// 키(min)가 string으로 들어있음: "770000", "775000", ...
const TAX_KEYS = Object.keys(taxTable as any)
  .map((x) => Number(x))
  .filter((x) => Number.isFinite(x))
  .sort((a, b) => a - b);

/**
 * 홈택스 안내(2024.03.01 시행) 규칙:
 * - 공제대상가족 중 8~20세 이하 자녀가 있으면
 *   간이세액표 금액에서 자녀수별 금액을 차감
 * - 차감 후 음수면 0원
 */
function childDeduction(u20Children: number) {
  const n = Math.max(0, Math.floor(u20Children));
  if (n === 0) return 0;
  if (n === 1) return 12_500;
  if (n === 2) return 29_160;
  return 29_160 + (n - 2) * 25_000;
}

// monthlyWageWon(원)이 속한 "이상(min)" 키를 찾는다(이분탐색)
function findBandKey(monthlyWageWon: number) {
  if (TAX_KEYS.length === 0) return null;

  let lo = 0;
  let hi = TAX_KEYS.length - 1;
  let ans = TAX_KEYS[0];

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const k = TAX_KEYS[mid];
    if (k <= monthlyWageWon) {
      ans = k;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return String(ans);
}

function lookupIncomeTax(monthlyWageWon: number, dependents: number, u20Children: number) {
  const dep = clampInt(dependents, 1, 11);

  const bandKey = findBandKey(monthlyWageWon);
  if (!bandKey) return 0;

  const row = (taxTable as any)[bandKey] as TaxRow | undefined;
  if (!row) return 0;

  const base = typeof (row as any)[String(dep)] === "number" ? (row as any)[String(dep)] : 0;

  // 자녀 공제 차감 (음수면 0)
  const adjusted = Math.max(0, base - childDeduction(u20Children));
  return adjusted;
}

export function calculateSalary(input: SalaryInput): SalaryOutput {
  const monthlyGross = input.annualSalary / 12;

  // ✅ 간이세액표 조회용 월급여(비과세 제외)
  const monthlyTaxable = Math.max(0, monthlyGross - input.monthlyNonTax);

  // 4대보험(월급여 기준, MVP)
  const pension = monthlyTaxable * INS_2026.pensionEmp;
  const health = monthlyTaxable * INS_2026.healthEmp;
  const care = health * INS_2026.careOverHealth;
  const employment = monthlyTaxable * INS_2026.employmentEmp;

  // ✅ 소득세: "월급여(비과세 제외)"로 표 조회 (보험 빼지 말 것)
  const incomeTax = lookupIncomeTax(monthlyTaxable, input.dependents, input.u20Children);
  const localTax = incomeTax * 0.1;

  const totalDeduction = pension + health + care + employment + incomeTax + localTax;
  const monthlyNet = monthlyGross - totalDeduction;

  return {
    monthlyGross: roundWon(monthlyGross),
    monthlyTaxable: roundWon(monthlyTaxable),
    pension: roundWon(pension),
    health: roundWon(health),
    care: roundWon(care),
    employment: roundWon(employment),
    incomeTax: roundWon(incomeTax),
    localTax: roundWon(localTax),
    totalDeduction: roundWon(totalDeduction),
    monthlyNet: roundWon(monthlyNet),
  };
}
