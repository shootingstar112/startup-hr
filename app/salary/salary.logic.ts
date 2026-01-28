import taxTable from "./tax_table_2026.json";

export type SalaryInput = {
  annualSalary: number;        // 연봉(총액)
  annualNonTax: number;        // 연 비과세 합계(연간)
  dependents: number;
  u20Children: number;
  severanceIncluded: boolean;  // 포함=13분할, 별도=12분할
};

export type SalaryOutput = {
  months: number; // 12 or 13

  annualGross: number;   // 연 세전(총액)
  annualTaxable: number; // 연 과세대상(=연 세전 - 연 비과세)

  annualPension: number;
  annualHealth: number;
  annualCare: number;
  annualEmployment: number;

  annualIncomeTax: number; // (월 간이세액표 기반을 연으로 환산)
  annualLocalTax: number;

  annualTotalDeduction: number;
  annualNet: number;
};

function clampInt(n: number, min: number, max: number) {
  const v = Math.floor(Number.isFinite(n) ? n : min);
  return Math.max(min, Math.min(max, v));
}
function clamp(n: number, min: number, max: number) {
  const v = Number.isFinite(n) ? n : min;
  return Math.max(min, Math.min(max, v));
}
function roundWon(n: number) {
  return Math.round(n);
}

/**
 * 2026 요율 (근로자 부담)
 * - 국민연금: 근로자 4.75%
 * - 건강보험: 근로자 3.595% (총 7.19%의 절반)
 * - 장기요양: 건강보험료의 13.14%  (= 총요율 0.9448%에 대응)
 * - 고용보험(실업급여): 근로자 0.9%
 */
const INS_2026 = {
  pensionEmp: 0.0475,
  healthEmp: 0.03595,
  careOverHealth: 0.1314,
  employmentEmp: 0.009,
};

/**
 * 2026 상/하한 (네가 준 값 그대로)
 * - 국민연금 기준소득월액: 400,000 ~ 6,370,000 (2025.7~2026.6)
 * - 건강보험 보수월액: 280,383 ~ 127,725,730 (2026.1~12)
 */
const CAP_2026 = {
  pensionBaseMin: 400_000,
  pensionBaseMax: 6_370_000,

  healthBaseMin: 280_383,
  healthBaseMax: 127_725_730,
};

// ====== 간이세액표 lookup ======

type TaxRow = {
  max: number;
  [k: string]: number; // "1"~"11"
};

const TAX_KEYS = Object.keys(taxTable as any)
  .map((x) => Number(x))
  .filter((x) => Number.isFinite(x))
  .sort((a, b) => a - b);

function childDeduction(u20Children: number) {
  const n = Math.max(0, Math.floor(u20Children));
  if (n === 0) return 0;
  if (n === 1) return 12_500;
  if (n === 2) return 29_160;
  return 29_160 + (n - 2) * 25_000;
}

function findBandKey(monthlyWageWon: number) {
  if (TAX_KEYS.length === 0) return null;

  // 1) floor(<=)로 1차 선택
  let lo = 0;
  let hi = TAX_KEYS.length - 1;
  let idx = 0;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const k = TAX_KEYS[mid];
    if (k <= monthlyWageWon) {
      idx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  // 2) row.max 초과인데 다음 키로 못 넘어가는 “갭” 방지
  while (idx < TAX_KEYS.length - 1) {
    const keyStr = String(TAX_KEYS[idx]);
    const row = (taxTable as any)[keyStr] as TaxRow | undefined;
    if (!row) break;

    if (typeof row.max === "number" && monthlyWageWon > row.max) {
      idx += 1; // 다음 구간으로
      continue;
    }
    break;
  }

  return String(TAX_KEYS[idx]);
}

function lookupIncomeTax(monthlyWageWon: number, dependents: number, u20Children: number) {
  const dep = clampInt(dependents, 1, 11);

  const bandKey = findBandKey(monthlyWageWon);
  if (!bandKey) return 0;

  const row = (taxTable as any)[bandKey] as TaxRow | undefined;
  if (!row) return 0;

  const base = typeof (row as any)[String(dep)] === "number" ? (row as any)[String(dep)] : 0;
  return Math.max(0, base - childDeduction(u20Children));
}

export function calculateSalary(input: SalaryInput): SalaryOutput {
  const months = input.severanceIncluded ? 13 : 12;

  // 내부 계산은 “월”로 나눠서(간이세액표가 월 기준이니까)
  const monthlyGross = input.annualSalary / months;
  const monthlyNonTax = input.annualNonTax / months;
  const monthlyTaxable = Math.max(0, monthlyGross - monthlyNonTax);

  // ✅ 국민연금: 기준소득월액 상/하한 적용
  const pensionBase = clamp(monthlyTaxable, CAP_2026.pensionBaseMin, CAP_2026.pensionBaseMax);
  const pension = pensionBase * INS_2026.pensionEmp;

  // ✅ 건강보험: 보수월액 상/하한 적용
  const healthBase = clamp(monthlyTaxable, CAP_2026.healthBaseMin, CAP_2026.healthBaseMax);
  const health = healthBase * INS_2026.healthEmp;

  // ✅ 장기요양: 건강보험료의 13.14%
  const care = health * INS_2026.careOverHealth;

  // 고용보험(실업급여): 근로자 0.9% (상/하한은 일단 미적용)
  const employment = monthlyTaxable * INS_2026.employmentEmp;

  // 소득세: 월 과세급여로 간이세액표 조회 → 월 값
  const incomeTax = lookupIncomeTax(monthlyTaxable, input.dependents, input.u20Children);
  const localTax = incomeTax * 0.1;

  const totalDeduction = pension + health + care + employment + incomeTax + localTax;
  const monthlyNet = monthlyGross - totalDeduction;

  // 연 환산(반환은 “연”만)
  const annualGross = monthlyGross * months;
  const annualTaxable = monthlyTaxable * months;

  const annualPension = pension * months;
  const annualHealth = health * months;
  const annualCare = care * months;
  const annualEmployment = employment * months;

  const annualIncomeTax = incomeTax * months;
  const annualLocalTax = localTax * months;

  const annualTotalDeduction = totalDeduction * months;
  const annualNet = monthlyNet * months;

  return {
    months,

    annualGross: roundWon(annualGross),
    annualTaxable: roundWon(annualTaxable),

    annualPension: roundWon(annualPension),
    annualHealth: roundWon(annualHealth),
    annualCare: roundWon(annualCare),
    annualEmployment: roundWon(annualEmployment),

    annualIncomeTax: roundWon(annualIncomeTax),
    annualLocalTax: roundWon(annualLocalTax),

    annualTotalDeduction: roundWon(annualTotalDeduction),
    annualNet: roundWon(annualNet),
  };
}
