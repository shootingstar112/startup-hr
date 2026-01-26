"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

type Menu = {
  key: string;
  label: string;
  href: string;
  children: { label: string; href: string }[];
};

const MENUS: Menu[] = [
  {
    key: "salary",
    label: "연봉",
    href: "/salary",
    children: [
      { label: "연봉 계산기", href: "/salary?tab=calc" },
      { label: "2026 연봉 실수령액표", href: "/salary?tab=table" },
    ],
  },
  {
    key: "pay",
    label: "월급",
    href: "/pay",
    children: [
      { label: "월급 계산기", href: "/pay?tab=calc" },
      { label: "2026 월급 실수령액표", href: "/pay?tab=table" },
    ],
  },
  {
    key: "hourly",
    label: "시급",
    href: "/hourly",
    children: [
      { label: "시급 계산기", href: "/hourly?tab=calc" },
      { label: "2026 최저임금 계산기", href: "/hourly?tab=minwage" },
    ],
  },
  {
    key: "parental",
    label: "육아/출산",
    href: "/parental",
    children: [
      { label: "출산휴가급여 계산기", href: "/parental?tab=maternity" },
      { label: "육아휴직급여 계산기", href: "/parental?tab=parental" },
    ],
  },
  {
    key: "resignation",
    label: "퇴사",
    href: "/resignation",
    children: [
      { label: "퇴직금 계산기", href: "/resignation?tab=severance" },
      { label: "휴업수당 계산기", href: "/resignation?tab=shutdown" },
      { label: "해고예고수당 계산기", href: "/resignation?tab=dismissal" },
    ],
  },
  {
    key: "timeoff",
    label: "휴가/휴직",
    href: "/time-off",
    children: [
      { label: "연차 계산기", href: "/time-off?tab=annual" },
      { label: "연차수당 계산기", href: "/time-off?tab=annualpay" },
      { label: "주휴수당 계산기", href: "/time-off?tab=weekly" },
    ],
  },
];

function isActivePath(pathname: string, menuHref: string) {
  if (menuHref === "/") return pathname === "/";
  return pathname === menuHref || pathname.startsWith(menuHref + "/");
}

// ...위 MENUS 동일

export default function TopNav({ year = 2026 }: { year?: number }) {
  const pathname = usePathname();

  const activeMenuKey = useMemo(() => {
    const found = MENUS.find((m) => isActivePath(pathname, m.href));
    return found?.key ?? null;
  }, [pathname]);

  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-white font-black">
              HR
            </div>
            <div className="text-lg font-black tracking-tight">스타트업-HR</div>
          </Link>

          <nav className="relative ml-4" onMouseLeave={() => setOpenKey(null)}>
            <ul className="flex items-center gap-8">
              {MENUS.map((m) => {
                const active = activeMenuKey === m.key; // ✅ 현재 페이지 강조만
                return (
                  <li key={m.key} className="relative">
                    <Link
                      href={m.href}
                      onMouseEnter={() => setOpenKey(m.key)}
                      onFocus={() => setOpenKey(m.key)}
                      className={[
                        "inline-flex items-center text-base font-extrabold",
                        active ? "text-blue-700" : "text-slate-900 hover:text-blue-700",
                      ].join(" ")}
                    >
                      {m.label}
                    </Link>

                    {/* ✅ hover(openKey)일 때만 드롭다운 */}
                    {openKey === m.key && (
                      <div
                        className="absolute left-0 top-full mt-3 w-56 overflow-hidden rounded-md border bg-white shadow-lg"
                        onMouseEnter={() => setOpenKey(m.key)}
                      >
                        {m.children.map((c) => (
                          <Link
                            key={c.href}
                            href={c.href}
                            className="block px-4 py-3 text-sm font-bold text-slate-900 hover:bg-blue-600 hover:text-white"
                          >
                            {c.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto text-sm font-extrabold text-slate-700">
            기준년도: <span className="text-slate-900">{year}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
