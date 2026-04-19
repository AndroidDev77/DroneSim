import React from "react";
import { AlertTriangle, Radio, Settings2 } from "lucide-react";
import { channelOrder } from "../simulator/constants";
import type { CalibrationConfig, ChannelKey, Rates, SimScale } from "../simulator/types";

type SetupPanelProps = {
  tab: string;
  setTab: React.Dispatch<React.SetStateAction<string>>;
  pads: Gamepad[];
  active: Gamepad | null;
  selectedIndex: number | null;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number | null>>;
  calibration: CalibrationConfig;
  calibrationCapture: ChannelKey | null;
  setCalibrationCapture: React.Dispatch<React.SetStateAction<ChannelKey | null>>;
  axisPreview: Record<ChannelKey, number>;
  updateChannel: (key: ChannelKey, patch: Partial<CalibrationConfig[ChannelKey]>) => void;
  hudControllerName: string;
  rates: Rates;
  simScale: SimScale;
  setRates: React.Dispatch<React.SetStateAction<Rates>>;
  setSimScale: React.Dispatch<React.SetStateAction<SimScale>>;
};

export function SetupPanel({
  tab,
  setTab,
  pads,
  active,
  selectedIndex,
  setSelectedIndex,
  calibration,
  calibrationCapture,
  setCalibrationCapture,
  axisPreview,
  updateChannel,
  hudControllerName,
  rates,
  simScale,
  setRates,
  setSimScale,
}: SetupPanelProps) {
  const tabButtonClass = (value: string) =>
    `px-3 py-2 rounded text-sm ${tab === value ? "bg-slate-700 text-white" : "bg-slate-800 text-slate-200"}`;

  const slider = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (v: number) => void,
  ) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-white">
        <span>{label}</span>
        <span>{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );

  return (
    <div className="bg-slate-900/80 border border-slate-800 shadow-2xl rounded-2xl p-4">
      <h3 className="text-lg text-white flex items-center gap-2 font-semibold mb-4">
        <Settings2 className="w-5 h-5" /> Controls / Setup
      </h3>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <button type="button" className={tabButtonClass("fly")} onClick={() => setTab("fly")}>Setup</button>
          <button type="button" className={tabButtonClass("calibration")} onClick={() => setTab("calibration")}>Calibration</button>
          <button type="button" className={tabButtonClass("physics")} onClick={() => setTab("physics")}>Physics</button>
        </div>

        {tab === "fly" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-white text-sm">Controller</label>
              <select
                value={String(selectedIndex ?? active?.index ?? "none")}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedIndex(value === "none" ? null : Number(value));
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl text-white px-2 py-2"
              >
                {pads.length ? (
                  pads.map((p) => (
                    <option key={p.index} value={String(p.index)}>
                      {p.id.slice(0, 48) || `Gamepad ${p.index}`}
                    </option>
                  ))
                ) : (
                  <option value="none">No gamepad detected</option>
                )}
              </select>
              <div className="text-xs text-white">Browser Gamepad API requires joystick/gamepad mode from your receiver.</div>
            </div>

            <div className="rounded-2xl border border-slate-800 p-3 space-y-3 bg-slate-950/60">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white flex items-center gap-2"><Radio className="w-4 h-4" /> Active controller</span>
                <span className="text-white truncate max-w-[180px] text-right">{hudControllerName}</span>
              </div>
              <div className="grid gap-3">
                {channelOrder.map((key) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-white">
                      <span className="capitalize">{key}</span>
                      <span>Axis {calibration[key].axis}</span>
                    </div>
                    <div className="h-2 rounded bg-slate-700 overflow-hidden">
                      <div className="h-full bg-white" style={{ width: `${Math.round(((axisPreview[key] + 1) / 2) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "calibration" && (
          <div className="space-y-4">
            {channelOrder.map((key) => (
              <div key={key} className="rounded-2xl border border-slate-800 p-3 bg-slate-950/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium capitalize">{key}</div>
                    <div className="text-xs text-white">Axis mapping and inversion</div>
                  </div>
                  <button
                    type="button"
                    className="rounded-xl px-3 py-1 text-sm bg-slate-200 text-slate-900"
                    onClick={() => setCalibrationCapture(key)}
                  >
                    {calibrationCapture === key ? "Move stick..." : "Auto detect"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm">Axis</label>
                    <input
                      type="number"
                      value={calibration[key].axis}
                      min={0}
                      max={7}
                      onChange={(e) => updateChannel(key, { axis: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm">Invert</label>
                    <div className="h-10 flex items-center">
                      <input
                        type="checkbox"
                        checked={calibration[key].invert}
                        onChange={(e) => updateChannel(key, { invert: e.target.checked })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-amber-700/40 bg-amber-500/10 p-3 text-xs text-amber-100 flex gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>This app does not talk to ELRS/CRSF directly and depends on browser gamepad support.</span>
            </div>
          </div>
        )}

        {tab === "physics" && (
          <div className="space-y-4 rounded-2xl border border-slate-800 p-3 bg-slate-950/60">
            {slider("Yaw rate", rates.yaw, 1, 6, 0.1, (v) => setRates((r) => ({ ...r, yaw: v })))}
            {slider("Pitch/Roll rate", rates.pitchRoll, 1, 8, 0.1, (v) => setRates((r) => ({ ...r, pitchRoll: v })))}
            {slider("Throttle lift", rates.throttleLift, 8, 30, 0.5, (v) => setRates((r) => ({ ...r, throttleLift: v })))}
            {slider("Drag", rates.drag, 0.9, 0.999, 0.001, (v) => setRates((r) => ({ ...r, drag: v })))}
            {slider("Gravity", rates.gravity, 5, 15, 0.1, (v) => setRates((r) => ({ ...r, gravity: v })))}
            {slider("Self level", rates.selfLevel, 0.5, 8, 0.1, (v) => setRates((r) => ({ ...r, selfLevel: v })))}
            {slider("Drone radius", simScale.droneRadius, 0.08, 0.2, 0.01, (v) => setSimScale((s) => ({ ...s, droneRadius: v })))}
            {slider("Collision bounce", simScale.collisionBounce, 0.05, 0.8, 0.01, (v) => setSimScale((s) => ({ ...s, collisionBounce: v })))}
            {slider("Indoor wind", simScale.indoorWind, 0, 0.2, 0.005, (v) => setSimScale((s) => ({ ...s, indoorWind: v })))}
          </div>
        )}
      </div>
    </div>
  );
}
