"use client";

import { useMemo, useState } from "react";
import { calculateMaternityLeave, POLICY } from "./maternityLeave.logic";

/** 표시 유틸 */
function stripDigits(v: string) {
    return (v ?? "").toString().replace(/[^\d]/g, "");
}

// ✅ 표시용: n을 unit 단위로 올림 (기본: 천원 단위)
function ceilToUnit(n: number, unit = 1000) {
    if (!Number.isFinite(n) || unit <= 0) return 0;
    return Math.ceil(n / unit) * unit;
}

function formatWon(n: number, unit = 1000) {
    const v = ceilToUnit(Math.floor(n), unit);
    return `${v.toLocaleString("ko-KR")}원`;
}

function formatWonCompact(n: number) {
    return formatWon(n, 1000);
}

// ✅ (1~60일) / (61~90일) / (1~75일) / (76~120일)
function rangeLabel(startDay: number, endDay: number) {
    return `(${startDay}~${endDay}일)`;
}

export default function MaternityLeaveCalculator() {
    const [wageText, setWageText] = useState("4000000"); // 원
    const [isMultiple, setIsMultiple] = useState(false); // 다태아
    const [isPriority, setIsPriority] = useState(true); // 우선지원대상기업

    const monthlyWage = useMemo(() => {
        const s = stripDigits(wageText);
        if (!s) return 0;
        const n = Number(s);
        return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
    }, [wageText]);

    const out = useMemo(
        () =>
            calculateMaternityLeave({
                monthlyWage,
                isMultiple,
                isPriorityCompany: isPriority,
            }),
        [monthlyWage, isMultiple, isPriority]
    );
    // ✅ 표시용(천원 올림) 숫자로 먼저 맞춰서 "합계/차액"도 표시상 딱 떨어지게
    const employerPayDisp = ceilToUnit(out.employerPayToEmployee, 1000);
    const refundDisp = ceilToUnit(out.govtRefundToEmployer, 1000);
    const employerNetDisp = Math.max(0, employerPayDisp - refundDisp);

    const employerDaysLabel = isMultiple
        ? `${POLICY.MULTIPLE_EMPLOYER_DAYS}일(≈2.5개월)`
        : `${POLICY.SINGLE_EMPLOYER_DAYS}일(≈2개월)`;

    const govtDaysLabel = isMultiple
        ? `${POLICY.MULTIPLE_GOVT_DIRECT_DAYS}일(≈1.5개월)`
        : `${POLICY.SINGLE_GOVT_DIRECT_DAYS}일(≈1개월)`;

    // ✅ 구간 계산 (단태/다태 공통 처리)
    const employerStart = 1;
    const employerEnd = out.employerPayDays; // 단태 60 / 다태 75
    const govtStart = out.employerPayDays + 1; // 단태 61 / 다태 76
    const govtEnd = out.totalDays; // 단태 90 / 다태 120

    return (
        <div className="space-y-6">
            {/* 입력 섹션 */}
            <div className="rounded-2xl border bg-white p-3 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-black">출산전후휴가·급여 계산기</h2>
                        <p className="mt-2 text-slate-600 font-semibold">
                            단태아: 60일(회사) + 30일(고용보험) · 다태아: 75일(회사) + 45일(고용보험)
                        </p>
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
                                        className={`rounded-full px-3 py-1.5 text-xs font-black border ${monthlyWage === b.value
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
                                className={`flex-1 rounded-xl px-3 py-2 text-sm font-black border ${isMultiple ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-900"
                                    }`}
                            >
                                예
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsMultiple(false)}
                                className={`flex-1 rounded-xl px-3 py-2 text-sm font-black border ${!isMultiple ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-900"
                                    }`}
                            >
                                아니오
                            </button>
                        </div>

                        <div className="mt-3 text-xs font-semibold text-slate-600">
                            휴가기간:{" "}
                            <span className="font-black text-slate-900">
                                {isMultiple ? POLICY.MULTIPLE_TOTAL_DAYS : POLICY.SINGLE_TOTAL_DAYS}일
                            </span>
                        </div>

                        <div className="mt-2 text-[11px] font-semibold text-slate-500">
                            회사 유급: {employerDaysLabel} · 고용보험: {govtDaysLabel}
                        </div>
                    </div>

                    {/* 우선지원 */}
                    <div className="rounded-2xl border bg-slate-50 p-4">
                        <div className="text-xs font-black text-slate-600">우선지원대상기업(환급 여부)</div>

                        <div className="mt-2 flex gap-2">
                            <button
                                type="button"
                                onClick={() => setIsPriority(true)}
                                className={`flex-1 rounded-xl px-3 py-2 text-sm font-black border ${isPriority ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-900"
                                    }`}
                            >
                                해당
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsPriority(false)}
                                className={`flex-1 rounded-xl px-3 py-2 text-sm font-black border ${!isPriority ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-900"
                                    }`}
                            >
                                해당없음
                            </button>
                        </div>

                        <div className="mt-3 text-[11px] font-semibold text-slate-500">
                            * 해당이면 “회사 유급 구간”도 상한 범위 내 환급(고용보험 총부담이 커짐)
                        </div>
                    </div>
                </div>
            </div>

            {/* 결과 섹션 */}
            <div className="rounded-2xl border bg-slate-900 p-3 sm:p-6 text-white shadow-sm">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-xs font-extrabold text-white/75">휴가 기간</div>
                        <div className="mt-1 text-4xl font-black tracking-tight">{out.totalDays}일</div>
                        <div className="mt-2 text-xs font-semibold text-white/70 flex flex-wrap items-center gap-x-1">
                            <span className="whitespace-nowrap">
                                회사 유급 <span className="font-black text-white">{out.employerPayDays}일</span>
                            </span>
                            <span className="whitespace-nowrap">·</span>
                            <span className="whitespace-nowrap">
                                고용보험 <span className="font-black text-white">{out.govtDirectDays}일</span>
                            </span>
                        </div>

                    </div>

                    <div className="flex flex-wrap gap-2 justify-end">
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">
                            일 통상임금: {formatWon(out.dailyWage)}
                        </span>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">
                            고용보험 일급(상한): {formatWon(out.govtDaily)}
                        </span>
                    </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    {/* 회사 */}
                    <div className="rounded-2xl bg-white/10 p-4">
                        <div className="text-xs font-black text-white/75">회사</div>
                        <div className="mt-2 text-2xl font-black">{formatWonCompact(employerNetDisp)}</div>

                        <div className="mt-1 text-[11px] font-semibold text-white/70">실질 회사부담(환급 반영)</div>

                        <div className="mt-3 space-y-1 text-[12px] font-semibold text-white/80">
                            <div className="flex items-center justify-between">
                                <span>근로자에게 지급{rangeLabel(employerStart, employerEnd)}</span>
                                <span className="font-black">{formatWon(out.employerPayToEmployee)}</span>
                            </div>

                            {/* ✅ 우선지원 아닐 땐 줄 자체를 안 보여줌 / ✅ 환급 라벨엔 range 제거 */}
                            {isPriority ? (
                                <div className="flex items-center justify-between">
                                    <span className="text-rose-300 font-black">고용보험 환급</span>
                                    <span className="text-rose-200 font-black">- {formatWon(out.govtRefundToEmployer)}</span>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* 정부(고용보험) */}
                    <div className="rounded-2xl bg-white/10 p-4">
                        <div className="text-xs font-black text-white/75">정부(고용보험)</div>
                        <div className="mt-2 text-2xl font-black">{formatWonCompact(out.govtTotalBurden)}</div>
                        <div className="mt-1 text-[11px] font-semibold text-white/70">고용보험 총 부담(직접지급 + 환급)</div>

                        <div className="mt-3 space-y-1 text-[12px] font-semibold text-white/80">
                            <div className="flex items-center justify-between">
                                <span>근로자 직접지급{rangeLabel(govtStart, govtEnd)}</span>
                                <span className="font-black">{formatWon(out.govtPayToEmployee)}</span>
                            </div>

                            {/* ✅ 우선지원일 때만 / ✅ 회사 환급 라벨엔 range 제거 */}
                            {isPriority ? (
                                <div className="flex items-center justify-between">
                                    <span className="text-rose-300 font-black">회사 환급</span>
                                    <span className="text-rose-200 font-black">{formatWon(out.govtRefundToEmployer)}</span>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* 근로자 */}
                    <div className="rounded-2xl bg-white/10 p-4">
                        <div className="text-xs font-black text-white/75">근로자</div>
                        <div className="mt-2 text-2xl font-black">{formatWonCompact(out.workerTotalTakeHome)}</div>
                        <div className="mt-1 text-[11px] font-semibold text-white/70">총 수령(회사 유급 + 고용보험)</div>

                        <div className="mt-3 space-y-1 text-[12px] font-semibold text-white/80">
                            <div className="flex items-center justify-between">
                                <span>회사 유급{rangeLabel(employerStart, employerEnd)}</span>
                                <span className="font-black">{formatWon(out.employerPayToEmployee)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>
                                    고용보험{rangeLabel(govtStart, govtEnd)}, 상한 적용
                                </span>
                                <span className="font-black">{formatWon(out.govtPayToEmployee)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4 text-[11px] font-semibold text-white/60">
                    * 단태: 회사 60일(2개월) + 고용보험 30일(1개월) · 다태: 회사 75일(2.5개월) + 고용보험 45일(1.5개월)
                    <br />
                    * 우선지원 “해당”이면 회사 유급 구간도 상한 범위 내 환급이 잡혀 “고용보험 총부담”이 커짐
                </div>
            </div>
        </div>
    );
}
