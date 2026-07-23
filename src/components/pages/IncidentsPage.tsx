// src/components/pages/IncidentsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Filter,
  Search,
  Sparkles,
  User,
  ChevronRight,
  FilterX,
  Calendar as CalendarIcon,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
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
import { useAuth } from "../../providers/AuthProvider";
import { getSchools, type School } from "../../lib/api";
import { cn } from "../ui/utils";

type TimePeriod = "day" | "week" | "month" | "custom" | "all";

interface IncidentsPageProps {
  onViewDetails: (id: string) => void;
  schoolId?: string;
}

/* --- helpers --- */

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
  const date = d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return { date, time };
}

function getStatusBadge(status?: string) {
  switch (status) {
    case "new":
      return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-inner px-2 py-0.5 uppercase text-[10px] tracking-wider font-bold hover:bg-rose-500/20">Новый</Badge>;
    case "in-progress":
      return (
        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-inner px-2 py-0.5 uppercase text-[10px] tracking-wider font-bold hover:bg-amber-500/20">В работе</Badge>
      );
    case "resolved":
      return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-inner px-2 py-0.5 uppercase text-[10px] tracking-wider font-bold hover:bg-emerald-500/20">Решен</Badge>;
    default:
      return <Badge variant="outline" className="border-slate-300 text-slate-500 px-2 py-0.5 uppercase text-[10px] tracking-wider font-bold">—</Badge>;
  }
}

function getSourceIcon(source?: string) {
  return source === "manual" ? (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100/50 border border-slate-300/50 text-slate-700 text-xs font-semibold shadow-inner">
      <User className="h-3.5 w-3.5 text-slate-500" />
      <span>Вручную</span>
    </div>
  ) : (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold shadow-inner">
      <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
      <span>ИИ-камера</span>
    </div>
  );
}

