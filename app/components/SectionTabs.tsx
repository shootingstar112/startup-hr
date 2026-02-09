"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Tab = {
  key: string;
  label: string;
  content: ReactNode;
};

export default function SectionTabs({
  tabs,
  defaultTab,
  syncQuery = true,
}: {
  tabs: Tab[];
  defaultTab: string;
  syncQuery?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams(); // ✅ URL query 변화를 구독
  const [active, setActive] = useState(defaultTab);

  // ✅ URL의 tab이 바뀔 때마다 active 갱신
  useEffect(() => {
    if (!syncQuery) return;

    const q = searchParams.get("tab");
    if (q && tabs.some((t) => t.key === q)) setActive(q);
    else setActive(defaultTab);
  }, [syncQuery, defaultTab, tabs, searchParams]);

  const onClick = (key: string) => {
    setActive(key);
    if (!syncQuery) return;

    const url = new URL(window.location.href);
    url.searchParams.set("tab", key);
    router.replace(url.pathname + "?" + url.searchParams.toString(), { scroll: false });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const isOn = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onClick(t.key)}
              className={[
                "rounded-full px-4 py-2 text-sm font-extrabold border transition",
                isOn
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
              ].join(" ")}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {tabs.map((t) => (
          <section key={t.key} style={{ display: t.key === active ? "block" : "none" }}>
            {t.content}
          </section>
        ))}
      </div>
    </div>
  );
}
