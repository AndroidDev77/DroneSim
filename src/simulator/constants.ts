import type { CalibrationConfig, ChannelKey, HudState, Rates, SimScale } from "./types";

export const defaultCalibration: CalibrationConfig = {
  inputSource: "gamepad",
  yaw: { axis: 3, invert: false, deadzone: 0.06, expo: 0.25, min: -1, max: 1, center: 0, name: "Yaw" },
  pitch: { axis: 1, invert: false, deadzone: 0.06, expo: 0.25, min: -1, max: 1, center: 0, name: "Pitch" },
  roll: { axis: 0, invert: false, deadzone: 0.06, expo: 0.25, min: -1, max: 1, center: 0, name: "Roll" },
  throttle: { axis: 2, invert: false, deadzone: 0.02, expo: 0.1, min: -1, max: 1, center: -1, name: "Throttle" },
  armButton: 0,
  resetButton: 1,
  levelModeButton: 2,
};

export const channelOrder: ChannelKey[] = ["yaw", "pitch", "roll", "throttle"];

export const initialHud: HudState = {
  yaw: 0,
  pitch: 0,
  roll: 0,
  throttle: 0,
  speed: 0,
  lap: 1,
  gate: 1,
  collisions: 0,
  status: "Idle",
  connected: false,
  controllerName: "No controller",
};

export const initialRates: Rates = {
  yaw: 2.7,
  pitchRoll: 4.4,
  throttleLift: 18,
  drag: 0.985,
  gravity: 8.5,
  selfLevel: 3.2,
};

export const initialSimScale: SimScale = {
  droneRadius: 0.12,
  collisionBounce: 0.32,
  indoorWind: 0.04,
};
