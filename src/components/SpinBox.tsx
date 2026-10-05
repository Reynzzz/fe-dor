import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import type { Participant } from "../data/prizes";

interface SpinBoxProps {
  index: number;
  isSpinning: boolean;
  winner: Participant | null;
  pool: Participant[];
  delay?: number;
  prizeColor: string;
  glowColor: string;
  compact?: boolean;
  onSpinComplete?: (winner: Participant | null) => void;
  onClick?: () => void;
}

const SPIN_DURATION = 3000;

const SpinBox: React.FC<SpinBoxProps> = ({
  isSpinning, winner, pool, delay = 0,
  prizeColor, compact = false, onSpinComplete, onClick,
}) => {
  const [display, setDisplay] = useState<Participant | null>(null);
  const [phase, setPhase] = useState<"idle" | "spinning" | "done">("idle");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSpin = useRef(false);

  const clearAll = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  /* Mount dengan pemenang tersimpan (refresh halaman) → langsung tampil sebagai "done" */
  useEffect(() => {
    if (winner && !isSpinning) { setDisplay(winner); setPhase("done"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isSpinning && !prevSpin.current) {
      setPhase("spinning"); setDisplay(null);
      timeoutRef.current = setTimeout(() => {
        intervalRef.current = setInterval(() => {
          setDisplay(pool[Math.floor(Math.random() * pool.length)]);
        }, 60);
        timeoutRef.current = setTimeout(() => {
          clearAll(); setDisplay(winner);
          setPhase("done"); onSpinComplete?.(winner);
        }, SPIN_DURATION);
      }, delay);
    } else if (!isSpinning && !winner) {
      clearAll(); setPhase("idle"); setDisplay(null);
    }
    prevSpin.current = isSpinning;
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning, winner, delay]);

  /* Teks panjang tidak dipotong: font diperkecil sampai muat satu baris */
  const nameRef = useRef<HTMLSpanElement>(null);
  const regionRef = useRef<HTMLSpanElement>(null);
  const baseNameSize = compact ? 42 : 48;
  const baseRegionSize = compact ? 22 : 26;
  const [nameSize, setNameSize] = useState(baseNameSize);
  const [regionSize, setRegionSize] = useState(baseRegionSize);

  useLayoutEffect(() => {
    const fit = (el: HTMLSpanElement | null, base: number, min: number) => {
      if (!el) return base;
      let size = base;
      el.style.fontSize = `${size}px`;
      while (el.scrollWidth > el.clientWidth && size > min) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
      return size;
    };
    setNameSize(fit(nameRef.current, baseNameSize, 12));
    setRegionSize(fit(regionRef.current, baseRegionSize, 10));
  }, [display, baseNameSize, baseRegionSize]);

  /* Dynamic border — glow dihilangkan sesuai request */
  const glowStyle: React.CSSProperties =
    phase === "spinning"
      ? { borderColor: prizeColor }
      : phase === "done"
        ? { borderColor: prizeColor }
        : { borderColor: "rgba(255,255,255,.7)" };

  return (
    <div
      onClick={phase === "done" ? onClick : undefined}
      className={[
        "relative flex items-center justify-center bg-white rounded-2xl border-4",
        "transition-colors duration-300 overflow-hidden",
        compact ? "w-[480px] h-[105px] px-5" : "w-[520px] h-[150px] px-6",
        phase === "done" ? "animate-winner-pop cursor-pointer" : "",
      ].join(" ")}
      style={glowStyle}
    >
      <div className={`flex flex-col items-center justify-center w-full h-full gap-1 ${compact ? "py-1" : "py-3"}`}>
        {/* Nama pemenang */}
        <span
          className={[
            "block font-trueno font-[800] text-center leading-tight whitespace-nowrap overflow-hidden w-full px-2",
            phase === "spinning" ? "text-gray-700 animate-roll-blur" : "",
          ].join(" ")}
          ref={nameRef}
          style={{ fontSize: nameSize, color: phase === "done" ? "#111" : undefined }}
        >
          {display ? display.name : "???"}
        </span>

        {/* Region pemenang */}
        <span
          className={[
            "block font-trueno font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap overflow-hidden w-full text-center px-2",
          ].join(" ")}
          ref={regionRef}
          style={{ fontSize: regionSize }}
        >
          {display ? display.region : "---"}
        </span>
      </div>

      {/* Done badge ✓ */}
      {phase === "done" && winner && (
        <span
          className="absolute top-2 right-2 rounded-full flex items-center justify-center
                     text-white font-black shadow-lg
                     w-[clamp(18px,1.8vw,30px)] h-[clamp(18px,1.8vw,30px)]
                     text-[clamp(9px,.9vw,14px)]"
          style={{ background: "#111" }}
        >
          ✓
        </span>
      )}
    </div>
  );
};

export default SpinBox;
