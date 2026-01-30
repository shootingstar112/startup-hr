export type ParentalMode = "normal" | "single_parent" | "six_plus_six";

export type PersonPlan = {
    label: "A" | "B";
    startYm: string; // "YYYY-MM"
    months: number;  // 1~18
    monthlyWage: number; // 통상임금(월), 원
};

export type NormalPlan = {
    mode: "normal" | "single_parent";
    months: number;       // 1~18
    monthlyWage: number;  // 원
};

export type SixPlusSixPlan = {
    mode: "six_plus_six";
    A: PersonPlan;
    B: PersonPlan;
};

export type ParentalInput = NormalPlan | SixPlusSixPlan;

export type MonthPayRow = {
    ym: string;          // "YYYY-MM" (표시용)
    who?: "A" | "B";     // 6+6일 때만
    monthIndex: number;  // 개인 기준 n개월차(1..). "정산용 추가 row"는 0으로 둠
    amount: number;      // 최종 지급액(원)
    retroTopUp: number;  // 그 달에 붙은 “정산/차액”(원) - 없으면 0
};

export type ParentalOutput = {
    rows: MonthPayRow[];
    total: number;
};

function clampInt(n: number, min: number, max: number) {
    const v = Math.floor(Number.isFinite(n) ? n : min);
    return Math.max(min, Math.min(max, v));
}
function floorWon(n: number) {
    return Math.floor(Number.isFinite(n) ? n : 0);
}

export function addYm(ym: string, add: number) {
    const [Y, M] = ym.split("-").map((x) => Number(x));
    if (!Number.isFinite(Y) || !Number.isFinite(M)) return ym;
    const base = (Y * 12 + (M - 1)) + add;
    const y = Math.floor(base / 12);
    const m = (base % 12) + 1;
    return `${y}-${String(m).padStart(2, "0")}`;
}

/**
 * (너가 쓰는 서비스 기준)
 * 1~6개월 100%, 7~18개월 80%
 */
function rateForMonthIndex(n: number) {
    return n <= 6 ? 1.0 : 0.8;
}

/**
 * 기본(일반/한부모) 상/하한 (원)
 */
function caps(mode: "normal" | "single_parent", n: number) {
    const floor = 700_000;

    if (mode === "single_parent") {
        const cap =
            n <= 3 ? 2_500_000 :
                n <= 6 ? 3_000_000 :
                    2_000_000;
        return { cap, floor };
    }

    const cap =
        n <= 3 ? 2_500_000 :
            n <= 6 ? 2_000_000 :
                1_600_000;
    return { cap, floor };
}

/**
 * ✅ 6+6 1~6개월 상한(원) : 고용노동부 자료 기준
 * 1:250만, 2:250만, 3:300만, 4:350만, 5:400만, 6:450만
 * 7개월~: 80% + 상한 160만, 하한 70만
 */
function capSixPlusSixFirst6(n: number) {
    if (n === 1) return 2_500_000;
    if (n === 2) return 2_500_000;
    if (n === 3) return 3_000_000;
    if (n === 4) return 3_500_000;
    if (n === 5) return 4_000_000;
    if (n === 6) return 4_500_000;
    return 0;
}

function monthlyPaySixPlusSix(monthlyWage: number, monthIndex: number) {
    const wage = Math.max(0, floorWon(monthlyWage));
    const floor = 700_000;

    if (monthIndex <= 6) {
        // 1~6개월: 100% + 상한(250/250/300/350/400/450) + 하한 70
        const base = wage; // 100%
        const cap = capSixPlusSixFirst6(monthIndex);
        return Math.max(floor, Math.min(cap, base));
    }

    // 7개월~: 80% + 상한 160 + 하한 70
    const base = floorWon(wage * 0.8);
    const cap = 1_600_000;
    return Math.max(floor, Math.min(cap, base));
}

/** 기본 월 지급액(일반/한부모 룰) */
function monthlyPayFromWage(mode: "normal" | "single_parent", monthlyWage: number, monthIndex: number) {
    const wage = Math.max(0, floorWon(monthlyWage));
    const r = rateForMonthIndex(monthIndex);
    const base = floorWon(wage * r);

    const { cap, floor } = caps(mode, monthIndex);
    return Math.max(floor, Math.min(cap, base));
}

/**
 * ✅ 6+6에서 "같은 n개월차" 기준으로
 * (6+6 상한 적용 지급액) - (일반 상한 적용 지급액) 차액
 * - 통상임금이 낮으면 차액 0
 */
function sixPlusSixDeltaVsNormal(monthlyWage: number, monthIndex: number) {
    const six = monthlyPaySixPlusSix(monthlyWage, monthIndex);
    const normal = monthlyPayFromWage("normal", monthlyWage, monthIndex);
    return Math.max(0, six - normal);
}

