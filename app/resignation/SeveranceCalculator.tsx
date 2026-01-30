
"use client";

import React, { useMemo, useState } from "react";
import {
  addMonths,
  calculateSeverance,
  isoDate,
  type SeveranceInput,
} from "./severance.logic.ts";

function stripNumberLike(v: string) {
  const s = (v ?? "").toString().replace(/[^\d]/g, "");
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function formatWon(n: number) {
  const x = Math.floor(Number.isFinite(n) ? n : 0);
  return x.toLocaleString("ko-KR") + "원";
}

function formatNumberInput(n: number) {
  const x = Math.floor(Number.isFinite(n) ? n : 0);
  return x === 0 ? "" : x.toLocaleString("ko-KR");
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="text-sm font-black text-slate-700">{label}</div>
      <div className="text-sm font-black text-slate-900">{value}</div>
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

  const [last3mEnd, setLast3mEnd] = useState(defaultEnd);
  const [last3mStart, setLast3mStart] = useState(() => {
    const end = new Date(defaultEnd + "T00:00:00");
    return isoDate(addMonths(end, -3));
  });

  const [last3mWagesText, setLast3mWagesText] = useState("");
  const [excludeDaysText, setExcludeDaysText] = useState("");

  const input: SeveranceInput = useMemo(
    () => ({
      employmentStart,
      employmentEnd,
      last3mStart,
      last3mEnd,
      last3mWages: stripNumberLike(last3mWagesText),
      excludeDays: stripNumberLike(excludeDaysText),
    }),
    [employmentStart, employmentEnd, last3mStart, last3mEnd, last3mWagesText, excludeDaysText]
  );

  const result = useMemo(() => calculateSeverance(input), [input]);

  const quickSetLast3mToEnd = () => {
    const ee = new Date(employmentEnd + "T00:00:00");
    if (!Number.isFinite(ee.getTime())) return;
    const le = ee;
    const ls = addMonths(le, -3);
    setLast3mEnd(isoDate(le));
    setLast3mStart(isoDate(ls));
  };

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">퇴직금 계산기</h2>
      <p className="mt-2 text-slate-600 font-semibold">
        최근 3개월 임금총액/기간을 넣으면 평균임금(1일) 기준으로 퇴직금을 계산해.
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
                <span className="font-black text-slate-900">
                  {result.serviceDays.toLocaleString("ko-KR")}
                </span>
                일
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
            <div className="flex items-center justify-between">
              <div className="text-sm font-black text-slate-800">최근 3개월(평균임금 산정)</div>
              <button
                type="button"
                onClick={quickSetLast3mToEnd}
                className="rounded-full border bg-white px-3 py-1 text-xs font-black text-slate-800 hover:bg-slate-50"
              >
                퇴사일 기준 3개월 자동설정
              </button>
            </div>

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
                <div className="text-xs font-bold text-slate-600">최근 3개월 임금총액(원)</div>
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
        </div>

        {/* Result */}
        <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
          <div className="text-sm font-extrabold text-white/80">결과(예상)</div>
          <div className="mt-2 text-4xl font-black tracking-tight">{formatWon(result.severance)}</div>

          <div className="mt-6 overflow-hidden rounded-2xl bg-white">
            <div className="divide-y">
              <Row label="평균임금(1일)" value={formatWon(result.avgDailyWage)} />
              <Row label="근속일수" value={`${result.serviceDays.toLocaleString("ko-KR")}일`} />
              <Row label="근속연수(일/365)" value={result.serviceYears.toFixed(6)} />
              <Row label="최근3개월 역일수" value={`${result.last3mDays.toLocaleString("ko-KR")}일`} />
              <Row label="산정일수(제외반영)" value={`${result.last3mDaysCounted.toLocaleString("ko-KR")}일`} />
              <Row label="계산식" value="평균임금(1일) × 30 × 근속연수" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
