import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Gamepad2, Home, RotateCcw, Play, Pause, Gauge, Radio, Settings2 } from "lucide-react";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;
const deadzoneApply = (v, dz) => (Math.abs(v) < dz ? 0 : ((Math.abs(v) - dz) / (1 - dz)) * Math.sign(v));

const defaultCalibration = {
  inputSource: "gamepad",
  yaw: { axis: 3, invert: false, deadzone: 0.06, expo: 0.25, min: -1, max: 1, center: 0, name: "Yaw" },
  pitch: { axis: 1, invert: false, deadzone: 0.06, expo: 0.25, min: -1, max: 1, center: 0, name: "Pitch" },
  roll: { axis: 0, invert: false, deadzone: 0.06, expo: 0.25, min: -1, max: 1, center: 0, name: "Roll" },
  throttle: { axis: 2, invert: false, deadzone: 0.02, expo: 0.1, min: -1, max: 1, center: -1, name: "Throttle" },
  armButton: 0,
  resetButton: 1,
  levelModeButton: 2,
};

const channelOrder = ["yaw", "pitch", "roll", "throttle"];

function shapeExpo(v, expo) {
  const e = clamp(expo, 0, 0.95);
  const cubic = v * v * v;
  return v * (1 - e) + cubic * e;
}

function normalizeAxis(raw, cfg, isThrottle = false) {
  let v = raw ?? 0;
  if (cfg.invert) v *= -1;
  v = deadzoneApply(v, cfg.deadzone);
  v = shapeExpo(v, cfg.expo);
  if (isThrottle) {
    return clamp((v + 1) / 2, 0, 1);
  }
  return clamp(v, -1, 1);
}

function useGamepadState() {
  const [pads, setPads] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);

  useEffect(() => {
    let raf;
    const tick = () => {
      const list = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
      setPads(list);
      if (selectedIndex == null && list.length) setSelectedIndex(list[0].index);
      raf = requestAnimationFrame(tick);
    };
    tick();
    const onConnect = () => {
      const list = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
      setPads(list);
      if (selectedIndex == null && list.length) setSelectedIndex(list[0].index);
    };
    const onDisconnect = () => {
      const list = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
      setPads(list);
    };
    window.addEventListener("gamepadconnected", onConnect);
    window.addEventListener("gamepaddisconnected", onDisconnect);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("gamepadconnected", onConnect);
      window.removeEventListener("gamepaddisconnected", onDisconnect);
    };
  }, [selectedIndex]);

  const active = useMemo(() => pads.find((p) => p.index === selectedIndex) || pads[0] || null, [pads, selectedIndex]);
  return { pads, active, selectedIndex, setSelectedIndex };
}

