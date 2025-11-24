// src/components/pages/IncidentsPage.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Filter,
  Search,
  Sparkles,
  User,
  ChevronRight,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../ui/dialog";
import { Label } from "../ui/label";

import {
  listEvents,
  type EventItem,
  type ListEventsParams,
} from "../../lib/events";
import { httpGet, httpPost } from "../../lib/http";

type TimePeriod = "day" | "week" | "month";

interface IncidentsPageProps {
  onViewDetails: (id: string) => void;
  schoolId?: string;
}

/* ------------------ helpers + labels ------------------ */

const EVENT_TYPE_LABELS: Record<string, string> = {
  person: "Обнаружен человек",
  crowd: "Скопление людей",
  zone_violation: "Нарушение зоны",
  fight_1v1: "Драка 1-на-1",
  fight_group: "Массовая драка",
  accident: "Несчастный случай",
  scream: "Крик",
  profanity: "Нецензурная лексика",
  SOS: "Сигнал SOS",
  profanity_scream: "Крик + нецензурная лексика",
  abuse: "Оскорбления",
  other: "Другое",
};

const EVENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "profanity", label: EVENT_TYPE_LABELS.profanity },
  { value: "SOS", label: EVENT_TYPE_LABELS.SOS },
  { value: "abuse", label: EVENT_TYPE_LABELS.abuse },
  { value: "other", label: EVENT_TYPE_LABELS.other },
];

function toDate(val: string | number): Date | null {
  try {
    if (typeof val === "number") return new Date(val);
    return new Date(val);
  } catch {
    return null;
  }
}

function formatDateTime(ts: string | number) {
  const d = toDate(ts);
  if (!d || Number.isNaN(d.getTime())) return { date: "-", time: "-" };
  const date = d.toLocaleDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return { date, time };
}

