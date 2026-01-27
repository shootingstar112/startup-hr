import { Suspense } from "react";
import SectionTabs from "./SectionTabs";

type Tab = {
  key: string;
  label: string;
  content: React.ReactNode;
};

export default function SectionTabsWrapper(props: {
  tabs: Tab[];
  defaultTab: string;
  syncQuery?: boolean;
}) {
  return (
    <Suspense fallback={null}>
      <SectionTabs {...props} />
    </Suspense>
  );
}
