import { Languages } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getLanguage, setLanguage, t, type AppLanguage } from "@/lib/i18n";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const language = getLanguage();

  return (
    <Select
      value={language}
      onValueChange={(value) => {
        setLanguage(value as AppLanguage);
      }}
    >
      <SelectTrigger
        aria-label={t.language}
        className={compact ? "h-8 w-[118px] border-sidebar-border bg-sidebar text-sidebar-foreground" : "h-9 w-[138px]"}
      >
        <Languages className="mr-2 h-4 w-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="rw">{t.kinyarwanda}</SelectItem>
        <SelectItem value="en">{t.english}</SelectItem>
      </SelectContent>
    </Select>
  );
}
