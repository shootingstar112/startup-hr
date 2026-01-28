"use client";

import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { calculateSalary } from "./salary.logic";

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
  annualMan: number; // 연봉(만원)
  annualWon: number;
  monthlyNet: number;
  totalDeduction: number;
  pension: number;
  health: number;
  care: number;
  employment: number;
  incomeTax: number;
  localTax: number;
};

type RangeDef = {
  key: string;
  label: string;
  fromMan: number;
  toMan: number; // inclusive
  summaryStepMan: number; // 요약 간격
  detailStepMan: number; // 펼쳤을 때 간격
  defaultOpen?: boolean;
};

const RANGES: RangeDef[] = [
  {
    key: "r1",
    label: "1,000~10,000만원",
    fromMan: 1000,
    toMan: 10000,
    summaryStepMan: 100,
    detailStepMan: 100,
    defaultOpen: true,
  },
  {
    key: "r2",
    label: "1억~2억 (10,000~20,000만원)",
    fromMan: 10000,
    toMan: 20000,
    summaryStepMan: 500,
    detailStepMan: 100,
    defaultOpen: false,
  },
  {
    key: "r3",
    label: "2억~5억 (20,000~50,000만원)",
    fromMan: 20000,
    toMan: 50000,
    summaryStepMan: 1000,
    detailStepMan: 500,
    defaultOpen: false,
  },
];

function buildRows(
  fromMan: number,
  toMan: number,
  stepMan: number,
  calcArgs: {
    monthlyNonTaxWon: number;
    dependents: number;
    u20Children: number;
    severanceIncluded: boolean;
  }
): Row[] {
  const rows: Row[] = [];
  for (let man = fromMan; man <= toMan; man += stepMan) {
    const annualWon = man * 10_000;

    const out = calculateSalary({
      annualSalary: annualWon,
      monthlyNonTax: calcArgs.monthlyNonTaxWon,
      dependents: calcArgs.dependents,
      u20Children: calcArgs.u20Children,
      severanceIncluded: calcArgs.severanceIncluded,
    } as any);

    rows.push({
      annualMan: man,
      annualWon,
      monthlyNet: out.monthlyNet,
      totalDeduction: out.totalDeduction,
      pension: out.pension,
      health: out.health,
      care: out.care,
      employment: out.employment,
      incomeTax: out.incomeTax,
      localTax: out.localTax,
    });
  }
  return rows;
}

function findRangeKey(annualMan: number) {
  const r = RANGES.find((x) => annualMan >= x.fromMan && annualMan <= x.toMan);
  return r?.key ?? RANGES[0].key;
}

function rowId(annualMan: number) {
  return `salary-row-${annualMan}`;
}

