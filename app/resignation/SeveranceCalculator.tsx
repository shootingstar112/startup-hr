"use client";

import React, { useMemo, useState, useEffect } from "react";

import { addMonths, calculateSeverance, isoDate, type SeveranceInput } from "./severance.logic";
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function stripNumberLike(v: string) {
  const s = (v ?? "").toString().replace(/[^\d]/g, "");
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function formatWonPlain(n: number) {
  const x = Math.floor(Number.isFinite(n) ? n : 0);
  return x.toLocaleString("ko-KR");
}

function formatWon(n: number) {
  return formatWonPlain(n) + "원";
}

function formatNumberInput(n: number) {
  const x = Math.floor(Number.isFinite(n) ? n : 0);
  return x === 0 ? "" : x.toLocaleString("ko-KR");
}

function Row({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="text-sm font-black text-white/80">{label}</div>
      <div className={`text-sm font-black text-white ${valueClassName ?? ""}`}>{value}</div>
    </div>
  );
}

export default function SeveranceCalculator() {
  const today = useMemo(() => new Date(), []);
  const defaultEnd = useMemo(() => isoDate(today), [today]);
  const defaultStart = useMemo(() => {
    const d = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    return isoDate(d);
  }, [today]);

  const [employmentStart, setEmploymentStart] = useState(defaultStart);
  const [employmentEnd, setEmploymentEnd] = useState(defaultEnd);

  const [last3mEnd, setLast3mEnd] = useState(() => {
    const ee = new Date(defaultEnd + "T00:00:00");
    const le = addDays(ee, -1);        // 종료: 퇴사일 전일
    return isoDate(le);
  });

  const [last3mStart, setLast3mStart] = useState(() => {
    const ee = new Date(defaultEnd + "T00:00:00");
    const ls = addMonths(ee, -3);      // ✅ 시작: 퇴사일 기준 3개월 전(11/06)
    return isoDate(ls);
  });


  const [last3mWagesText, setLast3mWagesText] = useState("");
  const [annualBonusText, setAnnualBonusText] = useState("");
  const [annualLeavePayText, setAnnualLeavePayText] = useState("");
  const [excludeDaysText, setExcludeDaysText] = useState("");
  useEffect(() => {
    const ee = new Date(employmentEnd + "T00:00:00");
    if (!Number.isFinite(ee.getTime())) return;

    const le = addDays(ee, -1);                 // 종료 = 퇴사일 전일 (02-05)
    const ls = addMonths(ee, -3);               // 시작 = 퇴사일 기준 3개월 전 (11-06)

    setLast3mEnd(isoDate(le));
    setLast3mStart(isoDate(ls));
  }, [employmentEnd]);


  const input: SeveranceInput = useMemo(
    () => ({
      employmentStart,
      employmentEnd,
      last3mStart,
      last3mEnd,
      last3mWages: stripNumberLike(last3mWagesText),
      annualBonus: stripNumberLike(annualBonusText),
      annualLeavePay: stripNumberLike(annualLeavePayText),
      excludeDays: stripNumberLike(excludeDaysText),
    }),
    [
      employmentStart,
      employmentEnd,
      last3mStart,
      last3mEnd,
      last3mWagesText,
      annualBonusText,
      annualLeavePayText,
      excludeDaysText,
    ]
  );

  const result = useMemo(() => calculateSeverance(input), [input]);

  const taxBarSeverance = result.severanceGross > 0 ? (result.severanceNet / result.severanceGross) * 100 : 0;
  const taxBarTax = 100 - taxBarSeverance;

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">퇴직금 계산기</h2>
      <p className="mt-2 text-slate-600 font-semibold">
        최근 3개월 임금총액/기간을 넣으면 평균임금(1일) 기준으로 퇴직금을 계산.
        (연간상여금/연차수당 모두 최근 3개월분으로 안분(=1/4) 반영)

      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-5">
          <div className="rounded-xl border p-4">
            <div className="text-sm font-black text-slate-800">근속기간</div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <div className="text-xs font-bold text-slate-600">입사일</div>
                <input
                  type="date"
                  value={employmentStart}
                  onChange={(e) => setEmploymentStart(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>
              <label className="block">
                <div className="text-xs font-bold text-slate-600">퇴사일</div>
                <input
                  type="date"
                  value={employmentEnd}
                  onChange={(e) => setEmploymentEnd(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="rounded-full bg-slate-50 px-2 py-1">
                근속일수:{" "}
                <span className="font-black text-slate-900">{result.serviceDays.toLocaleString("ko-KR")}</span>일
              </span>
              <span className="rounded-full bg-slate-50 px-2 py-1">
                근속연수(일/365):{" "}
                <span className="font-black text-slate-900">
                  {Number.isFinite(result.serviceYears) ? result.serviceYears.toFixed(4) : "0.0000"}
                </span>
              </span>
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="text-sm font-black text-slate-800">최근 3개월(평균임금 산정)</div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <div className="text-xs font-bold text-slate-600">기간 시작</div>
                <input
                  type="date"
                  value={last3mStart}
                  onChange={(e) => setLast3mStart(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>
              <label className="block">
                <div className="text-xs font-bold text-slate-600">기간 종료</div>
                <input
                  type="date"
                  value={last3mEnd}
                  onChange={(e) => setLast3mEnd(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <div className="text-xs font-bold text-slate-600">최근 3개월 임금총액(세전)</div>
                <input
                  inputMode="numeric"
                  placeholder="예: 15,000,000"
                  value={last3mWagesText}
                  onChange={(e) => {
                    const n = stripNumberLike(e.target.value);
                    setLast3mWagesText(formatNumberInput(n));
                  }}
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>

              <label className="block">
                <div className="text-xs font-bold text-slate-600">산정기간 제외일수(선택)</div>
                <input
                  inputMode="numeric"
                  placeholder="예: 0"
                  value={excludeDaysText}
                  onChange={(e) => {
                    const n = stripNumberLike(e.target.value);
                    setExcludeDaysText(n === 0 ? "" : String(n));
                  }}
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>
            </div>
          </div>

          {/* NEW: Extra pay items */}
          <div className="rounded-xl border p-4">
            <div className="text-sm font-black text-slate-800">추가 항목</div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <div className="text-xs font-bold text-slate-600">연간상여금(원, 연)</div>
                <input
                  inputMode="numeric"
                  placeholder="예: 12,000,000"
                  value={annualBonusText}
                  onChange={(e) => {
                    const n = stripNumberLike(e.target.value);
                    setAnnualBonusText(formatNumberInput(n));
                  }}
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                />
                <div className="mt-1 text-[11px] font-semibold text-slate-500">
                  최근 3개월에는 1/4(3개월분)로 안분 반영
                </div>
              </label>

              <label className="block">
                <div className="text-xs font-bold text-slate-600">연차수당(원, 연)</div>
                <input
                  inputMode="numeric"
                  placeholder="예: 1,500,000"
                  value={annualLeavePayText}
                  onChange={(e) => {
                    const n = stripNumberLike(e.target.value);
                    setAnnualLeavePayText(formatNumberInput(n));
                  }}
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                />
                <div className="mt-1 text-[11px] font-semibold text-slate-500">
                  최근 3개월에는 1/4(3개월분)로 안분 반영
                </div>
              </label>
            </div>

            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-700">
              최근 3개월 임금총액(반영 후):{" "}
              <span className="font-black text-slate-900">{formatWon(result.last3mWagesTotal)}</span>
              <div className="mt-1 text-[11px] text-slate-600">
                · 상여금 반영액(3개월분): {formatWon(result.bonusCountedIn3m)} / 연차수당 반영액:{" "}
                {formatWon(result.leavePayCountedIn3m)}
              </div>
            </div>
          </div>
        </div>

        {/* Result (screenshot-like) */}
        <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
          <div className="text-sm font-extrabold text-white/80">예상 실수령액(세후)</div>
          <div className="mt-2 text-4xl font-black tracking-tight">{formatWon(result.severanceNet)}</div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-xs font-extrabold text-white/70">1년 평균 퇴직금(세전)</div>
              <div className="mt-1 text-lg font-black">{formatWon(result.avgYearSeveranceGross)}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-xs font-extrabold text-white/70">실제 산정기간/일수</div>
              <div className="mt-1 text-sm font-black">
                {input.last3mStart} ~ {input.last3mEnd}
              </div>
              <div className="mt-1 text-xs font-semibold text-white/80">
                ({result.last3mDaysCounted.toLocaleString("ko-KR")}일)
              </div>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl bg-white/10">
            <div className="divide-y divide-white/10">
              <Row label="퇴직금(세전)" value={formatWon(result.severanceGross)} />
              <Row
                label="(-) 퇴직소득세"
                value={`-${formatWonPlain(result.retirementIncomeTax)}원`}
                valueClassName="text-white/90"
              />
              <Row
                label="(-) 지방소득세"
                value={`-${formatWonPlain(result.localIncomeTax)}원`}
                valueClassName="text-white/90"
              />
              <Row
                label="실효세율"
                value={`${(result.effectiveTaxRate * 100).toFixed(2)}%`}
                valueClassName="text-white/90"
              />
            </div>
          </div>

          {/* ratio bar */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-white/80">
              <span>실수령 비율</span>
              <span>
                실수령 {(taxBarSeverance || 0).toFixed(1)}% · 세금 {(taxBarTax || 0).toFixed(1)}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-white/15">
              <div className="h-full bg-white/80" style={{ width: `${Math.max(0, Math.min(100, taxBarSeverance))}%` }} />
            </div>
            <div className="mt-2 text-xs font-semibold text-white/80">
              세금 합계: {formatWon(result.taxTotal)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
