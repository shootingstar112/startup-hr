"use client";

import { useMemo, useState } from "react";
import {
    calculateParentalLeave,
    type ParentalInput,
    type ParentalMode,
    addYm,
} from "./parentalLeave.logic";

/** ===== 표시 유틸(만원 단위) ===== */
function toMan(n: number) {
    return Math.floor((Number.isFinite(n) ? n : 0) / 10_000);
}
function formatMan(n: number) {
    return String(toMan(n));
}
function fmtYYMM(ym: string) {
    const [y, m] = ym.split("-");
    if (!y || !m) return ym;
    return `${y.slice(2)}.${m}`;
}

/** ===== 입력 유틸 ===== */
function stripNumberLike(v: string) {
    const s = (v ?? "").toString().replace(/[^\d]/g, "");
    if (!s) return 0;
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
}
function formatWon(n: number) {
    const x = Math.floor(Number.isFinite(n) ? n : 0);
    return x.toLocaleString("ko-KR") + "원";
}
function formatInputWonText(v: string) {
    const n = stripNumberLike(v);
    return n === 0 ? "" : n.toLocaleString("ko-KR");
}
function toManWonText(n: number) {
    const v = Math.floor(n / 10_000);
    return v <= 0 ? "0만원" : `${v.toLocaleString("ko-KR")}만원`;
}
function ymNow() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** ===== YYYY-MM 비교/연산 유틸(하이라이트용) ===== */
function ymToIndex(ym: string) {
    const [Y, M] = ym.split("-").map((x) => Number(x));
    if (!Number.isFinite(Y) || !Number.isFinite(M)) return NaN;
    return Y * 12 + (M - 1);
}
function ymGte(a: string, b: string) {
    return ymToIndex(a) >= ymToIndex(b);
}

/** ===== 6+6 결과를 월 단위로 A/B 합치기 ===== */
type ABRow = {
    ym: string;
    A: number;
    B: number;
    aRetro: number;
    bRetro: number;
    hasA: boolean;
    hasB: boolean;
};

function buildABTableRows(
    rows: { ym: string; who?: "A" | "B"; amount: number; retroTopUp: number }[]
) {
    const map = new Map<string, ABRow>();

    for (const r of rows) {
        const cur =
            map.get(r.ym) ??
            { ym: r.ym, A: 0, B: 0, aRetro: 0, bRetro: 0, hasA: false, hasB: false };

        if (r.who === "A") {
            cur.A += r.amount;
            cur.aRetro += r.retroTopUp;
            cur.hasA = true;
        } else if (r.who === "B") {
            cur.B += r.amount;
            cur.bRetro += r.retroTopUp;
            cur.hasB = true;
        }

        map.set(r.ym, cur);
    }

    return Array.from(map.values()).sort((x, y) =>
        x.ym < y.ym ? -1 : x.ym > y.ym ? 1 : 0
    );
}

