"use client";

import React, { useMemo, useState } from "react";

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

function toIntOr0(s: string) {
    const n = stripNumberLike(s);
    return Math.max(0, Math.floor(n));
}

export default function WeeklyHolidayPayCalculator() {
    const currentYear = new Date().getFullYear();

    // 시급
    const [hourlyWageText, setHourlyWageText] = useState("10,320");

    // ✅ number 말고 string으로: 0 입력 UX 개선
    const [weeklyHoursText, setWeeklyHoursText] = useState("40");
    const [weeklyMinutesText, setWeeklyMinutesText] = useState("0");

    const computed = useMemo(() => {
        const hourlyWage = stripNumberLike(hourlyWageText);

        const h = toIntOr0(weeklyHoursText);
        const m = clamp(toIntOr0(weeklyMinutesText), 0, 59);

        const weekTotalHours = h + m / 60;

        // 주 15h 미만이면 주휴 없음
        const eligible = weekTotalHours >= 15;

        // 계산 시 주 근무시간은 최대 40시간까지만 반영
        const cappedWeekHoursForCalc = clamp(weekTotalHours, 0, 40);

        // 주휴시간 = (주 근무시간 / 40) * 8
        const weeklyHolidayHours = eligible ? (cappedWeekHoursForCalc / 40) * 8 : 0;

        const weeklyHolidayPayRaw = weeklyHolidayHours * hourlyWage;
        const weeklyHolidayPay = Math.max(0, Math.round(weeklyHolidayPayRaw));

        return {
            hourlyWage,
            weekTotalHours,
            eligible,
            cappedWeekHoursForCalc,
            weeklyHolidayHours,
            weeklyHolidayPay,
            h,
            m,
        };
    }, [hourlyWageText, weeklyHoursText, weeklyMinutesText]);

    return (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">주휴수당 계산기</h2>

            <div className="mt-4 rounded-xl border bg-blue-50 px-4 py-3 text-sm font-semibold text-slate-800">
                ℹ️ {currentYear}년 최저시급은 <span className="font-black">{hourlyWageText || "0"}</span>원 입니다.
            </div>

            {/* ✅ 입력줄: 버튼 제거 + 높이 통일 + 라벨 가로 고정 */}
            {/* ✅ 입력줄: "입력 박스" / "멘트 박스" 완전 분리 */}
            <div className="mt-4 rounded-2xl border p-4">
                {/* 1) 입력 박스(시급 + 근무시간) */}
                <div className="rounded-2xl border border-transparent">
                    <div className="grid grid-cols-12 items-end gap-3">
                        {/* 시급 */}
                        <div className="col-span-12 sm:col-span-4">
                            <div className="text-xs font-bold text-slate-600">시급</div>
                            <div className="mt-1 flex items-center gap-2">
                                <input
                                    inputMode="numeric"
                                    placeholder="예: 10,320"
                                    value={hourlyWageText}
                                    onChange={(e) => {
                                        const n = stripNumberLike(e.target.value);
                                        setHourlyWageText(formatNumberInput(n));
                                    }}
                                    className="h-11 w-full min-w-0 rounded-xl border px-3 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                                />
                                <div className="shrink-0 text-sm font-black text-slate-700">원</div>
                            </div>
                        </div>

                        {/* 1주 근무시간 */}
                        <div className="col-span-12 sm:col-span-8">
                            <div className="text-xs font-bold text-slate-600">1주 근무시간</div>

                            {/* ✅ 시간/분: 절대 튀어나가지 않게 */}
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                {/* 시간 */}
                                <div className="flex h-11 min-w-0 flex-1 items-center rounded-xl border px-3">
                                    <input
                                        inputMode="numeric"
                                        value={weeklyHoursText}
                                        onChange={(e) => {
                                            const s = e.target.value.replace(/[^\d]/g, "");
                                            setWeeklyHoursText(s === "" ? "" : String(Number(s)));
                                        }}
                                        onFocus={() => {
                                            if (toIntOr0(weeklyHoursText) === 0) setWeeklyHoursText("");
                                        }}
                                        onBlur={() => {
                                            if ((weeklyHoursText ?? "").trim() === "") setWeeklyHoursText("0");
                                        }}
                                        className="w-full min-w-0 bg-transparent font-semibold outline-none"
                                    />
                                    <span className="ml-2 shrink-0 text-sm font-black text-slate-700">시간</span>
                                </div>

                                {/* 분 */}
                                <div className="flex h-11 min-w-0 flex-1 items-center rounded-xl border px-3">
                                    <input
                                        inputMode="numeric"
                                        value={weeklyMinutesText}
                                        onChange={(e) => {
                                            const s = e.target.value.replace(/[^\d]/g, "");
                                            if (s === "") return setWeeklyMinutesText("");
                                            const n = clamp(Number(s), 0, 59);
                                            setWeeklyMinutesText(String(n));
                                        }}
                                        onFocus={() => {
                                            if (toIntOr0(weeklyMinutesText) === 0) setWeeklyMinutesText("");
                                        }}
                                        onBlur={() => {
                                            if ((weeklyMinutesText ?? "").trim() === "") setWeeklyMinutesText("0");
                                        }}
                                        className="w-full min-w-0 bg-transparent font-semibold outline-none"
                                    />
                                    <span className="ml-2 shrink-0 text-sm font-black text-slate-700">분</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2) 멘트 박스(입력폼에 영향 안 주게 분리, border 안 보이게) */}
                <div className="mt-2 rounded-2xl border border-transparent px-1">
                    <div className="text-[11px] font-semibold text-slate-500 leading-4">
                        ※ 주 15시간 미만이면 주휴수당은 0원. 계산 시 주 근무시간은 최대 40시간까지만 반영.
                    </div>
                </div>
            </div>



            {/* ✅ 결과: 항상 표시, 다시하기 버튼 삭제 */}
            <div className="mt-4 rounded-2xl border p-4">
                <div className="flex items-center justify-between">
                    <div className="text-sm font-black text-slate-800">예상 주휴수당</div>
                    <div className="text-lg font-black text-blue-600">{formatWon(computed.weeklyHolidayPay)}</div>
                </div>

                <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-600">
                    <div>
                        주 근무시간(입력):{" "}
                        <span className="font-black text-slate-900">{computed.weekTotalHours.toFixed(2)}h</span>
                    </div>
                    <div>
                        계산 적용 근무시간(최대40h):{" "}
                        <span className="font-black text-slate-900">{computed.cappedWeekHoursForCalc.toFixed(2)}h</span>
                    </div>
                    <div>
                        주휴시간:{" "}
                        <span className="font-black text-slate-900">{computed.weeklyHolidayHours.toFixed(2)}h</span>
                    </div>
                    <div>
                        지급 조건(주15h 이상):{" "}
                        <span className={computed.eligible ? "font-black text-emerald-700" : "font-black text-red-600"}>
                            {computed.eligible ? "충족" : "미충족"}
                        </span>
                    </div>
                    <div>
                        계산식: <span className="font-black text-slate-900">(주 근무시간 / 40) × 8 × 시급</span>
                    </div>
                </div>

                {/* ✅ 멘트는 여기로 이동 */}
                <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600">
                    ※ 주 15시간 미만이면 주휴수당은 0원. 계산 시 주 근무시간은 최대 40시간까지만 반영.
                </div>
            </div>

            {/* 설명 */}
            <div className="mt-4 rounded-2xl border bg-slate-50 p-4">
                <div className="text-sm font-black text-slate-900">주휴수당이란?</div>
                <div className="mt-2 text-sm font-semibold text-slate-700">
                    1주 동안 <span className="font-black">15시간 이상</span> 소정의 근로일수를 개근한 근로자에게 지급되는 유급휴일에 대한 수당.
                </div>

                <div className="mt-4 text-sm font-black text-slate-900">주휴수당 지급 기준</div>
                <ul className="mt-2 list-disc pl-5 text-sm font-semibold text-slate-700 space-y-1">
                    <li>1주 근로시간이 15시간 이상</li>
                    <li>근로계약상의 근로일을 개근한 경우</li>
                    <li>주휴수당 지급 이후에도 근로관계가 계속되는 경우</li>
                </ul>

                <div className="mt-4 text-sm font-black text-slate-900">주휴수당 계산법</div>
                <div className="mt-2 text-sm font-semibold text-slate-700">
                    <span className="font-black">(주 근무시간 / 40시간) × 8 × 시급</span>
                    <div className="mt-1 text-xs font-semibold text-slate-500">
                        ※ 법정근로시간은 1일 8시간(주 40시간). 주 40시간을 초과해도 계산은 최대 40시간까지만 적용.
                    </div>
                </div>
            </div>
        </div>
    );
}
