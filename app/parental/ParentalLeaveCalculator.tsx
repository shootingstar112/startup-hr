"use client";

import { useMemo, useState, useEffect } from "react";
import {
  calculateParentalLeave,
  type ParentalInput,
  type ParentalMode,
  addYm,
} from "./parentalLeave.logic";

/** ===== 표시 유틸(만원 단위) ===== */
function toMan(n: number) {
  return Math.floor((Number.isFinite(n) ? n : 0) / 10_000);
}
function formatMan(n: number) {
  return String(toMan(n));
}
function fmtYYMM(ym: string) {
  const [y, m] = ym.split("-");
  if (!y || !m) return ym;
  return `${y.slice(2)}.${m}`;
}

/** ===== 입력 유틸 ===== */
function ymNow() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function parseYmdOrNull(ymd: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((ymd ?? "").trim());
  if (!m) return null;
  const Y = Number(m[1]);
  const M = Number(m[2]);
  const D = Number(m[3]);
  if (!Number.isFinite(Y) || !Number.isFinite(M) || !Number.isFinite(D)) return null;
  if (M < 1 || M > 12) return null;
  if (D < 1 || D > 31) return null;
  const dt = new Date(Y, M - 1, D);
  if (dt.getFullYear() !== Y || dt.getMonth() !== M - 1 || dt.getDate() !== D) return null;
  return dt;
}
function fmtYmd(dt: Date) {
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

/** 출생일 기준 18개월(endDate) */
function allowedStartYmRangeFromBirth(ymd: string) {
  const birth = parseYmdOrNull(ymd);
  if (!birth) return null;

  const birthYm = `${birth.getFullYear()}-${pad2(birth.getMonth() + 1)}`;

  const end = new Date(birth);
  end.setMonth(end.getMonth() + 18);
  const maxYm = `${end.getFullYear()}-${pad2(end.getMonth() + 1)}`;

  return { birthDate: birth, birthYm, maxYm, endDate: end };
}

/** ===== months / wage (만원) 파싱 ===== */
function parseMonthsOrNull(text: string) {
  const s = (text ?? "").trim();
  if (!s) return null;
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (n < 1 || n > 18) return null;
  return n;
}
function stripDigits(v: string) {
  return (v ?? "").toString().replace(/[^\d]/g, "");
}
function formatManInputText(v: string) {
  const s = stripDigits(v);
  if (!s) return "";
  return Number(s).toLocaleString("ko-KR");
}
function parseManToWonOrNull(text: string) {
  const s = stripDigits(text);
  if (!s) return null;
  const man = Number(s);
  if (!Number.isFinite(man)) return null;
  return Math.floor(man * 10_000);
}
function toManWonTextFromWonOrNull(won: number | null) {
  if (won == null || won <= 0) return "";
  const v = Math.floor(won / 10_000);
  return `${v.toLocaleString("ko-KR")}만원`;
}

/** ===== YYYY-MM 비교/연산 유틸 ===== */
function ymToIndex(ym: string) {
  const [Y, M] = ym.split("-").map((x) => Number(x));
  if (!Number.isFinite(Y) || !Number.isFinite(M)) return NaN;
  return Y * 12 + (M - 1);
}
function ymLt(a: string, b: string) {
  return ymToIndex(a) < ymToIndex(b);
}
function ymMin(a: string, b: string) {
  return ymLt(a, b) ? a : b;
}
function ymMax(a: string, b: string) {
  return ymLt(a, b) ? b : a;
}
function ymGte(a: string, b: string) {
  return ymToIndex(a) >= ymToIndex(b);
}

/** ===== 6+6 결과를 월 단위로 A/B 합치기 ===== */
type ABRow = {
  ym: string;
  A: number;
  B: number;
  aRetro: number;
  bRetro: number;
  hasA: boolean;
  hasB: boolean;

  isGap?: boolean;
  gapFromYm?: string;
  gapToYm?: string;

  // ✅ 모 출산 전 사용분 표시용
  isPreBirthMother?: boolean;
};

function buildABTableRowsFullRangeCompressed(
  rows: { ym: string; who?: "A" | "B"; amount: number; retroTopUp: number }[],
  aStart: string,
  aMonths: number,
  bStart: string,
  bMonths: number,
  birthYmOrNull: string | null
) {
  // 1) 실제 지급 있는 달만 누적
  const map = new Map<string, ABRow>();

  for (const r of rows) {
    const cur =
      map.get(r.ym) ??
      { ym: r.ym, A: 0, B: 0, aRetro: 0, bRetro: 0, hasA: false, hasB: false };

    if (r.who === "A") {
      cur.A += r.amount;
      cur.aRetro += r.retroTopUp;
      cur.hasA = true;
    } else if (r.who === "B") {
      cur.B += r.amount;
      cur.bRetro += r.retroTopUp;
      cur.hasB = true;
    }

    map.set(r.ym, cur);
  }

  // 2) 전체 범위
  const aEnd = addYm(aStart, Math.max(0, aMonths - 1));
  const bEnd = addYm(bStart, Math.max(0, bMonths - 1));
  const startYm = ymMin(aStart, bStart);
  const endYm = ymMax(aEnd, bEnd);

  // 3) 월 시퀀스 만들고 gap 압축
  const out: ABRow[] = [];
  let curYm = startYm;

  let gapFrom: string | null = null;

  const flushGap = (gapTo: string) => {
    if (!gapFrom) return;
    out.push({
      ym: gapFrom,
      A: 0,
      B: 0,
      aRetro: 0,
      bRetro: 0,
      hasA: false,
      hasB: false,
      isGap: true,
      gapFromYm: gapFrom,
      gapToYm: gapTo,
    });
    gapFrom = null;
  };

  while (true) {
    const existing = map.get(curYm);

    if (existing) {
      if (gapFrom) flushGap(addYm(curYm, -1));

      // ✅ 모 출산 전 사용분 표시 플래그
      if (birthYmOrNull && ymLt(curYm, birthYmOrNull) && existing.hasB) {
        existing.isPreBirthMother = true;
      }

      out.push(existing);
    } else {
      if (!gapFrom) gapFrom = curYm;
    }

    if (curYm === endYm) {
      if (!existing && gapFrom) flushGap(curYm);
      break;
    }

    curYm = addYm(curYm, 1);
  }

  return out;
}

/** 특정 startYm부터 birthYm 직전까지가 몇 개월인지(사용 개월 기준으로 잘라서) */
function countMonthsBeforeBirth(startYm: string, months: number, birthYm: string) {
  const diff = ymToIndex(birthYm) - ymToIndex(startYm); // birthYm - startYm
  if (!Number.isFinite(diff)) return 0;
  const before = Math.max(0, diff); // birthYm 이전 달 수
  return Math.min(months, before);
}

export default function ParentalLeaveCalculator() {
  const [mode, setMode] = useState<ParentalMode>("normal");

  // normal/single
  const [monthsText, setMonthsText] = useState("12");
  const [wageManText, setWageManText] = useState("500");

  // 6+6 (A=부, B=모)
  const [aStart, setAStart] = useState(ymNow());
  const [aMonthsText, setAMonthsText] = useState("6");
  const [aWageManText, setAWageManText] = useState("500");

  const [bStart, setBStart] = useState(addYm(ymNow(), 6));
  const [bMonthsText, setBMonthsText] = useState("6");
  const [bWageManText, setBWageManText] = useState("500");

  // ✅ 6+6: 자녀 출생일 (YYYY-MM-DD)
  const [childBirth, setChildBirth] = useState("");

  /** ===== 파싱값 ===== */
  const monthsParsed = useMemo(() => parseMonthsOrNull(monthsText), [monthsText]);
  const wageWonParsed = useMemo(() => parseManToWonOrNull(wageManText), [wageManText]);

  const aMonthsParsed = useMemo(() => parseMonthsOrNull(aMonthsText), [aMonthsText]);
  const bMonthsParsed = useMemo(() => parseMonthsOrNull(bMonthsText), [bMonthsText]);
  const aWageWonParsed = useMemo(() => parseManToWonOrNull(aWageManText), [aWageManText]);
  const bWageWonParsed = useMemo(() => parseManToWonOrNull(bWageManText), [bWageManText]);

  const normalValid = mode !== "six_plus_six" && monthsParsed != null && wageWonParsed != null;

  const birthRange = useMemo(
    () => (mode === "six_plus_six" ? allowedStartYmRangeFromBirth(childBirth) : null),
    [mode, childBirth]
  );

  /**
   * ✅ 입력 제한 룰
   * - 부(A): 출생월(birthYm) ~ maxYm 안에서만 가능
   * - 모(B): 출산 전 가능(=min 없음), 대신 maxYm 이후는 불가
   */
  const startInBirthRange = useMemo(() => {
    if (mode !== "six_plus_six") return true;
    if (!childBirth) return true;
    if (!birthRange) return false;

    const fatherOk = aStart >= birthRange.birthYm && aStart <= birthRange.maxYm;
    const motherOk = bStart <= birthRange.maxYm; // ✅ min 없음

    return fatherOk && motherOk;
  }, [mode, childBirth, birthRange, aStart, bStart]);

  // ✅ 자동 보정: 부만(모는 출산 전 달 선택 가능해야 하니 건드리지 마)
  useEffect(() => {
    if (mode !== "six_plus_six") return;
    if (!birthRange) return;

    if (aStart < birthRange.birthYm) setAStart(birthRange.birthYm);
    if (aStart > birthRange.maxYm) setAStart(birthRange.maxYm);
  }, [mode, birthRange, aStart]);

  const sixValid =
    mode === "six_plus_six" &&
    !!childBirth &&
    !!birthRange &&
    startInBirthRange &&
    !!aStart &&
    !!bStart &&
    aMonthsParsed != null &&
    bMonthsParsed != null &&
    aWageWonParsed != null &&
    bWageWonParsed != null;

  /** ✅ 유효할 때만 input 생성 */
/** ✅ 유효할 때만 input 생성 (아니면 null) */
const input: ParentalInput | null = useMemo(() => {
  if (mode === "six_plus_six") {
    // ✅ TS 좁히기(진짜 number로 보장)
    if (!birthRange) return null;

    const am = aMonthsParsed;
    const bm = bMonthsParsed;
    const aw = aWageWonParsed;
    const bw = bWageWonParsed;

    if (!sixValid) return null;
    if (am == null || bm == null) return null;
    if (aw == null || bw == null) return null;

    return {
      mode,
      childBirthYmd: childBirth, // ✅ 이거 때문에 에러났던 거
      A: {
        label: "A",
        startYm: aStart,
        months: am,
        monthlyWage: aw,
      },
      B: {
        label: "B",
        startYm: bStart,
        months: bm,
        monthlyWage: bw,
      },
    };
  }

  // normal/single
  if (!normalValid) return null;

  const m = monthsParsed;
  const w = wageWonParsed;
  if (m == null || w == null) return null;

  return {
    mode,
    months: m,
    monthlyWage: w,
  };
}, [
  mode,
  normalValid,
  sixValid,
  birthRange,
  monthsParsed,
  wageWonParsed,
  aStart,
  bStart,
  aMonthsParsed,
  bMonthsParsed,
  aWageWonParsed,
  bWageWonParsed,
]);


  const out = useMemo(() => (input ? calculateParentalLeave(input) : null), [input]);

  const abRows = useMemo(() => {
    if (mode !== "six_plus_six" || !out) return [];
    return buildABTableRowsFullRangeCompressed(
      out.rows,
      aStart,
      aMonthsParsed ?? 0,
      bStart,
      bMonthsParsed ?? 0,
      birthRange?.birthYm ?? null
    );
  }, [mode, out, aStart, bStart, aMonthsParsed, bMonthsParsed, birthRange?.birthYm]);

  /** ✅ 6+6 부/모 총액 */
  const sixTotals = useMemo(() => {
    if (mode !== "six_plus_six" || !out) return null;

    let father = 0;
    let mother = 0;
    for (const r of out.rows) {
      if (r.who === "A") father += r.amount;
      if (r.who === "B") mother += r.amount;
    }
    return { father, mother, total: father + mother };
  }, [mode, out]);

  /**
   * ✅ 하이라이트/라벨:
   * - 카운팅은 "출생월부터" 시작
   * - 모가 출산 전 몇 개월 써도, 그 달들은 하이라이트/카운팅에서 제외
   * - 특례 적용 m = min(6, A(출생후 사용개월), B(출생후 사용개월))
   * - later는 "출생월 이후 실제 시작월" 기준으로 더 늦은 사람
   */
  const sixUi = useMemo(() => {
    if (mode !== "six_plus_six" || !sixValid || !birthRange) {
      return {
        laterWho: null as null | "A" | "B",
        rangeLight: new Set<string>(),
        rangeStrong: new Set<string>(),
        monthLabel: new Map<string, number>(),
        birthYm: null as null | string,
      };
    }

    const birthYm = birthRange.birthYm;

    const aTotal = aMonthsParsed!;
    const bTotal = bMonthsParsed!;

    const aPre = countMonthsBeforeBirth(aStart, aTotal, birthYm); // 부는 보통 0이지만 안전빵
    const bPre = countMonthsBeforeBirth(bStart, bTotal, birthYm); // ✅ 모 출산 전 사용분

    const aAfter = Math.max(0, aTotal - aPre);
    const bAfter = Math.max(0, bTotal - bPre);

    const m = Math.min(6, aAfter, bAfter);

    // ✅ 출생월 이후 실제 시작월(출생월보다 앞이면 출생월로 보정)
    const aEffective = ymGte(aStart, birthYm) ? aStart : birthYm;
    const bEffective = ymGte(bStart, birthYm) ? bStart : birthYm;

    const laterWho: "A" | "B" = ymGte(aEffective, bEffective) ? "A" : "B";
    const laterStart = laterWho === "A" ? aEffective : bEffective;

    const rangeLight = new Set<string>();
    const rangeStrong = new Set<string>();
    const monthLabel = new Map<string, number>();

    for (let i = 0; i < m; i++) {
      const ym = addYm(laterStart, i);
      const idx = i + 1;
      monthLabel.set(ym, idx);
      if (idx <= 2) rangeLight.add(ym);
      else rangeStrong.add(ym);
    }

    return { laterWho, rangeLight, rangeStrong, monthLabel, birthYm };
  }, [mode, sixValid, birthRange, aStart, bStart, aMonthsParsed, bMonthsParsed]);

  const showResult = out != null;

  return (
   <div className="rounded-2xl border bg-white p-3 sm:p-6 shadow-sm">

      <h2 className="text-xl font-black">육아휴직급여 계산기</h2>
      <p className="mt-2 text-slate-600 font-semibold">6+6은 월별로 부/모를 한 줄에 같이 보여줘(단위: 만원).</p>

      {/* Mode */}
      <div className="mt-6 rounded-xl border p-4">
        <div className="text-sm font-black text-slate-800">모드</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("normal")}
            className={`rounded-full px-4 py-2 text-sm font-black border ${
              mode === "normal" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-900"
            }`}
          >
            일반
          </button>
          <button
            type="button"
            onClick={() => setMode("single_parent")}
            className={`rounded-full px-4 py-2 text-sm font-black border ${
              mode === "single_parent" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-900"
            }`}
          >
            한부모
          </button>
          <button
            type="button"
            onClick={() => setMode("six_plus_six")}
            className={`rounded-full px-4 py-2 text-sm font-black border ${
              mode === "six_plus_six" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-900"
            }`}
          >
            6+6
          </button>
        </div>

        <div className="mt-3 text-xs font-semibold text-slate-600">
          상한/하한/지급률 설명은 아래에 따로 정리할 예정(일단 결과 UI부터).
        </div>
      </div>

      {/* Inputs + Result */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-5">
          {mode !== "six_plus_six" ? (
            <>
              <div className="rounded-xl border p-4">
                <div className="text-sm font-black text-slate-800">사용 개월 수</div>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    inputMode="numeric"
                    value={monthsText}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d+$/.test(v)) setMonthsText(v);
                    }}
                    placeholder="1~18"
                    className="w-28 rounded-xl border px-3 py-2 font-black outline-none focus:ring-2 focus:ring-slate-200"
                  />
                  <div className="text-sm font-semibold text-slate-600">범위: 1~18</div>
                </div>

                {monthsText !== "" && monthsParsed == null && (
                  <div className="mt-2 text-xs font-bold text-red-600">1~18 사이로 입력해줘</div>
                )}
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm font-black text-slate-800">월 통상임금(만원)</div>
                <input
                  inputMode="numeric"
                  value={formatManInputText(wageManText)}
                  onChange={(e) => setWageManText(e.target.value)}
                  placeholder="예: 400"
                  className="mt-2 w-full rounded-xl border px-3 py-2 font-black outline-none focus:ring-2 focus:ring-slate-200"
                />
                <div className="mt-2 text-xs font-semibold text-slate-600">
                  {wageWonParsed == null ? (
                    <>
                      표시: <span className="font-black text-slate-900">입력 필요</span>
                    </>
                  ) : (
                    <>
                      표시: <span className="font-black text-slate-900">{toManWonTextFromWonOrNull(wageWonParsed)}</span>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* ✅ 6+6: 자녀 출생일 + 신청 가능 기간 안내 */}
              <div className="rounded-xl border p-4">
                <div className="text-sm font-black text-slate-800">자녀 출생일</div>

                <input
                  type="date"
                  value={childBirth}
                  onChange={(e) => setChildBirth(e.target.value)}
                  className="mt-2 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                />

                <div className="mt-2 text-xs font-semibold text-slate-600">
                  {!birthRange ? (
                    <span className="text-slate-500">출생일을 입력하면 신청 가능 기간이 표시돼.</span>
                  ) : (
                    <>
                      신청 가능(부):{" "}
                      <span className="font-black text-red-600">
                        {birthRange.birthYm} ~ {birthRange.maxYm}
                      </span>
                      <span className="text-slate-500"> (출생일 + 18개월: {fmtYmd(birthRange.endDate)})</span>
                    </>
                  )}
                </div>

                {/* ✅ 모만 출산 전 신청 가능 멘트 */}
                <div className="mt-1 text-[11px] font-bold text-slate-600">* 모의 경우 출생일 전 신청 가능</div>

                {childBirth && !birthRange && <div className="mt-2 text-xs font-bold text-red-600">날짜 형식이 이상함</div>}

                {childBirth && birthRange && !startInBirthRange && (
                  <div className="mt-2 text-xs font-bold text-red-600">
                    부 시작월은 {birthRange.birthYm}~{birthRange.maxYm} 안에서만 가능 / 모는 {birthRange.maxYm} 이후는 불가
                  </div>
                )}
              </div>

              {/* 부 입력 카드 */}
              <div className="rounded-xl border p-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                    부
                  </span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="block">
                    <div className="text-xs font-bold text-slate-600">시작월</div>
                    <input
                      type="month"
                      value={aStart}
                      min={birthRange?.birthYm} // ✅ 부: 출생월부터만
                      max={birthRange?.maxYm}
                      onChange={(e) => setAStart(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs font-bold text-slate-600">사용개월</div>
                    <input
                      inputMode="numeric"
                      value={aMonthsText}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || /^\d+$/.test(v)) setAMonthsText(v);
                      }}
                      placeholder="1~18"
                      className="mt-1 w-full rounded-xl border px-3 py-2 font-black outline-none focus:ring-2 focus:ring-slate-200"
                    />
                    {aMonthsText !== "" && aMonthsParsed == null && (
                      <div className="mt-1 text-[11px] font-bold text-red-600">1~18 사이로 입력</div>
                    )}
                  </label>
                  <label className="block sm:col-span-3">
                    <div className="text-xs font-bold text-slate-600">월 통상임금(만원)</div>
                    <input
                      inputMode="numeric"
                      value={formatManInputText(aWageManText)}
                      onChange={(e) => setAWageManText(e.target.value)}
                      placeholder="예: 400"
                      className="mt-1 w-full rounded-xl border px-3 py-2 font-black outline-none focus:ring-2 focus:ring-slate-200"
                    />
                    <div className="mt-1 text-[11px] font-semibold text-slate-600">
                      {aWageWonParsed == null ? (
                        <span className="font-black text-slate-900">입력 필요</span>
                      ) : (
                        <>
                          표시: <span className="font-black text-slate-900">{toManWonTextFromWonOrNull(aWageWonParsed)}</span>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* 모 입력 카드 */}
              <div className="rounded-xl border p-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                    모
                  </span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="block">
                    <div className="text-xs font-bold text-slate-600">시작월</div>
                    <input
                      type="month"
                      value={bStart}
                      // ✅ 모: 출산 전 가능 -> min 없음
                      max={birthRange?.maxYm} // ✅ 18개월 이후는 막기
                      onChange={(e) => setBStart(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs font-bold text-slate-600">사용개월</div>
                    <input
                      inputMode="numeric"
                      value={bMonthsText}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || /^\d+$/.test(v)) setBMonthsText(v);
                      }}
                      placeholder="1~18"
                      className="mt-1 w-full rounded-xl border px-3 py-2 font-black outline-none focus:ring-2 focus:ring-slate-200"
                    />
                    {bMonthsText !== "" && bMonthsParsed == null && (
                      <div className="mt-1 text-[11px] font-bold text-red-600">1~18 사이로 입력</div>
                    )}
                  </label>
                  <label className="block sm:col-span-3">
                    <div className="text-xs font-bold text-slate-600">월 통상임금(만원)</div>
                    <input
                      inputMode="numeric"
                      value={formatManInputText(bWageManText)}
                      onChange={(e) => setBWageManText(e.target.value)}
                      placeholder="예: 400"
                      className="mt-1 w-full rounded-xl border px-3 py-2 font-black outline-none focus:ring-2 focus:ring-slate-200"
                    />
                    <div className="mt-1 text-[11px] font-semibold text-slate-600">
                      {bWageWonParsed == null ? (
                        <span className="font-black text-slate-900">입력 필요</span>
                      ) : (
                        <>
                          표시: <span className="font-black text-slate-900">{toManWonTextFromWonOrNull(bWageWonParsed)}</span>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Result panel */}
        <div className="rounded-2xl bg-slate-900 p-3 sm:p-6 text-white shadow-sm">

          <div className="text-sm font-extrabold text-white/80">총 수령액(추정)</div>

          {!showResult ? (
            <div className="mt-4 rounded-2xl bg-white/10 p-4 text-sm font-bold text-white/80">
              사용개월(1~18)과 통상임금(만원)을 입력하면 결과가 표시돼.
            </div>
          ) : (
            <>
              <div className="mt-2 text-4xl font-black tracking-tight">{formatMan(out.total)}만원</div>

              {mode === "six_plus_six" && sixTotals && (
                <div className="mt-2 flex flex-wrap gap-2 text-sm font-black text-white/90">
                  <span className="rounded-full bg-white/10 px-3 py-1">부: {formatMan(sixTotals.father)}만원</span>
                  <span className="rounded-full bg-white/10 px-3 py-1">모: {formatMan(sixTotals.mother)}만원</span>
                </div>
              )}

              <div className="mt-2 text-xs font-semibold text-white/70">* 실제 지급은 개인/사업장 요건에 따라 달라질 수 있음</div>

              {mode === "six_plus_six" ? (
                <>
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-xs font-bold text-white/70">월별 지급표</div>
                    <div className="rounded-full bg-amber-200 px-3 py-1 text-xs font-black text-slate-900">표 단위: 만원</div>
                  </div>

                  <div className="mt-2 overflow-hidden rounded-2xl bg-white">
                    <div className="grid grid-cols-3 items-center gap-2 bg-slate-50 px-2 sm:px-4 py-3 border-b border-black/10">

                      <div className="text-xs font-black text-slate-700">월</div>
                      <div className="text-right text-xs font-black text-slate-700">부</div>
                      <div className="text-right text-xs font-black text-slate-700">모</div>
                    </div>

                    <div className="divide-y divide-black/10">
                      {abRows.map((r) => {
                        const isLight = sixUi.rangeLight.has(r.ym);
                        const isStrong = sixUi.rangeStrong.has(r.ym);

                        // ✅ 모 출산 전 사용분: 연한 빨간 배경 (특례 영향 X 인지)
                        const isPreBirthMother = !!r.isPreBirthMother;

                        const rowBg = isPreBirthMother
                          ? "bg-red-50"
                          : isStrong
                          ? "bg-amber-100"
                          : isLight
                          ? "bg-amber-50"
                          : "bg-white";

                        const k = sixUi.monthLabel.get(r.ym);

                        if (r.isGap) {
                          return (
                            <div key={`gap-${r.gapFromYm}-${r.gapToYm}`} className="bg-white">
                              <div className="h-12 w-full flex items-center px-4">
                                <div className="flex w-full items-center gap-3">
                                  <div className="flex-1 border-t border-dashed border-slate-300" />
                                  <div className="text-[11px] font-bold text-slate-400 whitespace-nowrap">(공백 구간)</div>
                                  <div className="flex-1 border-t border-dashed border-slate-300" />
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={r.ym} className={`px-2 sm:px-4 py-3 ${rowBg}`}>

                            <div className="grid grid-cols-3 items-center gap-2">
                              <div>
                                <div className="text-sm font-black text-slate-800">{fmtYYMM(r.ym)}</div>

                                {/* ✅ 출생월 이후부터만 (n개월) 표시 */}
                                {k ? <div className="mt-0.5 text-[11px] font-semibold text-slate-500">({k}개월)</div> : null}

                                {/* ✅ 모 출산 전 사용분 라벨 */}
                                {isPreBirthMother ? (
                                  <div className="mt-0.5 text-[11px] font-bold text-red-600">특례 영향 없음(출산 전)</div>
                                ) : null}
                              </div>

                              <div className="text-right">
                                <div className="text-sm font-black text-slate-900">{r.hasA ? formatMan(r.A) : "-"}</div>
                                {r.hasA && r.aRetro > 0 && (
                                  <div className="text-[11px] font-bold text-blue-600">(+{formatMan(r.aRetro)} 정산)</div>
                                )}
                              </div>

                              <div className="text-right">
                                <div className="text-sm font-black text-slate-900">{r.hasB ? formatMan(r.B) : "-"}</div>
                                {r.hasB && r.bRetro > 0 && (
                                  <div className="text-[11px] font-bold text-blue-600">(+{formatMan(r.bRetro)} 정산)</div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ✅ 색상 범례 한 줄 */}
                  <div className="mt-3 text-[11px] font-semibold text-white/70">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-sm bg-red-300" />
                      모 출산 전 사용분(특례 영향 없음)
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-xs font-bold text-white/70">월별 지급표</div>
                    <div className="rounded-full bg-amber-200 px-3 py-1 text-xs font-black text-slate-900">표 단위: 만원</div>
                  </div>

                  <div className="mt-2 overflow-hidden rounded-2xl bg-white">
                    <div className="grid grid-cols-2 items-center gap-2 bg-slate-50 px-2 sm:px-4 py-3 border-b border-black/10">

                      <div className="text-xs font-black text-slate-700">월</div>
                      <div className="text-right text-xs font-black text-slate-700">지급액</div>
                    </div>

                    <div className="divide-y divide-black/10">
                      {out.rows.map((r, idx) => (
                       <div key={idx} className="px-2 sm:px-4 py-3">

                          <div className="grid grid-cols-2 items-center gap-2">
                            <div className="text-sm font-black text-slate-800">{idx + 1}</div>
                            <div className="text-right text-sm font-black text-slate-900">{formatMan(r.amount)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* 설명(하단) */}
      <div className="mt-6 rounded-xl border bg-slate-50 p-4 text-sm font-semibold text-slate-700">
        <div className="font-black text-slate-900">참고</div>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>입력값이 비었거나 범위 밖이면 결과/표는 표시되지 않음.</li>
          <li>6+6 카운팅은 출생월부터 시작(출산 전 사용분은 특례 영향 없음).</li>
          <li>정산(소급)이 발생하는 달에는 (+정산)으로 표시.</li>
          <li>통상임금이 낮아 상한에 안 걸리면 정산/증액은 0이 될 수 있음.</li>
        </ul>
      </div>
    </div>
  );
}
