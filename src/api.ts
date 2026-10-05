import type { Participant } from "./data/prizes";

// Dev: lewat proxy Vite ("/api"). Production: set VITE_API_URL, mis. https://api.contoh.com
const BASE = `${import.meta.env.VITE_API_URL ?? ""}/api`;

export interface Winner extends Participant {
  slotNo: number;
}

export type Status = "available" | "won" | "skipped";

export interface AdminParticipant {
  id: number;
  msisdn: string;
  name: string;
  region: string;
  status: Status;
  prizeId: number | null;
  slotNo: number | null;
  wonAt: string | null;
}

const TOKEN_KEY = "doorprizeAdminToken";
export const getToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) =>
  t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY);

async function request<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) headers.Authorization = `Bearer ${getToken() ?? ""}`;
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (auth && res.status === 401) setToken(null);
    throw new Error(body.error || `Request gagal (${res.status})`);
  }
  return body as T;
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const api = {
  pool: () => request<Participant[]>("/pool"),
  winners: (prizeId: number) => request<Winner[]>(`/winners/${prizeId}`),
  draw: (prizeId: number, quantity: number) =>
    request<{ winners: Winner[] }>("/draw", post({ prizeId, quantity })),
  redraw: (prizeId: number, slotNo: number) =>
    request<{ winner: Winner }>("/redraw", post({ prizeId, slotNo })),

  login: (password: string) => request<{ token: string }>("/admin/login", post({ password })),
  adminList: () =>
    request<{ participants: AdminParticipant[]; summary: Partial<Record<Status, number>> }>(
      "/admin/participants", {}, true),
  adminSetStatus: (id: number, status: "available" | "skipped") =>
    request<AdminParticipant>(`/admin/participants/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }, true),
  adminDelete: (id: number) => request<{ ok: true }>(`/admin/participants/${id}`, { method: "DELETE" }, true),
  adminImport: (participants: { msisdn: string; name: string; region: string }[]) =>
    request<{ added: number; skipped: number }>("/admin/participants", post({ participants }), true),
  adminReset: (prizeId?: number) =>
    request<{ reset: number }>("/admin/reset", post(prizeId === undefined ? {} : { prizeId }), true),
};
