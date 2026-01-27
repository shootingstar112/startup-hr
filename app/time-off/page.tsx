import SectionTabs from "../components/SectionTabs";

function AnnualLeave() {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">연차 계산기</h2>
      <p className="mt-2 text-slate-600 font-semibold">여기에 입력폼/계산 로직 넣기</p>
    </div>
  );
}

function AnnualLeavePay() {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">연차수당 계산기</h2>
      <p className="mt-2 text-slate-600 font-semibold">여기에 입력폼/계산 로직 넣기</p>
    </div>
  );
}

function WeeklyHolidayPay() {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">주휴수당 계산기</h2>
      <p className="mt-2 text-slate-600 font-semibold">여기에 입력폼/계산 로직 넣기</p>
    </div>
  );
}

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-black">휴가/휴직</h1>

      <div className="mt-6">
        <SectionTabs
          defaultTab="annual"
          tabs={[
            { key: "annual", label: "연차 계산기", content: <AnnualLeave /> },
            { key: "annualpay", label: "연차수당 계산기", content: <AnnualLeavePay /> },
            { key: "weekly", label: "주휴수당 계산기", content: <WeeklyHolidayPay /> },
          ]}
        />
      </div>
    </main>
  );
}
