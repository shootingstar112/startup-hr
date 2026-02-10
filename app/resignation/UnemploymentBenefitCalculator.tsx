"use client";

import React, { useMemo, useState } from "react";

const YEAR = 2026;

// 2026 가정값
const MIN_WAGE_2026 = 10320;           // 최저시급
const FLOOR_RATE = 0.8;               // 하한: 최저시급의 80%
const BENEFIT_RATE = 0.6;             // 구직급여: 평균임금의 60%
const DAILY_BENEFIT_CAP = 68100;      // 구직급여 일액 상한(최종 A 최대)
const MAX_HOURS_FOR_FLOOR = 8;        // 하한 계산에서 인정하는 시간 최대(8시간)

// “평균임금(1일)”은 이 값을 넘겨도 여기까지만 인정하고 60%를 때림
// (= 68,100 / 0.6 = 113,500)
const AVG_DAILY_WAGE_CAP_FOR_BASE = Math.round(DAILY_BENEFIT_CAP / BENEFIT_RATE);

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
function toDate(v: string) {
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

// 소정급여일수(2019.10.1 이후 표)
function benefitDaysByInsuredMonths(insuredMonths: number, isOver50OrDisabled: boolean) {
    const m = Math.max(0, insuredMonths);
    const band = m < 12 ? 0 : m < 36 ? 1 : m < 60 ? 2 : m < 120 ? 3 : 4;
    if (!isOver50OrDisabled) return [120, 150, 180, 210, 240][band];
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
                active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-800 hover:bg-slate-50",
            ].join(" ")}
        >
            {label}
        </button>
    );
}

