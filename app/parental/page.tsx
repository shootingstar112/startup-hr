import SectionTabs from "../components/SectionTabs";
import ParentalLeaveCalculator from "./ParentalLeaveCalculator";
import MaternityLeaveCalculator from "./MaternityLeaveCalculator"; // ✅ 같은 폴더

function Maternity() {
  return <MaternityLeaveCalculator />;
}

export default function Page() {
  return (
<<<<<<< HEAD
    <main className="mx-auto max-w-5xl px-1 sm:px-4 py-10
">
=======
    <main className="mx-auto max-w-5xl px-1 sm:px-4 py-10">
>>>>>>> e733a27 (awerawer)
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
