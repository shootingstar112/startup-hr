import SectionTabs from "../components/SectionTabs";
import ParentalLeaveCalculator from "./ParentalLeaveCalculator";

function Maternity() {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">출산휴가급여 계산기</h2>
      <p className="mt-2 text-slate-600 font-semibold">여기에 입력폼/계산 로직 넣기</p>
    </div>
  );
}

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-2 sm:px-4 py-10">
      <h1 className="text-3xl font-black">육아/출산</h1>

      <div className="mt-6">
        <SectionTabs
          defaultTab="maternity"
          tabs={[
            { key: "maternity", label: "출산휴가급여 계산기", content: <Maternity /> },
            { key: "parental", label: "육아휴직급여 계산기", content: <ParentalLeaveCalculator /> },
          ]}
        />
      </div>
    </main>
  );
}
