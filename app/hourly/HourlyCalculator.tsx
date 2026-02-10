// app/hourly/HourlyCalculator.tsx
"use client";

import { useMemo, useState } from "react";
import { calculateHourly } from "./hourly.logic";

function onlyDigits(s: string) {
    return (s ?? "").replace(/[^\d]/g, "");
}
function toInt(s: string) {
    return Number(onlyDigits(s) || "0");
}
function formatWon(n: number) {
    const v = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
    return v.toLocaleString("ko-KR");
}
function KRW({ n }: { n: number }) {
    return <span>{Math.round(n).toLocaleString("ko-KR")}원</span>;
}

function Segmented2({
    value,
    onChange,
    left,
    right,
}: {
    value: "left" | "right";
    onChange: (v: "left" | "right") => void;
    left: string;
    right: string;
}) {
    return (
        <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <button
                type="button"
                onClick={() => onChange("left")}
                className={[
                    "h-11 w-full text-sm font-black transition",
                    value === "left"
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-700 hover:bg-slate-50",
                ].join(" ")}
            >
                {left}
            </button>

            <button
                type="button"
                onClick={() => onChange("right")}
                className={[
                    "h-11 w-full text-sm font-black transition",
                    value === "right"
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-700 hover:bg-slate-50",
                ].join(" ")}
            >
                {right}
            </button>
        </div>
    );
}

type PeriodKey = "annual" | "monthly" | "weekly" | "daily";