export default function UnemploymentBenefitCalculator() {
    const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

    // 기본 입력
    const [birthDate, setBirthDate] = useState("1995-05-15");
    const [dismissalDate, setDismissalDate] = useState<string>("");
    const [isDisabled, setIsDisabled] = useState(false);

    // 소정근로시간(디폴트 8)
    const [dailyHoursText, setDailyHoursText] = useState("8");

    // 가입기간(개월)
    const preset = [
        { label: "6개월", months: 6 },
        { label: "1년", months: 12 },
        { label: "3년", months: 36 },
        { label: "5년", months: 60 },
        { label: "7년", months: 84 },
        { label: "10년+", months: 120 },
    ] as const;
    const [insuredMonthsText, setInsuredMonthsText] = useState("36");

    // 임금 입력 모드
    const [wageMode, setWageMode] = useState<"monthly" | "detail3m">("monthly");
    const [monthlyWageText, setMonthlyWageText] = useState("3,000,000");
    const [days3mText, setDays3mText] = useState("90");
    const [wage3mText, setWage3mText] = useState("");
    const [days3mDetailText, setDays3mDetailText] = useState("90");

    const computed = useMemo(() => {
        const asOf = toDate(dismissalDate) ?? toDate(todayIso) ?? new Date();
        const b = toDate(birthDate);

        const age = b ? calcAge(b, asOf) : 0;
        const isOver50OrDisabled = isDisabled || age >= 50;

        const insuredMonths = clamp(stripNumberLike(insuredMonthsText), 0, 2400);
        const payableDays = benefitDaysByInsuredMonths(insuredMonths, isOver50OrDisabled);

        const dailyHoursRaw = clamp(stripNumberLike(dailyHoursText) || 8, 1, 24);
        const 인정시간 = Math.min(dailyHoursRaw, MAX_HOURS_FOR_FLOOR);

        // 1) 평균임금(1일)
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

        // 2) 평균임금(1일) 상한(113,500) 적용 → “A 계산용 평균임금”
        const cappedAvgDailyWageForBase = Math.min(avgDailyWage, AVG_DAILY_WAGE_CAP_FOR_BASE);

        // 3) A(임금기반) = (상한 적용된 평균임금) × 60%  (=> 최대 68,100)
        const A_wageBased = cappedAvgDailyWageForBase * BENEFIT_RATE;

        // 4) B(하한기반) = (최저시급 × 80%) × min(근무시간, 8)
        const floorHourly = MIN_WAGE_2026 * FLOOR_RATE; // 8,256
        const B_floorBased = floorHourly * 인정시간;

        // 5) 최종 일액 = max(A, B)
        // (A는 이미 68,100을 넘지 못하도록 “평균임금 113,500 캡”을 먹였기 때문에 추가 clamp 불필요)
        const dailyBenefit = Math.max(A_wageBased, B_floorBased);

        // 6) 총액
        const total = Math.round(dailyBenefit * payableDays);

        return {
            asOf,
            age,
            isOver50OrDisabled,
            insuredMonths,
            payableDays,

            dailyHoursRaw,
            인정시간,

            avgDailyWage,
            cappedAvgDailyWageForBase,

            floorHourly,
            B_floorBased,

            A_wageBased,
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

    const A = Math.round(computed.A_wageBased);
    const B = Math.round(computed.B_floorBased);
    const finalDaily = Math.round(computed.dailyBenefit);
    const picked = A >= B ? "A" : "B";
    const aValueClass = picked === "A" ? "text-blue-400" : "text-white";
    const bValueClass = picked === "B" ? "text-blue-400" : "text-white";
    const B_CAP = Math.round(MIN_WAGE_2026 * FLOOR_RATE * MAX_HOURS_FOR_FLOOR); // 66,048

    return (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="text-xl font-black">실업급여(구직급여) 계산기</h2>
            <div className="mt-2 text-sm font-semibold text-slate-600">
                {YEAR}년 기준으로 <span className="font-black">“A(임금기반) vs B(하한기반)”</span> 두 값을 비교해서
                <span className="font-black"> 더 큰 값</span>이 1일 구직급여 일액으로 계산.
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                {/* 입력 */}
                <div className="space-y-5">
                    {/* 기본 정보 */}
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
                                <div className="mt-1 text-[11px] font-semibold text-slate-500">비우면 오늘 기준</div>
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
                                    <div className="text-xs font-bold text-slate-600">최근 3개월 평균 월급(원)</div>
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
                                    평균임금(1일) ≈{" "}
                                    <span className="font-black text-slate-900">{formatWonPlain(Math.round(computed.avgDailyWage))}</span>원
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
                                    평균임금(1일) ≈{" "}
                                    <span className="font-black text-slate-900">{formatWonPlain(Math.round(computed.avgDailyWage))}</span>원
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 근로시간/가입기간 */}
                    {/* 근로시간 */}
                    <div className="rounded-xl border p-4">
                        <div className="text-sm font-black text-slate-800">1일 소정근로시간</div>

                        <label className="mt-3 block">
                            <div className="text-xs font-bold text-slate-600">1일 소정근로시간(시간)</div>
                            <input
                                inputMode="numeric"
                                value={dailyHoursText}
                                onChange={(e) => setDailyHoursText(e.target.value.replace(/[^\d]/g, ""))}
                                className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                            />
                            <div className="mt-1 text-[11px] font-semibold text-slate-500">
                                하한 계산은 최대 {MAX_HOURS_FOR_FLOOR}시간까지만 인정
                            </div>
                        </label>
                    </div>

                    {/* 고용보험 가입기간 */}
                    <div className="rounded-xl border p-4">
                        <div className="text-sm font-black text-slate-800">고용보험 가입기간</div>

                        <label className="mt-3 block">
                            <div className="text-xs font-bold text-slate-600">고용보험 가입기간(개월)</div>
                            <input
                                inputMode="numeric"
                                value={insuredMonthsText}
                                onChange={(e) => setInsuredMonthsText(e.target.value.replace(/[^\d]/g, ""))}
                                className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                            />
                            <div className="mt-1 text-[11px] font-semibold text-slate-500">아래 버튼 누르면 자동 입력</div>
                        </label>

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

                </div>

                {/* 결과 */}
                <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-sm">
                    <div className="text-sm font-extrabold text-white/80">예상 구직급여 총액</div>
                    <div className="mt-2 text-4xl font-black tracking-tight">{formatWon(Math.round(computed.total))}</div>

                    <div className="mt-5 overflow-hidden rounded-2xl bg-white/10">
                        <div className="divide-y divide-white/10">
                            <div className="flex items-center justify-between px-4 py-3">
                                <div className="text-sm font-black text-white/80">최종 1일 일액</div>
                                <div className="text-sm font-black text-white">{formatWon(finalDaily)}</div>
                            </div>
                            <div className="flex items-center justify-between px-4 py-3">
                                <div className="text-sm font-black text-white/80">소정급여일수</div>
                                <div className="text-sm font-black text-white">
                                    {computed.payableDays}일
                                    {isDisabled ? " (장애인)" : computed.age >= 50 ? " (만50세이상)" : ""}
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* 계산 과정 (핵심: A vs B) */}
                    <div className="mt-5 rounded-2xl bg-white/10 p-4">
                        <div className="text-sm font-black text-white">어떻게 계산됐는지 (A vs B)</div>

                        <div className="mt-3 space-y-3 text-sm font-semibold text-white/85">
                            {/* Step 1: 평균임금(1일) + 상한 적용 (Step2 통합) */}
                            <div>
                                <div className="font-black text-white/90">Step 1) 평균임금(1일)</div>
                                <div className="text-white/75">
                                    입력한 평균임금(1일) ≈ {formatWonPlain(Math.round(computed.avgDailyWage))}원
                                </div>
                                <div className="text-white/75">
                                    A 계산에 쓰는 평균임금 = min(입력값, 상한 {formatWonPlain(AVG_DAILY_WAGE_CAP_FOR_BASE)}원) ={" "}
                                    {formatWonPlain(Math.round(computed.cappedAvgDailyWageForBase))}원
                                </div>
                            </div>

                            {/* Step 2: A */}
                            <div>
                                <div className="font-black text-white/90">Step 2) A(임금기반) = (상한 적용된 평균임금) × 60%</div>
                                <div className="text-white/75">
                                    A = {formatWonPlain(Math.round(computed.cappedAvgDailyWageForBase))} × 0.6 ={" "}
                                    <span className={`font-black ${aValueClass}`}>{formatWon(A)}</span>

                                    <span className="text-white/60">(상한 {formatWon(DAILY_BENEFIT_CAP)})</span>
                                </div>
                            </div>


                            {/* Step 3: B */}
                            <div>
                                <div className="font-black text-white/90">Step 3) B(하한기반) = (최저시급 × 80%) × min(근무시간, 상한 8시간)</div>
                                <div className="text-white/75">
                                    최저시급×80% = {formatWonPlain(Math.round(computed.floorHourly))}원/시간
                                </div>
                                <div className="text-white/75">
                                    인정시간 = min({computed.dailyHoursRaw}h, 8h) = {computed.인정시간}h
                                </div>
                                <div className="text-white/75">
                                    B = {formatWonPlain(Math.round(computed.floorHourly))} × {computed.인정시간} ={" "}
                                    <span className={`font-black ${bValueClass}`}>{formatWon(B)}</span>
                                    <span className="text-white/60"> (상한 {formatWon(B_CAP)})</span>

                                </div>
                            </div>


                            {/* Step 4: 최종 */}
                            <div>
                                <div className="font-black text-white/90">Step 4) 최종 1일 일액 = 더 큰 값 선택</div>
                                <div className="text-white/75">
                                    최종 = max(A, B) = max({formatWon(A)}, {formatWon(B)}) ={" "}
                                    <span className="font-black text-blue-400">{formatWon(finalDaily)}</span>

                                </div>
                            </div>
                        </div>
                    </div>


                    <div className="mt-4 text-[11px] font-semibold text-white/70 leading-5">
                        ※ 실제 수급 가능 여부/세부 계산은 관할 고용센터 판단에 따라 달라질 수 있음.
                    </div>
                </div>
            </div>
        </div>
    );
}
