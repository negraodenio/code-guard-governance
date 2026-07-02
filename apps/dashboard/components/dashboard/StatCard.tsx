import { Card } from "@/components/ui/Card";

interface StatCardProps {
  label: string;
  value: number | string;
  color?: "blue" | "red" | "yellow" | "green" | "gray";
  subtitle?: string;
}

const colorMap = {
  blue: "text-primary",
  red: "text-danger",
  yellow: "text-warning",
  green: "text-success",
  gray: "text-gray-400",
};

export function StatCard({ label, value, color = "blue", subtitle }: StatCardProps) {
  return (
    <Card>
      <div className="text-sm text-gray-400 mb-2">{label}</div>
      <div className={`text-3xl font-bold ${colorMap[color]}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
      )}
    </Card>
  );
}