"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { calculateSalary } from "../salary/salary.logic"; // ✅ 경로 맞게 수정: pay -> salary.logic 있는 곳으로!

function onlyDigits(s: string) {
    return (s ?? "").replace(/[^\d]/g, "");
}

function formatWon(n: number) {
    const v = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
    return v.toLocaleString("ko-KR");
}

// ✅ "5,000만원 · 3천원" (천원 단위는 있을 때만)
function formatManCheon(n: number) {
    const v = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
    if (v === 0) return "0원";

    const man = Math.floor(v / 10_000);
    const cheon = Math.floor((v % 10_000) / 1_000);

    const manPart = `${man.toLocaleString("ko-KR")}만원`;
    const cheonPart = cheon > 0 ? ` · ${cheon}천원` : "";
    return `${manPart}${cheonPart}`;
}

function KRW({ n }: { n: number }) {
    return <span>{Math.round(n).toLocaleString("ko-KR")}원</span>;
}

function Tip({ title, children }: { title: string; children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [leftPx, setLeftPx] = useState(0);
    const btnRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        if (!open) return;

        const TIP_W = 300;
        const PAD = 12;

        const calc = () => {
            const r = btnRef.current?.getBoundingClientRect();
            if (!r) return;
            const idealLeft = r.left;
            const maxLeft = Math.max(PAD, window.innerWidth - TIP_W - PAD);
            setLeftPx(Math.min(Math.max(idealLeft, PAD), maxLeft));
        };

        calc();
        window.addEventListener("resize", calc);
        window.addEventListener("scroll", calc, true);

        return () => {
            window.removeEventListener("resize", calc);
            window.removeEventListener("scroll", calc, true);
        };
    }, [open]);

    return (
        <span className="relative inline-flex">
            <button
                ref={btnRef}
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen((v) => !v);
                }}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-[11px] font-black text-slate-600 hover:bg-slate-50"
                aria-label={`${title} 도움말`}
            >
                ?
            </button>

            {open && (
                <span className="fixed inset-0 z-40" onMouseDown={() => setOpen(false)} />
            )}

            {open && (
                <div
                    className="fixed z-50 w-[300px] rounded-2xl border bg-white p-3 shadow-xl"
                    style={{
                        left: leftPx,
                        top: (btnRef.current?.getBoundingClientRect().bottom ?? 0) + 8,
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="text-sm font-black">{title}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-600 leading-relaxed">
                        {children}
                    </div>
                </div>
            )}
        </span>
    );
}

