import SectionTabs from "../components/SectionTabs";

function PayCalc() {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">월급 계산기</h2>
      <p className="mt-2 text-slate-600 font-semibold">여기에 입력폼/계산 로직 넣기</p>
    </div>
  );
}

function PayTable2026() {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">2026 월급 실수령액표</h2>
      <p className="mt-2 text-slate-600 font-semibold">여기에 표/다운로드 넣기</p>
    </div>
  );
}

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-black">월급</h1>

      <div className="mt-6">
        <SectionTabs
          defaultTab="calc"
          tabs={[
            { key: "calc", label: "월급 계산기", content: <PayCalc /> },
            { key: "table", label: "2026 월급 실수령액표", content: <PayTable2026 /> },
          ]}
        />
      </div>
    </main>
  );
}