function Card({
    title,
    tintClass,
    basic,
    final,
    expanded,
    onToggle,

    // 시간(표시용)
    workHours, // ✅ 실근무(근무+연장)
    baseHours, // ✅ 기본 근무
    weeklyRestHours, // ✅ 주휴(유급 추가)

    // 금액(항목)
    addWeeklyRest,
    deductTax,
    deductProbation,
}: {
    title: string;
    tintClass: string;
    basic: number;
    final: number;
    expanded: boolean;
    onToggle: () => void;

    workHours: number;
    baseHours: number;
    weeklyRestHours: number;

    addWeeklyRest: number;
    deductTax: number;
    deductProbation: number;
}) {
    const hasWeeklyRest = (addWeeklyRest ?? 0) > 0;
    const hasTax = (deductTax ?? 0) > 0;
    const hasProb = (deductProbation ?? 0) > 0;

    return (
        <div className={["rounded-3xl border border-slate-200 p-5 shadow-sm", tintClass].join(" ")}>
            <div className="flex items-center justify-between">
                <div className="text-sm font-black text-slate-700">{title}</div>
                <button
                    type="button"
                    onClick={onToggle}
                    className="text-xs font-black text-slate-700 hover:text-slate-900"
                >
                    급여 상세 보기 {expanded ? "▴" : "▾"}
                </button>
            </div>

            <div className="mt-3 grid gap-2">
                <div className="flex items-center justify-between">
                    <div className="text-sm font-extrabold text-slate-700">기본 {title}</div>
                    <div className="text-sm font-black text-slate-900">
                        <KRW n={basic} />
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="text-sm font-extrabold text-slate-700">최종 예상 {title}</div>
                    <div className="text-lg font-black text-blue-600">
                        <KRW n={final} />
                    </div>
                </div>


                <div className="text-[11px] font-semibold text-slate-600 leading-relaxed">
                    계약/휴게/절사에 따라 오차가 날 수 있음.
                </div>
            </div>

            {expanded && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-4">
                    {/* 시간 분해 (period별로 정확) */}
                    <div className="grid gap-1 text-xs font-semibold text-slate-700">
                        <div className="flex justify-between">
                            <span>실근무시간(근무+연장)</span>
                            <span className="font-black">{workHours.toLocaleString("ko-KR")}시간</span>
                        </div>

                        <div className="flex justify-between">
                            <span>기본 근무시간</span>
                            <span className="font-black">{baseHours.toLocaleString("ko-KR")}시간</span>
                        </div>

                        <div className="flex justify-between">
                            <span>주휴시간(추가 유급)</span>
                            <span className="font-black">{weeklyRestHours.toLocaleString("ko-KR")}시간</span>
                        </div>
                    </div>

                    <div className="my-3 h-px bg-slate-200/70" />

                    {/* 금액 항목: 있는 것만 */}
                    <div className="grid gap-2 text-sm">
                        {hasWeeklyRest && (
                            <div className="flex items-center justify-between">
                                <span className="font-extrabold text-slate-700">주휴수당</span>
                                <span className="font-black text-blue-600">
                                    {Math.round(addWeeklyRest).toLocaleString("ko-KR")}원
                                </span>
                            </div>
                        )}

                        {hasProb && (
                            <div className="flex items-center justify-between">
                                <span className="font-extrabold text-slate-700">수습 공제</span>
                                <span className="font-black text-rose-600">
                                    {Math.round(deductProbation).toLocaleString("ko-KR")}원
                                </span>
                            </div>
                        )}

                        {hasTax && (
                            <div className="flex items-center justify-between">
                                <span className="font-extrabold text-slate-700">세금</span>
                                <span className="font-black text-rose-600">
                                    {Math.round(deductTax).toLocaleString("ko-KR")}원
                                </span>
                            </div>
                        )}

                        {!hasWeeklyRest && !hasProb && !hasTax && (
                            <div className="text-xs font-semibold text-slate-600">추가/공제 항목 없음</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// 월 환산 상수(로직과 동일)
const WEEKS_PER_MONTH = 52 / 12;

export default function HourlyCalculator() {
    // 입력
    const [hourlyText, setHourlyText] = useState("10,000");
    const hourlyWage = toInt(hourlyText);

    const [dailyH, setDailyH] = useState("8");
    const [dailyM, setDailyM] = useState("0");

    const [dayType, setDayType] = useState<"week" | "month">("week");
    const [daysCountText, setDaysCountText] = useState("5");

    const [otH, setOtH] = useState("0");
    const [otM, setOtM] = useState("0");

    const [weeklyRest, setWeeklyRest] = useState(true);
    const [taxMode, setTaxMode] = useState<"none" | "basic_9_71" | "simple_3_3">("none");
    const [probation, setProbation] = useState(false);

    // 카드 펼침 상태 (한 번에 하나만 열리게)
    const [openCard, setOpenCard] = useState<PeriodKey | null>(null);

    const baseArgs = useMemo(
        () => ({
            hourlyWage,
            dailyHours: Number(onlyDigits(dailyH) || "0"),
            dailyMinutes: Number(onlyDigits(dailyM) || "0"),
            dayType,
            daysCount: Number(onlyDigits(daysCountText) || "0"),
            overtimeHours: Number(onlyDigits(otH) || "0"),
            overtimeMinutes: Number(onlyDigits(otM) || "0"),
            includeWeeklyRestPay: weeklyRest,
            taxMode,
            probation,
        }),
        [hourlyWage, dailyH, dailyM, dayType, daysCountText, otH, otM, weeklyRest, taxMode, probation]
    );

    const result = useMemo(() => calculateHourly(baseArgs), [baseArgs]);

    // ✅ taxRate / 수습 factor를 UI 계산에도 동일 적용
    const taxRate =
        taxMode === "basic_9_71" ? 0.0971 : taxMode === "simple_3_3" ? 0.033 : 0;
    const probFactor = probation ? 0.9 : 1;

    const daysCountRaw = Number(onlyDigits(daysCountText) || "0");
    const maxDays = dayType === "week" ? 7 : 31;
    const daysCountClamped = Math.max(0, Math.min(maxDays, Math.floor(daysCountRaw)));
    const safeDays = Math.max(1, daysCountClamped);

    // ✅ period별 minutes(근무/연장/주휴/유급) 분해
    const monthly = useMemo(() => {
        const work = result.monthlyWorkMinutes;
        const overtime = result.monthlyOvertimeMinutes;
        const rest =
            (result as any).monthlyRestMinutes ?? Math.round(result.weeklyRestMinutes * WEEKS_PER_MONTH);
        const paid = work + overtime + rest;
        return { work, overtime, rest, paid };
    }, [result]);

    const weekly = useMemo(() => {
        const work =
            dayType === "week"
                ? result.weeklyWorkMinutes
                : Math.round(result.monthlyWorkMinutes / WEEKS_PER_MONTH);

        const overtime = Math.round(result.monthlyOvertimeMinutes / WEEKS_PER_MONTH);
        const rest = result.weeklyRestMinutes;
        const paid = work + overtime + rest;
        return { work, overtime, rest, paid };
    }, [result, dayType]);

    const daily = useMemo(() => {
        const work = result.dailyWorkMinutes;

        // 연장은 “일 환산”으로 분배
        const overtime =
            dayType === "week"
                ? Math.round(weekly.overtime / safeDays)
                : Math.round(result.monthlyOvertimeMinutes / safeDays);

        // 주휴는 “주 1일치 유급”이므로, 일급 카드에서는 “일 환산”으로만 표시
        const rest =
            dayType === "week" ? Math.round(weekly.rest / safeDays) : Math.round(monthly.rest / safeDays);

        const paid = work + overtime + rest;
        return { work, overtime, rest, paid };
    }, [result, dayType, weekly, monthly, safeDays]);

    const annual = useMemo(() => {
        const work = monthly.work * 12;
        const overtime = monthly.overtime * 12;
        const rest = monthly.rest * 12;
        const paid = work + overtime + rest;
        return { work, overtime, rest, paid };
    }, [monthly]);

    function wonFromMinutes(mins: number) {
        return Math.round(hourlyWage * (mins / 60));
    }

    // ✅ 같은 기준으로 gross/tax/net + 항목 델타 계산
    function calcPeriod(mins: { work: number; overtime: number; rest: number; paid: number }) {
        const baseGross = wonFromMinutes(mins.paid); // 수습 적용 전
        const gross = Math.round(baseGross * probFactor); // 수습 적용 후

        const tax = Math.round(gross * taxRate);
        const net = gross - tax;

        // 주휴수당(수습 적용된 값으로 표시)
        const addWeeklyRest = Math.round(wonFromMinutes(mins.rest) * probFactor);

        // 수습 공제 = (수습 전 - 수습 후)
        const probationDeduct = probation ? Math.max(0, baseGross - gross) : 0;

        // 시간(표시용)
        const workHours = Math.round(((mins.work + mins.overtime) / 60) * 10) / 10; // 실근무
        const baseHours = Math.round((mins.work / 60) * 10) / 10; // 기본
        const restHours = Math.round((mins.rest / 60) * 10) / 10; // 주휴(추가 유급)

        return {
            gross,
            net,
            tax,
            addWeeklyRest,
            probationDeduct,
            workHours,
            baseHours,
            restHours,
        };
    }

    const pAnnual = useMemo(() => calcPeriod(annual), [annual, hourlyWage, taxRate, probFactor, probation]);
    const pMonthly = useMemo(() => calcPeriod(monthly), [monthly, hourlyWage, taxRate, probFactor, probation]);
    const pWeekly = useMemo(() => calcPeriod(weekly), [weekly, hourlyWage, taxRate, probFactor, probation]);
    const pDaily = useMemo(() => calcPeriod(daily), [daily, hourlyWage, taxRate, probFactor, probation]);

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div>
                <h2 className="text-2xl font-black tracking-tight">시급 계산기</h2>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                {/* 입력 */}
                <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
                    <div className="text-sm font-black text-slate-900">입력</div>

                    <div className="mt-4 grid gap-4">
                        {/* 시급 */}
                        <label className="grid gap-1">
                            <div className="text-sm font-extrabold text-slate-700">시급(원)</div>
                            <input
                                inputMode="numeric"
                                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200"
                                value={hourlyText}
                                onChange={(e) => setHourlyText(onlyDigits(e.target.value))}
                                onBlur={() => {
                                    const v = Number(onlyDigits(hourlyText) || "0");
                                    setHourlyText(v ? formatWon(v) : "");
                                }}
                                placeholder="예: 10,000"
                            />
                        </label>

                        {/* 일 근무시간 */}
                        <div className="grid gap-2">
                            <div className="text-sm font-extrabold text-slate-700">일 근무시간</div>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    inputMode="numeric"
                                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200"
                                    value={dailyH}
                                    onChange={(e) => setDailyH(onlyDigits(e.target.value))}
                                    placeholder="시간"
                                />
                                <input
                                    inputMode="numeric"
                                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200"
                                    value={dailyM}
                                    onChange={(e) => setDailyM(onlyDigits(e.target.value))}
                                    placeholder="분"
                                />
                            </div>
                        </div>

                        {/* 근무일수 */}
                        <div className="grid gap-2">
                            <div className="text-sm font-extrabold text-slate-700">근무일수(주/월)</div>
                            <div className="grid grid-cols-[140px_1fr] gap-2">
                                <Segmented2
                                    value={dayType === "week" ? "left" : "right"}
                                    onChange={(v) => setDayType(v === "left" ? "week" : "month")}
                                    left="주"
                                    right="월"
                                />
                                <input
                                    inputMode="numeric"
                                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200"
                                    value={daysCountText}
                                    onChange={(e) => setDaysCountText(onlyDigits(e.target.value))}
                                    placeholder={dayType === "week" ? "예: 5" : "예: 22"}
                                />
                            </div>
                        </div>

                        {/* 월 연장근무 */}
                        <div className="grid gap-2">
                            <div className="text-sm font-extrabold text-slate-700">월 연장근무</div>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    inputMode="numeric"
                                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200"
                                    value={otH}
                                    onChange={(e) => setOtH(onlyDigits(e.target.value))}
                                    placeholder="시간"
                                />
                                <input
                                    inputMode="numeric"
                                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200"
                                    value={otM}
                                    onChange={(e) => setOtM(onlyDigits(e.target.value))}
                                    placeholder="분"
                                />
                            </div>
                        </div>

                        {/* 주휴수당 */}
                        <div className="grid gap-2">
                            <div className="text-sm font-extrabold text-slate-700">주휴수당</div>
                            <Segmented2
                                value={weeklyRest ? "right" : "left"}
                                onChange={(v) => setWeeklyRest(v === "right")}
                                left="제외"
                                right="포함"
                            />
                        </div>

                        {/* 세금 */}
                        <div className="grid gap-2">
                            <div className="text-sm font-extrabold text-slate-700">세금(간단)</div>
                            <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                <button
                                    type="button"
                                    onClick={() => setTaxMode("none")}
                                    className={[
                                        "h-11 w-full text-sm font-black transition",
                                        taxMode === "none"
                                            ? "bg-slate-900 text-white"
                                            : "bg-white text-slate-700 hover:bg-slate-50",
                                    ].join(" ")}
                                >
                                    없음
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTaxMode("basic_9_71")}
                                    className={[
                                        "h-11 w-full text-sm font-black transition",
                                        taxMode === "basic_9_71"
                                            ? "bg-slate-900 text-white"
                                            : "bg-white text-slate-700 hover:bg-slate-50",
                                    ].join(" ")}
                                >
                                    9.71%
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTaxMode("simple_3_3")}
                                    className={[
                                        "h-11 w-full text-sm font-black transition",
                                        taxMode === "simple_3_3"
                                            ? "bg-slate-900 text-white"
                                            : "bg-white text-slate-700 hover:bg-slate-50",
                                    ].join(" ")}
                                >
                                    3.3%
                                </button>
                            </div>
                        </div>

                        {/* 수습 */}
                        <div className="grid gap-2">
                            <div className="text-sm font-extrabold text-slate-700">수습 여부</div>
                            <Segmented2
                                value={probation ? "right" : "left"}
                                onChange={(v) => setProbation(v === "right")}
                                left="아니오"
                                right="예"
                            />
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-600 leading-relaxed">
                            회사 규정(휴게/절사)에 따라 차이 날 수 있음.
                        </div>
                    </div>
                </div>

                {/* 결과: 카드 4장 */}
                <div className="grid gap-4">
                    <Card
                        title="연봉"
                        tintClass="bg-amber-50"
                        basic={pAnnual.gross}
                        final={pAnnual.net}
                        expanded={openCard === "annual"}
                        onToggle={() => setOpenCard((v) => (v === "annual" ? null : "annual"))}
                        workHours={pAnnual.workHours}
                        baseHours={pAnnual.baseHours}
                        weeklyRestHours={pAnnual.restHours}
                        addWeeklyRest={pAnnual.addWeeklyRest}
                        deductTax={pAnnual.tax}
                        deductProbation={pAnnual.probationDeduct}
                    />

                    <Card
                        title="월급"
                        tintClass="bg-sky-50"
                        basic={pMonthly.gross}
                        final={pMonthly.net}
                        expanded={openCard === "monthly"}
                        onToggle={() => setOpenCard((v) => (v === "monthly" ? null : "monthly"))}
                        workHours={pMonthly.workHours}
                        baseHours={pMonthly.baseHours}
                        weeklyRestHours={pMonthly.restHours}
                        addWeeklyRest={pMonthly.addWeeklyRest}
                        deductTax={pMonthly.tax}
                        deductProbation={pMonthly.probationDeduct}
                    />

                    <Card
                        title="주급"
                        tintClass="bg-emerald-50"
                        basic={pWeekly.gross}
                        final={pWeekly.net}
                        expanded={openCard === "weekly"}
                        onToggle={() => setOpenCard((v) => (v === "weekly" ? null : "weekly"))}
                        workHours={pWeekly.workHours}
                        baseHours={pWeekly.baseHours}
                        weeklyRestHours={pWeekly.restHours}
                        addWeeklyRest={pWeekly.addWeeklyRest}
                        deductTax={pWeekly.tax}
                        deductProbation={pWeekly.probationDeduct}
                    />

                    <Card
                        title="일급"
                        tintClass="bg-violet-50"
                        basic={pDaily.gross}
                        final={pDaily.net}
                        expanded={openCard === "daily"}
                        onToggle={() => setOpenCard((v) => (v === "daily" ? null : "daily"))}
                        workHours={pDaily.workHours}
                        baseHours={pDaily.baseHours}
                        weeklyRestHours={pDaily.restHours}
                        addWeeklyRest={pDaily.addWeeklyRest}
                        deductTax={pDaily.tax}
                        deductProbation={pDaily.probationDeduct}
                    />
                </div>
            </div>
        </div>
    );
}
