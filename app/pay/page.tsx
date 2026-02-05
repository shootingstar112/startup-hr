import SectionTabs from "../components/SectionTabs";
import PayCalculator from "./PayCalculator";
import SalaryTableMonthly2026 from "./SalaryTableMonthly2026";

function PayTable2026() {
  return <SalaryTableMonthly2026 />;
}

export default function Page() {
  return (
    <main className="mx-auto px-3 py-6 sm:px-4 sm:py-10">
      <h1 className="text-3xl font-black">월급</h1>

      <div className="mt-6">
        <SectionTabs
          defaultTab="calc"
          tabs={[
            { key: "calc", label: "월급 계산기", content: <PayCalculator /> },
            {
              key: "table",
              label: "2026 월급 실수령액표",
              content: <PayTable2026 />,
            },
          ]}
        />
      </div>
    </main>
  );
}