function buildPersonRows(
    who: "A" | "B",
    startYm: string,
    months: number,
    monthlyWage: number,
    modeForCaps: "normal" | "single_parent",
) {
    const m = clampInt(months, 1, 18);
    const rows: MonthPayRow[] = [];
    for (let i = 0; i < m; i++) {
        const monthIndex = i + 1;
        const ym = addYm(startYm, i);
        const amount = monthlyPayFromWage(modeForCaps, monthlyWage, monthIndex);
        rows.push({ ym, who, monthIndex, amount, retroTopUp: 0 });
    }
    return rows;
}

export function calculateParentalLeave(input: ParentalInput): ParentalOutput {
    switch (input.mode) {
        case "normal":
        case "single_parent": {
            const mode = input.mode;
            const months = clampInt(input.months, 1, 18);
            const monthlyWage = Math.max(0, floorWon(input.monthlyWage));

            const rows: MonthPayRow[] = [];
            for (let i = 0; i < months; i++) {
                const monthIndex = i + 1;
                const amount = monthlyPayFromWage(mode, monthlyWage, monthIndex);
                rows.push({ ym: "YYYY-MM", monthIndex, amount, retroTopUp: 0 });
            }

            const total = rows.reduce((s, r) => s + r.amount, 0);
            return { rows, total };
        }

case "six_plus_six": {
  const A = input.A;
  const B = input.B;

  const aMonths = clampInt(A.months, 1, 18);
  const bMonths = clampInt(B.months, 1, 18);

  // ✅ 특례 적용 개월수: 둘 중 최소값(최대 6)
  // (A 3개월, B 6개월이면 m=3까지만 특례/정산 발생)
  const m = Math.min(6, aMonths, bMonths);

  // 기본(normal) 지급 rows
  const aBaseRows = buildPersonRows("A", A.startYm, aMonths, A.monthlyWage, "normal");
  const bBaseRows = buildPersonRows("B", B.startYm, bMonths, B.monthlyWage, "normal");

  // ✅ 늦게 시작한 사람(later) / 먼저 시작한 사람(earlier)
  // (YYYY-MM은 문자열 비교로 안전)
  const laterWho: "A" | "B" = A.startYm >= B.startYm ? "A" : "B";
  const earlierWho: "A" | "B" = laterWho === "A" ? "B" : "A";

  const laterPlan = laterWho === "A" ? A : B;
  const earlierPlan = earlierWho === "A" ? A : B;

  const laterBase = laterWho === "A" ? aBaseRows : bBaseRows;

  // ✅ 1) later: 1..m개월까지만 6+6 상한 적용
  //    (표시용) normal 대비 증가분을 retroTopUp에 넣어둠  ← B의 (+정산) 여기서 유지됨
  const laterFinal: MonthPayRow[] = laterBase.map((r) => {
    if (r.monthIndex > m) return r;

    const six = monthlyPaySixPlusSix(laterPlan.monthlyWage, r.monthIndex);
    const inc = Math.max(0, six - r.amount);
    return { ...r, amount: six, retroTopUp: inc };
  });

  // ✅ 2) earlier 정산(차액): later의 3..m개월차 달에 "그 달에" 지급
  //    (A가 먼저 끝났어도, B의 3..m개월차 달에 A 정산이 찍히는 게 정상)
  const earlierTopUpRows: MonthPayRow[] = [];
  for (const lr of laterBase) {
    const k = lr.monthIndex;
    if (k < 3 || k > m) continue;

    const topUp = sixPlusSixDeltaVsNormal(earlierPlan.monthlyWage, k);
    if (topUp <= 0) continue;

    earlierTopUpRows.push({
      ym: lr.ym,          // ✅ 발생한 달 = later의 해당 달
      who: earlierWho,    // ✅ earlier 칸에 (+정산)으로 보이게
      monthIndex: 0,      // 정산 row
      amount: topUp,      // earlier에게 들어오는 차액
      retroTopUp: topUp,  // 표시용 (+정산)
    });
  }

  // ✅ 3) A/B에 다시 매핑 (later만 laterFinal로 덮고, 나머진 base 유지)
  const aFinal = laterWho === "A" ? laterFinal : aBaseRows;
  const bFinal = laterWho === "B" ? laterFinal : bBaseRows;

  const out: MonthPayRow[] = [...aFinal, ...bFinal, ...earlierTopUpRows];

  // 정렬: 월 오름차순, A 먼저, B 다음
  // 같은 달 같은 사람: 기본(monthIndex>0) 먼저, 정산(monthIndex=0) 나중
  out.sort((x, y) => {
    if (x.ym !== y.ym) return x.ym < y.ym ? -1 : 1;
    const wx = x.who ?? "";
    const wy = y.who ?? "";
    if (wx !== wy) return wx < wy ? -1 : 1;
    return y.monthIndex - x.monthIndex;
  });

  const total = out.reduce((s, r) => s + r.amount, 0);
  return { rows: out, total };
}





        default: {
            const _never: never = input;
            return { rows: [], total: 0 };
        }
    }
}
