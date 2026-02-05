"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { calculateSalary } from "./salary.logic";

function formatWon(n: number) {
  const v = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  return v.toLocaleString("ko-KR");
}

// ✅ "5,000만원 · 1천원" (천원 단위는 있을 때만)
function formatManCheon(n: number) {
  const v = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  if (v === 0) return "0원";

  const man = Math.floor(v / 10_000); // 만원
  const cheon = Math.floor((v % 10_000) / 1_000); // 천원(0~9)

  const manPart = `${man.toLocaleString("ko-KR")}만원`;
  const cheonPart = cheon > 0 ? ` · ${cheon}천원` : "";
  return `${manPart}${cheonPart}`;
}

function onlyDigits(s: string) {
  return (s ?? "").replace(/[^\d]/g, "");
}

function KRW({ n }: { n: number }) {
  return <span>{Math.round(n).toLocaleString("ko-KR")}원</span>;
}

function Tip({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [leftPx, setLeftPx] = useState(0);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const TIP_W = 300;
    const PAD = 12;

    const calc = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;

      const idealLeft = r.left;
      const maxLeft = Math.max(PAD, window.innerWidth - TIP_W - PAD);
      const clamped = Math.min(Math.max(idealLeft, PAD), maxLeft);
      setLeftPx(clamped);
    };

    calc();
    window.addEventListener("resize", calc);
    window.addEventListener("scroll", calc, true);

    return () => {
      window.removeEventListener("resize", calc);
      window.removeEventListener("scroll", calc, true);
    };
  }, [open]);

  return (
    <span className="relative inline-flex">
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-[11px] font-black text-slate-600 hover:bg-slate-50"
        aria-label={`${title} 도움말`}
      >
        ?
      </button>

      {open && (
        <span className="fixed inset-0 z-40" onMouseDown={() => setOpen(false)} />
      )}

      {open && (
        <div
          className="fixed z-50 w-[300px] rounded-2xl border bg-white p-3 shadow-xl"
          style={{
            left: leftPx,
            top: (btnRef.current?.getBoundingClientRect().bottom ?? 0) + 8,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="text-sm font-black">{title}</div>
          <div className="mt-1 text-xs font-semibold text-slate-600 leading-relaxed">
            {children}
          </div>
        </div>
      )}
    </span>
  );
}

function Segmented({
  value,
  onChange,
  left,
  right,
}: {
  value: "left" | "right";
  onChange: (v: "left" | "right") => void;
  left: string;
  right: string;
}) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => onChange("left")}
        className={[
          "h-11 w-full text-sm font-black transition",
          value === "left"
            ? "bg-slate-900 text-white"
            : "bg-white text-slate-700 hover:bg-slate-50",
        ].join(" ")}
      >
        {left}
      </button>

      <button
        type="button"
        onClick={() => onChange("right")}
        className={[
          "h-11 w-full text-sm font-black transition",
          value === "right"
            ? "bg-slate-900 text-white"
            : "bg-white text-slate-700 hover:bg-slate-50",
        ].join(" ")}
      >
        {right}
      </button>
    </div>
  );
}

function Item({ label, value }: { label: React.ReactNode; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 sm:px-4">
      <div className="text-sm font-extrabold text-slate-700">{label}</div>
      <div className="text-sm font-black text-slate-900">
        <KRW n={value} />
      </div>
    </div>
  );
}

