import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Sparkles,
  Calendar,
  Clock,
  Camera,
  Users,
  Trash2,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Alert, AlertDescription } from "../ui/alert";
import { httpGet } from "../../lib/http";
import { type EventItem, deleteEvent } from "../../lib/events";
import { useAuth } from "../../providers/AuthProvider";

interface IncidentDetailsProps {
  incidentId: string;
  onBack: () => void;
}

type StatusVal = "new" | "in-progress" | "resolved";

function toDate(val: string | number | undefined | null): Date | null {
  if (val == null) return null;
  try {
    return new Date(val);
  } catch {
    return null;
  }
}

function formatDT(val: string | number | undefined | null) {
  const d = toDate(val);
  if (!d || Number.isNaN(d.getTime())) return { date: "-", time: "-" };
  return {
    date: d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
  };
}

function StatusBadge({ status }: { status?: string }) {
  switch (status) {
    case "new":
      return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.2)] px-3 py-1 uppercase text-xs tracking-wider font-bold">Новый</Badge>;
    case "in-progress":
      return (
        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)] px-3 py-1 uppercase text-xs tracking-wider font-bold">В работе</Badge>
      );
    case "resolved":
      return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)] px-3 py-1 uppercase text-xs tracking-wider font-bold">Решен</Badge>;
    default:
      return <Badge variant="outline" className="border-slate-700 text-slate-400 px-3 py-1 uppercase text-xs tracking-wider font-bold">—</Badge>;
  }
}

function SourcePill({ source }: { source?: string }) {
  return source === "manual" ? (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-semibold shadow-inner">
      <Users className="h-4 w-4 text-slate-400" />
      <span>Добавлен вручную</span>
    </div>
  ) : (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-semibold shadow-inner">
      <Sparkles className="h-4 w-4 text-indigo-400" />
      <span>ИИ-камера</span>
    </div>
  );
}

export default function IncidentDetails({
  incidentId,
  onBack,
}: IncidentDetailsProps) {
  const { user } = useAuth();
  const isAdmin = (user?.role || "").toLowerCase() === "admin";

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const meta: Record<string, any> = event?.meta || {};
  const source: string = meta.source || "ai";
  const status: StatusVal = (meta.status as StatusVal) || "new";

  const { date, time } = formatDT(event?.timestamp);
  const cameraName = event?.camera?.name || meta.cameraName || "—";
  const cameraId = event?.cameraId || meta.cameraId || "—";
  const description: string = meta.description || meta.text || (event?.type ?? "Событие");
  const location: string = meta.location || meta.place || meta.transcript;
  const videoUrl = event?.videoUrl || null;
  const imageUrl = event?.imageUrl || null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const e = await httpGet<EventItem>(`/events/${incidentId}`);
        if (!cancelled) {
          setEvent(e);
        }
      } catch (err1: any) {
        if (!cancelled) setLoadError(err1?.message || "Не удалось загрузить инцидент");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [incidentId]);

  async function handleDelete() {
    if (!isAdmin) return;
    if (!window.confirm("Вы уверены, что хотите удалить эту запись безвозвратно?")) return;
    try {
      await deleteEvent(incidentId);
      onBack();
    } catch (e: any) {
      alert("Ошибка при удалении: " + (e?.message || "Неизвестная ошибка"));
    }
  }

  const headerRight = useMemo(() => <StatusBadge status={status} />, [status]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-indigo-400">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl border border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
              Инцидент <span className="text-indigo-400">#{incidentId.substring(0,8)}</span>
            </h2>
            <p className="text-slate-300 text-lg font-medium">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {headerRight}
          {isAdmin && (
            <Button
              onClick={handleDelete}
              variant="destructive"
              className="bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-600/30 rounded-xl font-bold shadow-sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </Button>
          )}
        </div>
      </div>

      {loadError && (
        <Alert className="bg-rose-500/10 border-rose-500/20 rounded-2xl">
          <AlertDescription className="text-rose-400 font-medium">
            {loadError}
          </AlertDescription>
        </Alert>
      )}

      {source === "ai" && !loadError && (
        <Alert className="bg-indigo-500/10 border-indigo-500/20 rounded-2xl flex items-center shadow-inner">
          <Sparkles className="h-5 w-5 text-indigo-400" />
          <AlertDescription className="text-indigo-200 font-medium ml-2">
            Этот инцидент автоматически зафиксирован системой ИИ-камер
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Медиа */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-900/30 border-b border-slate-800/40 pb-4">
              <CardTitle className="text-white text-xl">Медиа инцидента</CardTitle>
              <CardDescription className="text-slate-400 font-medium">
                Камера {cameraName !== "—" ? cameraName : cameraId} • {time}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {(videoUrl || imageUrl) ? (
                <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                  {videoUrl ? (
                    <video
                      src={videoUrl}
                      controls
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={imageUrl!}
                      alt="incident"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-slate-500">
                  <Camera className="w-12 h-12 opacity-20 mb-4" />
                  <p className="font-medium">Медиа файлы отсутствуют</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Инфо */}
        <div className="space-y-6">
          <Card className="border border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-900/30 border-b border-slate-800/40 pb-4">
              <CardTitle className="text-white text-xl">Детальная информация</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <Calendar className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-0.5">Дата</div>
                  <div className="text-slate-200 font-semibold">{date}</div>
                </div>
              </div>

              <Separator className="bg-slate-800/60" />

              <div className="flex items-center gap-4">
                <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                  <Clock className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-0.5">Время</div>
                  <div className="text-slate-200 font-semibold">{time}</div>
                </div>
              </div>

              <Separator className="bg-slate-800/60" />

              <div className="flex items-center gap-4">
                <SourcePill source={source} />
              </div>

              <Separator className="bg-slate-800/60" />

              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <Camera className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-0.5">Локация</div>
                  <div className="text-slate-200 font-semibold">
                    {cameraName !== "—" ? cameraName : cameraId}
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-800/60" />

              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                  <span className="text-lg leading-none">🎙️</span>
                </div>
                <div>
                  <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-0.5">Транскрипт</div>
                  <div className="text-slate-200 font-medium leading-relaxed">{location || "Нет данных транскрипции"}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
