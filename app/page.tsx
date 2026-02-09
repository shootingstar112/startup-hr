// app/page.tsx
import Link from "next/link";

const cards = [
  {
    title: "연봉",
    items: [
      { label: "연봉 계산기", href: "/salary?tab=calc" },
      { label: "2026 연봉 실수령액표", href: "/salary?tab=table" },
    ],
  },
  {
    title: "월급",
    items: [
      { label: "월급 계산기", href: "/pay?tab=calc" },
      { label: "2026 월급 실수령액표", href: "/pay?tab=table" },
    ],
  },
  {
    title: "시급",
    items: [
      { label: "시급 계산기", href: "/hourly?tab=calc" },
      { label: "2026 최저임금 계산기", href: "/hourly?tab=minwage" },
    ],
  },
  {
    title: "육아/출산",
    items: [
      { label: "출산휴가급여 계산기", href: "/parental?tab=maternity" },
      { label: "육아휴직급여 계산기", href: "/parental?tab=parental" },
    ],
  },
  {
    title: "퇴사",
    items: [
      { label: "퇴직금 계산기", href: "/resignation?tab=severance" },
      { label: "휴업수당 계산기", href: "/resignation?tab=shutdown" },
      { label: "해고예고수당 계산기", href: "/resignation?tab=dismissal" },
    ],
  },
  {
    title: "휴가/휴직",
    items: [
      { label: "연차 계산기", href: "/time-off?tab=annual" },
      { label: "연차수당 계산기", href: "/time-off?tab=annualpay" },
      { label: "주휴수당 계산기", href: "/time-off?tab=weekly" },
    ],
  },
];

export default function Home() {
  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "56px 20px" }}>
      <h1 style={{ fontSize: 44, fontWeight: 900, textAlign: "center" }}>
        스타트업-HR
      </h1>

      <div
        style={{
          marginTop: 36,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 18,
        }}
      >
        {cards.map((c) => (
          <section
            key={c.title}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 18,
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
                cursor: "default",
                userSelect: "none",
              }}
            >
              {c.title}
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {c.items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  style={{
                    display: "block",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: "10px 12px",
                    textAlign: "center",
                    fontWeight: 700,
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  {it.label}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>


            {/* ✅ 배너 */}
      <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
        <a
          href="https://cafe.naver.com/startuphr"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            width: 940,
            maxWidth: "100%",
            textDecoration: "none",
          }}
        >
          <img
            src="https://res.cloudinary.com/dy7hzszme/image/upload/v1770620095/wvjat0dxpgbiwlg3oif3.jpg"
            alt="스타트업-HR 네이버카페 배너"
            style={{
              width: "100%",
              height: "auto",
              borderRadius: 14,
              border: "1px solid #e5e7eb",
              display: "block",
            }}
            loading="lazy"
          />
        </a>
      </div>

            <div style={{ marginTop: 28, textAlign: "center", color: "#64748b", fontWeight: 700 }}>
        기준년도: 2026 (최신 기준만 제공)
      </div>
    </main>
  );
}
