import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, getToken, setToken, DEFAULT_SETTINGS } from "../api";
import type { AdminParticipant, Status, DisplaySettings } from "../api";
import { PRIZES } from "../data/prizes";
import logoXlsmart from "../assets/logo/XLSMART.png";

const STATUS_LABEL: Record<Status, string> = { available: "Tersedia", won: "Menang", skipped: "Dilewati" };
const STATUS_STYLE: Record<Status, string> = {
  available: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  won: "bg-amber-50 text-amber-700 ring-amber-200",
  skipped: "bg-slate-100 text-slate-600 ring-slate-200",
};
const STATUS_DOT: Record<Status, string> = {
  available: "bg-emerald-500", won: "bg-amber-500", skipped: "bg-slate-400",
};

const prizeLabel = (id: number | null) => {
  const p = PRIZES.find((x) => x.id === id);
  return p ? `${p.name} ${p.amountLabel}` : "-";
};

const btn = {
  primary: "rounded-lg bg-smartfren-pink px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-smartfren-dark disabled:opacity-50",
  danger: "rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700",
  ghost: "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50",
};

interface Confirm { title: string; body: string; action: () => void; danger?: boolean }

function Login({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      setToken((await api.login(password)).token);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-smartfren-black via-smartfren-deeper to-smartfren-pink p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-8 shadow-2xl">
        <div className="text-center">
          <img src={logoXlsmart} alt="XLSMART" className="mx-auto h-16 w-auto rounded bg-smartfren-black px-3 py-1" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Admin Doorprize</h1>
          <p className="text-sm text-slate-500">Masuk untuk mengelola peserta & pemenang</p>
        </div>
        <input
          type="password" autoFocus value={password}
          onChange={(e) => { setPassword(e.target.value); setError(""); }}
          placeholder="Password"
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-smartfren-pink focus:ring-2 focus:ring-smartfren-pink/20"
        />
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button disabled={busy || !password} className={`${btn.primary} w-full py-2.5`}>
          {busy ? "Memeriksa…" : "Masuk"}
        </button>
      </form>
    </div>
  );
}

function LogoControl({ label, value, onChange }: {
  label: string;
  value: DisplaySettings["logoLeft"];
  onChange: (v: DisplaySettings["logoLeft"]) => void;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <label className="flex items-center justify-between gap-3">
        <span className="font-semibold">{label}</span>
        <span className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={value.visible} onChange={(e) => onChange({ ...value, visible: e.target.checked })} />
          Tampilkan
        </span>
      </label>
      <div className={`mt-3 flex items-center gap-3 ${value.visible ? "" : "opacity-40"}`}>
        <input
          type="range" min={20} max={400} value={value.height} disabled={!value.visible}
          onChange={(e) => onChange({ ...value, height: Number(e.target.value) })}
          className="flex-1"
        />
        <input
          type="number" min={20} max={400} value={value.height} disabled={!value.visible}
          onChange={(e) => onChange({ ...value, height: Number(e.target.value) })}
          className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
        />
        <span className="text-sm text-slate-500">px</span>
      </div>
    </div>
  );
}