// ===== component =====
export default function SalaryTable2026() {
  // 기준 옵션
  const [dependents, setDependents] = useState(1);
  const [u20Children, setU20Children] = useState(0);

  // 비과세(만원) 입력
  const [nonTaxManText, setNonTaxManText] = useState("0");
  const monthlyNonTaxWon = Number(onlyDigits(nonTaxManText) || "0") * 10_000;

  // 퇴직금 포함/별도
  const [severanceIncluded, setSeveranceIncluded] = useState(false);

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
      severanceIncluded,
    };
  }, [monthlyNonTaxWon, dependents, u20Children, severanceIncluded]);

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

    const raf = requestAnimationFrame(() => {
      const sc = scrollerRef.current;
      const el = document.getElementById(rowId(pendingScrollMan));
      if (!sc || !el) {
        setPendingScrollMan(null);
        return;
      }

      const scRect = sc.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const delta =
        elRect.top -
        scRect.top -
        sc.clientHeight / 2 +
        el.clientHeight / 2;

      sc.scrollTo({ top: sc.scrollTop + delta, behavior: "smooth" });
      setPendingScrollMan(null);
    });

    return () => cancelAnimationFrame(raf);
  }, [pendingScrollMan]);

  const doSearch = useCallback(() => {
    const v = Number(onlyDigits(queryManText) || "0");
    if (v > 0) jumpTo(v);
  }, [queryManText]);

  function jumpTo(annualManRaw: number) {
    const min = RANGES[0].fromMan;
    const max = RANGES[RANGES.length - 1].toMan;

    const v = Math.max(min, Math.min(max, Math.floor(annualManRaw)));
    const rangeKey = findRangeKey(v);

    // 해당 구간 펼치기
    setOpenRanges((prev) => ({ ...prev, [rangeKey]: true }));
    const r = RANGES.find((x) => x.key === rangeKey)!;

    // ✅ 정확히 100단위면 파란색
    if (v % 100 === 0) {
      setHighlightExactMan(v);
      setHighlightAround(null);
      setPendingScrollMan(v);
      scheduleClearHighlights(2500);
      return;
    }

    // ✅ 사이값이면 아래/위 100단위 2줄 핑크
    const low = Math.floor(v / 100) * 100;
    const high = low + 100;

    const clLow = Math.max(r.fromMan, Math.min(r.toMan, low));
    const clHigh = Math.max(r.fromMan, Math.min(r.toMan, high));

    setHighlightExactMan(null);
    setHighlightAround([clLow, clHigh]);

    const nearest = v - clLow <= clHigh - v ? clLow : clHigh;
    setPendingScrollMan(nearest);

    scheduleClearHighlights(2500);
  }

  const quickJumps = [
    { label: "3,000", man: 3000 },
    { label: "5,000", man: 5000 },
    { label: "6,200", man: 6200 },
    { label: "1억", man: 10000 },
    { label: "1.5억", man: 15000 },
    { label: "2억", man: 20000 },
    { label: "3억", man: 30000 },
    { label: "5억", man: 50000 },
  ];

  return (
    // ✅ overflow-hidden으로 sticky가 “카드 내부에 갇히는” 느낌 나는 경우 많아서 제거/완화
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* ✅ 1) 제목/옵션: 절대 sticky 아님 (여기 안에 표/스크롤이 말려들 일 없음) */}
      <div className="rounded-t-3xl border-b border-slate-200 bg-white">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight">
                2026 연봉 실수령액표
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                기준: 공제대상가족 {dependents}명 · 비과세 월{" "}
                {fmtMan(monthlyNonTaxWon)} · 퇴직금{" "}
                {severanceIncluded ? "포함(13분할)" : "별도(12분할)"}
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

              <button
                type="button"
                onClick={() => setSeveranceIncluded((v) => !v)}
                className={[
                  "h-10 rounded-2xl border px-3 text-xs font-black",
                  severanceIncluded
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
                ].join(" ")}
              >
                퇴직금 {severanceIncluded ? "포함" : "별도"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ 2) “연봉(만원) ~ 검색/맨위”만 sticky */}
      <div className="sticky top-[72px] z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="p-4 sm:p-5 pt-3 sm:pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {/* 검색/맨위 */}
            <form
              className="order-2 sm:order-1"
              onSubmit={(e) => {
                e.preventDefault();
                doSearch();
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs font-black text-slate-700 whitespace-nowrap shrink-0">
                  연봉(만원)
                </div>

                <input
                  inputMode="numeric"
                  className="h-10 w-32 flex-none rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black outline-none focus:ring-2 focus:ring-slate-200"
                  value={queryManText}
                  onChange={(e) => setQueryManText(onlyDigits(e.target.value))}
                  placeholder="예: 6200"
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
                      scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-800 hover:bg-slate-50"
                  >
                    맨위
                  </button>
                </div>
              </div>
            </form>

            {/* 퀵 점프 */}
            <div className="order-1 sm:order-2 flex flex-wrap gap-2">
              {quickJumps.map((q) => (
                <button
                  key={q.man}
                  type="button"
                  onClick={() => jumpTo(q.man)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700 hover:bg-slate-50"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ 3) 표는 아래로. “연봉 실수령액표” 영역이 sticky 안으로 말려들어갈 구조 자체가 사라짐 */}
      <div className="p-4 sm:p-5">
        <div
          ref={scrollerRef}
          className="max-h-[52vh] sm:max-h-[70vh] overflow-auto overscroll-contain rounded-2xl border border-slate-200"

        >
          <table className="min-w-[980px] w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 bg-slate-50">
              <tr>
                <Th stickyLeft>연봉</Th>
                <Th>실수령액</Th>
                <Th>공제합계</Th>
                <Th>국민연금</Th>
                <Th>건강보험</Th>
                <Th>장기요양</Th>
                <Th>고용보험</Th>
                <Th>소득세</Th>
                <Th>지방소득세</Th>
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

        <div className="mt-3 text-xs font-semibold text-slate-500">
          ※ 표는 “간이세액표 기반” 참고용입니다. (회사별 절사/기준소득월액/보험
          상·하한 등에 따라 실지급과 차이 가능)
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
        const isExact = highlightExactMan === row.annualMan;
        const isAround =
          !!highlightAround &&
          (row.annualMan === highlightAround[0] ||
            row.annualMan === highlightAround[1]);

        const rowBgClass = isExact
          ? "bg-blue-50"
          : isAround
          ? "bg-rose-50"
          : "bg-white";

        return (
          <tr
            key={row.annualMan}
            id={rowId(row.annualMan)}
            className={[
              "hover:bg-slate-50 transition-colors",
              isExact ? "bg-blue-50" : "",
              isAround ? "bg-rose-50" : "",
            ].join(" ")}
          >
            <Td stickyLeft strong rowBgClass={rowBgClass}>
              {fmt(row.annualWon)}
            </Td>

            <Td strong>{fmt(row.monthlyNet)}</Td>
            <Td>{fmt(row.totalDeduction)}</Td>
            <Td>{fmt(row.pension)}</Td>
            <Td>{fmt(row.health)}</Td>
            <Td>{fmt(row.care)}</Td>
            <Td>{fmt(row.employment)}</Td>
            <Td>{fmt(row.incomeTax)}</Td>
            <Td>{fmt(row.localTax)}</Td>
          </tr>
        );
      })}
    </>
  );
}
