"use client";

import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { calculateSalary } from "../salary/salary.logic";

// ===== utils =====
function onlyDigits(s: string) {
  return (s ?? "").replace(/[^\d]/g, "");
}
function fmt(n: number) {
  const v = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  return v.toLocaleString("ko-KR");
}
function fmtMan(nWon: number) {
  const man = Math.floor(nWon / 10_000);
  return `${man.toLocaleString("ko-KR")}만원`;
}

type Row = {
  monthlyMan: number; // 월급(만원)
  monthlyWon: number;

  // ✅ 전부 "월" 기준
  monthlyNet: number;
  monthlyTotalDeduction: number;

  monthlyPension: number;
  monthlyHealth: number;
  monthlyCare: number;
  monthlyEmployment: number;

  monthlyIncomeTax: number;
  monthlyLocalTax: number;
};

type RangeDef = {
  key: string;
  label: string;
  fromMan: number;
  toMan: number; // inclusive
  summaryStepMan: number;
  detailStepMan: number;
  defaultOpen?: boolean;
};

// 월급 구간(만원 단위)
// 필요하면 너 원하는대로 구간/스텝만 조정하면 됨.
const RANGES: RangeDef[] = [
  {
    key: "r1",
    label: "100~500만원",
    fromMan: 100,
    toMan: 500,
    summaryStepMan: 10,
    detailStepMan: 10,
    defaultOpen: true,
  },
  {
    key: "r2",
    label: "500~1,000만원",
    fromMan: 500,
    toMan: 1000,
    summaryStepMan: 50,
    detailStepMan: 10,
    defaultOpen: false,
  },
  {
    key: "r3",
    label: "1,000~2,000만원",
    fromMan: 1000,
    toMan: 2000,
    summaryStepMan: 100,
    detailStepMan: 50,
    defaultOpen: false,
  },
];

function buildRows(
  fromMan: number,
  toMan: number,
  stepMan: number,
  calcArgs: {
    monthlyNonTaxWon: number; // ✅ 월 비과세
    dependents: number;
    u20Children: number;
  }
): Row[] {
  const rows: Row[] = [];

  for (let man = fromMan; man <= toMan; man += stepMan) {
    const monthlyWon = man * 10_000;

    // ✅ salary.logic 는 "연" 입력/출력이라 월→연 환산해서 넣고,
    //    결과는 다시 월로 나눠서 표에 표시
    const annualSalary = monthlyWon * 12;
    const annualNonTax = calcArgs.monthlyNonTaxWon * 12;

    const out = calculateSalary({
      annualSalary,
      annualNonTax,
      dependents: calcArgs.dependents,
      u20Children: calcArgs.u20Children,
      severanceIncluded: false, // ✅ 월급표에서는 퇴직금 개념 제거
    } as any);

    const toMonthly = (v: number) => Math.round(v / 12);

    rows.push({
      monthlyMan: man,
      monthlyWon,

      monthlyNet: toMonthly(out.annualNet),
      monthlyTotalDeduction: toMonthly(out.annualTotalDeduction),

      monthlyPension: toMonthly(out.annualPension),
      monthlyHealth: toMonthly(out.annualHealth),
      monthlyCare: toMonthly(out.annualCare),
      monthlyEmployment: toMonthly(out.annualEmployment),

      monthlyIncomeTax: toMonthly(out.annualIncomeTax),
      monthlyLocalTax: toMonthly(out.annualLocalTax),
    });
  }

  return rows;
}

function findRangeKey(monthlyMan: number) {
  const r = RANGES.find((x) => monthlyMan >= x.fromMan && monthlyMan <= x.toMan);
  return r?.key ?? RANGES[0].key;
}

function rowId(monthlyMan: number) {
  return `pay-row-${monthlyMan}`;
}

