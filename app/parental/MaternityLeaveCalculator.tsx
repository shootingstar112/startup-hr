"use client";

import { useMemo, useState } from "react";
import { POLICY, calculateMaternityLeave } from "./maternityLeave.logic";

/** 표시 유틸 */
function stripDigits(v: string) {
  return (v ?? "").toString().replace(/[^\d]/g, "");
}
function formatWon(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}
function toMan(n: number) {
  return Math.floor(n / 10_000);
}
function formatMan(n: number) {
  return `${toMan(n).toLocaleString("ko-KR")}만`;
}
function formatWonCompact(n: number) {
  // 카드 큰 숫자용: 원 그대로
  return formatWon(n);
}

export default function MaternityLeaveCalculator() {
  const [wageText, setWageText] = useState("4000000"); // 원
  const [isMultiple, setIsMultiple] = useState(true); // 스샷이 120일이라 기본 true
  const [isPriority, setIsPriority] = useState(true);

  // 정부지원일수(옵션) - 기본은 logic의 defaultGovtDays가 잡고, 사용자가 바꾸면 override
  const [useCustomGovtDays, setUseCustomGovtDays] = useState(false);
  const [govtDaysText, setGovtDaysText] = useState("");

  const monthlyWage = useMemo(() => {
    const s = stripDigits(wageText);
    if (!s) return 0;
    const n = Number(s);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }, [wageText]);

  const totalDays = isMultiple ? POLICY.MULTIPLE_DAYS : POLICY.SINGLE_DAYS;

  const govtDays = useMemo(() => {
    if (!useCustomGovtDays) return undefined;
    const s = stripDigits(govtDaysText);
    if (!s) return 0;
    const n = Number(s);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(totalDays, Math.floor(n)));
  }, [useCustomGovtDays, govtDaysText, totalDays]);

  const out = useMemo(
    () =>
      calculateMaternityLeave({
        monthlyWage,
        isMultiple,
        isPriorityCompany: isPriority,
        govtDays,
      }),
    [monthlyWage, isMultiple, isPriority, govtDays]
  );

  const progressGovt =
    out.companyPayGross <= 0 ? 0 : Math.min(1, out.govtPay / out.companyPayGross);

  return (
    <div className="space-y-6">
      {/* 상단 입력 섹션 */}
      <div className="rounded-2xl border bg-white p-3 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">출산전후휴가·급여 계산기</h2>
            <p className="mt-2 text-slate-600 font-semibold">
              상/하한(가정) 반영해서 정부/회사 분담(추정)을 계산해.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(
                  JSON.stringify(
                    { monthlyWage, isMultiple, isPriority, govtDays: govtDays ?? null },
                    null,
                    2
                  )
                );
              }}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-black text-white"
            >
              복사
            </button>
            <button
              type="button"
              onClick={() => {
                setWageText("4000000");
                setIsMultiple(true);
                setIsPriority(true);
                setUseCustomGovtDays(false);
                setGovtDaysText("");
              }}
              className="rounded-full border px-4 py-2 text-sm font-black text-slate-800"
            >
              초기화
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {/* 월 통상임금 */}
          <div className="rounded-2xl border bg-slate-50 p-4">
            <div className="text-xs font-black text-slate-600">월 통상임금(원)</div>

            <input
              inputMode="numeric"
              value={stripDigits(wageText)}
              onChange={(e) => setWageText(e.target.value)}
              className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-lg font-black outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="예: 4000000"
            />

            <div className="mt-2 text-xs font-semibold text-slate-600">
              표시: <span className="font-black text-slate-900">{formatWon(monthlyWage)}</span>
            </div>

            <div className="mt-4">
              <div className="text-xs font-black text-slate-600">빠른 입력</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  { label: "250만", value: 2_500_000 },
                  { label: "320만", value: 3_200_000 },
                  { label: "400만", value: 4_000_000 },
                  { label: "500만", value: 5_000_000 },
                ].map((b) => (
                  <button
                    key={b.label}
                    type="button"
                    onClick={() => setWageText(String(b.value))}
                    className={`rounded-full px-3 py-1.5 text-xs font-black border ${
                      monthlyWage === b.value
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-900"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 다태아 */}
          <div className="rounded-2xl border bg-slate-50 p-4">
            <div className="text-xs font-black text-slate-600">다태아(쌍둥이 등)</div>

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsMultiple(true)}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-black border ${
                  isMultiple ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-900"
                }`}
              >
                예
              </button>
              <button
                type="button"
                onClick={() => setIsMultiple(false)}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-black border ${
                  !isMultiple ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-900"
                }`}
              >
                아니오
              </button>
            </div>

            <div className="mt-3 text-xs font-semibold text-slate-600">
              휴가기간:{" "}
              <span className="font-black text-slate-900">
                {isMultiple ? POLICY.MULTIPLE_DAYS : POLICY.SINGLE_DAYS}일
              </span>
            </div>

            <div className="mt-2 text-[11px] font-semibold text-slate-500">
              * 출산 후 최소 확보일수(요건)는 케이스에 따라 별도 안내로 처리 추천
            </div>
          </div>

          {/* 우선지원대상기업 + 정부지원일수 */}
          <div className="rounded-2xl border bg-slate-50 p-4">
            <div className="text-xs font-black text-slate-600">우선지원대상기업(가정)</div>

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsPriority(true)}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-black border ${
                  isPriority ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-900"
                }`}
              >
                해당
              </button>
              <button
                type="button"
                onClick={() => setIsPriority(false)}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-black border ${
                  !isPriority ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-900"
                }`}
              >
                해당없음
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs font-black text-slate-600">정부지원일수 직접 입력</div>
              <button
                type="button"
                onClick={() => setUseCustomGovtDays((v) => !v)}
                className={`rounded-full px-3 py-1 text-xs font-black border ${
                  useCustomGovtDays ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-900"
                }`}
              >
                {useCustomGovtDays ? "ON" : "OFF"}
              </button>
            </div>

            {useCustomGovtDays ? (
              <div className="mt-2">
                <input
                  inputMode="numeric"
                  value={stripDigits(govtDaysText)}
                  onChange={(e) => setGovtDaysText(e.target.value)}
                  placeholder={`0 ~ ${totalDays}`}
                  className="w-full rounded-xl border bg-white px-3 py-2 text-sm font-black outline-none focus:ring-2 focus:ring-slate-200"
                />
                <div className="mt-1 text-[11px] font-semibold text-slate-500">
                  * 분담 기준 확정되면 이 입력은 숨기고 고정값으로 돌리면 됨
                </div>
              </div>
            ) : (
              <div className="mt-2 text-xs font-semibold text-slate-600">
                기본 가정으로 계산됨(로직의 defaultGovtDays 사용)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 하단 결과 섹션 */}
      <div className="rounded-2xl border bg-slate-900 p-3 sm:p-6 text-white shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-extrabold text-white/75">휴가 기간</div>
            <div className="mt-1 text-4xl font-black tracking-tight">{out.totalDays}일</div>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">
              일 통상임금(추정): {formatWon(out.dailyWage)}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">
              일 상한(추정): {formatWon(out.dailyCap)}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {/* 정부 지급 */}
          <div className="rounded-2xl bg-white/10 p-4">
            <div className="text-xs font-black text-white/75">정부 지급(추정)</div>
            <div className="mt-2 text-2xl font-black">{formatWonCompact(out.govtPay)}</div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-indigo-400" style={{ width: `${Math.round(progressGovt * 100)}%` }} />
            </div>
            <div className="mt-2 text-[11px] font-semibold text-white/70">
              정부지원일수: <span className="font-black text-white">{out.govtDays}일</span> · 일 기준:{" "}
              <span className="font-black text-white">{formatWon(Math.max(out.dailyFloor, Math.min(out.dailyCap, out.dailyWage)))}</span>
            </div>
          </div>

          {/* 회사 지급(총액) */}
          <div className="rounded-2xl bg-white/10 p-4">
            <div className="text-xs font-black text-white/75">회사 지급(총액 추정)</div>
            <div className="mt-2 text-2xl font-black">{formatWonCompact(out.companyPayGross)}</div>
            <div className="mt-2 text-[11px] font-semibold text-white/70">
              가정: 회사가 통상임금 100% 지급(일={formatWon(out.dailyWage)})
            </div>
          </div>

          {/* 회사 부담 */}
          <div className="rounded-2xl bg-white/10 p-4">
            <div className="text-xs font-black text-white/75">회사 부담(추정)</div>
            <div className="mt-2 text-2xl font-black">{formatWonCompact(out.companyNetBurden)}</div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-amber-300"
                style={{
                  width:
                    out.companyPayGross <= 0
                      ? "0%"
                      : `${Math.round((out.companyNetBurden / out.companyPayGross) * 100)}%`,
                }}
              />
            </div>
            <div className="mt-2 text-[11px] font-semibold text-white/70">
              회사 순부담 = 회사지급 - 정부지급
            </div>
          </div>
        </div>

        <div className="mt-4 text-[11px] font-semibold text-white/60">
          * 현재는 “일할=월/30, 회사 100% 지급” 및 “정부지원일수 가정”을 사용함. 실제 분담은 케이스/사업장 요건에 따라 달라질 수 있음.
        </div>
      </div>
    </div>
  );
}