export default function IncidentsPage({
  onViewDetails,
  schoolId,
}: IncidentsPageProps) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusFilter = searchParams.get("status") || "all";
  const sourceFilter = searchParams.get("source") || "all";
  const typeFilter = searchParams.get("type") || "all";

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  const [schools, setSchools] = useState<School[]>([]);
  const selectedSchoolId = searchParams.get("schoolId") || "all";

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const period = (searchParams.get("period") || "day") as TimePeriod;
  const limit = Number(searchParams.get("limit")) || 50;
  const offset = Number(searchParams.get("offset")) || 0;

  const dateRange = useMemo(() => {
    let fromDate: Date;
    let toDate: Date = new Date();

    if (fromParam && toParam) {
      fromDate = new Date(fromParam);
      toDate = new Date(toParam);
    } else {
      fromDate = new Date();
      if (period === "day") {
        fromDate.setHours(0, 0, 0, 0);
      } else if (period === "week") {
        fromDate.setDate(fromDate.getDate() - 7);
        fromDate.setHours(0, 0, 0, 0);
      } else if (period === "all") {
        fromDate = new Date(0);
      } else {
        fromDate.setDate(fromDate.getDate() - 30);
        fromDate.setHours(0, 0, 0, 0);
      }
    }
    return { from: fromDate, to: toDate };
  }, [fromParam, toParam, period]);

  const updateParam = (key: string, val: string, resetPage = true) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val === "all" && key !== "q") next.delete(key);
      else if (!val) next.delete(key);
      else next.set(key, val);

      if (resetPage) next.delete("offset");
      return next;
    });
  };

  const setTypeFilter = (v: string) => updateParam("type", v, true);
  const setSelectedSchoolId = (v: string) => updateParam("schoolId", v, true);

  const setPeriod = (v: TimePeriod) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("period", v);
      next.delete("from");
      next.delete("to");
      next.delete("offset");
      return next;
    });
  };

  const handleSelectRange = (range: DateRange | undefined) => {
    if (!range) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (range.from) {
        next.set("from", range.from.toISOString().split("T")[0]);
        next.set("period", "custom");
      } else {
        next.delete("from");
      }
      if (range.to) {
        next.set("to", range.to.toISOString().split("T")[0]);
      } else {
        next.delete("to");
      }
      next.delete("offset");
      return next;
    });
  };

  const setLimit = (v: number) => updateParam("limit", String(v), true);
  const setOffset = (v: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (v === 0) next.delete("offset");
      else next.set("offset", String(v));
      return next;
    });
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchParams((prev) => {
        const currentQ = prev.get("q") || "";
        if (currentQ === searchQuery) return prev;

        const next = new URLSearchParams(prev);
        if (searchQuery) next.set("q", searchQuery);
        else next.delete("q");

        next.delete("offset");
        return next;
      });
    }, 500);
    return () => clearTimeout(t);
  }, [searchQuery, setSearchParams]);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<EventItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [manualDescription, setManualDescription] = useState("");
  const [manualParticipants, setManualParticipants] = useState("");
  const [manualType, setManualType] = useState<string>("other");
  const [manualCameraId, setManualCameraId] = useState<string>("");
  const [cameras, setCameras] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const periodRange = useMemo(() => {
    const fromISO = new Date(dateRange.from);
    fromISO.setHours(0, 0, 0, 0);
    const toISO = new Date(dateRange.to);
    toISO.setHours(23, 59, 59, 999);
    return { from: fromISO.toISOString(), to: toISO.toISOString() };
  }, [dateRange]);

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

  useEffect(() => {
    if (user?.role === "admin") {
      getSchools()
        .then((res) => setSchools(res || []))
        .catch(() => {});
    }
  }, [user?.role]);

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

      if (schoolId) {
        params.school_id = schoolId;
      } else if (user?.role === "admin") {
        if (selectedSchoolId !== "all") {
          params.school_id = selectedSchoolId;
        }
      } else if (user?.schoolId) {
        params.school_id = user.schoolId;
      }

      if (typeFilter !== "all") params.type = typeFilter;

      const data = await listEvents(params);
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSearchParams((prev) => {
      const next = new URLSearchParams();
      if (prev.has("limit")) next.set("limit", prev.get("limit")!);
      return next;
    });
  };

  useEffect(() => {
    fetchEvents();
  }, [
    periodRange.from,
    periodRange.to,
    typeFilter,
    limit,
    offset,
    schoolId,
    selectedSchoolId,
  ]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      const meta = (r.meta as any) || {};
      const source = (meta.source as string) || "ai";
      const status = (meta.status as string) || "new";
      const description =
        (meta.description as string) || (meta.text as string) || r.type;
      const participants = (meta.participants as string) || "";
      const cameraName = r.camera?.name || "";

      const okStatus = statusFilter === "all" || status === statusFilter;
      const okSource = sourceFilter === "all" || source === sourceFilter;
      const okSearch =
        !q ||
        description.toLowerCase().includes(q) ||
        participants.toLowerCase().includes(q) ||
        cameraName.toLowerCase().includes(q);

      return okStatus && okSource && okSearch;
    });
  }, [rows, statusFilter, sourceFilter, searchQuery]);

  async function handleSaveManual() {
    if (!manualCameraId) return;
    setSaving(true);
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
      await fetchEvents();
    } catch (e: any) {
      alert(e?.message || "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  const totalCount = filtered.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-slate-900">
      {/* Шапка страницы */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 bg-white/50 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm">Журнал инцидентов</h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">Управление и мониторинг всех событий безопасности</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Быстрые периоды */}
          <div className="bg-slate-50/80 p-0.5 rounded-xl flex items-center gap-0.5 border border-slate-200/80 shadow-inner">
            <Button
              variant={period === "day" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriod("day")}
              className={cn(
                "rounded-lg transition-all font-semibold text-xs h-8 px-3.5",
                period === "day" ? "bg-indigo-600 text-slate-900 shadow-[0_0_15px_-3px_rgba(79,70,229,0.5)]" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
              )}
            >
              Сегодня
            </Button>
            <Button
              variant={period === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriod("week")}
              className={cn(
                "rounded-lg transition-all font-semibold text-xs h-8 px-3.5",
                period === "week" ? "bg-indigo-600 text-slate-900 shadow-[0_0_15px_-3px_rgba(79,70,229,0.5)]" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
              )}
            >
              Неделя
            </Button>
            <Button
              variant={period === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriod("month")}
              className={cn(
                "rounded-lg transition-all font-semibold text-xs h-8 px-3.5",
                period === "month" ? "bg-indigo-600 text-slate-900 shadow-[0_0_15px_-3px_rgba(79,70,229,0.5)]" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
              )}
            >
              Месяц
            </Button>
            <Button
              variant={period === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriod("all")}
              className={cn(
                "rounded-lg transition-all font-semibold text-xs h-8 px-3.5",
                period === "all" ? "bg-indigo-600 text-slate-900 shadow-[0_0_15px_-3px_rgba(79,70,229,0.5)]" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
              )}
            >
              Все время
            </Button>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={period === "custom" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-9 px-4 gap-2 font-semibold text-xs rounded-xl shadow-lg transition-all",
                  period === "custom" 
                    ? "bg-indigo-600 text-slate-900 shadow-indigo-500/25 border-transparent" 
                    : "bg-white/50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300"
                )}
              >
                <CalendarIcon className={cn("h-4 w-4", period === "custom" ? "text-indigo-200" : "text-indigo-400")} />
                {(() => {
                  if (period === "all") return "За всё время";
                  const options: Intl.DateTimeFormatOptions = {
                    day: "numeric",
                    month: "short",
                  };
                  const from = dateRange.from;
                  const to = dateRange.to;
                  if (from.toDateString() === to.toDateString()) {
                    return from.toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    });
                  }
                  return `${from.toLocaleDateString("ru-RU", options)} — ${to.toLocaleDateString("ru-RU", options)}`;
                })()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl bg-white" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={handleSelectRange}
                className="rounded-3xl bg-white text-slate-900"
              />
            </PopoverContent>
          </Popover>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 shadow-md transition-all rounded-xl ml-2">
                <Plus className="h-4 w-4" />
                Добавить вручную
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px] bg-white border-slate-200 text-slate-900 rounded-3xl shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Новый инцидент</DialogTitle>
                <DialogDescription className="text-slate-500">
                  Заполните информацию о вручную зафиксированном событии
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 py-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-semibold">Камера</Label>
                  <Select value={manualCameraId} onValueChange={setManualCameraId}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800 h-11 rounded-xl">
                      <SelectValue placeholder="Выберите камеру" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-800">
                      {cameras.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="focus:bg-slate-100 focus:text-slate-900 cursor-pointer">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-semibold">Тип события</Label>
                  <Select value={manualType} onValueChange={setManualType}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800 h-11 rounded-xl">
                      <SelectValue placeholder="Тип" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-800">
                      <SelectItem value="other" className="focus:bg-slate-100">Другое</SelectItem>
                      <SelectItem value="scream" className="focus:bg-slate-100">Крик</SelectItem>
                      <SelectItem value="profanity" className="focus:bg-slate-100">Нецензурная лексика</SelectItem>
                      <SelectItem value="abuse" className="focus:bg-slate-100">Оскорбления</SelectItem>
                      <SelectItem value="fight_1v1" className="focus:bg-slate-100">Драка 1-на-1</SelectItem>
                      <SelectItem value="fight_group" className="focus:bg-slate-100">Массовая драка</SelectItem>
                      <SelectItem value="zone_violation" className="focus:bg-slate-100">Нарушение зоны</SelectItem>
                      <SelectItem value="accident" className="focus:bg-slate-100">Несчастный случай</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-slate-700 font-semibold">Описание</Label>
                  <Input
                    id="description"
                    placeholder="Кратко о произошедшем"
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-600 h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="participants" className="text-slate-700 font-semibold">Участники</Label>
                  <Input
                    id="participants"
                    placeholder="Имена / классы"
                    value={manualParticipants}
                    onChange={(e) => setManualParticipants(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-600 h-11 rounded-xl"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  className="rounded-xl border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleSaveManual}
                  disabled={saving || !manualCameraId}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-slate-900 font-bold shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                >
                  {saving ? "Сохранение…" : "Сохранить"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Фильтры и Поиск */}
      <Card className="border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-white/50 backdrop-blur-xl rounded-3xl overflow-hidden">
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
              <Input
                placeholder="Поиск: описание, участники, камера…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-slate-50/60 border-slate-200 text-slate-900 placeholder:text-slate-500 rounded-2xl shadow-inner focus-visible:ring-indigo-500/50"
              />
            </div>

            <div className="flex gap-3 flex-wrap items-center">
              {user?.role === "admin" && !schoolId && (
                <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                  <SelectTrigger className="w-[200px] h-12 bg-slate-50/60 border-slate-200 text-slate-700 rounded-2xl font-medium">
                    <SelectValue placeholder="Школа" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-700 rounded-xl">
                    <SelectItem value="all" className="focus:bg-slate-100 cursor-pointer">Все школы</SelectItem>
                    {schools.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="focus:bg-slate-100 cursor-pointer">
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[200px] h-12 bg-slate-50/60 border-slate-200 text-slate-700 rounded-2xl font-medium">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-500" />
                    <SelectValue placeholder="Тип события" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-700 rounded-xl">
                  <SelectItem value="all" className="focus:bg-slate-100 cursor-pointer">Все типы</SelectItem>
                  <SelectItem value="scream" className="focus:bg-slate-100 cursor-pointer">Крик</SelectItem>
                  <SelectItem value="profanity" className="focus:bg-slate-100 cursor-pointer">Нецензурная лексика</SelectItem>
                  <SelectItem value="abuse" className="focus:bg-slate-100 cursor-pointer">Оскорбления</SelectItem>
                  <SelectItem value="fight_1v1" className="focus:bg-slate-100 cursor-pointer">Драка 1-на-1</SelectItem>
                  <SelectItem value="fight_group" className="focus:bg-slate-100 cursor-pointer">Массовая драка</SelectItem>
                  <SelectItem value="zone_violation" className="focus:bg-slate-100 cursor-pointer">Нарушение зоны</SelectItem>
                  <SelectItem value="accident" className="focus:bg-slate-100 cursor-pointer">Несчастный случай</SelectItem>
                  <SelectItem value="other" className="focus:bg-slate-100 cursor-pointer">Другое</SelectItem>
                </SelectContent>
              </Select>

              {(typeFilter !== "all" || searchQuery || selectedSchoolId !== "all") && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={resetFilters}
                  title="Сбросить фильтры"
                  className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 border border-rose-500/20 transition-all"
                >
                  <FilterX className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Заголовок результатов */}
      <div className="flex items-center justify-between px-2">
        <div className="text-slate-500 font-medium text-sm">
          Найдено инцидентов: <span className="text-slate-900 font-bold text-lg ml-1">{totalCount}</span>
          {error && <span className="text-rose-400 ml-3 bg-rose-500/10 px-2 py-1 rounded-md">{error}</span>}
        </div>
        
        {/* Пагинация */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider hidden sm:inline-block">Показывать по:</span>
          <Select value={String(limit)} onValueChange={(v: any) => setLimit(Number(v))}>
            <SelectTrigger className="w-[80px] h-9 bg-white border-slate-200 text-slate-700 rounded-lg text-xs font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200 text-slate-700 min-w-[80px]">
              {[25, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)} className="focus:bg-slate-100 text-xs font-bold cursor-pointer">{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1 ml-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0 || loading}
              className="h-9 px-3 rounded-lg border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100"
            >
              Назад
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(offset + limit)}
              disabled={loading || rows.length < limit}
              className="h-9 px-3 rounded-lg border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100"
            >
              Далее
            </Button>
          </div>
        </div>
      </div>

      {/* Таблица инцидентов (Desktop) */}
      <Card className="hidden lg:block border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-white/50 backdrop-blur-xl rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/40 border-b border-slate-200/80">
              <TableRow className="hover:bg-transparent border-transparent">
                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-wider py-4 px-6">Дата и время</TableHead>
                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-wider py-4">Камера</TableHead>
                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-wider py-4">Источник</TableHead>
                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-wider py-4">Описание</TableHead>
                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-wider py-4">Статус</TableHead>
                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-wider py-4 text-right pr-6">Действие</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="border-b border-slate-200/40 hover:bg-transparent">
                  <TableCell colSpan={6} className="h-32">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
                      <span className="text-sm font-medium">Синхронизация...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow className="border-b border-slate-200/40 hover:bg-transparent">
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500 font-medium">
                    Ничего не найдено
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e) => {
                  const { date, time } = formatDateTime(e.timestamp);
                  const meta = (e.meta as any) || {};
                  const source = meta.source || "ai";
                  const status = meta.status || "new";
                  const description = meta.description || meta.text || e.type.toUpperCase();
                  
                  return (
                    <TableRow
                      key={e.id}
                      className="cursor-pointer group hover:bg-slate-100/40 border-b border-slate-200/40 transition-colors"
                      onClick={() => onViewDetails(e.id)}
                    >
                      <TableCell className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-slate-800 font-bold">{date}</span>
                          <span className="text-slate-500 text-xs font-semibold">{time}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50/50 border border-slate-200 text-slate-700 text-xs font-medium">
                          {e.camera?.name ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">{getSourceIcon(source)}</TableCell>
                      <TableCell className="py-4">
                        <span className="text-slate-800 font-medium group-hover:text-indigo-300 transition-colors">{description}</span>
                      </TableCell>
                      <TableCell className="py-4">{getStatusBadge(status)}</TableCell>
                      <TableCell className="py-4 text-right pr-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200"
                          onClick={(ev: any) => {
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

      {/* Список инцидентов (Mobile) */}
      <div className="lg:hidden space-y-4">
        {loading && (
          <Card className="border-slate-200 bg-white/50">
            <CardContent className="p-8 flex justify-center text-indigo-400">
               <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </CardContent>
          </Card>
        )}
        {!loading && filtered.length === 0 && (
          <Card className="border-slate-200 bg-white/50">
            <CardContent className="p-8 text-center text-slate-500 font-medium">
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
            const description = meta.description || meta.text || e.type.toUpperCase();
            const participants = meta.participants || "";
            return (
              <Card
                key={e.id}
                className="cursor-pointer border-slate-200/80 bg-white/50 backdrop-blur-xl hover:bg-slate-100/60 transition-colors shadow-lg rounded-2xl overflow-hidden group"
                onClick={() => onViewDetails(e.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="pr-4">
                      <div className="text-slate-900 font-bold text-base mb-1.5 leading-snug group-hover:text-indigo-300 transition-colors">{description}</div>
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        {date} в {time}
                      </div>
                    </div>
                    <div className="p-2 bg-slate-100 rounded-full group-hover:bg-indigo-500/20 transition-colors">
                      <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-indigo-400" />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {getSourceIcon(source)}
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50/50 border border-slate-200 text-slate-500 text-xs font-medium shadow-inner">
                      {e.camera?.name ?? "Камера: —"}
                    </span>
                  </div>
                  {participants && (
                    <div className="text-slate-500 text-sm mb-4 bg-slate-50/30 p-2.5 rounded-xl border border-slate-200/50">
                      Участники: <span className="text-slate-700 font-medium">{participants}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-3">
                    {getStatusBadge(status)}
                    <span className="text-xs font-bold text-indigo-400">
                      Подробнее
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
