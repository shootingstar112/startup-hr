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
      { label: "실업급여 계산기", href: "/resignation?tab=unemployment" },
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

export default function TopNav({ year = 2026 }: { year?: number }) {
  const pathname = usePathname();

  const activeMenuKey = useMemo(() => {
    const found = MENUS.find((m) => isActivePath(pathname, m.href));
    return found?.key ?? null;
  }, [pathname]);

  // ✅ PC 드롭다운용(openKey) / ✅ 모바일 햄버거 메뉴 열림(mobileOpen) / ✅ 모바일 아코디언 열림(mobileAccordionKey)
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileAccordionKey, setMobileAccordionKey] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);

  // ✅ 모바일 판정: 화면이 md 미만이면 모바일 메뉴(햄버거) 사용
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)"); // tailwind md 직전
    const apply = () => setIsMobile(!!mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // ✅ 모바일/PC 전환 시 상태 정리
  useEffect(() => {
    if (isMobile) {
      setOpenKey(null); // PC hover 드롭다운 끄기
    } else {
      setMobileOpen(false);
      setMobileAccordionKey(null);
    }
  }, [isMobile]);

  // ✅ 바깥 클릭 닫기 (모바일 패널/PC 드롭다운 둘 다 포함)
  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (!rootRef.current) return;
      if (!rootRef.current.contains(t)) {
        setOpenKey(null);
        setMobileOpen(false);
        setMobileAccordionKey(null);
      }
    };
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("touchstart", onDown, true);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("touchstart", onDown, true);
    };
  }, []);

  const closeAll = () => {
    setOpenKey(null);
    setMobileOpen(false);
    setMobileAccordionKey(null);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      <div ref={rootRef} className="mx-auto max-w-6xl px-4">
        {/* 1줄 */}
        <div className="flex items-center py-4">
          <Link href="/" className="flex items-center gap-3" onClick={closeAll}>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-white font-black">
              HR
            </div>
            <div className="text-lg font-black whitespace-nowrap">스타트업-HR</div>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold whitespace-nowrap">
              기준년도 {year}
            </span>

            {/* ✅ 모바일 햄버거 버튼 */}
            <button
              type="button"
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200"
              aria-label="메뉴"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              <span className="text-2xl leading-none">☰</span>
            </button>
          </div>
        </div>

        {/* =======================
            PC 메뉴 (md 이상)
           ======================= */}
        <nav className="relative hidden md:block">
          <ul className="flex justify-center gap-10 py-3">
            {MENUS.map((m) => {
              const isOpen = openKey === m.key;
              const isActive = activeMenuKey === m.key;

              // open(파랑) > active(검정) > default
              const textClass = isOpen
                ? "text-blue-700"
                : isActive
                ? "text-slate-900"
                : "text-slate-900 hover:text-blue-700";

              const underlineClass = isOpen
                ? "bg-blue-700"
                : isActive
                ? "bg-slate-900"
                : "bg-transparent";

              return (
                <li
                  key={m.key}
                  className="relative"
                  onMouseEnter={() => setOpenKey(m.key)}
                  onMouseLeave={() => setOpenKey(null)}
                >
                  <button
                    type="button"
                    className={[
                      "relative px-3 py-2",
                      "text-[18px] lg:text-[19px]",
                      "font-extrabold whitespace-nowrap transition",
                      textClass,
                    ].join(" ")}
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                  >
                    {m.label}
                    <span
                      className={[
                        "absolute left-0 -bottom-1 h-[3px] w-full transition",
                        underlineClass,
                      ].join(" ")}
                    />
                  </button>

                  {isOpen && (
                    <div
                      className="
                        absolute top-full mt-1 left-1/2 -translate-x-1/2
                        w-64 rounded-xl bg-white shadow-xl py-2 z-50
                      "
                      role="menu"
                      onMouseEnter={() => setOpenKey(m.key)}
                    >
                      {m.children.map((c) => (
                        <Link
                          key={c.href}
                          href={c.href}
                          onClick={closeAll}
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

        {/* =======================
            모바일 메뉴 (md 미만)
            - 햄버거 눌렀을 때만 펼침
            - 상위 메뉴는 아코디언
           ======================= */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-slate-100 pb-3">
            <ul className="py-2">
              {MENUS.map((m) => {
                const isOpen = mobileAccordionKey === m.key;
                const isActive = activeMenuKey === m.key;

                return (
                  <li key={m.key} className="px-1">
                    <button
                      type="button"
                      onClick={() =>
                        setMobileAccordionKey((prev) => (prev === m.key ? null : m.key))
                      }
                      className={[
                        "w-full flex items-center justify-between",
                        "px-3 py-3 rounded-lg",
                        "font-extrabold",
                        isOpen ? "text-blue-700 bg-blue-50" : "text-slate-900",
                      ].join(" ")}
                      aria-expanded={isOpen}
                    >
                      <span className="text-[16px]">{m.label}</span>
                      <span className="text-lg leading-none">{isOpen ? "−" : "+"}</span>
                    </button>

                    {isOpen && (
                      <div className="mt-1 mb-2 rounded-lg bg-white">
                        {m.children.map((c) => (
                          <Link
                            key={c.href}
                            href={c.href}
                            onClick={closeAll}
                            className="block px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50"
                          >
                            {c.label}
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* 현재 페이지 표시(원하면) */}
                    {!isOpen && isActive && (
                      <div className="px-3 -mt-1 pb-2">
                        <div className="h-[3px] w-16 bg-slate-900 rounded-full" />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}
