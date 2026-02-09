import { Suspense } from "react";
import SectionTabs from "../components/SectionTabs";
import SeveranceCalculator from "./SeveranceCalculator";
import ShutdownPayCalculator from "./ShutdownPayCalculator";
import DismissalPayCalculator from "./DismissalPayCalculator";
import UnemploymentBenefitCalculator from "./UnemploymentBenefitCalculator"; // ✅ 추가

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-black">퇴사</h1>

      <div className="mt-6">
        <Suspense fallback={null}>
          <SectionTabs
            defaultTab="severance"
            tabs={[
              { key: "severance", label: "퇴직금 계산기", content: <SeveranceCalculator /> },
              { key: "shutdown", label: "휴업수당 계산기", content: <ShutdownPayCalculator /> },
              { key: "dismissal", label: "해고예고수당 계산기", content: <DismissalPayCalculator /> },
              { key: "unemployment", label: "실업급여 계산기", content: <UnemploymentBenefitCalculator /> }, // ✅ 추가
            ]}
          />
        </Suspense>
      </div>
    </main>
  );
}
