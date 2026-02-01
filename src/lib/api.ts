import { httpGet, httpPatch } from "./http";

export type IncidentStatus = "new" | "in-progress" | "resolved";
export type Incident = {
  id: string;
  description: string;
  time: string; // ISO
  status: IncidentStatus;
  type?: string; // scream, profanity_scream, fight, ...
  isAI?: boolean;
  cameraId?: string;
  clipUrl?: string;
  audioUrl?: string;
};
export type School = { id: string; name: string };

export const getSchoolById = (id: string) => httpGet<School>(`/schools/${id}`); // если у тебя путь другой — поменяешь тут
export const getSchools = () => httpGet<School[]>("/schools");

export function listIncidents(params: {
  status?: IncidentStatus;
  q?: string;
  page?: number;
  perPage?: number;
}) {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.q) sp.set("q", params.q);
  if (params.page) sp.set("page", String(params.page));
  if (params.perPage) sp.set("perPage", String(params.perPage));
  // если у тебя эндпоинт /events — просто замени путь
  return httpGet<{ items: Incident[]; total: number }>(
    `/events?${sp.toString()}`,
  );
}

export const getIncident = (id: string) => httpGet<Incident>(`/events/${id}`);
export const updateIncidentStatus = (id: string, status: IncidentStatus) =>
  httpPatch<Incident>(`/events/${id}/status`, { status });

export const getStats = (params: {
  range?: "day" | "week" | "month";
  from?: string;
  to?: string;
}) => {
  const sp = new URLSearchParams();
  if (params.range) sp.set("range", params.range);
  if (params.from) sp.set("from", params.from);
  if (params.to) sp.set("to", params.to);
  return httpGet<{ points: { ts: string; count: number }[] }>(
    `/stats?${sp.toString()}`,
  );
};
