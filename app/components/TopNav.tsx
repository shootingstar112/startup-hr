"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function TopNav({ year = 2026 }: { year?: number }) {
  const pathname = usePathname();
  const activeMenuKey = useMemo(() => {
    const found = MENUS.find((m) => isActivePath(pathname, m.href));
    return found?.key ?? null;
  }, [pathname]);

  const [openKey, setOpenKey] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // 버튼 ref (모바일 위치 계산용)
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // 모바일 드롭다운 위치
  const [mobilePos, setMobilePos] = useState<{ top: number; left: number; width: number } | null>(
    null
  );

  // 바깥 클릭 닫기
  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpenKey(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, []);

  // ✅ 모바일에서 누른 버튼 바로 밑 + 화면 밖 clamp
  useEffect(() => {
    if (!openKey) {
      setMobilePos(null);
      return;
    }

    const calc = () => {
      const btn = btnRefs.current[openKey];
      if (!btn) return;

      const r = btn.getBoundingClientRect();
      const desiredWidth = 260; // ✅ 좌우 너무 넓지 않게
      const padding = 12;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const width = Math.min(desiredWidth, vw - padding * 2);
      let left = r.left + r.width / 2 - width / 2;
      left = clamp(left, padding, vw - padding - width);

      let top = r.bottom + 8;
      top = Math.min(top, vh - 80);

      setMobilePos({ top: Math.round(top), left: Math.round(left), width: Math.round(width) });
    };

    calc();
    window.addEventListener("resize", calc);
    window.addEventListener("scroll", calc, { passive: true });
    return () => {
      window.removeEventListener("resize", calc);
      window.removeEventListener("scroll", calc);
    };
  }, [openKey]);

  const close = () => setOpenKey(null);

  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      <div ref={rootRef} className="mx-auto max-w-6xl px-4">
        {/* 1줄 */}
        <div className="flex items-center py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-white font-black">
              HR
            </div>
            <div className="text-lg font-black whitespace-nowrap">스타트업-HR</div>
          </Link>

          <div className="ml-auto">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold whitespace-nowrap">
              기준년도 {year}
            </span>
          </div>
        </div>

        {/* 2줄 메뉴 */}
        <nav className="relative">
          <ul
            className="
              grid grid-cols-3 gap-x-4 gap-y-2 py-3
              md:flex md:justify-center md:gap-10
            "
          >
            {MENUS.map((m) => {
              const active = activeMenuKey === m.key;
              const isOpen = openKey === m.key;

              return (
                <li
                  key={m.key}
                  className="relative flex justify-center"
                  // ✅ PC hover: li 영역 안에서만 열림/유지됨
                  onMouseEnter={() => setOpenKey(m.key)}
                  onMouseLeave={() => setOpenKey(null)}
                >
                  <button
                    ref={(el) => {
                      btnRefs.current[m.key] = el;
                    }}
                    type="button"
                    onClick={() => setOpenKey((prev) => (prev === m.key ? null : m.key))}
                    className="
  relative px-3 py-2
  text-[18px] md:text-[18px] lg:text-[19px]
  font-extrabold
  whitespace-nowrap break-keep
  hover:text-blue-700 transition
"
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                  >
                    {m.label}
                    <span
                      className={[
                        "absolute left-0 -bottom-1 h-[3px] w-full transition",
                        active || isOpen ? "bg-slate-900" : "bg-transparent",
                      ].join(" ")}
                    />
                  </button>

                  {/* ✅ PC 드롭다운: 버튼 바로 밑, mt 최소(틈 거의 없음) */}
                  {isOpen && (
                    <div
                      className="
                        hidden md:block absolute top-full mt-1 left-1/2 -translate-x-1/2
                        w-64 rounded-xl bg-white shadow-xl py-2 z-50
                      "
                      role="menu"
                      onMouseEnter={() => setOpenKey(m.key)} // 드롭다운 위에서도 유지
                    >
                      {m.children.map((c) => (
                        <Link
                          key={c.href}
                          href={c.href}
                          onClick={close}
                          className="block px-5 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50"
                          role="menuitem"
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
      </div>

      {/* ✅ 모바일 드롭다운: 버튼 바로 밑 fixed + clamp */}
      {openKey && mobilePos && (
        <div
          className="md:hidden fixed z-[9999] rounded-xl bg-white shadow-xl py-2"
          style={{
            top: mobilePos.top,
            left: mobilePos.left,
            width: mobilePos.width,
            maxHeight: "60vh",
            overflowY: "auto",
          }}
          role="menu"
        >
          {MENUS.find((m) => m.key === openKey)?.children.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              onClick={close}
              className="block px-5 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50"
              role="menuitem"
            >
              {c.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