export default function SalaryCalculator() {
  // ✅ 연봉
  const [annualSalaryText, setAnnualSalaryText] = useState("50,000,000");
  const annualSalary = Number(onlyDigits(annualSalaryText) || "0");

  // ✅ 연 비과세 (연간)
  const [annualNonTaxText, setAnnualNonTaxText] = useState("2,400,000");
  const annualNonTax = Number(onlyDigits(annualNonTaxText) || "0");

  const [dependents, setDependents] = useState(1);
  const [u20Children, setU20Children] = useState(0);

  // ✅ 퇴직금 옵션
  const [severanceIncluded, setSeveranceIncluded] = useState(false);

  const result = useMemo(() => {
    return calculateSalary({
      annualSalary,
      annualNonTax,
      dependents,
      u20Children,
      severanceIncluded,
    });
  }, [annualSalary, annualNonTax, dependents, u20Children, severanceIncluded]);

const monthlyNetPreview = Math.round(result.annualNet / 12);


  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      {/* 헤더 */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">연봉 계산기</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            국세청 간이세액표(조견표) 기반으로 연 실수령을 계산합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-extrabold text-slate-700">
            기준: 2026
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* 입력 */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-black text-slate-900">입력</div>
          </div>

          <div className="mt-4 grid gap-4">
            {/* 퇴직금 */}
            <div className="grid gap-2">
              <div className="flex items-center text-sm font-extrabold text-slate-700">
                퇴직금
                <Tip title="퇴직금">
                  연봉에 퇴직금이 포함된 경우 “포함(13분할)”로 계산합니다.
                  포함 여부는 근로계약서를 기준으로 확인하세요.
                </Tip>
              </div>

              <div className="w-full">
                <Segmented
                  value={severanceIncluded ? "right" : "left"}
                  onChange={(v) => setSeveranceIncluded(v === "right")}
                  left="별도"
                  right="포함"
                />
              </div>
            </div>

            <label className="grid gap-1">
              <div className="flex items-center text-sm font-extrabold text-slate-700">
                연봉(원)
              </div>

              <input
                inputMode="numeric"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200"
                value={annualSalaryText}
                onChange={(e) => setAnnualSalaryText(onlyDigits(e.target.value))}
                onBlur={() => {
                  const n = Number(onlyDigits(annualSalaryText) || "0");
                  setAnnualSalaryText(n ? formatWon(n) : "");
                }}
                placeholder="예: 50,000,000"
              />

              <div className="ml-[18px] text-xs font-semibold text-slate-500">
                {formatManCheon(annualSalary)}
              </div>
            </label>

            <label className="grid gap-1">
              <div className="flex items-center text-sm font-extrabold text-slate-700">
                연 비과세 합계(원)
                <Tip title="비과세">
                  식대/보육수당 등 연간 비과세 합계입니다. 계산 내부에서는 “월 간이세액표”를 쓰기 위해
                  비과세/연봉을 12(또는 13)으로 나눠 적용합니다.
                </Tip>
              </div>

              <input
                inputMode="numeric"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200"
                value={annualNonTaxText}
                onChange={(e) => setAnnualNonTaxText(onlyDigits(e.target.value))}
                onBlur={() => {
                  const n = Number(onlyDigits(annualNonTaxText) || "0");
                  setAnnualNonTaxText(n ? formatWon(n) : "");
                }}
                placeholder="예: 2,400,000"
              />

              <div className="ml-[18px] text-xs font-semibold text-slate-500">
                {formatManCheon(annualNonTax)}
              </div>
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2 text-sm font-extrabold text-slate-700">
                  공제대상가족(본인 포함)
                  <Tip title="공제대상가족">간이세액표(조견표) 조회에 사용됩니다.</Tip>
                </div>
                <input
                  inputMode="numeric"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200"
                  value={dependents}
                  onChange={(e) => setDependents(Number(e.target.value))}
                />
              </div>

              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2 text-sm font-extrabold text-slate-700">
                  8~20세 자녀 수
                  <Tip title="자녀(8~20세)">
                    2024.03.01 시행 간이세액표 규칙에 따라, 자녀 수에 해당하는 금액을 표 세액에서 차감합니다.
                  </Tip>
                </div>
                <input
                  inputMode="numeric"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200"
                  value={u20Children}
                  onChange={(e) => setU20Children(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-600 leading-relaxed">
              실제 급여명세서와는 회사별 기준(기준소득월액/절사 규칙 등)에 따라 차이가 날 수 있습니다.
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="text-sm font-black text-slate-900">결과(년)</div>

          <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-900 p-5 text-white shadow-sm sm:p-6">
            <div className="text-sm font-extrabold text-white/80">
              예상 실수령액(년)
            </div>

            <div className="mt-1 text-[28px] leading-tight font-black tracking-tight sm:text-3xl">
              <KRW n={result.annualNet} />
            </div>

            <div className="mt-2 text-xs font-semibold text-white/70">
              (월: <KRW n={monthlyNetPreview} />)
            </div>

            <div className="mt-2 text-xs font-semibold text-white/70">
              총 공제 <KRW n={result.annualTotalDeduction} /> / 세전{" "}
              <KRW n={result.annualGross} />
            </div>

            <div className="mt-2 text-xs font-semibold text-white/60">
              (퇴직금 {result.months === 13 ? "포함(13분할)" : "별도(12분할)"})
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            <Item label="연 과세대상(비과세 제외)" value={result.annualTaxable} />

            <Item
              label={
                <span className="inline-flex items-center gap-2">
                  <span>국민연금</span>
                  <Tip title="국민연금">
                    2026년부터 본인 부담률은 4.5%에서 시작해 매년 +0.25%p씩 올라갑니다.
                    <br />
                    (예: 2026 4.75% → 2027 5.00% → 2028 5.25% …)
                  </Tip>
                  <span className="text-xs font-black text-slate-600">4.75%</span>
                </span>
              }
              value={result.annualPension}
            />

            <Item
              label={
                <span className="inline-flex items-center gap-2">
                  <span>건강보험</span>
                  <span className="text-xs font-black text-slate-600">3.595%</span>
                </span>
              }
              value={result.annualHealth}
            />

            <Item
              label={
                <span className="inline-flex items-center gap-2">
                  <span>장기요양</span>
                  <span className="text-xs font-black text-slate-600">13.14%</span>
                </span>
              }
              value={result.annualCare}
            />

            <Item
              label={
                <span className="inline-flex items-center gap-2">
                  <span>고용보험</span>
                  <span className="text-xs font-black text-slate-600">0.9%</span>
                </span>
              }
              value={result.annualEmployment}
            />

            <div className="my-2 h-px bg-slate-100" />

            <Item
              label={
                <span className="inline-flex items-center gap-2">
                  <span>소득세(간이세액표)</span>
                </span>
              }
              value={result.annualIncomeTax}
            />

            <Item
              label={
                <span className="inline-flex items-center gap-2">
                  <span>지방소득세</span>
                  <span className="text-xs font-black text-slate-600">10%</span>
                </span>
              }
              value={result.annualLocalTax}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
