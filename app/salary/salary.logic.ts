import taxTable from "./tax_table_2026.json";

export type SalaryInput = {
  annualSalary: number; // 총 연봉(퇴직금 포함/미포함 모두 가능)
  annualNonTax: number; // 연 비과세 합계
  dependents: number;
  u20Children: number;
  severanceIncluded: boolean; // true면 13개월분으로 분할(월 스냅샷)
};

export type SalaryOutput = {
  months: number;

  // 월 스냅샷(12/13 분할 결과)
  monthlyGross: number;
  monthlyTaxable: number;

  monthlyPension: number;
  monthlyHealth: number;
  monthlyCare: number;
  monthlyEmployment: number;

  monthlyIncomeTax: number;
  monthlyLocalTax: number;

  monthlyTotalDeduction: number;
  monthlyNet: number;

  // 연 환산(정책: 월 스냅샷 * 12)
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
  return Math.round(Number.isFinite(n) ? n : 0);
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
type TaxRow = { max: number; [k: string]: any };

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
  const wage = Math.max(0, Math.floor(monthlyWageWon));
  if (TAX_KEYS.length === 0) return "";

  let lo = 0,
    hi = TAX_KEYS.length - 1;
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
  return String(TAX_KEYS[TAX_KEYS.length - 1]);
}

function lookupIncomeTax(monthlyWageWon: number, dependents: number, u20Children: number) {
  const dep = clampInt(dependents, 1, 11);
  const wage = Math.max(0, Math.floor(monthlyWageWon));

  const lastKeyNum = TAX_KEYS.length ? TAX_KEYS[TAX_KEYS.length - 1] : 0;
  const lastRow = lastKeyNum
    ? ((taxTable as any)[String(lastKeyNum)] as TaxRow | undefined)
    : undefined;
  const tableMax = lastRow?.max ?? 0;

  const taxAt10M = (() => {
    if (!lastRow) return 0;
    const v = lastRow[String(dep)];
    return typeof v === "number" ? v : 0;
  })();

  if (wage <= tableMax) {
    const bandKey = findBandKey(wage);
    if (!bandKey) return 0;
    const row = (taxTable as any)[bandKey] as TaxRow | undefined;
    if (!row) return 0;

    const base = typeof row[String(dep)] === "number" ? row[String(dep)] : 0;
    return Math.max(0, base - childDeduction(u20Children));
  }

  let baseHigh = 0;
  if (wage > 10_000_000 && wage <= 14_000_000) {
    baseHigh = taxAt10M + (wage - 10_000_000) * 0.98 * 0.35 + 25_000;
  } else if (wage > 14_000_000 && wage <= 28_000_000) {
    baseHigh = taxAt10M + 1_397_000 + (wage - 14_000_000) * 0.98 * 0.38;
  } else if (wage > 28_000_000 && wage <= 30_000_000) {
    baseHigh = taxAt10M + 6_610_600 + (wage - 28_000_000) * 0.98 * 0.40;
  } else if (wage > 30_000_000 && wage <= 45_000_000) {
    baseHigh = taxAt10M + 7_394_600 + (wage - 30_000_000) * 0.40;
  } else if (wage > 45_000_000 && wage <= 87_000_000) {
    baseHigh = taxAt10M + 13_394_600 + (wage - 45_000_000) * 0.42;
  } else {
    baseHigh = taxAt10M + 31_034_600 + (wage - 87_000_000) * 0.45;
  }

  return Math.max(0, roundWon(baseHigh) - childDeduction(u20Children));
}

export function calculateSalary(input: SalaryInput): SalaryOutput {
  // ✅ 월 스냅샷 분할 기준(퇴직금 포함이면 13)
  const splitMonths = input.severanceIncluded ? 13 : 12;

  // ✅ “연 환산” 정책: 월 스냅샷 * 12 (니 UI가 이 모델을 전제로 함)
  const annualFactor = 12;

  // 1) 월 스냅샷(월급/비과세를 같은 기준으로 나눔)
  const monthlyGross = input.annualSalary / splitMonths;
  const monthlyNonTax = input.annualNonTax / splitMonths;
  const monthlyTaxable = Math.max(0, monthlyGross - monthlyNonTax);

  // 2) 4대보험(월)
  const pensionBase = clamp(monthlyTaxable, CAP_2026.pensionBaseMin, CAP_2026.pensionBaseMax);
  const monthlyPension = roundWon(pensionBase * INS_2026.pensionEmp);

  const healthBase = clamp(monthlyTaxable, CAP_2026.healthBaseMin, CAP_2026.healthBaseMax);
  const monthlyHealth = roundWon(healthBase * INS_2026.healthEmp);

  const monthlyCare = roundWon(monthlyHealth * INS_2026.careOverHealth);
  const monthlyEmployment = roundWon(monthlyTaxable * INS_2026.employmentEmp);

  // 3) 세금(월)
  const monthlyIncomeTax = roundWon(
    lookupIncomeTax(monthlyTaxable, input.dependents, input.u20Children)
  );
  const monthlyLocalTax = Math.floor(monthlyIncomeTax * 0.1);

  const monthlyTotalDeduction =
    monthlyPension +
    monthlyHealth +
    monthlyCare +
    monthlyEmployment +
    monthlyIncomeTax +
    monthlyLocalTax;

  const monthlyNet = roundWon(monthlyGross - monthlyTotalDeduction);

  // 4) 연 환산(월 스냅샷 * 12)
  const annualGross = roundWon(monthlyGross * annualFactor);
  const annualTaxable = roundWon(monthlyTaxable * annualFactor);

  const annualPension = roundWon(monthlyPension * annualFactor);
  const annualHealth = roundWon(monthlyHealth * annualFactor);
  const annualCare = roundWon(monthlyCare * annualFactor);
  const annualEmployment = roundWon(monthlyEmployment * annualFactor);

  const annualIncomeTax = roundWon(monthlyIncomeTax * annualFactor);
  const annualLocalTax = roundWon(monthlyLocalTax * annualFactor);

  const annualTotalDeduction = roundWon(monthlyTotalDeduction * annualFactor);
  const annualNet = roundWon(monthlyNet * annualFactor);

  return {
    months: splitMonths,

    monthlyGross: roundWon(monthlyGross),
    monthlyTaxable: roundWon(monthlyTaxable),

    monthlyPension,
    monthlyHealth,
    monthlyCare,
    monthlyEmployment,

    monthlyIncomeTax,
    monthlyLocalTax,

    monthlyTotalDeduction: roundWon(monthlyTotalDeduction),
    monthlyNet,

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
