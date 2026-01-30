// app/hourly/page.tsx
import SectionTabs from "../components/SectionTabs";
import HourlyCalculator from "./HourlyCalculator";

function HourlyCalc() {
  return <HourlyCalculator />;
}

function MinWage2026() {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">2026 최저임금 계산기</h2>
      <p className="mt-2 text-slate-600 font-semibold">여기에 내용 넣기</p>
    </div>
  );
}

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-black">시급</h1>

      <div className="mt-6">
        <SectionTabs
          defaultTab="calc"
          tabs={[
            { key: "calc", label: "시급 계산기", content: <HourlyCalc /> },
            { key: "minwage", label: "2026 최저임금 계산기", content: <MinWage2026 /> },
          ]}
        />
      </div>
    </main>
  );
}