function Segmented({
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

function Item({
    label,
    value,
    tipTitle,
    tip,
}: {
    label: string;
    value: number;
    tipTitle?: string;
    tip?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 sm:px-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-700">
                {label}
                {tip && tipTitle && <Tip title={tipTitle}>{tip}</Tip>}
            </div>
            <div className="text-sm font-black text-slate-900">
                <KRW n={value} />
            </div>
        </div>
    );
}

export default function PayCalculator() {
    // ✅ 월급(원) 입력
    const [monthlySalaryText, setMonthlySalaryText] = useState("3,000,000");
    const monthlySalary = Number(onlyDigits(monthlySalaryText) || "0");

    // ✅ 월 비과세(원)
    const [monthlyNonTaxText, setMonthlyNonTaxText] = useState("200,000");
    const monthlyNonTax = Number(onlyDigits(monthlyNonTaxText) || "0");

    // ✅ 공제
    const [dependents, setDependents] = useState(1);
    const [u20Children, setU20Children] = useState(0);

    // ✅ 만 60세 이상(국민연금 제외 처리 - 단순화)
    const [isOver60, setIsOver60] = useState(false);

    // ✅ 퇴직금 옵션(월급 → 연봉 환산에만 사용)


    const result = useMemo(() => {


        // 월 입력값을 연으로 환산해서 salary.logic에 맞춤
        const annualSalary = monthlySalary * 12;
        const annualNonTax = monthlyNonTax * 12;

        const annual = calculateSalary({
            annualSalary,
            annualNonTax,
            dependents,
            u20Children,
            severanceIncluded: false, // ← 고정
        });

        // 연 결과를 월 표시용으로 쪼갬
        const m = annual.months; // 12 or 13 (로직이 결정한 값)
        const toMonthly = (v: number) => Math.round(v / m);

        let monthlyGross = toMonthly(annual.annualGross);
        let monthlyTaxable = toMonthly(annual.annualTaxable);

        let pension = toMonthly(annual.annualPension);
        const health = toMonthly(annual.annualHealth);
        const care = toMonthly(annual.annualCare);
        const employment = toMonthly(annual.annualEmployment);

        const incomeTax = toMonthly(annual.annualIncomeTax);
        const localTax = toMonthly(annual.annualLocalTax);

        // ✅ 만 60세 이상이면 국민연금 0 (월 결과에서만 반영)
        if (isOver60) pension = 0;

        const totalDeduction = pension + health + care + employment + incomeTax + localTax;
        const monthlyNet = monthlyGross - totalDeduction;

        // UI가 쓰는 shape로 반환(월 단위)
        return {
            months: m,

            monthlyGross,
            monthlyTaxable,

            pension,
            health,
            care,
            employment,

            incomeTax,
            localTax,

            totalDeduction,
            monthlyNet,

            // (원하면 연값도 같이 남겨둘 수 있음)
            annual,
        };
    }, [
        monthlySalary,
        monthlyNonTax,
        dependents,
        u20Children,
        isOver60,
    ]);


    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            {/* 헤더 */}
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h2 className="text-2xl font-black tracking-tight">월급 계산기</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-600">
                        국세청 간이세액표(조견표) 기반으로 월 실수령을 계산합니다.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-extrabold text-slate-700">
                        기준: 2026
                    </span>
                </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                {/* 입력 */}
                <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-black text-slate-900">입력</div>
                    </div>

                    <div className="mt-4 grid gap-4">


                        {/* 만 60세 이상 */}
                        <div className="grid gap-2">
                            <div className="flex items-center text-sm font-extrabold text-slate-700">
                                만 60세 이상 근로자
                                <Tip title="만 60세 이상">
                                    간단 처리: 만 60세 이상이면 국민연금(근로자 부담)을 0으로 보고 계산합니다.
                                    (정밀 일치엔 회사/가입유형/상하한 등 추가 규칙이 필요)
                                </Tip>
                            </div>

                            <div className="w-full">
                                <Segmented
                                    value={isOver60 ? "right" : "left"}
                                    onChange={(v) => setIsOver60(v === "right")}
                                    left="아니오"
                                    right="예"
                                />
                            </div>
                        </div>

                        {/* 월급 */}
                        <label className="grid gap-1">
                            <div className="flex items-center text-sm font-extrabold text-slate-700">
                                월급(원)
                            </div>

                            <input
                                inputMode="numeric"
                                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200"
                                value={monthlySalaryText}
                                onChange={(e) => setMonthlySalaryText(onlyDigits(e.target.value))}
                                onBlur={() => {
                                    const n = Number(onlyDigits(monthlySalaryText) || "0");
                                    setMonthlySalaryText(n ? formatWon(n) : "");
                                }}
                                placeholder="예: 3,000,000"
                            />

                            <div className="ml-[18px] text-xs font-semibold text-slate-500">
                                {formatManCheon(monthlySalary)}
                            </div>
                        </label>

                        {/* 비과세 */}
                        <label className="grid gap-1">
                            <div className="flex items-center text-sm font-extrabold text-slate-700">
                                월 비과세 합계(원)
                                <Tip title="비과세">
                                    식대/보육수당 등 비과세 합계. 비과세는 월급여(비과세 제외)에서 빠지며,
                                    간이세액표 조회에도 영향을 줍니다.
                                </Tip>
                            </div>

                            <input
                                inputMode="numeric"
                                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200"
                                value={monthlyNonTaxText}
                                onChange={(e) => setMonthlyNonTaxText(onlyDigits(e.target.value))}
                                onBlur={() => {
                                    const n = Number(onlyDigits(monthlyNonTaxText) || "0");
                                    setMonthlyNonTaxText(n ? formatWon(n) : "");
                                }}
                                placeholder="예: 200,000"
                            />

                            <div className="ml-[18px] text-xs font-semibold text-slate-500">
                                {formatManCheon(monthlyNonTax)}
                            </div>
                        </label>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="min-w-0">
                                <div className="mb-1 flex items-center gap-2 text-sm font-extrabold text-slate-700">
                                    공제대상가족(본인 포함)
                                    <Tip title="공제대상가족">간이세액표(조견표) 조회에 사용됩니다.</Tip>
                                </div>
                                <input
                                    inputMode="numeric"
                                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200"
                                    value={dependents}
                                    onChange={(e) => setDependents(Number(e.target.value))}
                                />
                            </div>

                            <div className="min-w-0">
                                <div className="mb-1 flex items-center gap-2 text-sm font-extrabold text-slate-700">
                                    8~20세 자녀 수
                                    <Tip title="자녀(8~20세)">
                                        2024.03.01 시행 규칙에 따라, 자녀 수에 해당하는 금액을 표 세액에서 차감합니다.
                                    </Tip>
                                </div>
                                <input
                                    inputMode="numeric"
                                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200"
                                    value={u20Children}
                                    onChange={(e) => setU20Children(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-600 leading-relaxed">
                            실제 급여명세서와는 회사별 기준(기준소득월액/절사 규칙 등)에 따라 차이가 날 수 있습니다.
                        </div>
                    </div>
                </div>

                {/* 결과 */}
                <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
                    <div className="text-sm font-black text-slate-900">결과(월)</div>

                    <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-900 p-5 text-white shadow-sm sm:p-6">
                        <div className="text-sm font-extrabold text-white/80">예상 실수령액</div>
                        <div className="mt-1 text-[28px] leading-tight font-black tracking-tight sm:text-3xl">
                            <KRW n={result.monthlyNet} />
                        </div>
                        <div className="mt-2 text-xs font-semibold text-white/70">
                            총 공제 <KRW n={result.totalDeduction} /> / 세전 <KRW n={result.monthlyGross} />
                        </div>
                        <div className="mt-2 text-xs font-semibold text-white/60">
                            (만 60세 이상 {isOver60 ? "예" : "아니오"})
                        </div>

                    </div>

                    <div className="mt-5 grid gap-2">
                        <Item label="월급여(비과세 제외)" value={result.monthlyTaxable} />

                        <Item
                            label="국민연금 4.75%"
                            value={result.pension}
                            tipTitle="국민연금"
                            tip={
                                <>
                                    2026년 기준 근로자 부담률은 <b>4.75%</b>입니다.
                                    <br />
                                    기준소득월액 <b>상·하한</b>을 적용해 계산합니다.
                                </>
                            }
                        />

                        <Item label="건강보험 3.595%" value={result.health} />
                        <Item label="장기요양 13.14%" value={result.care} />
                        <Item label="고용보험 0.9%" value={result.employment} />

                        <div className="my-2 h-px bg-slate-100" />

                        <Item label="소득세 (간이세액표)" value={result.incomeTax} />
                        <Item label="지방소득세 (소득세의 10%)" value={result.localTax} />
                    </div>

                </div>
            </div>
        </div>
    );
}
