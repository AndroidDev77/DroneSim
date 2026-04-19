import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { buildHouseScene, createDroneMesh } from "./simulator/scene";
import { clamp, lerp, normalizeAxis } from "./simulator/math";
import { useGamepadState } from "./simulator/useGamepadState";
import { defaultCalibration, initialHud, initialRates, initialSimScale } from "./simulator/constants";
import type { ChannelKey, CalibrationConfig, Rates, SimScale } from "./simulator/types";
import { SimulatorViewport } from "./components/SimulatorViewport";
import { SetupPanel } from "./components/SetupPanel";

export default function TinyWhoopSimulator() {
  const activeGamepadRef = useRef<Gamepad | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<{ resetDrone: () => void } | null>(null);
  const { pads, active, selectedIndex, setSelectedIndex } = useGamepadState();

  useEffect(() => {
    activeGamepadRef.current = active;
  }, [active]);

  const [tab, setTab] = useState("fly");
  const [calibration, setCalibration] = useState<CalibrationConfig>(defaultCalibration);
  const [armed, setArmed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [levelMode, setLevelMode] = useState(true);
  const [hud, setHud] = useState(initialHud);
  const [calibrationCapture, setCalibrationCapture] = useState<ChannelKey | null>(null);
  const [cameraMode, setCameraMode] = useState("fpv");
  const [rates, setRates] = useState<Rates>(initialRates);
  const [simScale, setSimScale] = useState<SimScale>(initialSimScale);

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
    simRef.current = { resetDrone: () => resetDrone(true) };

    let raf = 0;
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

      const state = animate as typeof animate & { prevArm?: boolean; prevReset?: boolean; prevLevel?: boolean };
      state.prevArm = state.prevArm ?? false;
      state.prevReset = state.prevReset ?? false;
      state.prevLevel = state.prevLevel ?? false;

      if (armPressed && !state.prevArm) setArmed((a) => !a);
      if (resetPressed && !state.prevReset) resetDrone(true);
      if (levelPressed && !state.prevLevel) setLevelMode((m) => !m);

      state.prevArm = armPressed;
      state.prevReset = resetPressed;
      state.prevLevel = levelPressed;

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
          const tiltForce = forward
            .multiplyScalar(pitchIn * throttleIn * rates.pitchRoll * 0.9)
            .add(right.multiplyScalar(rollIn * throttleIn * rates.pitchRoll * 0.9));
          const gravity = new THREE.Vector3(0, -rates.gravity, 0);
          const wind = new THREE.Vector3(
            Math.sin(droneState.elapsed * 0.7) * simScale.indoorWind,
            Math.cos(droneState.elapsed * 0.5) * simScale.indoorWind * 0.35,
            Math.sin(droneState.elapsed * 0.45) * simScale.indoorWind,
          );

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

      setHud({
        yaw: yawIn,
        pitch: pitchIn,
        roll: rollIn,
        throttle: throttleIn,
        speed: droneState.vel.length(),
        lap: droneState.lap,
        gate: droneState.gateIndex + 1,
        collisions: droneState.collisions,
        status: armed ? (paused ? "Paused" : "Armed") : "Disarmed",
        connected: !!gp,
        controllerName: gp?.id || "No controller",
      });

      renderer.render(scene, camera);
    };

    resetDrone(true);
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose?.();
        const material = (obj as THREE.Mesh).material;
        if (material) {
          if (Array.isArray(material)) material.forEach((m) => m.dispose?.());
          else material.dispose?.();
        }
      });
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [calibration, paused, armed, levelMode, rates, cameraMode, simScale, hud.throttle]);

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
        setCalibration((prev) => ({
          ...prev,
          [calibrationCapture]: {
            ...prev[calibrationCapture],
            axis: bestAxis,
            invert: bestValue < 0 && calibrationCapture !== "throttle",
          },
        }));
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

  const updateChannel = (key: ChannelKey, patch: Partial<CalibrationConfig[ChannelKey]>) => {
    setCalibration((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid gap-4 lg:grid-cols-[1.35fr_420px]">
          <SimulatorViewport
            mountRef={mountRef}
            hud={hud}
            levelMode={levelMode}
            cameraMode={cameraMode}
            armed={armed}
            paused={paused}
            setArmed={setArmed}
            setPaused={setPaused}
            setCameraMode={setCameraMode}
            onReset={() => simRef.current?.resetDrone()}
          />

          <SetupPanel
            tab={tab}
            setTab={setTab}
            pads={pads}
            active={active}
            selectedIndex={selectedIndex}
            setSelectedIndex={setSelectedIndex}
            calibration={calibration}
            calibrationCapture={calibrationCapture}
            setCalibrationCapture={setCalibrationCapture}
            axisPreview={axisPreview}
            updateChannel={updateChannel}
            hudControllerName={hud.controllerName}
            rates={rates}
            simScale={simScale}
            setRates={setRates}
            setSimScale={setSimScale}
          />
        </div>
      </div>
    </div>
  );
}
