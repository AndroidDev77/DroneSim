import { useEffect, useMemo, useState } from "react";

export function useGamepadState() {
  const [pads, setPads] = useState<Gamepad[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const list = Array.from(navigator.getGamepads?.() || []).filter(Boolean) as Gamepad[];
      setPads(list);
      if (selectedIndex == null && list.length) setSelectedIndex(list[0].index);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onConnect = () => {
      const list = Array.from(navigator.getGamepads?.() || []).filter(Boolean) as Gamepad[];
      setPads(list);
      if (selectedIndex == null && list.length) setSelectedIndex(list[0].index);
    };

    const onDisconnect = () => {
      const list = Array.from(navigator.getGamepads?.() || []).filter(Boolean) as Gamepad[];
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
