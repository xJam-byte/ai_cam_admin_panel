import { httpGet } from './http';

export type EventItem = {
  id: string;
  type: string;           // EventType из БД
  timestamp: string|number; // ISO или ms
  cameraId?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  score?: number | null;
  meta?: Record<string, any> | null;
  // опционально: сервер может расширить
  camera?: { name?: string } | null;
};

export type ListEventsParams = {
  camera_id?: string;
  type?: string;          // один или CSV
  from?: string;          // ISO
  to?: string;            // ISO
  limit?: number;
  offset?: number;
  school_id?: string;
};

export async function listEvents(p: ListEventsParams = {}): Promise<EventItem[]> {
  const sp = new URLSearchParams();
  if (p.camera_id) sp.set('camera_id', p.camera_id);
  if (p.type)      sp.set('type', p.type);
  if (p.from)      sp.set('from', p.from);
  if (p.to)        sp.set('to', p.to);
  if (p.limit)     sp.set('limit', String(p.limit));
  if (p.offset)    sp.set('offset', String(p.offset));
  if (p.school_id) sp.set('school_id', p.school_id);
  const q = sp.toString();
  return httpGet<EventItem[]>(`/events${q ? `?${q}` : ''}`);
}
