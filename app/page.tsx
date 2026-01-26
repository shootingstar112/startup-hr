// app/page.tsx
import Link from "next/link";

const cards = [
{ title: "연봉", items: ["연봉 계산기", "2026 연봉 실수령액표"], href: "/salary" },
{ title: "월급", items: ["월급 계산기", "2026 월급 실수령액표"], href: "/pay" },
{ title: "시급", items: ["시급 계산기", "2026 최저임금 계산기"], href: "/hourly" },
{ title: "육아/출산", items: ["출산휴가급여 계산기", "육아휴직급여 계산기"], href: "/parental" },
{ title: "퇴사", items: ["퇴직금 계산기", "휴업수당 계산기", "해고예고수당 계산기"], href: "/resignation" },
{ title: "휴가/휴직", items: ["연차 계산기", "연차수당 계산기", "주휴수당 계산기"], href: "/time-off" },
];

export default function Home() {
  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "56px 20px" }}>
      <h1 style={{ fontSize: 44, fontWeight: 900, textAlign: "center" }}>스타트업-HR</h1>

      <div
        style={{
          marginTop: 36,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 18,
        }}
      >
        {cards.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 18,
              textDecoration: "none",
              color: "inherit",
              background: "white",
            }}
          >
            <div
              style={{
                fontWeight: 900,
                textAlign: "center",
                padding: "10px 12px",
                borderRadius: 10,
                background: "#334155",
                color: "white",
                marginBottom: 12,
              }}
            >
              {c.title}
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {c.items.map((t) => (
                <div
                  key={t}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: "10px 12px",
                    textAlign: "center",
                    fontWeight: 700,
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
          </Link>
        ))}
      </div>

      <div style={{ marginTop: 28, textAlign: "center", color: "#64748b", fontWeight: 700 }}>
        기준년도: 2026 (최신 기준만 제공)
      </div>
    </main>
  );
}
