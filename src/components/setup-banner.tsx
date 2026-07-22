import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Step {
  message: string;
  to: string;
  label: string;
}

export function SetupBanner({ steps }: { steps: Step[] }) {
  if (steps.length === 0) return null;
  return (
    <div className="rounded-lg border border-warning/40 bg-warning/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" />
        <div className="flex-1 space-y-2">
          {steps.map((s, i) => (
            <div key={i} className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm">{s.message}</p>
              <Button asChild size="sm" variant="outline">
                <Link to={s.to}>{s.label}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
