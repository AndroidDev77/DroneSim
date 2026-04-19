export type ChannelKey = "yaw" | "pitch" | "roll" | "throttle";

export type AxisConfig = {
  axis: number;
  invert: boolean;
  deadzone: number;
  expo: number;
  min: number;
  max: number;
  center: number;
  name: string;
};

export type CalibrationConfig = {
  inputSource: string;
  yaw: AxisConfig;
  pitch: AxisConfig;
  roll: AxisConfig;
  throttle: AxisConfig;
  armButton: number;
  resetButton: number;
  levelModeButton: number;
};

export type HudState = {
  yaw: number;
  pitch: number;
  roll: number;
  throttle: number;
  speed: number;
  lap: number;
  gate: number;
  collisions: number;
  status: string;
  connected: boolean;
  controllerName: string;
};

export type Rates = {
  yaw: number;
  pitchRoll: number;
  throttleLift: number;
  drag: number;
  gravity: number;
  selfLevel: number;
};

export type SimScale = {
  droneRadius: number;
  collisionBounce: number;
  indoorWind: number;
};
