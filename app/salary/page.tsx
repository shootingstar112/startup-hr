import SectionTabs from "../components/SectionTabs";
import SalaryCalculator from "./SalaryCalculator";

function SalaryTable2026() {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">2026 연봉 실수령액표</h2>
      <p className="mt-2 text-slate-600 font-semibold">
        여기에 표/다운로드 넣기 (추후 업데이트)
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-3 py-6 sm:px-4 sm:py-10">

      <h1 className="text-3xl font-black">연봉</h1>

      <div className="mt-6">
        <SectionTabs
          defaultTab="calc"
          tabs={[
            { key: "calc", label: "연봉 계산기", content: <SalaryCalculator /> },
            { key: "table", label: "2026 연봉 실수령액표", content: <SalaryTable2026 /> },
          ]}
        />
      </div>
    </main>
  );
}
