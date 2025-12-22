import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Sparkles,
  Calendar,
  Clock,
  Camera,
  Users,
  Trash2, // Иконка удаления
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
import { httpGet, httpPatch } from "../../lib/http";
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
    date: d.toLocaleDateString(),
    time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}
function StatusBadge({ status }: { status?: string }) {
  switch (status) {
    case "new":
      return <Badge className="bg-red-500 hover:bg-red-600">Новый</Badge>;
    case "in-progress":
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600">В работе</Badge>
      );
    case "resolved":
      return <Badge className="bg-green-500 hover:bg-green-600">Решен</Badge>;
    default:
      return <Badge variant="outline">—</Badge>;
  }
}
function SourcePill({ source }: { source?: string }) {
  return source === "manual" ? (
    <div className="flex items-center gap-1.5 text-slate-600">
      <Users className="h-4 w-4" />
      <span>Добавлен вручную</span>
    </div>
  ) : (
    <div className="flex items-center gap-1.5 text-purple-600">
      <Sparkles className="h-4 w-4" />
      <span>ИИ-камера</span>
    </div>
  );
}

export default function IncidentDetails({
  incidentId,
  onBack,
}: IncidentDetailsProps) {
  const { user } = useAuth();

  // Проверка прав (учитываем регистр на всякий случай)
  const isAdmin = user?.role === "admin" || user?.role === "Admin";

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const meta: Record<string, any> = event?.meta || {};
  const source: string = meta.source || "ai";
  const status: StatusVal = (meta.status as StatusVal) || "new";
  const [statusLocal, setStatusLocal] = useState<StatusVal>(status);
  const [savingStatus, setSavingStatus] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const { date, time } = formatDT(event?.timestamp);
  const cameraName = event?.camera?.name || meta.cameraName || "—";
  const cameraId = event?.cameraId || meta.cameraId || "—";
  const description: string =
    meta.description || meta.text || (event?.type ?? "Событие");
  const participants: string = meta.participants || "";
  const location: string = meta.location || meta.place || meta.transcript;
  const videoUrl = event?.videoUrl || null;
  const imageUrl = event?.imageUrl || null;

  // загрузка инцидента
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const e = await httpGet<EventItem>(`/events/${incidentId}`);
        if (!cancelled) {
          setEvent(e);
          setStatusLocal((e.meta?.status as StatusVal) || "new");
        }
      } catch (err1: any) {
        if (!cancelled)
          setLoadError(err1?.message || "Не удалось загрузить инцидент");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [incidentId]);

  // Логика удаления
  async function handleDelete() {
    if (!isAdmin) return;
    if (
      !window.confirm("Вы уверены, что хотите удалить эту запись безвозвратно?")
    )
      return;

    try {
      await deleteEvent(incidentId);
      onBack();
    } catch (e: any) {
      alert("Ошибка при удалении: " + (e?.message || "Неизвестная ошибка"));
    }
  }

  // обновление статуса (без изменений)
  async function handleUpdateStatus() {
    if (!event) return;
    setSavingStatus(true);
    setSaveMsg(null);
    try {
      const prev = event;
      const newMeta = { ...(prev.meta || {}), status: statusLocal };
      setEvent({ ...prev, meta: newMeta });

      try {
        await httpPatch(`/events/${event.id}`, { meta: newMeta });
      } catch (e1) {
        await httpPatch(`/events/${event.id}/meta`, { meta: newMeta });
      }
      setSaveMsg("Статус обновлён.");
    } catch (e: any) {
      setSaveMsg(e?.message || "Не удалось обновить статус");
    } finally {
      setSavingStatus(false);
      setTimeout(() => setSaveMsg(null), 2500);
    }
  }

  const headerRight = useMemo(() => <StatusBadge status={status} />, [status]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-slate-900 mb-1">
            Детали инцидента #{incidentId}
          </h2>
          <p className="text-slate-600">{description}</p>
        </div>

        {/* Кнопка удаления - ЯВНЫЕ СТИЛИ (без variant="destructive") */}
        {isAdmin && (
          <Button
            size="sm"
            className="gap-2 bg-red-600 hover:bg-red-700 text-white border-0 shadow-sm"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Удалить</span>
          </Button>
        )}

        {headerRight}
      </div>

      {loadError && (
        <Alert className="bg-red-50 border-red-200">
          <AlertDescription className="text-red-700">
            {loadError}
          </AlertDescription>
        </Alert>
      )}

      {source === "ai" && !loadError && (
        <Alert className="bg-purple-50 border-purple-200">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-900">
            Этот инцидент автоматически зафиксирован системой ИИ-камер
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Видео/изображение */}
          {(videoUrl || imageUrl) && (
            <Card>
              <CardHeader>
                <CardTitle>Медиа инцидента</CardTitle>
                <CardDescription>
                  Камера {cameraName !== "—" ? cameraName : cameraId} • {time}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden mb-4">
                  {videoUrl ? (
                    <video
                      src={videoUrl}
                      controls
                      className="w-full h-full object-contain bg-black"
                    />
                  ) : (
                    <img
                      src={imageUrl!}
                      alt="incident"
                      className="w-full h-full object-contain bg-black"
                    />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                    <div className="flex items-center justify-between text-white text-sm">
                      <span className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        {cameraName !== "—"
                          ? cameraName
                          : `Камера ${cameraId}`}{" "}
                        • {location}
                      </span>
                      <span>{time}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-slate-400" />
                <div>
                  <div className="text-slate-500">Дата</div>
                  <div className="text-slate-900">{date}</div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-slate-400" />
                <div>
                  <div className="text-slate-500">Время</div>
                  <div className="text-slate-900">{time}</div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <SourcePill source={source} />
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <Camera className="h-5 w-5 text-slate-400" />
                <div>
                  <div className="text-slate-500">Камера</div>
                  <div className="text-slate-900">
                    {cameraName !== "—" ? cameraName : cameraId}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 flex items-center justify-center">
                  🎙️
                </div>
                <div>
                  <div className="text-slate-500">Транскрипт</div>
                  <div className="text-slate-900">{location}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
