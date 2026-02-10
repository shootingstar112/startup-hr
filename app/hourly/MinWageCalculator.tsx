// app/hourly/MinWageCalculator.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  MinWageMode,
  TaxMode,
  AmountBasis,
  calculateMinWage,
} from "./minwage.logic";

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
  return `${formatWonPlain(n)}원`;
}
function formatNumberInput(n: number) {
  const x = Math.floor(Number.isFinite(n) ? n : 0);
  return x === 0 ? "" : x.toLocaleString("ko-KR");
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function minutesToHHMM(mins: number) {
  const m = Math.max(0, Math.floor(mins));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}시간 ${mm}분`;
}

function SegButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl border px-3 py-2 text-sm font-black",
        active
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white text-slate-800 hover:bg-slate-50",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function TogglePill({
  left,
  right,
  value,
  onChange,
}: {
  left: { label: string; value: boolean };
  right: { label: string; value: boolean };
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-xl border bg-white">
      <button
        type="button"
        onClick={() => onChange(left.value)}
        className={[
          "px-3 py-2 text-sm font-black",
          value === left.value ? "bg-slate-900 text-white" : "text-slate-800",
        ].join(" ")}
      >
        {left.label}
      </button>
      <button
        type="button"
        onClick={() => onChange(right.value)}
        className={[
          "px-3 py-2 text-sm font-black",
          value === right.value ? "bg-slate-900 text-white" : "text-slate-800",
        ].join(" ")}
      >
        {right.label}
      </button>
    </div>
  );
}

function moneyLabel(mode: MinWageMode) {
  if (mode === "daily") return { base: "기본 일급", expected: "예상 일급(세전)" };
  if (mode === "weekly") return { base: "기본 주급", expected: "예상 주급(세전)" };
  if (mode === "monthly") return { base: "기본 월급", expected: "예상 월급(세전)" };
  return { base: "기본 연봉", expected: "예상 연봉(세전)" };
}

function Row({
  left,
  right,
  strong,
  accent,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  strong?: boolean;
  accent?: "blue" | "red" | "none";
}) {
  const rightCls =
    accent === "blue"
      ? "text-blue-300"
      : accent === "red"
      ? "text-red-300"
      : "text-white";

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div
        className={[
          "text-sm",
          strong ? "font-black text-white" : "font-semibold text-white/80",
        ].join(" ")}
      >
        {left}
      </div>
      <div
        className={[
          "text-sm tabular-nums",
          strong ? "font-black" : "font-semibold",
          rightCls,
        ].join(" ")}
      >
        {right}
      </div>
    </div>
  );
}

export default function MinWageCalculator() {
  const [mode, setMode] = useState<MinWageMode>("daily");

  const [amountBasis, setAmountBasis] = useState<AmountBasis>("net");
  const [amountText, setAmountText] = useState("0");

  const [dailyHours, setDailyHours] = useState("8");
  const [dailyMinutes, setDailyMinutes] = useState("00");

  const [dayType, setDayType] = useState<"week" | "month">("week");
  const [daysCount, setDaysCount] = useState("5");

  const [includeWeeklyRestPay, setIncludeWeeklyRestPay] = useState(true);

  const [overtimeHours, setOvertimeHours] = useState("0");
  const [overtimeMinutes, setOvertimeMinutes] = useState("00");

  const [taxMode, setTaxMode] = useState<TaxMode>("none");
  const [probation, setProbation] = useState(false);

  const computed = useMemo(() => {
    const input = {
      mode,
      amount: stripNumberLike(amountText),
      amountBasis,

      dailyHours: clamp(stripNumberLike(dailyHours), 0, 24),
      dailyMinutes: clamp(stripNumberLike(dailyMinutes), 0, 59),

      dayType,
      daysCount: clamp(
        stripNumberLike(daysCount),
        0,
        dayType === "week" ? 7 : 31
      ),

      includeWeeklyRestPay,

      overtimeHours: clamp(stripNumberLike(overtimeHours), 0, 300),
      overtimeMinutes: clamp(stripNumberLike(overtimeMinutes), 0, 59),

      probation,
      taxMode,
    };

    return calculateMinWage(input);
  }, [
    mode,
    amountText,
    amountBasis,
    dailyHours,
    dailyMinutes,
    dayType,
    daysCount,
    includeWeeklyRestPay,
    overtimeHours,
    overtimeMinutes,
    probation,
    taxMode,
  ]);

  const labels = moneyLabel(mode);

  // 연봉은 연장 미반영이니까 표시용 총시간도 기본+주휴 기준이 더 일관됨
  const totalMinutes =
    computed.periodBaseMinutes +
    computed.periodRestMinutes +
    computed.periodOvertimeMinutes;

  const totalHoursText = minutesToHHMM(totalMinutes);

  const showProbationLine = probation;
  const showTaxLine = taxMode !== "none";
  const showOvertimeLine =
    mode !== "annual" && computed.periodOvertimeMinutes > 0; // ✅ 연봉은 연장 라인 숨김

  const overtimeLabel =
    mode === "daily"
      ? "연장 근무시간"
      : mode === "weekly"
      ? "연장 근무시간(주)"
      : "연장 근무시간(월)";

  const wageColor = computed.isUnderMin ? "text-red-400" : "text-white";
  const statusColor = computed.isUnderMin ? "text-red-400" : "text-blue-300";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* LEFT */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <SegButton
            label="일급 → 시급"
            active={mode === "daily"}
            onClick={() => setMode("daily")}
          />
          <SegButton
            label="주급 → 시급"
            active={mode === "weekly"}
            onClick={() => setMode("weekly")}
          />
          <SegButton
            label="월급 → 시급"
            active={mode === "monthly"}
            onClick={() => setMode("monthly")}
          />
          <SegButton
            label="연봉 → 시급"
            active={mode === "annual"}
            onClick={() => setMode("annual")}
          />
        </div>

        <div className="mt-5 space-y-4">
          {/* 입력 금액 + 실수령/세전 토글 */}
          <div className="rounded-xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-black text-slate-800">입력 금액</div>

              <TogglePill
                left={{ label: "실수령액", value: true }}
                right={{ label: "세전금액", value: false }}
                value={amountBasis === "net"}
                onChange={(v) => setAmountBasis(v ? "net" : "gross")}
              />
            </div>

            <label className="mt-3 block">
              <div className="text-xs font-bold text-slate-600">
                {mode === "daily"
                  ? amountBasis === "net"
                    ? "일 실수령(원)"
                    : "일 세전(원)"
                  : mode === "weekly"
                  ? amountBasis === "net"
                    ? "주 실수령(원)"
                    : "주 세전(원)"
                  : mode === "monthly"
                  ? amountBasis === "net"
                    ? "월 실수령(원)"
                    : "월 세전(원)"
                  : amountBasis === "net"
                  ? "연 실수령(원)"
                  : "연 세전(원)"}
              </div>

              <input
                inputMode="numeric"
                value={amountText}
                onChange={(e) => {
                  const n = stripNumberLike(e.target.value);
                  setAmountText(formatNumberInput(n));
                }}
                className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
              />
            </label>

            <div className="mt-2 text-[11px] font-semibold text-slate-500">
              {amountBasis === "net"
                ? "※ 입력한 실수령액 기준으로 세전 금액을 역산해서 계산"
                : "※ 입력한 세전 금액 기준으로 계산"}
            </div>
          </div>

          {/* 일 근무시간 */}
          <div className="rounded-xl border p-4">
            <div className="text-sm font-black text-slate-800">일 근무시간</div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <div className="text-xs font-bold text-slate-600">시간</div>
                <input
                  inputMode="numeric"
                  value={dailyHours}
                  onChange={(e) =>
                    setDailyHours(e.target.value.replace(/[^\d]/g, ""))
                  }
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>

              <label className="block">
                <div className="text-xs font-bold text-slate-600">분</div>
                <input
                  inputMode="numeric"
                  value={dailyMinutes}
                  onChange={(e) =>
                    setDailyMinutes(e.target.value.replace(/[^\d]/g, ""))
                  }
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>
            </div>
          </div>

          {/* 근무일수 */}
          {mode !== "daily" && (
            <div className="rounded-xl border p-4">
              <div className="text-sm font-black text-slate-800">근무일수</div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <SegButton
                  label="주"
                  active={dayType === "week"}
                  onClick={() => setDayType("week")}
                />
                <SegButton
                  label="월"
                  active={dayType === "month"}
                  onClick={() => setDayType("month")}
                />

                <div className="ml-auto text-xs font-bold text-slate-600">
                  {dayType === "week"
                    ? "주당 근무일수 (0~7)"
                    : "월 근무일수 (0~31)"}
                </div>
              </div>

              <label className="mt-3 block">
                <input
                  inputMode="numeric"
                  value={daysCount}
                  onChange={(e) =>
                    setDaysCount(e.target.value.replace(/[^\d]/g, ""))
                  }
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>
            </div>
          )}

          {/* ✅ 연장근무: 연봉일 때는 숨김 */}
          {mode !== "annual" && (
            <div className="rounded-xl border p-4">
              <div className="text-sm font-black text-slate-800">
                {mode === "daily"
                  ? "일 연장근무"
                  : mode === "weekly"
                  ? "주 연장근무"
                  : "월 연장근무"}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <div className="text-xs font-bold text-slate-600">시간</div>
                  <input
                    inputMode="numeric"
                    value={overtimeHours}
                    onChange={(e) =>
                      setOvertimeHours(e.target.value.replace(/[^\d]/g, ""))
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </label>

                <label className="block">
                  <div className="text-xs font-bold text-slate-600">분</div>
                  <input
                    inputMode="numeric"
                    value={overtimeMinutes}
                    onChange={(e) =>
                      setOvertimeMinutes(e.target.value.replace(/[^\d]/g, ""))
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </label>
              </div>

              <div className="mt-2 text-[11px] font-semibold text-slate-500">
                ※ 연장은 시급 환산에서 1.5배 시간으로 반영
              </div>
            </div>
          )}

          {/* 주휴 포함 */}
          {mode !== "daily" && (
            <div className="rounded-xl border p-4">
              <div className="text-sm font-black text-slate-800">주휴수당</div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-sm font-bold text-slate-700">환산에 포함</div>
                <TogglePill
                  left={{ label: "제외", value: false }}
                  right={{ label: "포함", value: true }}
                  value={includeWeeklyRestPay}
                  onChange={setIncludeWeeklyRestPay}
                />
              </div>
              <div className="mt-2 text-[11px] font-semibold text-slate-500">
                ※ 단순 모델(주 15시간 이상 + 하루 1일치)
              </div>
            </div>
          )}

          {/* 세금 적용 */}
          <div className="rounded-xl border p-4">
            <div className="text-sm font-black text-slate-800">세금 적용</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <SegButton
                label="없음"
                active={taxMode === "none"}
                onClick={() => setTaxMode("none")}
              />
              <SegButton
                label="9.71%"
                active={taxMode === "basic_9_71"}
                onClick={() => setTaxMode("basic_9_71")}
              />
              <SegButton
                label="3.3%"
                active={taxMode === "simple_3_3"}
                onClick={() => setTaxMode("simple_3_3")}
              />
            </div>
          </div>

          {/* 수습 여부 */}
          <div className="rounded-xl border p-4">
            <div className="text-sm font-black text-slate-800">수습 여부</div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-sm font-bold text-slate-700">수습(90%)</div>
              <TogglePill
                left={{ label: "아니오", value: false }}
                right={{ label: "예", value: true }}
                value={probation}
                onChange={setProbation}
              />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-sm">
        <div className="text-sm font-extrabold text-white/80">
          환산 시급(세전 기준)
        </div>

        {/* ✅ 미달이면 빨간색 */}
        <div className={["mt-2 text-4xl font-black tracking-tight", wageColor].join(" ")}>
          {formatWon(computed.impliedHourlyWage)}
        </div>

        {/* ✅ 최저시급 표시(수습이면 90% 반영된 값) */}
        <div className="mt-2 text-sm font-semibold text-white/75">
          2026 최저시급:{" "}
          <span className="font-black text-white">
            {formatWon(computed.minHourlyWageToCompare)}
          </span>
        </div>

        {/* ✅ 준수/미달 텍스트 */}
        <div className={["mt-1 text-sm font-black", statusColor].join(" ")}>
          {computed.isUnderMin ? "최저임금 미달" : "최저임금 준수"}
        </div>

        {/* 표(스샷 스타일) */}
        <div className="mt-4 overflow-hidden rounded-2xl bg-white/10">
          <div className="divide-y divide-white/15">
            <Row left="총 근무시간" right={totalHoursText} />
            <Row left="기본 근무시간" right={minutesToHHMM(computed.periodBaseMinutes)} />
            {mode !== "annual" && (
              <Row left={overtimeLabel} right={minutesToHHMM(computed.periodOvertimeMinutes)} />
            )}

            <div className="h-px w-full bg-white/20" />

            <Row left={labels.base} right={formatWon(computed.basePayGross)} />
            {showOvertimeLine && <Row left="+ 연장 수당" right={formatWon(computed.overtimePayGross)} />}

            <Row
              left={<span className="font-black">{labels.expected}</span>}
              right={formatWon(computed.expectedGross)}
              strong
            />

            {showProbationLine && (
              <>
                <Row left="- 수습" right={formatWon(computed.probationDeduction)} />
                <Row
                  left={<span className="font-black">수습 적용 후(세전)</span>}
                  right={formatWon(computed.grossAfterProbation)}
                  strong
                />
              </>
            )}

            {showTaxLine && <Row left="- 세금" right={formatWon(computed.taxAmount)} />}

            {/* ✅ 이름 변경 */}
            <Row
              left={<span className="font-black">최종 실수령액</span>}
              right={formatWon(computed.netAmount)}
              strong
              accent="red"
            />
          </div>
        </div>

        <div className="mt-4 text-[11px] font-semibold text-white/70 leading-5">
          ※ 기본/연장 금액은 “환산 가중시간 비율”로 세전 총액을 나눠서 표시.
          <br />
          ※ 최종 실수령액은 (수습→세금) 적용 후 기준.
          {mode === "annual" && (
            <>
              <br />※ 연봉 환산은 연장근무를 제외한 기본 기준으로 계산.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
