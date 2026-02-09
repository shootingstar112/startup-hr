"use client";

import React, { useMemo, useState } from "react";

const YEAR = 2026;

// ✅ 2026 기준 (상한은 고정, 하한은 최저임금 80% * 1일 소정근로시간)
const MIN_WAGE_2026 = 10320;
const DAILY_CAP_2026 = 68100;

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
function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function toDate(v: string) {
    // YYYY-MM-DD
    const [y, m, d] = (v || "").split("-").map(Number);
    if (!y || !m || !d) return null;
    const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
    return Number.isFinite(dt.getTime()) ? dt : null;
}

function calcAge(birth: Date, asOf: Date) {
    let age = asOf.getFullYear() - birth.getFullYear();
    const bThisYear = new Date(asOf.getFullYear(), birth.getMonth(), birth.getDate(), 12);
    if (asOf.getTime() < bThisYear.getTime()) age -= 1;
    return Math.max(0, age);
}

// ✅ 소정급여일수(2019.10.1 이후 기준 표)
function benefitDaysByInsuredMonths(insuredMonths: number, isOver50OrDisabled: boolean) {
    const m = Math.max(0, insuredMonths);

    // 구간: 1년미만 / 1~3 / 3~5 / 5~10 / 10+
    const band =
        m < 12 ? 0 : m < 36 ? 1 : m < 60 ? 2 : m < 120 ? 3 : 4;

    if (!isOver50OrDisabled) {
        return [120, 150, 180, 210, 240][band];
    }
    return [120, 180, 210, 240, 270][band];
}

