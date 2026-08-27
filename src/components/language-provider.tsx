import { Fragment, useEffect, useState, type ReactNode } from "react";
import { restoreLanguage } from "@/lib/i18n";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("ufbc-language-change", refresh);
    restoreLanguage();
    refresh();
    return () => window.removeEventListener("ufbc-language-change", refresh);
  }, []);

  return <Fragment key={revision}>{children}</Fragment>;
}
