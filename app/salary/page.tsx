import { Suspense } from "react";
import SectionTabs from "../components/SectionTabs";
import SalaryCalculator from "./SalaryCalculator";
import SalaryTable2026View from "./SalaryTable2026";

export default function Page() {
  return (
    <main className="mx-auto px-3 py-6 sm:px-4 sm:py-10">
      <h1 className="text-3xl font-black">연봉</h1>

      <div className="mt-6">
        <Suspense fallback={null}>
          <SectionTabs
            defaultTab="calc"
            tabs={[
              { key: "calc", label: "연봉 계산기", content: <SalaryCalculator /> },
              { key: "table", label: "2026 연봉 실수령액표", content: <SalaryTable2026View /> },
            ]}
          />
        </Suspense>
      </div>
    </main>
  );
}
