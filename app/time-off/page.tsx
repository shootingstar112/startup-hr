"use client";

import SectionTabs from "../components/SectionTabs";
import AnnualLeaveCalculator from "./AnnualLeaveCalculator";

function AnnualLeavePay() {
  return <div className="rounded-2xl border bg-white p-6">연차수당 계산기 (TODO)</div>;
}

function WeeklyHolidayPay() {
  return <div className="rounded-2xl border bg-white p-6">주휴수당 계산기 (TODO)</div>;
}

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-2 py-10">
      <h1 className="text-3xl font-black">휴가/휴직</h1>

      <div className="mt-6">
        <SectionTabs
          defaultTab="annual"
          tabs={[
            { key: "annual", label: "연차 계산기", content: <AnnualLeaveCalculator /> },
            { key: "annualpay", label: "연차수당 계산기", content: <AnnualLeavePay /> },
            { key: "weekly", label: "주휴수당 계산기", content: <WeeklyHolidayPay /> },
          ]}
        />
      </div>
    </main>
  );
}
