import taxTable from "./tax_table_2026.json";

export type SalaryInput = {
  annualSalary: number;
  annualNonTax: number;
  dependents: number;
  u20Children: number;
  severanceIncluded: boolean;
};

export type SalaryOutput = {
  months: number;

  annualGross: number;
  annualTaxable: number;

  annualPension: number;
  annualHealth: number;
  annualCare: number;
  annualEmployment: number;

  annualIncomeTax: number;
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
 */
const INS_2026 = {
  pensionEmp: 0.0475,
  healthEmp: 0.03595,
  careOverHealth: 0.1314,
  employmentEmp: 0.009,
};

/**
 * 2026 상/하한
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
  [k: string]: any; // "1"~"11"
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

/**
 * ✅ wage 이하의 최대 key(이분탐색) 기반 + row.max 포함 구간 찾기
 * (네가 준 버전 유지)
 */
function findBandKey(monthlyWageWon: number) {
  const wage = Math.max(0, Math.floor(monthlyWageWon));
  if (TAX_KEYS.length === 0) return "";

  let lo = 0, hi = TAX_KEYS.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const k = TAX_KEYS[mid];
    if (k <= wage) lo = mid + 1;
    else hi = mid - 1;
  }

  let idx = Math.max(0, hi);

  const maxSteps = Math.min(50, TAX_KEYS.length);
  for (let step = 0; step < maxSteps; step++) {
    const k = TAX_KEYS[idx];
    const row = (taxTable as any)[String(k)] as TaxRow | undefined;

    if (row?.max != null && k <= wage && wage <= row.max) return String(k);

    if (row?.max == null || wage > row.max) {
      if (idx < TAX_KEYS.length - 1) idx++;
      else break;
      continue;
    }

    if (wage < k) {
      if (idx > 0) idx--;
      else break;
      continue;
    }

    break;
  }

  if (wage < TAX_KEYS[0]) return String(TAX_KEYS[0]);

  // ⚠️ 여기서 “마지막 리턴”은 유지하되,
  // 실제 소득세 계산(lookupIncomeTax)에서 10,000,000 초과면 공식을 타게 만들거라 괜찮음.
  return String(TAX_KEYS[TAX_KEYS.length - 1]);
}

/**
 * ✅ (핵심) 표 마지막 max(=10,000,000) 초과 구간은
 * 네가 준 ‘초과 구간 공식’으로 계산
 */
