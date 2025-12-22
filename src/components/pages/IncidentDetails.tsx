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

  // --- ЖЕСТКАЯ ПРОВЕРКА ---
  const rawRole = user?.role || "";
  // Убираем пробелы и приводим к нижнему регистру
  const cleanRole = rawRole.trim().toLowerCase();
  const isAdmin = cleanRole === "admin";

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

  async function handleDelete() {
    if (!isAdmin) return;
    if (!window.confirm("Удалить эту запись безвозвратно?")) return;
    try {
      await deleteEvent(incidentId);
      onBack();
    } catch (e: any) {
      alert("Ошибка при удалении: " + (e?.message || "Неизвестная ошибка"));
    }
  }

  // Обновление статуса (без изменений)
  async function handleUpdateStatus() {
    /* ... */
  }

  const headerRight = useMemo(() => <StatusBadge status={status} />, [status]);

  return (
    <div className="space-y-6">
      {/* --- ВИЗУАЛЬНЫЙ ОТЛАДЧИК (Покажет точно, что видит код) --- */}
      <div className="bg-slate-100 p-2 text-xs text-slate-500 font-mono border border-slate-300 rounded mb-4">
        DEBUG INFO: Role=[{cleanRole}] IsAdmin=[{isAdmin ? "YES" : "NO"}]
        {isAdmin && (
          <span className="ml-2 text-green-600 font-bold">
            ADMIN ACCESS GRANTED
          </span>
        )}
      </div>

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

        {/* КНОПКА УДАЛЕНИЯ */}
        {/* Я убрал проверку loading и loadError, чтобы кнопка рендерилась всегда, если ты админ */}
        {isAdmin && (
          <button
            // Используем обычный HTML button временно, чтобы исключить глюк компонента Button
            className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
            Удалить
          </button>
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

      {/* ... Остальной контент (видео, карточки) без изменений ... */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
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
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ... Инфо поля ... */}
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
