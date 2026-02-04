export type ParentalMode = "normal" | "single_parent" | "six_plus_six";

export type PersonPlan = {
  label: "A" | "B";
  startYm: string; // "YYYY-MM"
  months: number; // 1~18
  monthlyWage: number; // 통상임금(월), 원
};

export type NormalPlan = {
  mode: "normal" | "single_parent";
  months: number; // 1~18
  monthlyWage: number; // 원
};

/**
 * ✅ 6+6: 출산일 개념 추가
 * - childBirthYmd: "YYYY-MM-DD"
 * - 6+6 특례/정산 카운팅(k=1..6)은 "출생월(YYYY-MM)" 기준으로만 시작
 * - 출생월 이전에 시작한 휴직분은 "영향 없음(=normal 그대로)" 이고,
 *   출생월부터만 k를 새로 1로 잡아 특례를 적용
 */
export type SixPlusSixPlan = {
  mode: "six_plus_six";
  childBirthYmd: string; // ✅ 추가
  A: PersonPlan;
  B: PersonPlan;
};

export type ParentalInput = NormalPlan | SixPlusSixPlan;

export type MonthPayRow = {
  ym: string; // "YYYY-MM" (표시용)
  who?: "A" | "B"; // 6+6일 때만
  monthIndex: number; // 개인 기준 n개월차(1..). "정산용 추가 row"는 0
  amount: number; // 최종 지급액(원)
  retroTopUp: number; // 그 달에 붙은 “정산/차액”(원) - 없으면 0

  cap?: number;  // ✅ 월 상한(원) - normal/한부모/6+6 모두 표시용
  floor?: number; // (선택) 하한도 표시하고 싶으면
  rate?: number;  // (선택) 지급률도 표시하고 싶으면
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

/** YYYY-MM -> month index */
function ymToIndex(ym: string) {
  const [Y, M] = ym.split("-").map((x) => Number(x));
  if (!Number.isFinite(Y) || !Number.isFinite(M)) return NaN;
  return Y * 12 + (M - 1);
}
function ymLt(a: string, b: string) {
  return ymToIndex(a) < ymToIndex(b);
}
function ymGte(a: string, b: string) {
  return ymToIndex(a) >= ymToIndex(b);
}

export function addYm(ym: string, add: number) {
  const [Y, M] = ym.split("-").map((x) => Number(x));
  if (!Number.isFinite(Y) || !Number.isFinite(M)) return ym;
  const base = Y * 12 + (M - 1) + add;
  const y = Math.floor(base / 12);
  const m = (base % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" -> "YYYY-MM" (최소 방어) */
function birthYmFromYmd(ymd: string) {
  const s = (ymd ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s.slice(0, 7);
}

/**
 * (너가 쓰는 서비스 기준)
 * 1~6개월 100%, 7~18개월 80%
 */
function rateForMonthIndex(n: number) {
  return n <= 6 ? 1.0 : 0.8;
}

/** 기본(일반/한부모) 상/하한 (원) */
function caps(mode: "normal" | "single_parent", n: number) {
  const floor = 700_000;

  if (mode === "single_parent") {
    const cap = n <= 3 ? 3_000_000 : n <= 6 ? 2_000_000 : 1_600_000;
    return { cap, floor };
  }

  const cap = n <= 3 ? 2_500_000 : n <= 6 ? 2_000_000 : 1_600_000;
  return { cap, floor };
}

/**
 * ✅ 6+6 1~6개월 상한(원)
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
    const base = wage; // 100%
    const cap = capSixPlusSixFirst6(monthIndex);
    return Math.max(floor, Math.min(cap, base));
  }

  const base = floorWon(wage * 0.8);
  const cap = 1_600_000;
  return Math.max(floor, Math.min(cap, base));
}

/** 기본 월 지급액(일반/한부모 룰) */
function monthlyPayFromWage(
  mode: "normal" | "single_parent",
  monthlyWage: number,
  monthIndex: number
) {
  const wage = Math.max(0, floorWon(monthlyWage));
  const r = rateForMonthIndex(monthIndex);
  const base = floorWon(wage * r);

  const { cap, floor } = caps(mode, monthIndex);
  return Math.max(floor, Math.min(cap, base));
}

/**
 * ✅ 6+6에서 "같은 k개월차" 기준으로
 * (6+6 상한 적용 지급액) - (일반 상한 적용 지급액) 차액
 */
function sixPlusSixDeltaVsNormal(monthlyWage: number, monthIndex: number) {
  const six = monthlyPaySixPlusSix(monthlyWage, monthIndex);
  const normal = monthlyPayFromWage("normal", monthlyWage, monthIndex);
  return Math.max(0, six - normal);
}

/**
 * 개인 rows: monthIndex는 "휴직 시작 기준"으로 1..m 유지 (✅ 출산 전 달도 정상 카운팅)
 * => 출산 전 달을 250/250/250/200...로 만들려면 이게 맞음
 */
function buildPersonRows(
  who: "A" | "B",
  startYm: string,
  months: number,
  monthlyWage: number,
  modeForCaps: "normal" | "single_parent"
) {
  const m = clampInt(months, 1, 18);
  const rows: MonthPayRow[] = [];
  for (let i = 0; i < m; i++) {
    const monthIndex = i + 1;
    const ym = addYm(startYm, i);
    const amount = monthlyPayFromWage(modeForCaps, monthlyWage, monthIndex);
    const { cap, floor } = caps(modeForCaps, monthIndex);

    rows.push({
      ym,
      who,
      monthIndex,
      amount,
      retroTopUp: 0,
      cap,
      floor,
      rate: rateForMonthIndex(monthIndex),
    });
  }
  return rows;
}

/**
 * 출생월(birthYm) 이후에 실제로 "휴직이 존재하는 달 수" (inclusive)
 * - endYm < birthYm 이면 0
 * - startYm < birthYm이면 effectiveStart = birthYm
 */
function postBirthMonthsCount(startYm: string, months: number, birthYm: string) {
  const m = clampInt(months, 1, 18);
  const endYm = addYm(startYm, m - 1);
  if (ymLt(endYm, birthYm)) return 0;

  const effStart = ymLt(startYm, birthYm) ? birthYm : startYm;
  return ymToIndex(endYm) - ymToIndex(effStart) + 1;
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
        const { cap, floor } = caps(mode, monthIndex);

        rows.push({
          ym: "",                 // ✅ normal/single은 실제 월 표시 안 할 거면 빈 값
          monthIndex,
          amount,
          retroTopUp: 0,
          cap,                    // ✅ 상한
          floor,                  // (선택)
          rate: rateForMonthIndex(monthIndex), // (선택)
        });
      }


      const total = rows.reduce((s, r) => s + r.amount, 0);
      return { rows, total };
    }

    case "six_plus_six": {
      const A = input.A;
      const B = input.B;

      const birthYm = birthYmFromYmd(input.childBirthYmd);
      if (!birthYm) {
        // 출산일이 이상하면(방어), 그냥 normal 2명 합산처럼 처리(특례 없음)
        const aMonths = clampInt(A.months, 1, 18);
        const bMonths = clampInt(B.months, 1, 18);

        const aBaseRows = buildPersonRows("A", A.startYm, aMonths, A.monthlyWage, "normal");
        const bBaseRows = buildPersonRows("B", B.startYm, bMonths, B.monthlyWage, "normal");

        const out: MonthPayRow[] = [...aBaseRows, ...bBaseRows];
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

      const aMonths = clampInt(A.months, 1, 18);
      const bMonths = clampInt(B.months, 1, 18);

      // ✅ 기본(normal) 지급 rows: 출산 전 포함해서 그대로 깐다
      const aBaseRows = buildPersonRows("A", A.startYm, aMonths, A.monthlyWage, "normal");
      const bBaseRows = buildPersonRows("B", B.startYm, bMonths, B.monthlyWage, "normal");

      // ✅ 출생월 이후 실제 사용 개월수(각자)
      const aPost = postBirthMonthsCount(A.startYm, aMonths, birthYm);
      const bPost = postBirthMonthsCount(B.startYm, bMonths, birthYm);

      // ✅ 출생월 이후 둘 다 존재하는 구간에서만 특례 적용 가능
      const m = Math.min(6, aPost, bPost);
      if (m <= 0) {
        // 출산월 이후에 둘 다 겹치지 않으면 특례/정산 없음
        const out: MonthPayRow[] = [...aBaseRows, ...bBaseRows];
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

      /**
       * ✅ later/earlier 판단도 "출생월 기준 effective start"로 한다
       * - 출생월 이전 시작이면 effectiveStart = birthYm
       */
      const aEff = ymLt(A.startYm, birthYm) ? birthYm : A.startYm;
      const bEff = ymLt(B.startYm, birthYm) ? birthYm : B.startYm;

      const laterWho: "A" | "B" = ymGte(aEff, bEff) ? "A" : "B";
      const earlierWho: "A" | "B" = laterWho === "A" ? "B" : "A";

      const laterPlan = laterWho === "A" ? A : B;
      const earlierPlan = earlierWho === "A" ? A : B;

      const laterBase = laterWho === "A" ? aBaseRows : bBaseRows;

      // ✅ later의 특례 시작월 = max(later.startYm, birthYm)
      const laterEffStart = ymLt(laterPlan.startYm, birthYm) ? birthYm : laterPlan.startYm;

      /**
       * ✅ later의 (ym -> k) 매핑 만들기
       * - k는 출생월(또는 later 시작월이 출생월 이후면 그 달)부터 1..m
       * - 출생월 이전 달은 매핑 없음(=영향 없음)
       */
      const ymToK = new Map<string, number>();
      for (let i = 0; i < m; i++) {
        const ym = addYm(laterEffStart, i);
        ymToK.set(ym, i + 1);
      }

      // ✅ 1) later: k=1..m 구간만 6+6 상한 적용
      const laterFinal: MonthPayRow[] = laterBase.map((r) => {
        const k = ymToK.get(r.ym);
        if (!k) return r; // 출산 전 or 겹침 밖: 영향 없음

        const six = monthlyPaySixPlusSix(laterPlan.monthlyWage, k);
        const inc = Math.max(0, six - r.amount);

        return {
          ...r,
          amount: six,
          retroTopUp: inc,
          cap: capSixPlusSixFirst6(k), // ✅ 6+6 상한으로 덮어쓰기
          floor: 700_000,              // ✅ 하한도 같이 맞춤
          rate: 1.0,                   // ✅ 1~6은 100%
        };
      });


      // ✅ 2) earlier 정산(차액): later의 k=3..m 달에 "그 달에" 지급
      const earlierTopUpRows: MonthPayRow[] = [];
      for (let k = 3; k <= m; k++) {
        const ym = addYm(laterEffStart, k - 1); // k번째 달의 ym
        const topUp = sixPlusSixDeltaVsNormal(earlierPlan.monthlyWage, k);
        if (topUp <= 0) continue;

        earlierTopUpRows.push({
          ym,
          who: earlierWho,
          monthIndex: 0,
          amount: topUp,
          retroTopUp: topUp,
        });
      }

      // ✅ 3) A/B에 다시 매핑
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
