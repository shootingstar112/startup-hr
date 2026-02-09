"use client";

import { Suspense } from "react";
import SectionTabs from "../components/SectionTabs";
import AnnualLeaveCalculator from "./AnnualLeaveCalculator";
import AnnualLeavePayCalculator from "./AnnualLeavePayCalculator";
import WeeklyHolidayPayCalculator from "./WeeklyHolidayPayCalculator";

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-2 py-10">
      <h1 className="text-3xl font-black">휴가/휴직</h1>

      <div className="mt-6">
        <Suspense fallback={null}>
          <SectionTabs
            defaultTab="annual"
            tabs={[
              { key: "annual", label: "연차 계산기", content: <AnnualLeaveCalculator /> },
              { key: "annualpay", label: "연차수당 계산기", content: <AnnualLeavePayCalculator /> },
              { key: "weekly", label: "주휴수당 계산기", content: <WeeklyHolidayPayCalculator /> },
            ]}
          />
        </Suspense>
      </div>
    </main>
  );
}
