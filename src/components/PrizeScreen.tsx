import React, { useState, useCallback, useEffect, useRef } from "react";
import type { Prize, Participant } from "../data/prizes";
import { api, DEFAULT_SETTINGS } from "../api";
import type { DisplaySettings } from "../api";
import SpinBox from "./SpinBox";
import bgImage from "../assets/background/bg 3.png";
import logoXlsmart from "../assets/logo/Logogram XLSMART - Primary_1.png";
import tagline from "../assets/New_Hadiah/TAGLINE DOORPRIZE.png";
import logoSidiva from "../assets/logo/LOGO SIDIVA GOLD.png";

interface PrizeScreenProps {
  prize: Prize;
  onBack: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
  prizeIndex: number;
  totalPrizes: number;
}

type GlobalState = "idle" | "spinning" | "done";

interface SlotState {
  winner: Participant | null;
  isSpinning: boolean;
}

const PrizeScreen: React.FC<PrizeScreenProps> = ({
  prize, onBack, onNext, isFirst, isLast, prizeIndex, totalPrizes,
}) => {
  const [globalState, setGlobalState] = useState<GlobalState>("idle");
  const emptySlots = () =>
    Array.from({ length: prize.quantity }, (): SlotState => ({ winner: null, isSpinning: false }));
  const [slots, setSlots] = useState<SlotState[]>(emptySlots);
  const [pool, setPool] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULT_SETTINGS);
  const completedRef = useRef(0);

  useEffect(() => {
    api.settings().then(setSettings).catch(() => {});
  }, []);

  /* Muat pool peserta + pemenang yang sudah tersimpan di server (aman saat refresh / pindah hadiah) */
  useEffect(() => {
    let cancelled = false;
    Promise.all([api.pool(), api.winners(prize.id)])
      .then(([poolData, winners]) => {
        if (cancelled) return;
        setPool(poolData);
        const restored = emptySlots();
        winners.forEach((w) => {
          if (w.slotNo < restored.length) restored[w.slotNo] = { winner: w, isSpinning: false };
        });
        setSlots(restored);
        completedRef.current = winners.length;
        setGlobalState(winners.length > 0 ? "done" : "idle");
      })
      .catch((e: Error) => !cancelled && setError(`Gagal terhubung ke server: ${e.message}`))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prize.id]);

  /* Spin semua slot sekaligus — pemenang ditentukan & disimpan server (status jadi "won") */
  const handleSpin = useCallback(async () => {
    if (globalState !== "idle" || loading) return;
    completedRef.current = 0;
    setError(null);
    setGlobalState("spinning");
    try {
      const { winners } = await api.draw(prize.id, prize.quantity);
      setSlots((prev) => prev.map((_s, i) => ({ winner: winners.find((w) => w.slotNo === i) ?? null, isSpinning: true })));
    } catch (e) {
      setError((e as Error).message);
      setGlobalState("idle");
    }
  }, [globalState, loading, prize.id, prize.quantity]);

  /* Dipanggil SpinBox setelah animasi selesai */
  const handleSlotComplete = useCallback((idx: number) => {
    setSlots((prev) => {
      const n = [...prev];
      n[idx] = { ...n[idx], isSpinning: false };
      return n;
    });
    completedRef.current += 1;
    if (completedRef.current >= prize.quantity) setGlobalState("done");
  }, [prize.quantity]);

  /* Respin 1 kartu: pemenang lama jadi "skipped", peserta baru menggantikan slot */
  const handleSpinSingle = useCallback(async (idx: number) => {
    if (globalState !== "done" || slots[idx].isSpinning) return;
    setError(null);
    setGlobalState("spinning");
    try {
      const { winner } = await api.redraw(prize.id, idx);
      completedRef.current -= 1;
      setSlots((prev) => {
        const n = [...prev];
        n[idx] = { winner, isSpinning: true };
        return n;
      });
    } catch (e) {
      setError((e as Error).message);
      setGlobalState("done");
    }
  }, [globalState, slots, prize.id]);

  /* ── Keyboard Controls ── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          if (globalState === "idle") handleSpin();
          break;
        case "ArrowRight":
          if (!isLast && globalState !== "spinning") { e.preventDefault(); onNext(); }
          break;
        case "ArrowLeft":
          if (!isFirst && globalState !== "spinning") { e.preventDefault(); onBack(); }
          break;
        case "1": case "2": case "3": case "4": case "5":
        case "6": case "7": case "8": case "9": case "0": {
          if (globalState !== "done") break;
          e.preventDefault();
          const keyNum = parseInt(e.key, 10);
          const idx = keyNum === 0 ? 9 : keyNum - 1;
          if (idx < prize.quantity) handleSpinSingle(idx);
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [globalState, isFirst, isLast, handleSpin, handleSpinSingle, onNext, onBack, prize.quantity]);


  /* Bagi slot: separuh pertama kiri, separuh sisanya kanan */
  const half = Math.ceil(prize.quantity / 2);
  const leftIndices = Array.from({ length: half }, (_, i) => i);
  const rightIndices = Array.from({ length: prize.quantity - half }, (_, i) => i + half);
  /* Kartu dipadatkan bila satu kolom berisi > 3 kartu (mis. 10 pemenang = 5 per kolom) agar muat 1080px */
  const compact = half > 3;

  const renderSlot = (i: number) => (
    <SpinBox
      key={i}
      index={i}
      isSpinning={slots[i].isSpinning}
      winner={slots[i].winner}
      pool={pool}
      delay={i * 120}
      prizeColor={prize.color}
      glowColor={prize.glowColor}
      compact={compact}
      onSpinComplete={() => handleSlotComplete(i)}
      onClick={() => handleSpinSingle(i)}
    />
  );

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col font-trueno font-[800] bg-[#1a0010]">

      {/* ── Background image ── */}
      <img
        src={bgImage}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
      />

      {/* ══ TOP BAR: XLSMART kiri, SiDIVA kanan ══ */}
      <div className="relative z-10 flex items-center justify-between flex-shrink-0 px-[4vw] pt-10 ">
        {settings.logoLeft.visible
          ? <img src={logoXlsmart} alt="XLSMART" style={{ height: settings.logoLeft.height }} className="w-auto" />
          : <span />}
        {settings.logoRight.visible
          ? <img src={logoSidiva} alt="SiDIVA" style={{ height: settings.logoRight.height }} className="w-auto" />
          : <span />}
      </div>

      {/* ══ MAIN CONTENT ══ */}
      <div className={`relative z-10 flex flex-col flex-1 items-center justify-start min-h-0 px-[4vw] -mt-[120px]  pt-20 pb-[3vh] ${compact ? "gap-3" : "gap-5"}`}>

        {/* Headline hadiah (gambar: nominal + jumlah pemenang) */}
        <img
          src={prize.image}
          alt={`${prize.amountLabel} - ${prize.quantity} Pemenang`}
          className="h-[170px] w-auto drop-shadow-[0_4px_25px_rgba(0,0,0,.5)]"
        />

        {/* Dua kolom pemenang: kiri & kanan */}
        <div className="flex flex-row items-start justify-center mt-5 gap-[350px] w-full">
          <div className={`flex flex-col items-center ${compact ? "gap-3" : "gap-4"}`}>{leftIndices.map(renderSlot)}</div>
          <div className={`flex flex-col items-center ${compact ? "gap-3" : "gap-4"}`}>{rightIndices.map(renderSlot)}</div>
        </div>
      </div>

      {(loading || error) && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 rounded-xl bg-black/70 px-6 py-3 text-[22px] text-white">
          {error ?? "Memuat data peserta…"}
        </div>
      )}

      {/* ══ BOTTOM BAR: tagline ══ */}
      <div className="relative z-10 flex items-center justify-center flex-shrink-0 px-[4vw] pb-[2vh]">
        <img src={tagline} alt="Go Beyond, Be The Best" className="h-[100px] w-auto" />
        <span className="absolute right-[4vw] bottom-[2vh] text-white/60 font-bold tracking-[.28em] uppercase text-[12px]">
          Hadiah {prizeIndex + 1} / {totalPrizes}
        </span>
      </div>
    </div>
  );
};

export default PrizeScreen;
