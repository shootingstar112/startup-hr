import SectionTabs from "../components/SectionTabs";

function Severance() {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">퇴직금 계산기</h2>
      <p className="mt-2 text-slate-600 font-semibold">여기에 입력폼/계산 로직 넣기</p>
    </div>
  );
}

function ShutdownPay() {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">휴업수당 계산기</h2>
      <p className="mt-2 text-slate-600 font-semibold">여기에 입력폼/계산 로직 넣기</p>
    </div>
  );
}

function DismissalPay() {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">해고예고수당 계산기</h2>
      <p className="mt-2 text-slate-600 font-semibold">여기에 입력폼/계산 로직 넣기</p>
    </div>
  );
}

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-black">퇴사</h1>

      <div className="mt-6">
        <SectionTabs
          defaultTab="severance"
          tabs={[
            { key: "severance", label: "퇴직금 계산기", content: <Severance /> },
            { key: "shutdown", label: "휴업수당 계산기", content: <ShutdownPay /> },
            { key: "dismissal", label: "해고예고수당 계산기", content: <DismissalPay /> },
          ]}
        />
      </div>
    </main>
  );
}
