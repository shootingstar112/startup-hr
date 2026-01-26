"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Tab = {
  key: string;
  label: string;
  content: React.ReactNode;
};

export default function SectionTabs({
  tabs,
  defaultTab,
  syncQuery = true, // ?tab=xxx 로 상태 저장하고 싶으면 true
}: {
  tabs: Tab[];
  defaultTab: string;
  syncQuery?: boolean;
}) {
  const sp = useSearchParams();
  const router = useRouter();

  const initial = useMemo(() => {
    if (!syncQuery) return defaultTab;
    const q = sp.get("tab");
    if (q && tabs.some((t) => t.key === q)) return q;
    return defaultTab;
  }, [sp, tabs, defaultTab, syncQuery]);

  const [active, setActive] = useState(initial);

  useEffect(() => {
    // 뒤로가기/새로고침에도 맞추기
    setActive(initial);
  }, [initial]);

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
          <section
            key={t.key}
            style={{ display: t.key === active ? "block" : "none" }} // ✅ 네가 말한 display 토글
          >
            {t.content}
          </section>
        ))}
      </div>
    </div>
  );
}
