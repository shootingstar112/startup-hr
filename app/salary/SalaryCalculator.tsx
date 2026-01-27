"use client";

import { useMemo, useState } from "react";
import { calculateSalary } from "./salary.logic";

function KRW({ n }: { n: number }) {
  return <span>{Math.round(n).toLocaleString("ko-KR")}원</span>;
}

function Tip({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-[11px] font-black text-slate-600 hover:bg-slate-50"
      >
        ?
      </button>
      {open && (
        <div className="absolute left-0 top-7 z-50 w-[280px] rounded-xl border bg-white p-3 shadow-xl">
          <div className="text-sm font-black">{title}</div>
          <div className="mt-1 text-xs font-semibold text-slate-600 leading-relaxed">
            {children}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 rounded-lg px-2 py-1 text-xs font-black text-slate-600 hover:bg-slate-50"
          >
            닫기
          </button>
        </div>
      )}
    </span>
  );
}

export default function SalaryCalculator() {
  const [annualSalary, setAnnualSalary] = useState(50_000_000);
  const [monthlyNonTax, setMonthlyNonTax] = useState(200_000);
  const [dependents, setDependents] = useState(1);
  const [u20Children, setU20Children] = useState(0);

  const result = useMemo(() => {
    return calculateSalary({ annualSalary, monthlyNonTax, dependents, u20Children });
  }, [annualSalary, monthlyNonTax, dependents, u20Children]);

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">연봉 계산기</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            간이세액표 기반(2026)으로 월 실수령을 계산합니다.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold">
          기준: 2026
        </span>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* 입력 */}
        <div className="rounded-2xl border p-5">
          <div className="text-sm font-black">입력</div>

          <div className="mt-4 grid gap-4">
            <label className="grid gap-1">
              <div className="flex items-center text-sm font-extrabold text-slate-700">
                연봉(원)
              </div>
              <input
                inputMode="numeric"
                className="h-11 rounded-xl border px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200"
                value={annualSalary}
                onChange={(e) => setAnnualSalary(Number(e.target.value))}
              />
            </label>

            <label className="grid gap-1">
              <div className="flex items-center text-sm font-extrabold text-slate-700">
                월 비과세 합계(원)
                <Tip title="비과세">
                  식대/보육수당 등 비과세 합계. 비과세는 과세대상에서 제외됩니다.
                </Tip>
              </div>
              <input
                inputMode="numeric"
                className="h-11 rounded-xl border px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200"
                value={monthlyNonTax}
                onChange={(e) => setMonthlyNonTax(Number(e.target.value))}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <div className="flex items-center text-sm font-extrabold text-slate-700">
                  부양가족(본인 포함)
                  <Tip title="부양가족">
                    간이세액표 조회에 쓰입니다.
                  </Tip>
                </div>
                <input
                  inputMode="numeric"
                  className="h-11 rounded-xl border px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200"
                  value={dependents}
                  onChange={(e) => setDependents(Number(e.target.value))}
                />
              </label>

              <label className="grid gap-1">
                <div className="flex items-center text-sm font-extrabold text-slate-700">
                  20세 이하 자녀
                  <Tip title="자녀">
                    다음 단계에서 자녀 세액공제까지 정확 반영합니다.
                  </Tip>
                </div>
                <input
                  inputMode="numeric"
                  className="h-11 rounded-xl border px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200"
                  value={u20Children}
                  onChange={(e) => setU20Children(Number(e.target.value))}
                />
              </label>
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="rounded-2xl border p-5">
          <div className="text-sm font-black">결과(월)</div>

          <div className="mt-4 rounded-2xl bg-slate-900 p-5 text-white">
            <div className="text-sm font-extrabold text-white/80">예상 실수령액</div>
            <div className="mt-1 text-3xl font-black">
              <KRW n={result.monthlyNet} />
            </div>
            <div className="mt-2 text-xs font-semibold text-white/70">
              총 공제 <KRW n={result.totalDeduction} /> / 세전 <KRW n={result.monthlyGross} />
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            <Item label="과세대상(월)" value={result.monthlyTaxable} />
            <Item label="국민연금" value={result.pension} />
            <Item label="건강보험" value={result.health} />
            <Item label="장기요양" value={result.care} />
            <Item label="고용보험" value={result.employment} />
            <div className="my-2 h-px bg-slate-100" />
            <Item label="소득세(간이세액표)" value={result.incomeTax} />
            <Item label="지방소득세" value={result.localTax} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <div className="text-sm font-extrabold text-slate-700">{label}</div>
      <div className="text-sm font-black text-slate-900">
        <KRW n={value} />
      </div>
    </div>
  );
}