export default function ParentalLeaveCalculator() {
    const [mode, setMode] = useState<ParentalMode>("normal");

    // normal/single
    const [months, setMonths] = useState(12);
    const [wageText, setWageText] = useState("5000000");

    // 6+6
    const [aStart, setAStart] = useState(ymNow());
    const [aMonths, setAMonths] = useState(6);
    const [aWageText, setAWageText] = useState("5000000");

    const [bStart, setBStart] = useState(addYm(ymNow(), 6));
    const [bMonths, setBMonths] = useState(6);
    const [bWageText, setBWageText] = useState("5000000");

    const input: ParentalInput = useMemo(() => {
        if (mode === "six_plus_six") {
            return {
                mode,
                A: {
                    label: "A",
                    startYm: aStart,
                    months: aMonths,
                    monthlyWage: stripNumberLike(aWageText),
                },
                B: {
                    label: "B",
                    startYm: bStart,
                    months: bMonths,
                    monthlyWage: stripNumberLike(bWageText),
                },
            };
        }

        return {
            mode,
            months,
            monthlyWage: stripNumberLike(wageText),
        };
    }, [
        mode,
        months,
        wageText,
        aStart,
        aMonths,
        aWageText,
        bStart,
        bMonths,
        bWageText,
    ]);

    const out = useMemo(() => calculateParentalLeave(input), [input]);
    const abRows = useMemo(
        () => (mode === "six_plus_six" ? buildABTableRows(out.rows) : []),
        [mode, out.rows]
    );

    /** ===== 6+6 하이라이트 계산 =====
     * - 특례 적용 개월수: min(6, A.months, B.months)
     * - later(늦게 시작한 사람) 기준으로 1..m개월에만 적용
     * - 1~2개월: 연한톤
     * - 3~m개월: 진한톤 (정산 구간)
     */
    const sixUi = useMemo(() => {
        if (mode !== "six_plus_six") {
            return { laterWho: null as null | "A" | "B", rangeLight: new Set<string>(), rangeStrong: new Set<string>() };
        }

        const m = Math.min(6, Math.max(1, Math.min(18, aMonths)), Math.max(1, Math.min(18, bMonths)));
        const laterWho: "A" | "B" = ymGte(aStart, bStart) ? "A" : "B";
        const laterStart = laterWho === "A" ? aStart : bStart;

        const rangeLight = new Set<string>();
        const rangeStrong = new Set<string>();

        for (let i = 0; i < m; i++) {
            const ym = addYm(laterStart, i);
            const idx = i + 1;
            if (idx <= 2) rangeLight.add(ym);
            else rangeStrong.add(ym); // 3..m
        }

        return { laterWho, rangeLight, rangeStrong };
    }, [mode, aStart, bStart, aMonths, bMonths]);

    return (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">육아휴직급여 계산기</h2>
            <p className="mt-2 text-slate-600 font-semibold">
                6+6은 월별로 A/B를 한 줄에 같이 보여줘(단위: 만원).
            </p>

            {/* Mode */}
            <div className="mt-6 rounded-xl border p-4">
                <div className="text-sm font-black text-slate-800">모드</div>
                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setMode("normal")}
                        className={`rounded-full px-4 py-2 text-sm font-black border ${mode === "normal"
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-900"
                            }`}
                    >
                        일반
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode("single_parent")}
                        className={`rounded-full px-4 py-2 text-sm font-black border ${mode === "single_parent"
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-900"
                            }`}
                    >
                        한부모
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode("six_plus_six")}
                        className={`rounded-full px-4 py-2 text-sm font-black border ${mode === "six_plus_six"
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-900"
                            }`}
                    >
                        6+6
                    </button>
                </div>

                <div className="mt-3 text-xs font-semibold text-slate-600">
                    상한/하한/지급률 설명은 아래에 따로 정리할 예정(일단 결과 UI부터).
                </div>
            </div>

            {/* Inputs + Result */}
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                {/* Inputs */}
                <div className="space-y-5">
                    {mode !== "six_plus_six" ? (
                        <>
                            <div className="rounded-xl border p-4">
                                <div className="text-sm font-black text-slate-800">사용 개월 수</div>
                                <div className="mt-3 flex items-center gap-3">
                                    <input
                                        type="number"
                                        min={1}
                                        max={18}
                                        value={months}
                                        onChange={(e) =>
                                            setMonths(
                                                Math.max(1, Math.min(18, Number(e.target.value || 1)))
                                            )
                                        }
                                        className="w-28 rounded-xl border px-3 py-2 font-black outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                    <div className="text-sm font-semibold text-slate-600">범위: 1~18</div>
                                </div>
                            </div>

                            <div className="rounded-xl border p-4">
                                <div className="text-sm font-black text-slate-800">월 통상임금(원)</div>
                                <input
                                    inputMode="numeric"
                                    value={formatInputWonText(wageText)}
                                    onChange={(e) => setWageText(e.target.value)}
                                    placeholder="예: 5,000,000"
                                    className="mt-2 w-full rounded-xl border px-3 py-2 font-black outline-none focus:ring-2 focus:ring-slate-200"
                                />
                                <div className="mt-2 text-xs font-semibold text-slate-600">
                                    표시:{" "}
                                    <span className="font-black text-slate-900">
                                        {toManWonText(stripNumberLike(wageText))}
                                    </span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="rounded-xl border p-4">
                                <div className="text-sm font-black text-slate-800">첫 번째 육아휴직자(A)</div>
                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                    <label className="block">
                                        <div className="text-xs font-bold text-slate-600">시작월</div>
                                        <input
                                            type="month"
                                            value={aStart}
                                            onChange={(e) => setAStart(e.target.value)}
                                            className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                                        />
                                    </label>
                                    <label className="block">
                                        <div className="text-xs font-bold text-slate-600">사용개월</div>
                                        <input
                                            type="number"
                                            min={1}
                                            max={18}
                                            value={aMonths}
                                            onChange={(e) =>
                                                setAMonths(
                                                    Math.max(1, Math.min(18, Number(e.target.value || 1)))
                                                )
                                            }
                                            className="mt-1 w-full rounded-xl border px-3 py-2 font-black outline-none focus:ring-2 focus:ring-slate-200"
                                        />
                                    </label>
                                    <label className="block sm:col-span-3">
                                        <div className="text-xs font-bold text-slate-600">월 통상임금(원)</div>
                                        <input
                                            inputMode="numeric"
                                            value={formatInputWonText(aWageText)}
                                            onChange={(e) => setAWageText(e.target.value)}
                                            placeholder="예: 5,000,000"
                                            className="mt-1 w-full rounded-xl border px-3 py-2 font-black outline-none focus:ring-2 focus:ring-slate-200"
                                        />
                                        <div className="mt-1 text-[11px] font-semibold text-slate-600">
                                            표시:{" "}
                                            <span className="font-black text-slate-900">
                                                {toManWonText(stripNumberLike(aWageText))}
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="rounded-xl border p-4">
                                <div className="text-sm font-black text-slate-800">두 번째 육아휴직자(B)</div>
                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                    <label className="block">
                                        <div className="text-xs font-bold text-slate-600">시작월</div>
                                        <input
                                            type="month"
                                            value={bStart}
                                            onChange={(e) => setBStart(e.target.value)}
                                            className="mt-1 w-full rounded-xl border px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                                        />
                                    </label>
                                    <label className="block">
                                        <div className="text-xs font-bold text-slate-600">사용개월</div>
                                        <input
                                            type="number"
                                            min={1}
                                            max={18}
                                            value={bMonths}
                                            onChange={(e) =>
                                                setBMonths(
                                                    Math.max(1, Math.min(18, Number(e.target.value || 1)))
                                                )
                                            }
                                            className="mt-1 w-full rounded-xl border px-3 py-2 font-black outline-none focus:ring-2 focus:ring-slate-200"
                                        />
                                    </label>
                                    <label className="block sm:col-span-3">
                                        <div className="text-xs font-bold text-slate-600">월 통상임금(원)</div>
                                        <input
                                            inputMode="numeric"
                                            value={formatInputWonText(bWageText)}
                                            onChange={(e) => setBWageText(e.target.value)}
                                            placeholder="예: 5,000,000"
                                            className="mt-1 w-full rounded-xl border px-3 py-2 font-black outline-none focus:ring-2 focus:ring-slate-200"
                                        />
                                        <div className="mt-1 text-[11px] font-semibold text-slate-600">
                                            표시:{" "}
                                            <span className="font-black text-slate-900">
                                                {toManWonText(stripNumberLike(bWageText))}
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Result panel */}
                <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
                    <div className="text-sm font-extrabold text-white/80">총 수령액(추정)</div>

                    <div className="mt-2 text-4xl font-black tracking-tight">
                        {mode === "six_plus_six" ? `${formatMan(out.total)}만원` : formatWon(out.total)}
                    </div>

                    {mode === "six_plus_six" && (
                        <div className="mt-1 text-xs font-semibold text-white/70">표 단위: 만원</div>
                    )}

                    <div className="mt-2 text-xs font-semibold text-white/70">
                        * 실제 지급은 개인/사업장 요건에 따라 달라질 수 있음
                    </div>

                    {/* 6+6: 월별 A/B 한 줄(모바일/데스크탑 동일) */}
                    {mode === "six_plus_six" ? (
                        <div className="mt-6 overflow-hidden rounded-2xl bg-white">
                            <div className="grid grid-cols-3 items-center gap-2 bg-slate-50 px-4 py-3">
                                <div className="text-xs font-black text-slate-700">월</div>
                                <div className="text-right text-xs font-black text-slate-700">A</div>
                                <div className="text-right text-xs font-black text-slate-700">B</div>
                            </div>

                            <div className="divide-y">
                                {abRows.map((r) => {
                                    const isLight = sixUi.rangeLight.has(r.ym);
                                    const isStrong = sixUi.rangeStrong.has(r.ym);

                                    // ✅ 하이라이트는 "later 시작 기준 1..m개월"에만
                                    // 1~2: 연하게 / 3~m: 진하게
                                    const rowBg = isStrong
                                        ? "bg-amber-100" // 3~m (진한 살색)
                                        : isLight
                                            ? "bg-amber-50"  // 1~2 (연한 살색)
                                            : "bg-white";

                                    return (
                                        <div key={r.ym} className={`px-4 py-3 ${rowBg}`}>
                                            <div className="grid grid-cols-3 items-center gap-2">
                                                <div className="text-sm font-black text-slate-800">{fmtYYMM(r.ym)}</div>

                                                <div className="text-right">
                                                    <div className="text-sm font-black text-slate-900">
                                                        {r.hasA ? formatMan(r.A) : "-"}
                                                    </div>
                                                    {r.hasA && r.aRetro > 0 && (
                                                        <div className="text-[11px] font-bold text-red-600">
                                                            (+{formatMan(r.aRetro)} 정산)
                                                        </div>
                                                    )}


                                                </div>

                                                <div className="text-right">
                                                    <div className="text-sm font-black text-slate-900">
                                                        {r.hasB ? formatMan(r.B) : "-"}
                                                    </div>
                                                    {r.hasB && r.bRetro > 0 && (
                                                        <div className="text-[11px] font-bold text-red-600">
                                                            (+{formatMan(r.bRetro)} 정산)
                                                        </div>
                                                    )}

                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* 일반/한부모: 기존 유지 */}
                            <div className="mt-6 hidden overflow-hidden rounded-2xl bg-white lg:block">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50 text-xs font-black text-slate-700">
                                            <th className="px-4 py-3">월</th>
                                            <th className="px-4 py-3">지급액</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {out.rows.map((r, idx) => (
                                            <tr key={`${idx}`} className="text-sm font-semibold text-slate-800">
                                                <td className="px-4 py-3">{idx + 1}개월차</td>
                                                <td className="px-4 py-3 font-black">{formatWon(r.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6 space-y-2 lg:hidden">
                                {out.rows.map((r, idx) => (
                                    <div key={`${idx}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm font-black">{idx + 1}개월차</div>
                                            <div className="text-sm font-black">{formatWon(r.amount)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* 설명(하단) */}
            <div className="mt-6 rounded-xl border bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                <div className="font-black text-slate-900">참고</div>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                    <li>6+6은 월별로 A/B를 같은 행에 표시하고, 금액은 만원 단위로 간략 표시.</li>
                    <li>정산(소급)이 발생하는 달에는 (+정산)으로 표시.</li>
                    <li>통상임금이 낮아 상한에 안 걸리면 정산/증액은 0이 될 수 있음.</li>
                </ul>
            </div>
        </div>
    );
}