function getStatusBadge(status?: string) {
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

function getSourceIcon(source?: string) {
  return source === "manual" ? (
    <div className="flex items-center gap-1.5 text-slate-600">
      <User className="h-4 w-4" />
      <span>Вручную</span>
    </div>
  ) : (
    <div className="flex items-center gap-1.5 text-purple-600">
      <Sparkles className="h-4 w-4" />
      <span>ИИ-камера</span>
    </div>
  );
}

function getTypeLabel(type?: string) {
  if (!type) return "—";
  return EVENT_TYPE_LABELS[type] || type.toUpperCase();
}

/* ------------------ component ------------------ */

export default function IncidentsPage({
  onViewDetails,
  schoolId,
}: IncidentsPageProps) {
  // filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // period + paging
  const [period, setPeriod] = useState<TimePeriod>("day");
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  // data
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<EventItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // dialog (manual add)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [manualDescription, setManualDescription] = useState("");
  const [manualParticipants, setManualParticipants] = useState("");
  const [manualType, setManualType] = useState<string>("other");
  const [manualCameraId, setManualCameraId] = useState<string>("");
  const [cameras, setCameras] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // period range -> from/to ISO
  const periodRange = useMemo(() => {
    const to = new Date();
    const from = new Date(to);
    if (period === "day") from.setDate(to.getDate() - 1);
    else if (period === "week") from.setDate(to.getDate() - 7);
    else from.setDate(to.getDate() - 30);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [period]);

  // load cameras (для ручного добавления)
  useEffect(() => {
    (async () => {
      try {
        const list = await httpGet<{ id: string; name: string }[]>("/cameras");
        setCameras(list || []);
      } catch {
        setCameras([]);
      }
    })();
  }, []);

  // fetch events
  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: ListEventsParams = {
        limit,
        offset,
        from: periodRange.from,
        to: periodRange.to,
      };
      if (schoolId) params.school_id = schoolId;
      if (typeFilter !== "all") params.type = typeFilter;

      const data = await listEvents(params);
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  // refresh on deps change
  useEffect(() => {
    setOffset(0);
  }, [period, typeFilter, statusFilter, sourceFilter, searchQuery]);

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodRange.from, periodRange.to, typeFilter, limit, offset, schoolId]);

  // client-side refine: status/source from meta + search (memoized)
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    if (statusFilter === "all" && sourceFilter === "all" && !q) {
      return rows;
    }

    return rows.filter((r) => {
      const meta: Record<string, any> = r.meta || {};
      const source = meta.source || "ai";
      const status = meta.status || "new";

      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (sourceFilter !== "all" && source !== sourceFilter) return false;

      if (q) {
        const description =
          meta.description || meta.text || getTypeLabel(r.type);
        const participants = meta.participants || "";
        const cameraName = r.camera?.name || "";
        const typeLabel = getTypeLabel(r.type);

        const searchableText =
          `${description} ${participants} ${cameraName} ${typeLabel}`.toLowerCase();

        if (!searchableText.includes(q)) return false;
      }

      return true;
    });
  }, [rows, statusFilter, sourceFilter, searchQuery]);

  async function handleSaveManual() {
    if (!manualCameraId) return;
    setSaving(true);
    setSaveError(null);
    try {
      await httpPost("/events/ingest", {
        camera_id: manualCameraId,
        type: manualType,
        meta: {
          source: "manual",
          status: "new",
          description: manualDescription,
          participants: manualParticipants,
        },
      });
      setIsAddDialogOpen(false);
      setManualDescription("");
      setManualParticipants("");
      setManualType("other");
      setManualCameraId("");
      setSaveError(null);
      await fetchEvents();
    } catch (e: any) {
      setSaveError(e?.message || "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  const totalCount = filtered.length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-slate-900 mb-1">Журнал инцидентов</h2>
          <p className="text-slate-600">Управление и мониторинг всех событий</p>
        </div>

        <div className="flex gap-2">
          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as TimePeriod)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Период" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Сегодня</SelectItem>
              <SelectItem value="week">7 дней</SelectItem>
              <SelectItem value="month">30 дней</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            {/* <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Добавить вручную
              </Button>
            </DialogTrigger> */}

            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Новый инцидент</DialogTitle>
                <DialogDescription>
                  Заполните информацию о вручную зафиксированном событии
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Камера</Label>
                  <Select
                    value={manualCameraId}
                    onValueChange={setManualCameraId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите камеру" />
                    </SelectTrigger>
                    <SelectContent>
                      {cameras.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Тип события</Label>
                  <Select value={manualType} onValueChange={setManualType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Тип" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Описание</Label>
                  <Input
                    id="description"
                    placeholder="Кратко о произошедшем"
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="participants">Участники</Label>
                  <Input
                    id="participants"
                    placeholder="Имена / классы"
                    value={manualParticipants}
                    onChange={(e) => setManualParticipants(e.target.value)}
                  />
                </div>
              </div>

              {saveError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {saveError}
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleSaveManual}
                  disabled={saving || !manualCameraId}
                >
                  {saving ? "Сохранение…" : "Сохранить"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Поиск: описание, участники, камера…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="Статус" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="new">Новый</SelectItem>
                  <SelectItem value="in-progress">В работе</SelectItem>
                  <SelectItem value="resolved">Решен</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Источник" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="ai">ИИ-камера</SelectItem>
                  <SelectItem value="manual">Вручную</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Тип события" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  {EVENT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Пагинация/лимит */}
          <div className="flex gap-3 items-center mt-4">
            <span className="text-sm text-slate-500">Показывать по:</span>
            <Select
              value={String(limit)}
              onValueChange={(v) => setLimit(Number(v))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0 || loading}
              >
                Назад
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(offset + limit)}
                disabled={loading || rows.length < limit}
              >
                Далее
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="text-slate-600">
        Найдено инцидентов: <span className="text-slate-900">{totalCount}</span>
        {error && <span className="text-red-600 ml-3">{error}</span>}
      </div>

      {/* Incidents Table - Desktop */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата и время</TableHead>
                <TableHead>Камера</TableHead>
                <TableHead>Источник</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-[100px]">Действие</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-slate-500">
                    Загрузка…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-slate-500">
                    Ничего не найдено
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e) => {
                  const { date, time } = formatDateTime(e.timestamp);
                  const meta = (e.meta as any) || {};
                  const source = meta.source || "ai";
                  const status = meta.status || "new";

                  const description =
                    meta.description || meta.text || getTypeLabel(e.type);

                  return (
                    <TableRow
                      key={e.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => onViewDetails(e.id)}
                    >
                      <TableCell>
                        <div>
                          <div className="text-slate-900">{date}</div>
                          <div className="text-slate-500">{time}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-700">
                        {e.camera?.name ?? "—"}
                      </TableCell>
                      <TableCell>{getSourceIcon(source)}</TableCell>
                      <TableCell className="text-slate-900">
                        {description}
                      </TableCell>
                      <TableCell>{getStatusBadge(status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onViewDetails(e.id);
                          }}
                        >
                          Подробнее
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Incidents List - Mobile */}
      <div className="lg:hidden space-y-3">
        {loading && (
          <Card>
            <CardContent className="p-4 text-slate-500">Загрузка…</CardContent>
          </Card>
        )}
        {!loading && filtered.length === 0 && (
          <Card>
            <CardContent className="p-4 text-slate-500">
              Ничего не найдено
            </CardContent>
          </Card>
        )}
        {!loading &&
          filtered.map((e) => {
            const { date, time } = formatDateTime(e.timestamp);
            const meta = (e.meta as any) || {};
            const source = meta.source || "ai";
            const status = meta.status || "new";

            const description =
              meta.description || meta.text || getTypeLabel(e.type);

            const participants = meta.participants || "";

            return (
              <Card
                key={e.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => onViewDetails(e.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-slate-900 mb-1">{description}</div>
                      <div className="text-slate-500">
                        {date} в {time}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    {getSourceIcon(source)}
                  </div>

                  {participants && (
                    <div className="text-slate-600 mb-3">{participants}</div>
                  )}

                  <div className="flex items-center justify-between">
                    {getStatusBadge(status)}
                    <Button variant="ghost" size="sm">
                      Подробнее
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