function buildHouseScene(scene) {
  scene.background = new THREE.Color(0x0b1220);
  scene.fog = new THREE.Fog(0x0b1220, 12, 48);

  const ambient = new THREE.HemisphereLight(0xffffff, 0x334455, 1.1);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 1.25);
  dir.position.set(8, 12, 6);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  scene.add(dir);

  const floorMat = new THREE.MeshStandardMaterial({ color: 0x7c5c4a, roughness: 0.8, metalness: 0.05 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd9d6cf, roughness: 0.95 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.8 });
  const obstacleMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.75 });
  const gateMat = new THREE.MeshStandardMaterial({ color: 0xe84f4f, roughness: 0.55, metalness: 0.1, emissive: 0x2a0000 });

  const colliders = [];
  const gates = [];

  const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.2, 14), floorMat);
  floor.position.set(0, -0.1, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  function addBox(w, h, d, x, y, z, material = wallMat, collidable = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    if (collidable) colliders.push(new THREE.Box3().setFromObject(m));
    return m;
  }

  addBox(18, 3, 0.3, 0, 1.5, -7);
  addBox(18, 3, 0.3, 0, 1.5, 7);
  addBox(0.3, 3, 14, -9, 1.5, 0);
  addBox(0.3, 3, 14, 9, 1.5, 0);

  addBox(6, 3, 0.25, -2.5, 1.5, -1.5);
  addBox(0.25, 3, 4.6, 0.3, 1.5, 0.9);
  addBox(4.8, 3, 0.25, 3.2, 1.5, 2.4);
  addBox(0.25, 3, 4.8, -4.7, 1.5, 2.2);

  addBox(0.6, 0.9, 2.2, -5.6, 0.45, -4.8, trimMat);
  addBox(2.4, 0.75, 1.2, -6.2, 0.38, -2.2, obstacleMat);
  addBox(1.6, 0.45, 0.9, 6.3, 0.23, -3.6, obstacleMat);
  addBox(2.1, 0.8, 1.2, 4.8, 0.4, 4.8, obstacleMat);
  addBox(1.0, 1.6, 0.35, 0.9, 0.8, -4.6, trimMat);
  addBox(0.9, 0.6, 0.9, -2.2, 0.3, 4.7, obstacleMat);
  addBox(1.1, 1.1, 1.1, 2.2, 0.55, 5.5, obstacleMat);
  addBox(0.2, 2.2, 6, -1.2, 1.1, 5.5, trimMat);

  const rug = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 0.02, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 1 })
  );
  rug.position.set(4.9, 0.02, -0.8);
  scene.add(rug);

  function addGate(x, y, z, rotY = 0, w = 1.2, h = 0.9) {
    const group = new THREE.Group();
    const tubeGeoA = new THREE.BoxGeometry(w, 0.08, 0.08);
    const tubeGeoB = new THREE.BoxGeometry(0.08, h, 0.08);
    const top = new THREE.Mesh(tubeGeoA, gateMat);
    const bottom = new THREE.Mesh(tubeGeoA, gateMat);
    const left = new THREE.Mesh(tubeGeoB, gateMat);
    const right = new THREE.Mesh(tubeGeoB, gateMat);
    top.position.set(0, h / 2, 0);
    bottom.position.set(0, -h / 2, 0);
    left.position.set(-w / 2, 0, 0);
    right.position.set(w / 2, 0, 0);
    group.add(top, bottom, left, right);
    group.position.set(x, y, z);
    group.rotation.y = rotY;
    scene.add(group);
    gates.push({ center: new THREE.Vector3(x, y, z), radius: Math.max(w, h) * 0.8, passed: false });
    return group;
  }

  addGate(-7.2, 1.1, -5.4, Math.PI / 2);
  addGate(-3.2, 1.0, -0.2, 0);
  addGate(1.9, 1.0, -3.9, Math.PI / 2);
  addGate(5.8, 1.05, 0.8, 0);
  addGate(4.8, 1.0, 5.6, Math.PI / 2);
  addGate(-1.8, 1.0, 5.2, 0);
  addGate(-6.2, 1.0, 3.8, Math.PI / 2);

  const path = [
    [-7.2, 1.1, -5.4],
    [-5.6, 1.0, -3.8],
    [-3.2, 1.0, -0.2],
    [0.8, 1.0, -2.4],
    [1.9, 1.0, -3.9],
    [4.8, 1.0, -1.6],
    [5.8, 1.05, 0.8],
    [5.4, 1.0, 3.6],
    [4.8, 1.0, 5.6],
    [1.3, 1.0, 5.6],
    [-1.8, 1.0, 5.2],
    [-4.3, 1.0, 4.8],
    [-6.2, 1.0, 3.8],
    [-7.1, 1.0, 1.0],
    [-7.4, 1.0, -2.8],
    [-7.2, 1.1, -5.4],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z));

  const curve = new THREE.CatmullRomCurve3(path, true, "catmullrom", 0.15);
  const points = curve.getPoints(220);
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0xffffff })
  );
  scene.add(line);

  return { colliders, gates, path, curve };
}

function createDroneMesh() {
  const g = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.7, metalness: 0.2 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.1, emissive: 0x0b2622 });
  const propMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, roughness: 0.2 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.22), frameMat);
  g.add(body);

  const cam = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.05), accentMat);
  cam.position.set(0, 0.01, -0.12);
  g.add(cam);

  const armGeo = new THREE.BoxGeometry(0.32, 0.018, 0.025);
  const arm1 = new THREE.Mesh(armGeo, frameMat);
  const arm2 = new THREE.Mesh(armGeo, frameMat);
  arm2.rotation.y = Math.PI / 2;
  g.add(arm1, arm2);

  const props = [];
  [[0.16, 0, 0.16], [-0.16, 0, 0.16], [0.16, 0, -0.16], [-0.16, 0, -0.16]].forEach(([x, y, z]) => {
    const duct = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 12, 26), accentMat);
    duct.rotation.x = Math.PI / 2;
    duct.position.set(x, y, z);
    g.add(duct);

    const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.006, 20), propMat);
    prop.position.set(x, 0.01, z);
    g.add(prop);
    props.push(prop);
  });

  return { group: g, props };
}

