"use client";

import React, { useMemo, useState } from "react";
import { calculateAnnualLeave, type AnnualLeaveBasis } from "./annual.logic";
import { calculateDismissalPay, type DismissalPayInput } from "../resignation/dismissal.logic"; // 경로 맞춰줘

function stripNumberLike(v: string) {
  const s = (v ?? "").toString().replace(/[^\d.]/g, "");
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
function formatDays(n: number) {
  if (!Number.isFinite(n)) return "0";
  const isInt = Math.abs(n - Math.round(n)) < 1e-9;
  return isInt ? String(Math.round(n)) : n.toFixed(1);
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(n || 0)));
}

// 주휴 자동 반영(비례) - 주소정/5, 주15h 미만이면 0
function addWeeklyHolidayHours(weeklyWorkHours: number) {
  const w = Math.max(0, weeklyWorkHours);
  const weeklyHolidayHours = w >= 15 ? w / 5 : 0;
  return {
    weeklyWorkHours: w,
    weeklyHolidayHours,
    weeklyPaidHours: w + weeklyHolidayHours,
  };
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl border px-3 py-2 text-sm font-black",
        active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-800 hover:bg-slate-50",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="text-sm font-black text-white/80">{label}</div>
      <div className="text-sm font-black text-white">{value}</div>
    </div>
  );
}

function BasisChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-3 py-2 rounded-xl font-black border",
        active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-800 hover:bg-slate-50",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

