import React from "react";

type AxisMeterProps = {
  label: string;
  value: number;
};

export function AxisMeter({ label, value }: AxisMeterProps) {
  const pct = Math.round(((value + 1) / 2) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-white">
        <span>{label}</span>
        <span>{value.toFixed(2)}</span>
      </div>
      <div className="h-2 rounded bg-slate-700 overflow-hidden">
        <div className="h-full bg-white" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
