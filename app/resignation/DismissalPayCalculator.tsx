"use client";

import React, { useMemo, useState } from "react";
import { calculateDismissalPay, type DismissalPayInput } from "./dismissal.logic";

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

export default function DismissalPayCalculator() {
  const today = useMemo(() => new Date(), []);
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayIso = `${yyyy}-${mm}-${dd}`;

  const [employmentStart, setEmploymentStart] = useState(`${yyyy - 1}-${mm}-${dd}`);
  const [dismissalDate, setDismissalDate] = useState(todayIso);

  // 임금(세전)
  const [monthlyBasePayText, setMonthlyBasePayText] = useState("");
  const [monthlyFixedAllowanceText, setMonthlyFixedAllowanceText] = useState("");
  const [annualBonusText, setAnnualBonusText] = useState("");

  // 입력모드
  const [mode, setMode] = useState<"simple" | "weekly">("simple");

  // simple
  const [weeklyWorkDays, setWeeklyWorkDays] = useState("5");
  const [dailyWorkHours, setDailyWorkHours] = useState("8");

  // weekly
  const [weeklyHoursText, setWeeklyHoursText] = useState("");

  const input: DismissalPayInput = useMemo(
    () => ({
      employmentStart,
      dismissalDate,

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
      dismissalDate,
      monthlyBasePayText,
      monthlyFixedAllowanceText,
      annualBonusText,
      mode,
      weeklyWorkDays,
      dailyWorkHours,
      weeklyHoursText,
    ]
  );

  const result = useMemo(() => calculateDismissalPay(input), [input]);

  // ✅ iOS Safari overflow/깨짐 방지
  const iosSafeDateInput =
    "mt-1 w-full max-w-full min-w-0 appearance-none rounded-xl border px-3 py-2 font-semibold text-base outline-none focus:ring-2 focus:ring-slate-200";
  const iosSafeTextInput =
    "mt-1 w-full max-w-full min-w-0 rounded-xl border px-3 py-2 font-semibold text-base outline-none focus:ring-2 focus:ring-slate-200";

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">해고예고수당 계산기</h2>
      <p className="mt-2 text-slate-600 font-semibold">
        통상임금(세전) 기준으로 <span className="font-black">30일분</span> 해고예고수당(세전)을 계산.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-5">
          <div className="rounded-xl border p-4 overflow-hidden">
            <div className="text-sm font-black text-slate-800">기본 정보</div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block min-w-0">
                <div className="text-xs font-bold text-slate-600">입사일</div>
                <input
                  type="date"
                  value={employmentStart}
                  onChange={(e) => setEmploymentStart(e.target.value)}
                  className={iosSafeDateInput}
                />
              </label>

              <label className="block min-w-0">
                <div className="text-xs font-bold text-slate-600">해고일(종료일)</div>
                <input
                  type="date"
                  value={dismissalDate}
                  onChange={(e) => setDismissalDate(e.target.value)}
                  className={iosSafeDateInput}
                />
              </label>
            </div>

            <div className="mt-3 text-xs font-semibold text-slate-600">
              근속: <span className="font-black text-slate-900">{result.serviceDays.toLocaleString("ko-KR")}</span>일
              <span className="text-slate-500"> (≈ {result.serviceMonthsApprox.toFixed(1)}개월)</span>
            </div>
          </div>

          <div className="rounded-xl border p-4 overflow-hidden">
            <div className="text-sm font-black text-slate-800">통상임금(월, 세전)</div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block min-w-0">
                <div className="text-xs font-bold text-slate-600">월 기본급</div>
                <input
                  inputMode="numeric"
                  placeholder="예: 3,000,000"
                  value={monthlyBasePayText}
                  onChange={(e) => {
                    const n = stripNumberLike(e.target.value);
                    setMonthlyBasePayText(formatNumberInput(n));
                  }}
                  className={iosSafeTextInput}
                />
              </label>

              <label className="block min-w-0">
                <div className="text-xs font-bold text-slate-600">월 고정수당 합계</div>
                <input
                  inputMode="numeric"
                  placeholder="예: 200,000"
                  value={monthlyFixedAllowanceText}
                  onChange={(e) => {
                    const n = stripNumberLike(e.target.value);
                    setMonthlyFixedAllowanceText(formatNumberInput(n));
                  }}
                  className={iosSafeTextInput}
                />
              </label>
            </div>

            <div className="mt-3">
              <label className="block min-w-0">
                <div className="text-xs font-bold text-slate-600">연간상여금(연, 통상임금에 무조건 포함)</div>
                <input
                  inputMode="numeric"
                  placeholder="예: 12,000,000"
                  value={annualBonusText}
                  onChange={(e) => {
                    const n = stripNumberLike(e.target.value);
                    setAnnualBonusText(formatNumberInput(n));
                  }}
                  className={iosSafeTextInput}
                />
              </label>

              <div className="mt-2 text-xs font-semibold text-slate-700">
                월 통상임금(세전): <span className="font-black text-slate-900">{formatWon(result.monthlyOrdinaryWage)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-4 overflow-hidden">
            <div className="text-sm font-black text-slate-800">근로시간 입력</div>

            <div className="mt-3 flex gap-2 flex-wrap">
              <Chip label="간편입력(주/일)" active={mode === "simple"} onClick={() => setMode("simple")} />
              <Chip label="직접입력(1주 유급시간)" active={mode === "weekly"} onClick={() => setMode("weekly")} />
            </div>

            {mode === "simple" ? (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block min-w-0">
                  <div className="text-xs font-bold text-slate-600">주 근무일수</div>
                  <input
                    inputMode="numeric"
                    value={weeklyWorkDays}
                    onChange={(e) => setWeeklyWorkDays(e.target.value.replace(/[^\d]/g, ""))}
                    className={iosSafeTextInput}
                  />
                </label>
                <label className="block min-w-0">
                  <div className="text-xs font-bold text-slate-600">1일 근로시간</div>
                  <input
                    inputMode="numeric"
                    value={dailyWorkHours}
                    onChange={(e) => setDailyWorkHours(e.target.value.replace(/[^\d]/g, ""))}
                    className={iosSafeTextInput}
                  />
                </label>

                <div className="sm:col-span-2 mt-1 text-[11px] font-semibold text-slate-500">
                  ※ 주휴 자동 반영(주휴시간=주소정/5, 주15h 미만 0).
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <label className="block min-w-0">
                  <div className="text-xs font-bold text-slate-600">1주 소정근로시간(주휴 제외, 시간)</div>
                  <input
                    inputMode="numeric"
                    placeholder="예: 40"
                    value={weeklyHoursText}
                    onChange={(e) => {
                      const n = stripNumberLike(e.target.value);
                      setWeeklyHoursText(n === 0 ? "" : String(n));
                    }}
                    className={iosSafeTextInput}
                  />
                </label>
                <div className="mt-1 text-[11px] font-semibold text-slate-500">
                  ※ 직접입력도 주휴 자동 반영(주휴시간=주소정/5, 주15h 미만 0).
                </div>
              </div>
            )}

            <div className="mt-3 text-xs font-semibold text-slate-700">
              월 소정근로시간(환산):{" "}
              <span className="font-black text-slate-900">{result.monthlyHours.toLocaleString("ko-KR")}</span>시간
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
          <div className="text-sm font-extrabold text-white/80">해고예고수당(세전) 예상</div>
          <div className="mt-2 text-4xl font-black tracking-tight">{formatWon(result.dismissalPay)}</div>

          <div className="mt-5 overflow-hidden rounded-2xl bg-white/10">
            <div className="divide-y divide-white/10">
              <Row label="시간당 통상임금" value={`${formatWonPlain(result.hourlyOrdinaryWage)}원`} />
              <Row
                label={mode === "simple" ? `1일 통상임금(${stripNumberLike(dailyWorkHours) || 0}h)` : "1일 통상임금(8h 기준)"}
                value={`${formatWonPlain(result.dailyOrdinaryWage)}원`}
              />
              <Row label="예고일수" value={`${result.payableNoticeDays}일(고정)`} />
              <Row label="월 통상임금(세전)" value={formatWon(result.monthlyOrdinaryWage)} />
              <Row label="월 소정근로시간" value={`${result.monthlyHours.toLocaleString("ko-KR")}시간`} />
            </div>
          </div>

          <div className="mt-3 text-xs font-semibold text-white/70">
            ※ 실제 통상임금 포함항목(상여/수당) 인정 여부는 회사 규정/판례에 따라 달라질 수 있음.
          </div>
        </div>
      </div>
    </div>
  );
}