export default function AnnualLeavePayCalculator() {
  const today = useMemo(() => new Date(), []);
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayIso = `${yyyy}-${mm}-${dd}`;

  // ===== 연차 입력 =====
  const [basis, setBasis] = useState<AnnualLeaveBasis>("hire");
  const [employmentStart, setEmploymentStart] = useState(`${yyyy - 1}-${mm}-${dd}`);
  const [calcDate, setCalcDate] = useState(todayIso);

  const [usedLeaveDaysText, setUsedLeaveDaysText] = useState("0");

  // ===== 임금(세전) =====
  const [monthlyBasePayText, setMonthlyBasePayText] = useState("");
  const [monthlyFixedAllowanceText, setMonthlyFixedAllowanceText] = useState("");
  const [annualBonusText, setAnnualBonusText] = useState("");

  // ===== 근로시간 입력모드 =====
  const [mode, setMode] = useState<"simple" | "weekly">("simple");

  // simple
  const [weeklyWorkDays, setWeeklyWorkDays] = useState("5");
  const [dailyWorkHours, setDailyWorkHours] = useState("8");

  // weekly (주휴 제외 주소정 주 소정근로시간)
  const [weeklyHoursText, setWeeklyHoursText] = useState("");

  const leave = useMemo(
    () => calculateAnnualLeave(employmentStart, calcDate, basis),
    [employmentStart, calcDate, basis]
  );

  const usedLeaveDays = Math.max(0, Number(stripNumberLike(usedLeaveDaysText)) || 0);
  const totalLeaveDays = leave.ok ? Number(leave.currentLeaveDays) || 0 : 0;
  const payableLeaveDays = Math.max(0, totalLeaveDays - usedLeaveDays);

  // 주 소정/주휴 표시 계산(화면용)
  const weeklyWorkHoursForDisplay =
    mode === "simple"
      ? clampInt(stripNumberLike(weeklyWorkDays), 0, 7) * Math.max(0, Math.floor(stripNumberLike(dailyWorkHours)))
      : Math.max(0, stripNumberLike(weeklyHoursText));

  const withHoliday = useMemo(
    () => addWeeklyHolidayHours(weeklyWorkHoursForDisplay),
    [weeklyWorkHoursForDisplay]
  );

  // dismissal.logic.ts 재사용(통상임금 엔진)
  const input: DismissalPayInput = useMemo(
    () => ({
      employmentStart,
      dismissalDate: calcDate, // 날짜는 연차수당에 본질적이진 않지만 기존 엔진 재사용용

      monthlyBasePay: stripNumberLike(monthlyBasePayText),
      monthlyFixedAllowance: stripNumberLike(monthlyFixedAllowanceText),
      annualBonus: stripNumberLike(annualBonusText),

      mode,

      weeklyWorkDays: stripNumberLike(weeklyWorkDays),
      dailyWorkHours: stripNumberLike(dailyWorkHours),

      weeklyHours: stripNumberLike(weeklyHoursText),
    }),
    [
      employmentStart,
      calcDate,
      monthlyBasePayText,
      monthlyFixedAllowanceText,
      annualBonusText,
      mode,
      weeklyWorkDays,
      dailyWorkHours,
      weeklyHoursText,
    ]
  );

  const wage = useMemo(() => calculateDismissalPay(input), [input]);

  const dailyOrdinaryWageRaw = Number.isFinite(wage.dailyOrdinaryWageRaw) ? wage.dailyOrdinaryWageRaw : 0;
  const annualLeavePayRaw = dailyOrdinaryWageRaw * payableLeaveDays;
  const annualLeavePay = Math.max(0, Math.round(annualLeavePayRaw));

  const hoursLabel =
    mode === "simple" ? `${Math.max(0, Math.floor(stripNumberLike(dailyWorkHours) || 0))}h` : "8h 기준";

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">연차수당 계산기</h2>
      <p className="mt-2 text-slate-600 font-semibold">
        <span className="font-black">1일 통상임금 × 미사용 연차일수</span>로 연차수당(세전)을 계산.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-5">
          {/* 연차 정보 */}
          <div className="rounded-xl border p-4">
            <div className="text-sm font-black text-slate-800">연차 계산 기준</div>

            <div className="mt-3 flex gap-2">
              <BasisChip label="입사일" active={basis === "hire"} onClick={() => setBasis("hire")} />
              <BasisChip label="회계년도" active={basis === "fiscal"} onClick={() => setBasis("fiscal")} />
            </div>

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
                <div className="text-xs font-bold text-slate-600">계산일</div>
                <input
                  type="date"
                  value={calcDate}
                  onChange={(e) => setCalcDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <div className="text-xs font-bold text-slate-600">사용한 연차일수</div>
                <input
                  inputMode="decimal"
                  value={usedLeaveDaysText}
                  onChange={(e) => setUsedLeaveDaysText(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>

              <div className="rounded-xl border bg-slate-50 p-4">
                <div className="text-xs font-bold text-slate-600">미사용 연차일수</div>
                <div className="mt-2 text-lg font-black text-slate-900">
                  {formatDays(payableLeaveDays)}일
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-500">
                  연차 {formatDays(totalLeaveDays)}일 − 사용 {formatDays(usedLeaveDays)}일
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs font-semibold text-slate-600">
              근무기간:{" "}
              <span className="font-black text-slate-900">{leave.ok ? leave.serviceYMDText : "-"}</span>
              <span className="text-slate-500"> (근속연수 {leave.ok ? leave.serviceFullYears : 0}년)</span>
            </div>
          </div>

          {/* 통상임금(월, 세전) */}
          <div className="rounded-xl border p-4">
            <div className="text-sm font-black text-slate-800">통상임금(월, 세전)</div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <div className="text-xs font-bold text-slate-600">월 기본급</div>
                <input
                  inputMode="numeric"
                  placeholder="예: 3,000,000"
                  value={monthlyBasePayText}
                  onChange={(e) => {
                    const n = stripNumberLike(e.target.value);
                    setMonthlyBasePayText(formatNumberInput(n));
                  }}
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>

              <label className="block">
                <div className="text-xs font-bold text-slate-600">월 고정수당 합계</div>
                <input
                  inputMode="numeric"
                  placeholder="예: 200,000"
                  value={monthlyFixedAllowanceText}
                  onChange={(e) => {
                    const n = stripNumberLike(e.target.value);
                    setMonthlyFixedAllowanceText(formatNumberInput(n));
                  }}
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>
            </div>

            <div className="mt-3">
              <label className="block">
                <div className="text-xs font-bold text-slate-600">연간상여금(연, 통상임금에 무조건 포함)</div>
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
              </label>

              <div className="mt-2 text-xs font-semibold text-slate-700">
                월 통상임금(세전):{" "}
                <span className="font-black text-slate-900">{formatWon(wage.monthlyOrdinaryWage)}</span>
              </div>
            </div>
          </div>

          {/* 근로시간 입력 */}
          <div className="rounded-xl border p-4">
            <div className="text-sm font-black text-slate-800">근로시간 입력</div>

            <div className="mt-3 flex gap-2">
              <Chip label="간편입력(주/일)" active={mode === "simple"} onClick={() => setMode("simple")} />
              <Chip label="직접입력(1주 유급시간)" active={mode === "weekly"} onClick={() => setMode("weekly")} />
            </div>

            {mode === "simple" ? (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <div className="text-xs font-bold text-slate-600">주 근무일수</div>
                  <input
                    inputMode="numeric"
                    value={weeklyWorkDays}
                    onChange={(e) => setWeeklyWorkDays(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </label>

                <label className="block">
                  <div className="text-xs font-bold text-slate-600">1일 근로시간</div>
                  <input
                    inputMode="numeric"
                    value={dailyWorkHours}
                    onChange={(e) => setDailyWorkHours(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </label>

                <div className="sm:col-span-2 mt-1 text-[11px] font-semibold text-slate-500">
                  ※ 주휴 자동 반영(주휴시간=주소정/5, 주15h 미만 0).
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <label className="block">
                  <div className="text-xs font-bold text-slate-600">1주 소정근로시간(주휴 제외, 시간)</div>
                  <input
                    inputMode="numeric"
                    placeholder="예: 40"
                    value={weeklyHoursText}
                    onChange={(e) => {
                      const n = stripNumberLike(e.target.value);
                      setWeeklyHoursText(n === 0 ? "" : String(n));
                    }}
                    className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </label>

                <div className="mt-1 text-[11px] font-semibold text-slate-500">
                  ※ 직접입력도 주휴 자동 반영(주휴시간=주소정/5, 주15h 미만 0).
                </div>
              </div>
            )}

            <div className="mt-3 text-xs font-semibold text-slate-700">
              월 소정근로시간(환산):{" "}
              <span className="font-black text-slate-900">{wage.monthlyHours.toLocaleString("ko-KR")}</span>시간
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
          <div className="text-sm font-extrabold text-white/80">연차수당(세전) 예상</div>
          <div className="mt-2 text-4xl font-black tracking-tight">{formatWon(annualLeavePay)}</div>

          <div className="mt-5 overflow-hidden rounded-2xl bg-white/10">
            <div className="divide-y divide-white/10">
              <Row label="연차일수" value={`${formatDays(totalLeaveDays)}일`} />
              <Row label="미사용 연차일수" value={`${formatDays(payableLeaveDays)}일`} />

              <Row label="주 근로시간(주소정)" value={`${Math.round(withHoliday.weeklyWorkHours)}시간`} />
              <Row label="주휴시간" value={`${withHoliday.weeklyHolidayHours % 1 === 0 ? Math.round(withHoliday.weeklyHolidayHours) : withHoliday.weeklyHolidayHours.toFixed(1)}시간`} />
              <Row label="주 유급시간(주휴 포함)" value={`${withHoliday.weeklyPaidHours % 1 === 0 ? Math.round(withHoliday.weeklyPaidHours) : withHoliday.weeklyPaidHours.toFixed(1)}시간`} />

              <Row label="월 소정근로시간(환산)" value={`${wage.monthlyHours.toLocaleString("ko-KR")}시간`} />
              <Row label="월 통상임금(세전)" value={formatWon(wage.monthlyOrdinaryWage)} />

              <Row label="시간당 통상임금" value={`${formatWonPlain(wage.hourlyOrdinaryWage)}원`} />
              <Row label={`1일 통상임금(${hoursLabel})`} value={`${formatWonPlain(wage.dailyOrdinaryWage)}원`} />
            </div>
          </div>

          <div className="mt-3 text-xs font-semibold text-white/70">
            ※ 주휴 자동 반영 규칙: 주휴시간=주소정/5, 주15h 미만이면 0.
            <br />
            ※ 실제 통상임금 포함항목(상여/수당) 인정 여부는 회사 규정/판례에 따라 달라질 수 있음.
          </div>
        </div>
      </div>
    </div>
  );
}
