"use client";

import React, { useMemo, useState, useEffect } from "react";
import { addMonths, isoDate, calculateShutdownPay, type ShutdownPayInput } from "./shutdown.logic";

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

export default function ShutdownPayCalculator() {
  const today = useMemo(() => new Date(), []);
  const defaultEnd = useMemo(() => isoDate(today), [today]);
  const defaultStart = useMemo(() => {
    const ee = new Date(defaultEnd + "T00:00:00");
    return isoDate(addMonths(ee, -3));
  }, [defaultEnd]);

  const [last3mStart, setLast3mStart] = useState(defaultStart);
  const [last3mEnd, setLast3mEnd] = useState(defaultEnd);

  const [last3mWagesText, setLast3mWagesText] = useState("");
  const [excludeDaysText, setExcludeDaysText] = useState("");
  const [shutdownDaysText, setShutdownDaysText] = useState("");
  const [rateText, setRateText] = useState("70"); // %
useEffect(() => {
  const end = new Date(last3mEnd + "T00:00:00");
  if (!Number.isFinite(end.getTime())) return;

  // ✅ 92일로 맞추기: 시작 = (종료일 - 3개월) + 1일
  const start = addDays(addMonths(end, -3), 1);

  setLast3mStart(isoDate(start));
}, [last3mEnd]);

  const input: ShutdownPayInput = useMemo(
    () => ({
      last3mStart,
      last3mEnd,
      last3mWages: stripNumberLike(last3mWagesText),
      excludeDays: stripNumberLike(excludeDaysText),
      shutdownDays: stripNumberLike(shutdownDaysText),
      rate: Math.max(0, Math.min(1, (stripNumberLike(rateText) || 70) / 100)),
    }),
    [last3mStart, last3mEnd, last3mWagesText, excludeDaysText, shutdownDaysText, rateText]
  );

  const result = useMemo(() => calculateShutdownPay(input), [input]);

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">휴업수당 계산기</h2>
      <p className="mt-2 text-slate-600 font-semibold">
        최근 3개월 평균임금(1일) × 지급률(기본 70%) × 휴업일수로 계산(세전).
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-5">
          <div className="rounded-xl border p-4">
            <div className="text-sm font-black text-slate-800">최근 3개월(평균임금 산정)</div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <div className="text-xs font-bold text-slate-600">기간 시작</div>
                <input type="date" value={last3mStart} onChange={(e) => setLast3mStart(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200" />
              </label>
              <label className="block">
                <div className="text-xs font-bold text-slate-600">기간 종료</div>
                <input type="date" value={last3mEnd} onChange={(e) => setLast3mEnd(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200" />
              </label>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <div className="text-xs font-bold text-slate-600">최근 3개월 임금총액(세전, 원)</div>
                <input
                  inputMode="numeric"
                  placeholder="예: 9,000,000"
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

          <div className="rounded-xl border p-4">
            <div className="text-sm font-black text-slate-800">휴업 조건</div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <div className="text-xs font-bold text-slate-600">휴업일수</div>
                <input
                  inputMode="numeric"
                  placeholder="예: 10"
                  value={shutdownDaysText}
                  onChange={(e) => {
                    const n = stripNumberLike(e.target.value);
                    setShutdownDaysText(n === 0 ? "" : String(n));
                  }}
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>

              <label className="block">
                <div className="text-xs font-bold text-slate-600">지급률(%)</div>
                <input
                  inputMode="numeric"
                  placeholder="70"
                  value={rateText}
                  onChange={(e) => {
                    const n = stripNumberLike(e.target.value);
                    setRateText(n === 0 ? "" : String(n));
                  }}
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                />
                <div className="mt-1 text-[11px] font-semibold text-slate-500">
                  법정 최소 70% (회사 규정이 더 높으면 수정)
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
          <div className="text-sm font-extrabold text-white/80">휴업수당(세전) 예상</div>
          <div className="mt-2 text-4xl font-black tracking-tight">{formatWon(result.shutdownPayTotal)}</div>

          <div className="mt-5 overflow-hidden rounded-2xl bg-white/10">
            <div className="divide-y divide-white/10">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="text-sm font-black text-white/80">평균임금(1일)</div>
                <div className="text-sm font-black text-white">{formatWon(result.avgDailyWage)}</div>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="text-sm font-black text-white/80">휴업수당(1일, {rateText || "70"}%)</div>
                <div className="text-sm font-black text-white">{formatWon(result.shutdownPayDaily)}</div>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="text-sm font-black text-white/80">산정일수(제외반영)</div>
                <div className="text-sm font-black text-white">{result.last3mDaysCounted.toLocaleString("ko-KR")}일</div>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="text-sm font-black text-white/80">휴업일수</div>
                <div className="text-sm font-black text-white">{(stripNumberLike(shutdownDaysText) || 0).toLocaleString("ko-KR")}일</div>
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs font-semibold text-white/70">
            ※ 실제 지급/공제는 회사 규정·근태(주휴 포함 여부)·세금/4대보험 처리에 따라 달라질 수 있음.
          </div>
        </div>
      </div>
    </div>
  );
}
