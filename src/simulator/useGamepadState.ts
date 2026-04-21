import { useEffect, useMemo, useState } from "react";

export function useGamepadState() {
  const [pads, setPads] = useState<Gamepad[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    let raf = 0;
    const pickIndex = (list: Gamepad[], previous: number | null) => {
      if (!list.length) return null;
      if (previous == null) return list[0].index;
      const stillConnected = list.some((pad) => pad.index === previous);
      return stillConnected ? previous : list[0].index;
    };

    const tick = () => {
      const list = Array.from(navigator.getGamepads?.() || []).filter(Boolean) as Gamepad[];
      setPads(list);
      setSelectedIndex((prev) => pickIndex(list, prev));
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onConnect = () => {
      const list = Array.from(navigator.getGamepads?.() || []).filter(Boolean) as Gamepad[];
      setPads(list);
      setSelectedIndex((prev) => pickIndex(list, prev));
    };

    const onDisconnect = () => {
      const list = Array.from(navigator.getGamepads?.() || []).filter(Boolean) as Gamepad[];
      setPads(list);
      setSelectedIndex((prev) => pickIndex(list, prev));
    };

    window.addEventListener("gamepadconnected", onConnect);
    window.addEventListener("gamepaddisconnected", onDisconnect);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("gamepadconnected", onConnect);
      window.removeEventListener("gamepaddisconnected", onDisconnect);
    };
  }, []);

  const active = useMemo(() => pads.find((p) => p.index === selectedIndex) || pads[0] || null, [pads, selectedIndex]);

  return { pads, active, selectedIndex, setSelectedIndex };
}
