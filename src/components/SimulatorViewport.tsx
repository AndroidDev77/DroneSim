import React from "react";
import { motion } from "framer-motion";
import { Gauge, Gamepad2, Pause, Play, RotateCcw } from "lucide-react";
import { AxisMeter } from "./AxisMeter";
import type { HudState } from "../simulator/types";

type SimulatorViewportProps = {
  mountRef: React.RefObject<HTMLDivElement>;
  hud: HudState;
  levelMode: boolean;
  cameraMode: string;
  armed: boolean;
  paused: boolean;
  setArmed: React.Dispatch<React.SetStateAction<boolean>>;
  setPaused: React.Dispatch<React.SetStateAction<boolean>>;
  setCameraMode: React.Dispatch<React.SetStateAction<string>>;
  onReset: () => void;
};

export function SimulatorViewport({
  mountRef,
  hud,
  levelMode,
  cameraMode,
  armed,
  paused,
  setArmed,
  setPaused,
  setCameraMode,
  onReset,
}: SimulatorViewportProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/80 border border-slate-800 shadow-2xl rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl text-white flex items-center gap-2 font-semibold">
              <Gamepad2 className="w-5 h-5" /> Tiny Whoop House Simulator
            </h2>
            <div className="text-sm text-white mt-1">Three.js indoor course with controller setup and calibration.</div>
          </div>
          <div className="flex gap-2 flex-wrap text-xs">
            <span className="border border-slate-700 px-2 py-1 rounded text-white">{hud.status}</span>
            <span className="border border-slate-700 px-2 py-1 rounded text-white">Lap {hud.lap}</span>
            <span className="border border-slate-700 px-2 py-1 rounded text-white">Gate {hud.gate}</span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black">
          <div ref={mountRef} className="w-full h-[520px]" />

          <div className="absolute left-3 top-3 grid gap-2 text-xs w-60">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 backdrop-blur">
              <div className="flex items-center justify-between mb-2 text-white">
                <span className="flex items-center gap-2"><Gauge className="w-4 h-4" /> Live Inputs</span>
                <span>{hud.connected ? "Connected" : "No RX"}</span>
              </div>
              <div className="space-y-2">
                <AxisMeter label="Yaw" value={hud.yaw} />
                <AxisMeter label="Pitch" value={hud.pitch} />
                <AxisMeter label="Roll" value={hud.roll} />
                <AxisMeter label="Throttle" value={hud.throttle * 2 - 1} />
              </div>
            </div>
          </div>

          <div className="absolute right-3 top-3 w-56 bg-slate-950/80 border border-slate-800 rounded-xl p-3 backdrop-blur text-xs text-white space-y-2">
            <div className="flex justify-between"><span>Speed</span><span>{hud.speed.toFixed(2)} m/s</span></div>
            <div className="flex justify-between"><span>Collisions</span><span>{hud.collisions}</span></div>
            <div className="flex justify-between"><span>Mode</span><span>{levelMode ? "Level" : "Acro-ish"}</span></div>
            <div className="flex justify-between"><span>Camera</span><span className="capitalize">{cameraMode}</span></div>
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setArmed((a) => !a)} className="rounded-xl px-3 py-2 text-sm bg-white text-slate-900 flex items-center">
              {armed ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {armed ? "Disarm" : "Arm"}
            </button>
            <button type="button" onClick={() => setPaused((p) => !p)} className="rounded-xl px-3 py-2 text-sm bg-slate-200 text-slate-900">
              {paused ? "Resume" : "Pause"}
            </button>
            <button type="button" onClick={onReset} className="rounded-xl px-3 py-2 text-sm bg-slate-200 text-slate-900 flex items-center">
              <RotateCcw className="w-4 h-4 mr-2" /> Reset
            </button>
            <select value={cameraMode} onChange={(e) => setCameraMode(e.target.value)} className="w-[150px] bg-slate-900 border border-slate-700 rounded-xl text-white px-2 py-2 text-sm">
              <option value="fpv">FPV Cam</option>
              <option value="follow">Follow Cam</option>
              <option value="chase">Chase Cam</option>
              <option value="orbit">Orbit Cam</option>
            </select>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