function lookupIncomeTax(monthlyWageWon: number, dependents: number, u20Children: number) {
  const dep = clampInt(dependents, 1, 11);
  const wage = Math.max(0, Math.floor(monthlyWageWon));

  // --- 표의 마지막 max(대개 10,000,000) 가져오기 ---
  const lastKeyNum = TAX_KEYS.length ? TAX_KEYS[TAX_KEYS.length - 1] : 0;
  const lastRow = lastKeyNum ? ((taxTable as any)[String(lastKeyNum)] as TaxRow | undefined) : undefined;
  const tableMax = lastRow?.max ?? 0;

  // --- 10,000,000(=10,000천원) 시점의 “해당세액” 구하기 ---
  // json이 9,980,000~10,000,000 마지막 행으로 되어있으니,
  // 10,000,000은 이 마지막 행의 dep 값을 “10,000천원인 경우의 해당세액”으로 사용.
  const taxAt10M = (() => {
    if (!lastRow) return 0;
    const v = lastRow[String(dep)];
    return typeof v === "number" ? v : 0;
  })();

  // --- 10,000,000 이하: 기존처럼 표 lookup ---
  if (wage <= tableMax) {
    const bandKey = findBandKey(wage);
    if (!bandKey) return 0;
    const row = (taxTable as any)[bandKey] as TaxRow | undefined;
    if (!row) return 0;

    const base = typeof row[String(dep)] === "number" ? row[String(dep)] : 0;
    return Math.max(0, base - childDeduction(u20Children));
  }

  // --- 10,000,000 초과: 네가 준 공식 적용 ---
  // (스크린샷에 “98%를 곱한 금액”이 명시된 구간은 그대로 0.98 적용)
  // (명시 없는 구간은 스샷대로 그대로 계산)
  let baseHigh = 0;

  if (wage > 10_000_000 && wage <= 14_000_000) {
    // (10,000천원인 경우의 해당세액) + (초과금액*98%*35%) + 25,000
    baseHigh =
      taxAt10M +
      (wage - 10_000_000) * 0.98 * 0.35 +
      25_000;
  } else if (wage > 14_000_000 && wage <= 28_000_000) {
    // (10,000천원 해당세액) + 1,397,000 + ((14,000천원 초과분)*98%*38%)
    baseHigh =
      taxAt10M +
      1_397_000 +
      (wage - 14_000_000) * 0.98 * 0.38;
  } else if (wage > 28_000_000 && wage <= 30_000_000) {
    // (10,000천원 해당세액) + 6,610,600 + ((28,000천원 초과분)*98%*40%)
    baseHigh =
      taxAt10M +
      6_610_600 +
      (wage - 28_000_000) * 0.98 * 0.40;
  } else if (wage > 30_000_000 && wage <= 45_000_000) {
    // (10,000천원 해당세액) + 7,394,600 + ((30,000천원 초과분)*40%)
    baseHigh =
      taxAt10M +
      7_394_600 +
      (wage - 30_000_000) * 0.40;
  } else if (wage > 45_000_000 && wage <= 87_000_000) {
    // (10,000천원 해당세액) + 13,394,600 + ((45,000천원 초과분)*42%)
    baseHigh =
      taxAt10M +
      13_394_600 +
      (wage - 45_000_000) * 0.42;
  } else {
    // 87,000천원 초과:
    // (10,000천원 해당세액) + 31,034,600 + ((87,000천원 초과분)*45%)
    baseHigh =
      taxAt10M +
      31_034_600 +
      (wage - 87_000_000) * 0.45;
  }

  const afterChild = Math.max(0, roundWon(baseHigh) - childDeduction(u20Children));
  return afterChild;
}

export function calculateSalary(input: SalaryInput): SalaryOutput {
  const months = input.severanceIncluded ? 13 : 12;

  const monthlyGross = input.annualSalary / months;
  const monthlyNonTax = input.annualNonTax / months;
  const monthlyTaxable = Math.max(0, monthlyGross - monthlyNonTax);

  // 4대보험(월)
  const pensionBase = clamp(monthlyTaxable, CAP_2026.pensionBaseMin, CAP_2026.pensionBaseMax);
  const pension = roundWon(pensionBase * INS_2026.pensionEmp);

  const healthBase = clamp(monthlyTaxable, CAP_2026.healthBaseMin, CAP_2026.healthBaseMax);
  const health = roundWon(healthBase * INS_2026.healthEmp);

  const care = roundWon(health * INS_2026.careOverHealth);
  const employment = roundWon(monthlyTaxable * INS_2026.employmentEmp);

  // ✅ 소득세/지방세: “월 간이세액표 + 초과구간 공식”
  const incomeTax = roundWon(lookupIncomeTax(monthlyTaxable, input.dependents, input.u20Children));
  const localTax = Math.floor(incomeTax * 0.1);

  const totalDeduction = pension + health + care + employment + incomeTax + localTax;
  const monthlyNet = monthlyGross - totalDeduction;

  // 연 환산
  const annualGross = roundWon(monthlyGross * months);
  const annualTaxable = roundWon(monthlyTaxable * months);

  const annualPension = roundWon(pension * months);
  const annualHealth = roundWon(health * months);
  const annualCare = roundWon(care * months);
  const annualEmployment = roundWon(employment * months);

  const annualIncomeTax = roundWon(incomeTax * months);
  const annualLocalTax = roundWon(localTax * months);

  const annualTotalDeduction = roundWon(totalDeduction * months);
  const annualNet = roundWon(monthlyNet * months);

  return {
    months,
    annualGross,
    annualTaxable,

    annualPension,
    annualHealth,
    annualCare,
    annualEmployment,

    annualIncomeTax,
    annualLocalTax,

    annualTotalDeduction,
    annualNet,
  };
}
