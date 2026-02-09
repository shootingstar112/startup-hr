import { Suspense } from "react";
import SectionTabs from "../components/SectionTabs";
import ParentalLeaveCalculator from "./ParentalLeaveCalculator";
import MaternityLeaveCalculator from "./MaternityLeaveCalculator";

function Maternity() {
  return <MaternityLeaveCalculator />;
}

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-1 sm:px-4 py-10">
      <h1 className="text-3xl font-black">육아/출산</h1>

      <div className="mt-6">
        <Suspense fallback={null}>
          <SectionTabs
            defaultTab="maternity"
            tabs={[
              { key: "maternity", label: "출산휴가급여 계산기", content: <Maternity /> },
              { key: "parental", label: "육아휴직급여 계산기", content: <ParentalLeaveCalculator /> },
            ]}
          />
        </Suspense>
      </div>
    </main>
  );
}