export default function Admin() {
  const [authed, setAuthed] = useState(!!getToken());
  const [rows, setRows] = useState<AdminParticipant[]>([]);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [display, setDisplay] = useState<DisplaySettings>(DEFAULT_SETTINGS);
  const [confirmBox, setConfirmBox] = useState<Confirm | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((text: string, error = false) => {
    setToast({ text, error });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const logout = () => { setToken(null); setAuthed(false); };

  const load = useCallback(async () => {
    try {
      setRows((await api.adminList()).participants);
    } catch (e) {
      notify((e as Error).message, true);
      if (!getToken()) setAuthed(false);
    }
  }, [notify]);

  useEffect(() => {
    if (!authed) return;
    load();
    api.settings().then(setDisplay).catch(() => {});
  }, [authed, load]);

  const run = async (fn: () => Promise<unknown>, okMsg = "") => {
    try {
      const custom = await fn();
      notify(typeof custom === "string" && custom ? custom : okMsg);
      await load();
    } catch (e) {
      notify((e as Error).message, true);
      if (!getToken()) setAuthed(false);
    }
  };

  const ask = (c: Confirm) => setConfirmBox(c);

  const importFile = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      const list = (Array.isArray(data) ? data : []).map((r: Record<string, unknown>) => ({
        msisdn: String(r.msisdn ?? r.ro_msisdn ?? ""),
        name: String(r.name ?? r.ro_name ?? ""),
        region: String(r.region ?? r.ro_region ?? ""),
      }));
      const r = await api.adminImport(list);
      notify(`Import: ${r.added} ditambah, ${r.skipped} dilewati (duplikat/kosong)`);
      load();
    } catch (e) {
      notify(`Import gagal: ${(e as Error).message}`, true);
    }
  };

  const counts = useMemo(() => {
    const c = { available: 0, won: 0, skipped: 0 };
    rows.forEach((r) => c[r.status]++);
    return c;
  }, [rows]);

  const winnersByPrize = useMemo(() => {
    const m = new Map<number, AdminParticipant[]>();
    rows.filter((r) => r.status === "won" && r.prizeId !== null).forEach((r) => {
      m.set(r.prizeId!, [...(m.get(r.prizeId!) ?? []), r]);
    });
    m.forEach((l) => l.sort((a, b) => (a.slotNo ?? 0) - (b.slotNo ?? 0)));
    return m;
  }, [rows]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) => (filter === "all" || r.status === filter) &&
        (!q || r.name.toLowerCase().includes(q) || r.msisdn.includes(q) || r.region.toLowerCase().includes(q)),
    );
  }, [rows, filter, search]);

  if (!authed) return <Login onDone={() => setAuthed(true)} />;

  const stats: { label: string; value: number; status: Status | "all"; color: string }[] = [
    { label: "Total peserta", value: rows.length, status: "all", color: "border-smartfren-pink" },
    { label: "Tersedia", value: counts.available, status: "available", color: "border-emerald-500" },
    { label: "Menang", value: counts.won, status: "won", color: "border-amber-500" },
    { label: "Dilewati", value: counts.skipped, status: "skipped", color: "border-slate-400" },
  ];

  return (
    <div className="min-h-full bg-slate-100 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-smartfren-black via-smartfren-deeper to-smartfren-pink shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <img src={logoXlsmart} alt="XLSMART" className="h-10 w-auto" />
          <div className="mr-auto leading-tight text-white">
            <div className="text-lg font-bold">Admin Doorprize</div>
            <div className="text-xs text-white/70">Kelola peserta, pemenang & reset</div>
          </div>
          <a href="#/1" className="rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/25">
            Layar undian →
          </a>
          <button onClick={logout} className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10">
            Keluar
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {/* Stat cards (klik untuk filter) */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <button
              key={s.label} onClick={() => setFilter(s.status)}
              className={`rounded-xl border-l-4 bg-white p-4 text-left shadow-sm transition hover:shadow-md ${s.color} ${filter === s.status ? "ring-2 ring-smartfren-pink/40" : ""}`}
            >
              <div className="text-sm text-slate-500">{s.label}</div>
              <div className="text-3xl font-extrabold tabular-nums">{s.value}</div>
            </button>
          ))}
        </section>

        {/* Pengaturan logo layar undian */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Logo layar undian</h2>
            <button
              className={btn.primary}
              onClick={() => run(async () => { setDisplay(await api.saveSettings(display)); return "Pengaturan logo disimpan"; })}
            >
              Simpan
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <LogoControl label="Logo kiri atas (XLSMART)" value={display.logoLeft} onChange={(v) => setDisplay({ ...display, logoLeft: v })} />
            <LogoControl label="Logo kanan atas (SiDIVA)" value={display.logoRight} onChange={(v) => setDisplay({ ...display, logoRight: v })} />
          </div>
          <p className="mt-2 text-xs text-slate-500">Ukuran = tinggi logo pada kanvas 1920×1080. Muat ulang layar undian setelah menyimpan.</p>
        </section>

        {/* Hadiah & pemenang */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Hadiah & pemenang</h2>
            <button
              className={btn.danger}
              onClick={() => ask({
                title: "Reset semua?", danger: true,
                body: "Semua peserta berstatus Menang atau Dilewati akan kembali menjadi Tersedia. Data peserta tidak dihapus.",
                action: () => run(async () => `${(await api.adminReset()).reset} peserta direset`),
              })}
            >
              Reset semua
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {PRIZES.map((p) => {
              const w = winnersByPrize.get(p.id) ?? [];
              const pct = Math.round((w.length / p.quantity) * 100);
              return (
                <div key={p.id} className="flex flex-col rounded-xl bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hadiah {p.id} · {p.name}</div>
                      <div className="text-xl font-extrabold text-smartfren-dark">{p.amountLabel}</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${w.length ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                      {w.length}/{p.quantity} pemenang
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-smartfren-pink transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <ul className="mt-3 max-h-40 flex-1 space-y-1 overflow-auto text-sm">
                    {w.length === 0 && <li className="text-slate-400">Belum diundi</li>}
                    {w.map((r) => (
                      <li key={r.id} className="flex justify-between gap-2">
                        <span className="truncate"><span className="mr-1.5 text-slate-400">{(r.slotNo ?? 0) + 1}.</span>{r.name}</span>
                        <span className="shrink-0 text-xs text-slate-500">{r.region}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    disabled={w.length === 0}
                    className={`${btn.ghost} mt-3 disabled:opacity-40`}
                    onClick={() => ask({
                      title: `Reset hadiah ${p.id}?`, danger: true,
                      body: `${w.length} pemenang ${prizeLabel(p.id)} akan dikembalikan ke status Tersedia, hadiah ini bisa diundi ulang.`,
                      action: () => run(async () => `${(await api.adminReset(p.id)).reset} pemenang direset`),
                    })}
                  >
                    Reset hadiah ini
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Tabel peserta */}
        <section className="rounded-xl bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
            <h2 className="mr-auto text-lg font-bold">Peserta <span className="text-sm font-normal text-slate-500">({shown.length} ditampilkan)</span></h2>
            <input
              value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama / msisdn / region"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-smartfren-pink focus:ring-2 focus:ring-smartfren-pink/20 sm:w-72"
            />
            <select value={filter} onChange={(e) => setFilter(e.target.value as Status | "all")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="all">Semua status</option>
              {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <label className={`${btn.ghost} cursor-pointer`}>
              Import JSON
              <input type="file" accept=".json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ""; }} />
            </label>
          </div>

          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {["#", "Msisdn", "Nama", "Region", "Status", "Hadiah", "Waktu", ""].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Tidak ada peserta yang cocok</td></tr>
                )}
                {shown.map((r, i) => (
                  <tr key={r.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.msisdn}</td>
                    <td className="px-4 py-2.5 font-medium">{r.name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.region}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLE[r.status]}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[r.status]}`} />{STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{r.status === "won" ? `${prizeLabel(r.prizeId)} · slot ${(r.slotNo ?? 0) + 1}` : "-"}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">{r.wonAt ?? "-"}</td>
                    <td className="space-x-3 whitespace-nowrap px-4 py-2.5 text-right">
                      {r.status !== "available" ? (
                        <button className="font-medium text-emerald-700 hover:underline" onClick={() => run(() => api.adminSetStatus(r.id, "available"), `${r.name} dikembalikan ke pool`)}>Kembalikan</button>
                      ) : (
                        <button className="font-medium text-slate-600 hover:underline" onClick={() => run(() => api.adminSetStatus(r.id, "skipped"), `${r.name} dikeluarkan dari undian`)}>Keluarkan</button>
                      )}
                      <button
                        className="font-medium text-red-600 hover:underline"
                        onClick={() => ask({
                          title: `Hapus ${r.name}?`, danger: true,
                          body: "Peserta dihapus permanen dari database.",
                          action: () => run(() => api.adminDelete(r.id), `${r.name} dihapus`),
                        })}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg px-5 py-3 text-sm font-medium text-white shadow-lg ${toast.error ? "bg-red-600" : "bg-slate-900"}`}>
          {toast.text}
        </div>
      )}

      {/* Konfirmasi */}
      {confirmBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmBox(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">{confirmBox.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{confirmBox.body}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button className={btn.ghost} onClick={() => setConfirmBox(null)}>Batal</button>
              <button
                className={confirmBox.danger ? btn.danger : btn.primary}
                onClick={() => { const a = confirmBox.action; setConfirmBox(null); a(); }}
              >
                Ya, lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
