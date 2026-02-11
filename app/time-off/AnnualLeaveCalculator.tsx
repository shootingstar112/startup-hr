"use client";

import React, { useMemo, useState } from "react";
import { calculateAnnualLeave, type AnnualLeaveBasis } from "./annual.logic";

const iosSafeDateInput =
  "mt-1 w-full max-w-full min-w-0 appearance-none rounded-xl border px-3 py-2 font-semibold text-base outline-none focus:ring-2 focus:ring-slate-200";

function formatDays(n: number) {
  if (!Number.isFinite(n)) return "0";
  const isInt = Math.abs(n - Math.round(n)) < 1e-9;
  return isInt ? String(Math.round(n)) : n.toFixed(1);
}

function summaryTitleFromLabel(label: string) {
  const hasM = label.includes("월차");
  const hasA = label.includes("연차");
  if (hasM && hasA) return "월차/연차";
  if (hasM) return "월차";
  return "연차";
}

function BasisHint({ basis, hireDay }: { basis: AnnualLeaveBasis; hireDay: number }) {
  const dd = String(hireDay).padStart(2, "0");
  return (
    <div className="mt-4 rounded-xl border bg-slate-50 p-4 text-sm font-semibold text-slate-700">
      {basis === "hire" ? (
        <>
          <div className="font-black text-slate-900">입사일 기준</div>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>1년 미만: 월차만</li>
            <li>1년 이후: 연차만</li>
            <li>연차 발생일: 매년 입사 {dd}일</li>
          </ul>
        </>
      ) : (
        <>
          <div className="font-black text-slate-900">회계년도 기준(1/1)</div>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>월차: 1주년 전까지(입사기준일과 동일)</li>
            <li>연차: 매년 1/1 (입사 다음해 1/1은 비례)</li>
            <li>따라서 1년 전까지 월차+연차 공존 가능</li>
          </ul>
        </>
      )}
    </div>
  );
}

export default function AnnualLeaveCalculator() {
  const today = new Date().toISOString().slice(0, 10);

  const [employmentStart, setEmploymentStart] = useState("2025-12-30");
  const [calcDate, setCalcDate] = useState(today);
  const [basis, setBasis] = useState<AnnualLeaveBasis>("hire");

  const hireDay = useMemo(() => {
    const d = new Date(employmentStart + "T00:00:00");
    return Number.isFinite(d.getTime()) ? d.getDate() : 1;
  }, [employmentStart]);

  const result = useMemo(
    () => calculateAnnualLeave(employmentStart, calcDate, basis),
    [employmentStart, calcDate, basis]
  );

  const summaryTitle = result.ok ? summaryTitleFromLabel(result.currentLeaveLabel) : "-";

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="text-xl font-black">연차 계산기</h2>

      {/* ✅ iOS safe: overflow-hidden + label min-w-0 + input appearance-none/max-w/min-w */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 overflow-hidden">
        <label className="min-w-0">
          <div className="text-xs font-bold text-slate-600">입사일</div>
          <input
            type="date"
            value={employmentStart}
            onChange={(e) => setEmploymentStart(e.target.value)}
            className={iosSafeDateInput}
          />
        </label>

        <label className="min-w-0">
          <div className="text-xs font-bold text-slate-600">계산일</div>
          <input
            type="date"
            value={calcDate}
            onChange={(e) => setCalcDate(e.target.value)}
            className={iosSafeDateInput}
          />
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setBasis("hire")}
          className={[
            "px-3 py-2 rounded-xl font-black border",
            basis === "hire"
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-800 hover:bg-slate-50",
          ].join(" ")}
        >
          입사일 기준
        </button>

        <button
          type="button"
          onClick={() => setBasis("fiscal")}
          className={[
            "px-3 py-2 rounded-xl font-black border",
            basis === "fiscal"
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-800 hover:bg-slate-50",
          ].join(" ")}
        >
          회계년도 기준(1/1)
        </button>
      </div>

      {/* ✅ 상단 요약: 2칸만 */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm font-black text-slate-900">근무기간</div>
          <div className="mt-2 text-lg font-black text-slate-900">
            {result.ok ? result.serviceYMDText : "-"}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm font-black text-slate-900">{summaryTitle}</div>
          <div className="mt-2 text-lg font-black text-blue-600">
            {result.ok ? `${formatDays(result.currentLeaveDays)}일` : "-"}
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-500">
            {result.ok ? result.currentLeaveLabel : ""}
          </div>
        </div>
      </div>

      <BasisHint basis={basis} hireDay={hireDay} />

      {/* ✅ 표(전체 보여주기)는 그대로 */}
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-white">
              <th className="px-3 py-2 text-left">구분</th>
              <th className="px-3 py-2 text-center">휴가수</th>
              <th className="px-3 py-2 text-center">휴가 발생일(기간)</th>
              <th className="px-3 py-2 text-center">미사용 수당/소멸 기준일</th>
            </tr>
          </thead>

          <tbody>
            {result.schedule.map((r, i) => (
              <tr key={i} className={["border-b", r.highlight ? "bg-amber-50" : ""].join(" ")}>
                <td className="px-3 py-2 font-semibold text-slate-900">{r.label}</td>
                <td className="px-3 py-2 text-center font-black text-slate-900">
                  {formatDays(r.days)}일
                </td>
                <td className="px-3 py-2 text-center">{r.accrualDate}</td>
                <td className="px-3 py-2 text-center">{r.expiryDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs font-semibold text-slate-500">{result.noteAfter23}</div>
      <div className="mt-2 text-xs font-semibold text-slate-500">
        ※ 회사 규정에 따라 “입사일 기준” 또는 “회계년도(1/1) 기준” 중 하나로 운영.
      </div>
    </div>
  );
}