function Chip({
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

export default function UnemploymentBenefitCalculator() {
    const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

    // ✅ 최소 입력
    const [birthDate, setBirthDate] = useState("1995-05-15");
    const [dismissalDate, setDismissalDate] = useState<string>(""); // 선택(없으면 오늘 기준)
    const [isDisabled, setIsDisabled] = useState(false);

    // 1일 소정근로시간(디폴트 8)
    const [dailyHoursText, setDailyHoursText] = useState("8");

    // 고용보험 가입기간(개월) - 버튼 6개 + 직접입력
    const preset = [
        { label: "6개월", months: 6 },
        { label: "1년", months: 12 },
        { label: "3년", months: 36 },
        { label: "5년", months: 60 },
        { label: "7년", months: 84 },
        { label: "10년+", months: 120 },
    ] as const;

    const [insuredMonthsText, setInsuredMonthsText] = useState("36"); // 기본 3년

    // 임금 입력 탭
    const [wageMode, setWageMode] = useState<"monthly" | "detail3m">("monthly");

    // 간편(월급): 최근 월급(만원 아님, 원) + 3개월 총일수(기본 90)
    const [monthlyWageText, setMonthlyWageText] = useState("3,000,000");
    const [days3mText, setDays3mText] = useState("90");

    // 정밀(3개월): 3개월 총임금 + 3개월 총일수
    const [wage3mText, setWage3mText] = useState("");
    const [days3mDetailText, setDays3mDetailText] = useState("90");

    const computed = useMemo(() => {
        const asOf = toDate(dismissalDate) ?? toDate(todayIso) ?? new Date();
        const b = toDate(birthDate);

        const age = b ? calcAge(b, asOf) : 0;
        const isOver50OrDisabled = isDisabled || age >= 50;

        const insuredMonths = clamp(stripNumberLike(insuredMonthsText), 0, 2400);
        const payableDays = benefitDaysByInsuredMonths(insuredMonths, isOver50OrDisabled);

        const dailyHours = clamp(stripNumberLike(dailyHoursText) || 8, 1, 24);

        // ✅ 하한액은 8시간 기준 고정
        const dailyFloor = Math.round(MIN_WAGE_2026 * 0.8 * 8);

        const dailyCeil = DAILY_CAP_2026;

        // 평균임금(1일)
        let avgDailyWage = 0;

        if (wageMode === "monthly") {
            const monthly = stripNumberLike(monthlyWageText);
            const days3m = clamp(stripNumberLike(days3mText) || 90, 1, 200);

            const total3m = monthly * 3;
            avgDailyWage = total3m / days3m;
        } else {
            const total3m = stripNumberLike(wage3mText);
            const days3m = clamp(stripNumberLike(days3mDetailText) || 90, 1, 200);

            avgDailyWage = total3m / days3m;
        }

        const baseDaily = avgDailyWage * 0.6;
        const dailyBenefit = clamp(baseDaily, dailyFloor, dailyCeil);

        const total = Math.round(dailyBenefit * payableDays);

        return {
            asOf,
            age,
            isOver50OrDisabled,
            insuredMonths,
            payableDays,

            dailyHours,
            dailyFloor,
            dailyCeil,

            avgDailyWage,
            baseDaily,
            dailyBenefit,
            total,
        };
    }, [
        todayIso,
        birthDate,
        dismissalDate,
        isDisabled,
        dailyHoursText,
        insuredMonthsText,
        wageMode,
        monthlyWageText,
        days3mText,
        wage3mText,
        days3mDetailText,
    ]);

    return (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">실업급여(구직급여) 계산기</h2>

            <div className="mt-2 text-sm font-semibold text-slate-600">
                {YEAR}년 기준으로 <span className="font-black">일액(하한/상한 적용)</span>과{" "}
                <span className="font-black">예상 총액</span>만 간단히 계산해.
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                {/* Inputs */}
                <div className="space-y-5">
                    {/* 날짜/분류 */}
                    <div className="rounded-xl border p-4">
                        <div className="text-sm font-black text-slate-800">기본 정보</div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <label className="block">
                                <div className="text-xs font-bold text-slate-600">생년월일 (50세 미만/이상 판단)</div>
                                <input
                                    type="date"
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                                />
                            </label>

                            <label className="block">
                                <div className="text-xs font-bold text-slate-600">퇴사일 (선택)</div>
                                <input
                                    type="date"
                                    value={dismissalDate}
                                    onChange={(e) => setDismissalDate(e.target.value)}
                                    className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                                />
                                <div className="mt-1 text-[11px] font-semibold text-slate-500">
                                    비우면 오늘 기준으로 나이 판단
                                </div>
                            </label>
                        </div>

                        <label className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                            <input
                                type="checkbox"
                                checked={isDisabled}
                                onChange={(e) => setIsDisabled(e.target.checked)}
                                className="h-4 w-4"
                            />
                            장애인 해당
                            <span className="ml-auto text-xs font-semibold text-slate-500">
                                현재 판단: {computed.isOver50OrDisabled ? "50세 이상/장애인" : "50세 미만"}
                            </span>
                        </label>
                    </div>

                    {/* 임금 입력 */}
                    <div className="rounded-xl border p-4">
                        <div className="text-sm font-black text-slate-800">임금 입력</div>

                        <div className="mt-3 flex gap-2">
                            <Chip label="간편(월급)" active={wageMode === "monthly"} onClick={() => setWageMode("monthly")} />
                            <Chip label="정밀(3개월)" active={wageMode === "detail3m"} onClick={() => setWageMode("detail3m")} />
                        </div>

                        {wageMode === "monthly" ? (
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <label className="block sm:col-span-2">
                                    <div className="text-xs font-bold text-slate-600">최근 월급(원)</div>
                                    <input
                                        inputMode="numeric"
                                        value={monthlyWageText}
                                        onChange={(e) => {
                                            const n = stripNumberLike(e.target.value);
                                            setMonthlyWageText(formatNumberInput(n));
                                        }}
                                        className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                </label>

                                <label className="block">
                                    <div className="text-xs font-bold text-slate-600">3개월 총일수</div>
                                    <input
                                        inputMode="numeric"
                                        value={days3mText}
                                        onChange={(e) => setDays3mText(e.target.value.replace(/[^\d]/g, ""))}
                                        className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                    <div className="mt-1 text-[11px] font-semibold text-slate-500">보통 90일</div>
                                </label>

                                <div className="sm:col-span-2 text-xs font-semibold text-slate-600">
                                    평균임금(1일) ≈ <span className="font-black text-slate-900">{formatWonPlain(Math.round(computed.avgDailyWage))}</span>원
                                </div>
                            </div>
                        ) : (
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <label className="block sm:col-span-2">
                                    <div className="text-xs font-bold text-slate-600">3개월 총임금(원)</div>
                                    <input
                                        inputMode="numeric"
                                        value={wage3mText}
                                        onChange={(e) => {
                                            const n = stripNumberLike(e.target.value);
                                            setWage3mText(formatNumberInput(n));
                                        }}
                                        className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                </label>

                                <label className="block">
                                    <div className="text-xs font-bold text-slate-600">3개월 총일수</div>
                                    <input
                                        inputMode="numeric"
                                        value={days3mDetailText}
                                        onChange={(e) => setDays3mDetailText(e.target.value.replace(/[^\d]/g, ""))}
                                        className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                </label>

                                <div className="sm:col-span-2 text-xs font-semibold text-slate-600">
                                    평균임금(1일) ≈ <span className="font-black text-slate-900">{formatWonPlain(Math.round(computed.avgDailyWage))}</span>원
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 근로시간/가입기간 */}
                    <div className="rounded-xl border p-4">
                        <div className="text-sm font-black text-slate-800">근로시간 / 고용보험 가입기간</div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <label className="block">
                                <div className="text-xs font-bold text-slate-600">1일 소정근로시간(시간)</div>
                                <input
                                    inputMode="numeric"
                                    value={dailyHoursText}
                                    onChange={(e) => setDailyHoursText(e.target.value.replace(/[^\d]/g, ""))}
                                    className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                                />
                                <div className="mt-1 text-[11px] font-semibold text-slate-500">기본 8시간</div>
                            </label>

                            <label className="block">
                                <div className="text-xs font-bold text-slate-600">고용보험 가입기간(개월)</div>
                                <input
                                    inputMode="numeric"
                                    value={insuredMonthsText}
                                    onChange={(e) => setInsuredMonthsText(e.target.value.replace(/[^\d]/g, ""))}
                                    className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                                />
                                <div className="mt-1 text-[11px] font-semibold text-slate-500">
                                    아래 버튼 누르면 자동 입력
                                </div>
                            </label>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                            {preset.map((p) => {
                                const active = stripNumberLike(insuredMonthsText) === p.months;
                                return (
                                    <Chip
                                        key={p.label}
                                        label={p.label}
                                        active={active}
                                        onClick={() => setInsuredMonthsText(String(p.months))}
                                    />
                                );
                            })}
                        </div>

                        <div className="mt-3 text-xs font-semibold text-slate-600">
                            예상 소정급여일수:{" "}
                            <span className="font-black text-slate-900">{computed.payableDays}일</span>
                        </div>
                    </div>

                    {/* 자격 안내(멘트만) */}
                    <div className="rounded-xl border bg-slate-50 p-4">
                        <div className="text-sm font-black text-slate-900">수급 조건(요약)</div>
                        <ul className="mt-2 list-disc pl-5 text-sm font-semibold text-slate-700 space-y-1">
                            <li>비자발적 이직(권고사직/해고/계약만료 등) 또는 정당한 자발적 이직 사유</li>
                            <li>이직 전 18개월 내 피보험단위기간 180일 이상</li>
                            <li>근로 의사/능력 + 적극적 구직활동</li>
                        </ul>
                        <div className="mt-2 text-[11px] font-semibold text-slate-500">
                            ※ 실제 인정/금액은 관할 고용센터 판단에 따라 달라질 수 있음.
                        </div>
                    </div>
                </div>

                {/* Result */}
                <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
                    <div className="text-sm font-extrabold text-white/80">예상 구직급여</div>

                    <div className="mt-2 text-4xl font-black tracking-tight">
                        {formatWon(Math.round(computed.total))}
                    </div>

                    <div className="mt-5 overflow-hidden rounded-2xl bg-white/10">
                        <div className="divide-y divide-white/10">
                            <div className="flex items-center justify-between px-4 py-3">
                                <div className="text-sm font-black text-white/80">구직급여 일액(내 값)</div>
                                <div className="text-sm font-black text-white">{formatWon(Math.round(computed.dailyBenefit))}</div>
                            </div>

                            <div className="flex items-center justify-between px-4 py-3">
                                <div className="text-sm font-black text-white/80">일 하한액</div>
                                <div className="text-sm font-black text-white">{formatWon(computed.dailyFloor)}</div>
                            </div>

                            <div className="flex items-center justify-between px-4 py-3">
                                <div className="text-sm font-black text-white/80">일 상한액</div>
                                <div className="text-sm font-black text-white">{formatWon(computed.dailyCeil)}</div>
                            </div>

                            <div className="flex items-center justify-between px-4 py-3">
                                <div className="text-sm font-black text-white/80">소정급여일수</div>
                                <div className="text-sm font-black text-white">{computed.payableDays}일</div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 text-xs font-semibold text-white/70 leading-5">
                        - 계산식: 평균임금(1일) × 60% → 하한/상한 범위로 보정<br />
                        - 하한액: 최저임금 × 80% × 1일 소정근로시간(기본 8h)<br />
                        - 상한액: {YEAR}년 기준 고정
                    </div>
                </div>
            </div>
        </div>
    );
}