// ===== component =====
export default function MonthlyPayTable2026() {
  // 기준 옵션
  const [dependents, setDependents] = useState(1);
  const [u20Children, setU20Children] = useState(0);

  // ✅ 비과세(월) 입력 (만원)
  const [nonTaxManText, setNonTaxManText] = useState("0");
  const monthlyNonTaxWon = Number(onlyDigits(nonTaxManText) || "0") * 10_000;

  // 검색(만원)
  const [queryManText, setQueryManText] = useState("");

  // 펼침 상태
  const [openRanges, setOpenRanges] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const r of RANGES) init[r.key] = !!r.defaultOpen;
    return init;
  });

  // 스크롤 컨테이너 ref
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // 계산 args 메모
  const calcArgs = useMemo(() => {
    return {
      monthlyNonTaxWon,
      dependents,
      u20Children,
    };
  }, [monthlyNonTaxWon, dependents, u20Children]);

  // 각 구간별 rows (요약/디테일)
  const rangeRows = useMemo(() => {
    const map: Record<string, { summary: Row[]; detail: Row[] }> = {};
    for (const r of RANGES) {
      map[r.key] = {
        summary: buildRows(r.fromMan, r.toMan, r.summaryStepMan, calcArgs),
        detail: buildRows(r.fromMan, r.toMan, r.detailStepMan, calcArgs),
      };
    }
    return map;
  }, [calcArgs]);

  // pending scroll + highlight
  const [pendingScrollMan, setPendingScrollMan] = useState<number | null>(null);
  const [highlightExactMan, setHighlightExactMan] = useState<number | null>(null);
  const [highlightAround, setHighlightAround] = useState<[number, number] | null>(
    null
  );

  // 하이라이트 타이머(겹침 방지)
  const clearTimerRef = useRef<number | null>(null);
  const scheduleClearHighlights = useCallback((ms: number) => {
    if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    clearTimerRef.current = window.setTimeout(() => {
      setHighlightExactMan(null);
      setHighlightAround(null);
      clearTimerRef.current = null;
    }, ms);
  }, []);

  // ✅ 내부 스크롤만 사용 + DOM 배치 직후 처리
  useLayoutEffect(() => {
    if (pendingScrollMan == null) return;

    let raf1 = 0;
    let raf2 = 0;
    let raf3 = 0;

    const tryScroll = () => {
      const sc = scrollerRef.current;
      const el = document.getElementById(rowId(pendingScrollMan));
      if (!sc || !el) return false;

      const scRect = sc.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();

      // sticky thead 높이
      const theadEl = sc.querySelector("thead") as HTMLElement | null;
      const theadH = theadEl ? theadEl.getBoundingClientRect().height : 0;

      const viewH = sc.clientHeight - theadH;

      const delta =
        elRect.top - scRect.top - theadH - viewH / 2 + elRect.height / 2;

      sc.scrollTo({ top: sc.scrollTop + delta, behavior: "smooth" });
      return true;
    };

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (tryScroll()) {
          setPendingScrollMan(null);
          return;
        }
        raf3 = requestAnimationFrame(() => {
          tryScroll();
          setPendingScrollMan(null);
        });
      });
    });

    return () => {
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      if (raf3) cancelAnimationFrame(raf3);
    };
  }, [pendingScrollMan]);

  const doSearch = useCallback(() => {
    const v = Number(onlyDigits(queryManText) || "0");
    if (v > 0) jumpTo(v);
  }, [queryManText]);

  function jumpTo(monthlyManRaw: number) {
    const min = RANGES[0].fromMan;
    const max = RANGES[RANGES.length - 1].toMan;

    const v = Math.max(min, Math.min(max, Math.floor(monthlyManRaw)));
    const rangeKey = findRangeKey(v);

    // 새 검색 시작 → 이전 하이라이트 초기화
    setHighlightExactMan(null);
    setHighlightAround(null);

    // 해당 구간 펼치기
    setOpenRanges((prev) => ({ ...prev, [rangeKey]: true }));
    const r = RANGES.find((x) => x.key === rangeKey)!;

    // ✅ 월급표는 10만원 단위가 기본이라 "정확히 10단위면 1줄"
    if (v % 10 === 0) {
      setHighlightExactMan(v);
      setPendingScrollMan(v);
      // scheduleClearHighlights(2000);
      return;
    }

    // 사이값이면 아래/위 10단위 2줄
    const low = Math.floor(v / 10) * 10;
    const high = low + 10;

    const clLow = Math.max(r.fromMan, Math.min(r.toMan, low));
    const clHigh = Math.max(r.fromMan, Math.min(r.toMan, high));

    setHighlightAround([clLow, clHigh]);

    const nearest = v - clLow <= clHigh - v ? clLow : clHigh;
    setPendingScrollMan(nearest);

    // scheduleClearHighlights(2000);
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* 1) 제목/옵션 */}
      <div className="rounded-t-3xl border-b border-slate-200 bg-white">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight">
                2026 월급 실수령액표
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                기준: 공제대상가족 {dependents}명 · 비과세 월 {fmtMan(monthlyNonTaxWon)}
              </p>
            </div>

            {/* 옵션들 */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                <div className="text-xs font-black text-slate-700">
                  공제대상가족
                </div>
                <select
                  className="h-8 rounded-xl border border-slate-200 bg-white px-2 text-xs font-extrabold"
                  value={dependents}
                  onChange={(e) => setDependents(Number(e.target.value))}
                >
                  {Array.from({ length: 11 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}명
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                <div className="text-xs font-black text-slate-700">8~20 자녀</div>
                <input
                  inputMode="numeric"
                  className="h-8 w-14 rounded-xl border border-slate-200 bg-white px-2 text-xs font-extrabold"
                  value={u20Children}
                  onChange={(e) =>
                    setU20Children(Number(onlyDigits(e.target.value) || "0"))
                  }
                />
              </div>

              {/* ✅ 비과세(월) */}
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                <div className="text-xs font-black text-slate-700">비과세(월)</div>
                <input
                  inputMode="numeric"
                  className="h-8 w-20 rounded-xl border border-slate-200 bg-white px-2 text-xs font-extrabold"
                  value={nonTaxManText}
                  onChange={(e) => setNonTaxManText(onlyDigits(e.target.value))}
                  placeholder="만원"
                />
                <div className="text-[11px] font-bold text-slate-500">만원</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2) 검색/맨위 sticky */}
      <div className="sticky top-[72px] z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="p-4 sm:p-5 pt-3 sm:pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <form
              className="order-2 sm:order-1"
              onSubmit={(e) => {
                e.preventDefault();
                doSearch();
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs font-black text-slate-700 whitespace-nowrap shrink-0">
                  월급(만원)
                </div>

                <input
                  inputMode="numeric"
                  className="h-10 w-32 flex-none rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black outline-none focus:ring-2 focus:ring-slate-200"
                  value={queryManText}
                  onChange={(e) => setQueryManText(onlyDigits(e.target.value))}
                  placeholder="예: 320"
                />

                <div className="flex gap-2 flex-none w-full sm:w-auto">
                  <button
                    type="submit"
                    className="h-10 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700"
                  >
                    검색
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      scrollerRef.current?.scrollTo({
                        top: 0,
                        behavior: "smooth",
                      });
                    }}
                    className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-800 hover:bg-slate-50"
                  >
                    맨위
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 3) 표 */}
      <div className="p-4 sm:p-5">
        <div className="mt-3 text-xs font-semibold text-slate-500">
          ※ 표는 “간이세액표 기반” 참고용입니다. (회사별 절사/기준소득월액/보험 상·하한 등에 따라 실지급과 차이 가능)
        </div>

        <div
          ref={scrollerRef}
          className="max-h-[calc(100dvh-360px)] sm:max-h-[70vh] overflow-auto overscroll-contain rounded-2xl border border-slate-200 pb-10 scroll-pb-10"
        >
          <table className="min-w-[980px] w-full border-separate border-spacing-0 mb-6">
            <thead className="sticky top-0 z-20 bg-slate-50">
              <tr>
                <Th stickyLeft>월급</Th>
                <Th>실수령액(월)</Th>
                <Th>공제합계(월)</Th>
                <Th>국민연금(월)</Th>
                <Th>건강보험(월)</Th>
                <Th>장기요양(월)</Th>
                <Th>고용보험(월)</Th>
                <Th>소득세(월)</Th>
                <Th>지방소득세(월)</Th>
              </tr>
            </thead>

            <tbody>
              {RANGES.map((r) => {
                const isOpen = !!openRanges[r.key];
                const rows = isOpen
                  ? rangeRows[r.key].detail
                  : rangeRows[r.key].summary;

                return (
                  <FragmentRange
                    key={r.key}
                    range={r}
                    isOpen={isOpen}
                    onToggle={() =>
                      setOpenRanges((prev) => ({
                        ...prev,
                        [r.key]: !prev[r.key],
                      }))
                    }
                    rows={rows}
                    highlightExactMan={highlightExactMan}
                    highlightAround={highlightAround}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({
  children,
  stickyLeft,
}: {
  children: React.ReactNode;
  stickyLeft?: boolean;
}) {
  return (
    <th
      className={[
        "border-b border-slate-200 px-3 py-3 text-left text-xs font-black text-slate-700",
        stickyLeft ? "sticky left-0 z-30 bg-slate-50" : "",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  stickyLeft,
  strong,
  rowBgClass,
}: {
  children: React.ReactNode;
  stickyLeft?: boolean;
  strong?: boolean;
  rowBgClass?: string;
}) {
  return (
    <td
      className={[
        "border-b border-slate-100 px-3 py-3 text-sm",
        stickyLeft ? `sticky left-0 z-10 ${rowBgClass ?? "bg-white"}` : "",
        strong ? "font-black text-slate-900" : "font-semibold text-slate-700",
      ].join(" ")}
    >
      {children}
    </td>
  );
}

function RangeHeaderRow({
  range,
  isOpen,
  onToggle,
}: {
  range: RangeDef;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <tr>
      <td colSpan={9} className="border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
              {range.label}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {isOpen
                ? `상세(${range.detailStepMan}만원 단위)`
                : `요약(${range.summaryStepMan}만원 단위)`}
            </span>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700 hover:bg-slate-50"
          >
            {isOpen ? "접기" : "펼치기"}
          </button>
        </div>
      </td>
    </tr>
  );
}

function FragmentRange({
  range,
  isOpen,
  onToggle,
  rows,
  highlightExactMan,
  highlightAround,
}: {
  range: RangeDef;
  isOpen: boolean;
  onToggle: () => void;
  rows: Row[];
  highlightExactMan: number | null;
  highlightAround: [number, number] | null;
}) {
  return (
    <>
      <RangeHeaderRow range={range} isOpen={isOpen} onToggle={onToggle} />

      {rows.map((row) => {
        const isExact = highlightExactMan === row.monthlyMan;
        const isAround =
          !!highlightAround &&
          (row.monthlyMan === highlightAround[0] ||
            row.monthlyMan === highlightAround[1]);

        const rowBgClass = isExact
          ? "bg-blue-50"
          : isAround
          ? "bg-rose-50"
          : "bg-white";

        return (
          <tr
            key={row.monthlyMan}
            id={rowId(row.monthlyMan)}
            className={[
              "hover:bg-slate-50 transition-colors",
              isExact ? "bg-blue-50" : "",
              isAround ? "bg-rose-50" : "",
            ].join(" ")}
          >
            <Td stickyLeft strong rowBgClass={rowBgClass}>
              {fmt(row.monthlyWon)}
            </Td>

            <Td strong>{fmt(row.monthlyNet)}</Td>
            <Td>{fmt(row.monthlyTotalDeduction)}</Td>
            <Td>{fmt(row.monthlyPension)}</Td>
            <Td>{fmt(row.monthlyHealth)}</Td>
            <Td>{fmt(row.monthlyCare)}</Td>
            <Td>{fmt(row.monthlyEmployment)}</Td>
            <Td>{fmt(row.monthlyIncomeTax)}</Td>
            <Td>{fmt(row.monthlyLocalTax)}</Td>
          </tr>
        );
      })}
    </>
  );
}