function axisMeter({ label, value }) {
  const pct = Math.round(((value + 1) / 2) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-white">
        <span>{label}</span>
        <span>{value.toFixed(2)}</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

export default function TinyWhoopSimulator() {
  const activeGamepadRef = useRef(null);
  const mountRef = useRef(null);
  const simRef = useRef(null);
  const { pads, active, selectedIndex, setSelectedIndex } = useGamepadState();

  useEffect(() => {
    activeGamepadRef.current = active;
  }, [active]);

  const [tab, setTab] = useState("fly");
  const [calibration, setCalibration] = useState(defaultCalibration);
  const [armed, setArmed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [levelMode, setLevelMode] = useState(true);
  const [hud, setHud] = useState({ yaw: 0, pitch: 0, roll: 0, throttle: 0, speed: 0, lap: 1, gate: 1, collisions: 0, status: "Idle", connected: false, controllerName: "No controller" });
  const [calibrationCapture, setCalibrationCapture] = useState(null);
  const [cameraMode, setCameraMode] = useState("fpv");
  const [rates, setRates] = useState({ yaw: 2.7, pitchRoll: 4.4, throttleLift: 18, drag: 0.985, gravity: 8.5, selfLevel: 3.2 });
  const [simScale, setSimScale] = useState({ droneRadius: 0.12, collisionBounce: 0.32, indoorWind: 0.04 });

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.01, 200);
    camera.position.set(0, 2.4, 5.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);

    const { colliders, gates, curve } = buildHouseScene(scene);
    const { group: drone, props } = createDroneMesh();
    drone.position.set(-7.4, 1.0, -5.8);
    scene.add(drone);

    const droneState = {
      angVel: new THREE.Vector3(),
      pos: drone.position.clone(),
      vel: new THREE.Vector3(),
      euler: new THREE.Euler(0, 0, 0, "YXZ"),
      lastSafe: drone.position.clone(),
      collisions: 0,
      lap: 1,
      gateIndex: 0,
      lastGateTime: 0,
      elapsed: 0,
      justReset: false,
    };

    const clock = new THREE.Clock();
    const droneBox = new THREE.Box3();
    const droneSize = new THREE.Vector3(simScale.droneRadius * 2, simScale.droneRadius * 0.8, simScale.droneRadius * 2);

    function resetDrone(full = false) {
      droneState.pos.set(-7.4, 1.0, -5.8);
      droneState.vel.set(0, 0, 0);
      droneState.angVel.set(0, 0, 0);
      droneState.euler.set(0, 0, 0);
      droneState.lastSafe.copy(droneState.pos);
      if (full) {
        droneState.collisions = 0;
        droneState.lap = 1;
        droneState.gateIndex = 0;
        gates.forEach((g) => (g.passed = false));
        droneState.elapsed = 0;
      }
      drone.position.copy(droneState.pos);
      drone.rotation.copy(droneState.euler);
      droneState.justReset = true;
    }

    function handleResize() {
      const w = mountRef.current?.clientWidth || 100;
      const h = mountRef.current?.clientHeight || 100;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    handleResize();
    const ro = new ResizeObserver(handleResize);
    ro.observe(mountRef.current);

    simRef.current = { resetDrone: () => resetDrone(true), arm: () => setArmed((a) => !a), setLevelMode, setPaused };

    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.033);
      const gp = activeGamepadRef.current;
      const axes = gp?.axes || [];
      const buttons = gp?.buttons || [];
      const rawYaw = axes[calibration.yaw.axis] ?? 0;
      const rawPitch = axes[calibration.pitch.axis] ?? 0;
      const rawRoll = axes[calibration.roll.axis] ?? 0;
      const rawThrottle = axes[calibration.throttle.axis] ?? -1;

      const yawIn = normalizeAxis(rawYaw, calibration.yaw, false);
      const pitchIn = normalizeAxis(rawPitch, calibration.pitch, false);
      const rollIn = normalizeAxis(rawRoll, calibration.roll, false);
      const throttleIn = normalizeAxis(rawThrottle, calibration.throttle, true);

      const armPressed = !!buttons[calibration.armButton]?.pressed;
      const resetPressed = !!buttons[calibration.resetButton]?.pressed;
      const levelPressed = !!buttons[calibration.levelModeButton]?.pressed;

      if (!animate.prevArm) animate.prevArm = false;
      if (!animate.prevReset) animate.prevReset = false;
      if (!animate.prevLevel) animate.prevLevel = false;

      if (armPressed && !animate.prevArm) setArmed((a) => !a);
      if (resetPressed && !animate.prevReset) resetDrone(true);
      if (levelPressed && !animate.prevLevel) setLevelMode((m) => !m);

      animate.prevArm = armPressed;
      animate.prevReset = resetPressed;
      animate.prevLevel = levelPressed;

      if (!paused) {
        droneState.elapsed += dt;

        if (armed) {
          droneState.angVel.y = -yawIn * rates.yaw;
          if (levelMode) {
            droneState.euler.z = lerp(droneState.euler.z, -rollIn * 0.8, 0.16);
            droneState.euler.x = lerp(droneState.euler.x, -pitchIn * 0.75, 0.16);
            droneState.euler.z = lerp(droneState.euler.z, 0, clamp(rates.selfLevel * dt, 0, 1));
            droneState.euler.x = lerp(droneState.euler.x, 0, clamp(rates.selfLevel * dt * 0.6, 0, 1));
          } else {
            droneState.angVel.z = -rollIn * rates.pitchRoll;
            droneState.angVel.x = -pitchIn * rates.pitchRoll;
            droneState.euler.z += droneState.angVel.z * dt;
            droneState.euler.x += droneState.angVel.x * dt;
          }
          droneState.euler.y += droneState.angVel.y * dt;

          const thrustUp = new THREE.Vector3(0, 1, 0).applyEuler(droneState.euler);
          const forward = new THREE.Vector3(0, 0, -1).applyEuler(droneState.euler);
          const right = new THREE.Vector3(1, 0, 0).applyEuler(droneState.euler);
          const upLift = thrustUp.multiplyScalar(throttleIn * rates.throttleLift);
          const tiltForce = forward.multiplyScalar(pitchIn * throttleIn * rates.pitchRoll * 0.9).add(right.multiplyScalar(rollIn * throttleIn * rates.pitchRoll * 0.9));
          const gravity = new THREE.Vector3(0, -rates.gravity, 0);
          const wind = new THREE.Vector3(Math.sin(droneState.elapsed * 0.7) * simScale.indoorWind, Math.cos(droneState.elapsed * 0.5) * simScale.indoorWind * 0.35, Math.sin(droneState.elapsed * 0.45) * simScale.indoorWind);

          droneState.vel.add(upLift.multiplyScalar(dt));
          droneState.vel.add(tiltForce.multiplyScalar(dt));
          droneState.vel.add(gravity.multiplyScalar(dt));
          droneState.vel.add(wind.multiplyScalar(dt));
        } else {
          droneState.vel.multiplyScalar(0.94);
          droneState.vel.y -= rates.gravity * 0.45 * dt;
        }

        droneState.vel.multiplyScalar(rates.drag);
        droneState.pos.addScaledVector(droneState.vel, dt);

        if (droneState.pos.y < 0.18) {
          droneState.pos.y = 0.18;
          droneState.vel.y = Math.abs(droneState.vel.y) * 0.18;
        }

        droneBox.setFromCenterAndSize(droneState.pos, droneSize);
        let collided = false;
        for (const box of colliders) {
          if (droneBox.intersectsBox(box)) {
            collided = true;
            break;
          }
        }
        if (collided) {
          droneState.collisions += 1;
          droneState.pos.copy(droneState.lastSafe);
          droneState.vel.multiplyScalar(-simScale.collisionBounce);
          droneState.vel.y = Math.abs(droneState.vel.y) * 0.25;
        } else {
          droneState.lastSafe.copy(droneState.pos);
        }

        const gate = gates[droneState.gateIndex];
        if (gate && droneState.pos.distanceTo(gate.center) < gate.radius) {
          const now = performance.now();
          if (now - droneState.lastGateTime > 500) {
            droneState.lastGateTime = now;
            droneState.gateIndex += 1;
            if (droneState.gateIndex >= gates.length) {
              droneState.gateIndex = 0;
              droneState.lap += 1;
            }
          }
        }
      }

      drone.position.copy(droneState.pos);
      drone.rotation.copy(droneState.euler);
      props.forEach((p, i) => {
        p.rotation.y += ((armed ? 0.8 : 0.12) + hud.throttle * 1.8) * (i % 2 === 0 ? 1 : -1);
      });

      const camTarget = drone.position.clone();
      if (cameraMode === "fpv") {
        const fpvOffset = new THREE.Vector3(0, 0.05, -0.08).applyEuler(drone.rotation);
        camera.position.lerp(drone.position.clone().add(fpvOffset), 0.5);
        const lookDir = new THREE.Vector3(0, 0, -1).applyEuler(drone.rotation);
        camera.lookAt(drone.position.clone().add(lookDir));
      } else if (cameraMode === "follow") {
        const back = new THREE.Vector3(0, 0.45, 1.6).applyEuler(new THREE.Euler(0, drone.rotation.y, 0));
        camera.position.lerp(camTarget.clone().add(back), 0.12);
        camera.lookAt(camTarget.clone().add(new THREE.Vector3(0, 0.05, 0)));
      } else if (cameraMode === "chase") {
        const dir = new THREE.Vector3(0, 0.22, 2.2).applyEuler(drone.rotation);
        camera.position.lerp(camTarget.clone().add(dir), 0.08);
        camera.lookAt(camTarget.clone().add(new THREE.Vector3(0, 0.02, -0.8).applyEuler(drone.rotation)));
      } else {
        const t = ((droneState.elapsed * 0.035) % 1 + 1) % 1;
        const p = curve.getPointAt(t);
        camera.position.lerp(p.clone().add(new THREE.Vector3(0, 4.5, 4.5)), 0.03);
        camera.lookAt(drone.position);
      }

      setHud({ yaw: yawIn, pitch: pitchIn, roll: rollIn, throttle: throttleIn, speed: droneState.vel.length(), lap: droneState.lap, gate: droneState.gateIndex + 1, collisions: droneState.collisions, status: armed ? (paused ? "Paused" : "Armed") : "Disarmed", connected: !!gp, controllerName: gp?.id || "No controller" });

      renderer.render(scene, camera);
    };

    resetDrone(true);
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose?.();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
          else obj.material.dispose?.();
        }
      });
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [calibration, paused, armed, levelMode, rates, cameraMode, simScale]);

  useEffect(() => {
    if (!calibrationCapture || !active) return;
    const threshold = 0.45;
    const interval = setInterval(() => {
      const gp = navigator.getGamepads?.()[active.index];
      if (!gp) return;
      let bestAxis = -1;
      let bestValue = 0;
      gp.axes.forEach((v, i) => {
        const mag = Math.abs(v);
        if (mag > Math.abs(bestValue)) {
          bestValue = v;
          bestAxis = i;
        }
      });
      if (bestAxis >= 0 && Math.abs(bestValue) > threshold) {
        setCalibration((prev) => ({ ...prev, [calibrationCapture]: { ...prev[calibrationCapture], axis: bestAxis, invert: bestValue < 0 && calibrationCapture !== "throttle" } }));
        setCalibrationCapture(null);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [calibrationCapture, active]);

  const axisPreview = useMemo(() => {
    const axes = active?.axes || [];
    return {
      yaw: axes[calibration.yaw.axis] ?? 0,
      pitch: axes[calibration.pitch.axis] ?? 0,
      roll: axes[calibration.roll.axis] ?? 0,
      throttle: axes[calibration.throttle.axis] ?? 0,
    };
  }, [active, calibration]);

  const updateChannel = (key, patch) => {
    setCalibration((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 lg:grid-cols-[1.35fr_420px]">
          <Card className="bg-slate-900/80 border-slate-800 shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-xl text-white flex items-center gap-2"><Gamepad2 className="w-5 h-5" /> Tiny Whoop House Simulator</CardTitle>
                  <div className="text-sm text-white mt-1">Three.js indoor course with controller setup, calibration, and one house track.</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="border-slate-700 text-white">{hud.status}</Badge>
                  <Badge variant="outline" className="border-slate-700 text-white">Lap {hud.lap}</Badge>
                  <Badge variant="outline" className="border-slate-700 text-white">Gate {hud.gate}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black">
                <div ref={mountRef} className="w-full h-[520px]" />
                <div className="absolute left-3 top-3 grid gap-2 text-xs w-60">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 backdrop-blur">
                    <div className="flex items-center justify-between mb-2 text-white">
                      <span className="flex items-center gap-2"><Gauge className="w-4 h-4" /> Live Inputs</span>
                      <span>{hud.connected ? "Connected" : "No RX"}</span>
                    </div>
                    <div className="space-y-2">
                      {axisMeter({ label: "Yaw", value: hud.yaw })}
                      {axisMeter({ label: "Pitch", value: hud.pitch })}
                      {axisMeter({ label: "Roll", value: hud.roll })}
                      {axisMeter({ label: "Throttle", value: hud.throttle * 2 - 1 })}
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
                  <Button size="sm" onClick={() => setArmed((a) => !a)} className="rounded-xl">
                    {armed ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    {armed ? "Disarm" : "Arm"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setPaused((p) => !p)} className="rounded-xl">{paused ? "Resume" : "Pause"}</Button>
                  <Button size="sm" variant="secondary" onClick={() => simRef.current?.resetDrone()} className="rounded-xl"><RotateCcw className="w-4 h-4 mr-2" /> Reset</Button>
                  <Select value={cameraMode} onValueChange={setCameraMode}>
                    <SelectTrigger className="w-[150px] bg-slate-900 border-slate-700 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 text-white">
                      <SelectItem className="text-white" value="fpv">FPV Cam</SelectItem>
                      <SelectItem className="text-white" value="follow">Follow Cam</SelectItem>
                      <SelectItem className="text-white" value="chase">Chase Cam</SelectItem>
                      <SelectItem className="text-white" value="orbit">Orbit Cam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800 shadow-2xl rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white flex items-center gap-2"><Settings2 className="w-5 h-5" /> Controls / Setup</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={tab} onValueChange={setTab} className="space-y-4">
                <TabsList className="grid grid-cols-3 bg-slate-800">
                  <TabsTrigger value="fly" className="text-white">Setup</TabsTrigger>
                  <TabsTrigger value="calibration" className="text-white">Calibration</TabsTrigger>
                  <TabsTrigger value="physics" className="text-white">Physics</TabsTrigger>
                </TabsList>
                <TabsContent value="fly" className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white">Controller</Label>
                    <Select value={String(selectedIndex ?? active?.index ?? "none")} onValueChange={(v) => setSelectedIndex(Number(v))}>
                      <SelectTrigger className="bg-slate-950 border-slate-700 rounded-xl"><SelectValue placeholder="Select controller" /></SelectTrigger>
                      <SelectContent className="bg-slate-900 text-white">
                        {pads.length ? pads.map((p) => <SelectItem className="text-white" key={p.index} value={String(p.index)}>{p.id.slice(0, 48) || `Gamepad ${p.index}`}</SelectItem>) : <SelectItem className="text-white" value="none">No gamepad detected</SelectItem>}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-white">Browser Gamepad API works with many USB receivers when they present as a joystick/gamepad. If your receiver uses HID-only mode, the browser may not expose it here.</div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 p-3 space-y-3 bg-slate-950/60">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white flex items-center gap-2"><Radio className="w-4 h-4" /> Active controller</span>
                      <span className="text-white truncate max-w-[180px] text-right">{hud.controllerName}</span>
                    </div>
                    <div className="grid gap-3">
                      {channelOrder.map((key) => (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-white"><span className="capitalize">{key}</span><span>Axis {calibration[key].axis}</span></div>
                          <Progress value={Math.round(((axisPreview[key] + 1) / 2) * 100)} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="calibration" className="space-y-4">
                  {channelOrder.map((key) => (
                    <div key={key} className="rounded-2xl border border-slate-800 p-3 bg-slate-950/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium capitalize">{key}</div>
                          <div className="text-xs text-white">Axis mapping, inversion, deadzone, and expo</div>
                        </div>
                        <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => setCalibrationCapture(key)}>{calibrationCapture === key ? "Move stick..." : "Auto detect"}</Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Axis</Label>
                          <Input type="number" value={calibration[key].axis} min={0} max={7} onChange={(e) => updateChannel(key, { axis: Number(e.target.value) })} className="bg-slate-900 border-slate-700 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label>Invert</Label>
                          <div className="h-10 flex items-center"><Switch checked={calibration[key].invert} onCheckedChange={(v) => updateChannel(key, { invert: v })} /></div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="rounded-2xl border border-amber-700/40 bg-amber-500/10 p-3 text-xs text-amber-100 flex gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /><span>Most browsers require the receiver to appear as a standard gamepad for direct access. This app does not talk to ELRS/CRSF directly.</span></div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
