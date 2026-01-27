"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  // 서버/빌드 단계에서는 window가 없으니까 defaultTab로 시작
  const [active, setActive] = useState(defaultTab);

  // 클라이언트 마운트 이후에만 URL에서 tab 읽기 (프리렌더 에러 방지)
  useEffect(() => {
    if (!syncQuery) return;

    const q = new URLSearchParams(window.location.search).get("tab");
    if (q && tabs.some((t) => t.key === q)) {
      setActive(q);
    } else {
      setActive(defaultTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncQuery, defaultTab, tabs]);

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
