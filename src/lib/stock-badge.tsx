import { Badge } from "@/components/ui/badge";

/** Reusable stock-status badge. Uses Kinyarwanda labels. */
export function StockBadge({ qty, min }: { qty: number; min: number }) {
  if (qty <= 0)
    return (
      <Badge variant="outline" className="border-red-600 text-red-700">
        Byanka
      </Badge>
    );
  if (qty <= min)
    return (
      <Badge variant="outline" className="border-orange-600 text-orange-700">
        Birahari
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-green-600 text-green-700">
      Hari
    </Badge>
  );
}
