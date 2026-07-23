import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ChevronRight,
  Activity,
  Loader2,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  Zap,
  Users,
  Clock,
  Mic,
  Video,
  Smile,
  MessageSquare,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { listEvents, type EventItem } from "../../lib/events";
import { useAuth } from "../../providers/AuthProvider";
import { cn } from "../ui/utils";

interface DashboardProps {
  onNavigateToIncidents: () => void;
}

// Вспомогательная функция для хэширования
function getStringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

// Парсинг визиторов из эвентов
function getVisitorsFromEvents(events: EventItem[]) {
  const visitorsMap = new Map<
    string,
    {
      id: string;
      alias: string;
      avatarGradient: string;
      lastSeen: string | number;
      count: number;
      source: "face" | "voice";
    }
  >();

  events.forEach((ev) => {
    let visitorId = "unknown";
    let source: "face" | "voice" = "voice";

    const transcript = ev.meta?.transcript || "";
    if (transcript) {
      const hash = getStringHash(transcript) % 6;
      visitorId = `voice_${hash}`;
      source = "voice";
    } else {
      const hash = getStringHash(ev.cameraId || "default") % 5;
      visitorId = `face_${hash}`;
      source = "face";
    }

    if (!visitorsMap.has(visitorId)) {
      const shortId = Math.abs(getStringHash(visitorId)) % 10000;
      const alias =
        source === "voice" ? `Голос #${shortId}` : `Личность #${shortId}`;

      const gradients = [
        "from-indigo-500 to-purple-500",
        "from-blue-500 to-cyan-500",
        "from-emerald-500 to-teal-500",
        "from-amber-500 to-orange-500",
        "from-pink-500 to-rose-500",
        "from-violet-500 to-fuchsia-500",
      ];
      const gradient = gradients[shortId % gradients.length];

      visitorsMap.set(visitorId, {
        id: visitorId,
        alias,
        avatarGradient: gradient,
        lastSeen: ev.timestamp,
        count: 0,
        source,
      });
    }

    const visitor = visitorsMap.get(visitorId)!;
    visitor.count++;
    if (new Date(ev.timestamp) > new Date(visitor.lastSeen)) {
      visitor.lastSeen = ev.timestamp;
    }
  });

  return Array.from(visitorsMap.values()).sort(
    (a, b) =>
      new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
  );
}

export default function Dashboard({ onNavigateToIncidents }: DashboardProps) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const period = (searchParams.get("period") || "week") as
    | "day"
    | "week"
    | "month"
    | "custom"
    | "all";

  // Подсчёт дат
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
        // month
        fromDate.setDate(fromDate.getDate() - 30);
        fromDate.setHours(0, 0, 0, 0);
      }
    }
    return { from: fromDate, to: toDate };
  }, [fromParam, toParam, period]);

  const fromISO = useMemo(() => {
    const d = new Date(dateRange.from);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [dateRange.from]);

  const toISO = useMemo(() => {
    const d = new Date(dateRange.to);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }, [dateRange.to]);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Загрузка эвентов
  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        const data = await listEvents({
          from: fromISO,
          to: toISO,
          limit: 10000,
          school_id: user?.schoolId,
        });
        if (!ignore) {
          setEvents(data || []);
        }
      } catch (e) {
        console.error("❌ Dashboard listEvents error:", e);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [fromISO, toISO, user?.schoolId]);

  // Вычисления
  const visitors = useMemo(() => getVisitorsFromEvents(events), [events]);
  const uniqueVisitorsCount = visitors.length;
  const totalDetections = events.length;

  // Динамический тренд детекций
  const detectionsTrend = useMemo(() => {
    if (events.length === 0) return null;
    const midTime =
      dateRange.from.getTime() +
      (dateRange.to.getTime() - dateRange.from.getTime()) / 2;
    const firstHalf = events.filter(
      (e) => new Date(e.timestamp).getTime() < midTime
    ).length;
    const secondHalf = events.filter(
      (e) => new Date(e.timestamp).getTime() >= midTime
    ).length;

    if (firstHalf === 0) return { percent: 100, isUp: true };
    const diff = secondHalf - firstHalf;
    const percent = Math.round((diff / firstHalf) * 100);
    return {
      percent: Math.abs(percent),
      isUp: percent >= 0,
    };
  }, [events, dateRange]);

  const peakHour = useMemo(() => {
    if (events.length === 0) return "—";
    const hours = Array(24).fill(0);
    events.forEach((ev) => {
      const d = new Date(ev.timestamp);
      const h = d.getHours();
      if (!isNaN(h) && h >= 0 && h < 24) {
        hours[h]++;
      }
    });
    let maxCount = -1;
    let peakH = -1;
    for (let i = 0; i < 24; i++) {
      if (hours[i] > maxCount) {
        maxCount = hours[i];
        peakH = i;
      }
    }
    if (maxCount <= 0) return "—";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(peakH)}:00`;
  }, [events]);

  const hourlyChartData = useMemo(() => {
    const data = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, "0")}:00`,
      detections: 0,
    }));
    events.forEach((ev) => {
      const d = new Date(ev.timestamp);
      const h = d.getHours();
      if (!isNaN(h) && h >= 0 && h < 24) {
        data[h].detections++;
      }
    });
    return data;
  }, [events]);

  const dailyChartData = useMemo(() => {
    const diffTime = Math.abs(dateRange.to.getTime() - dateRange.from.getTime());
    const isHourly = diffTime <= 24 * 60 * 60 * 1000;

    if (isHourly) {
      return hourlyChartData.map((d) => ({
        date: d.hour,
        fullDate: `Время суток: ${d.hour}`,
        detections: d.detections,
      }));
    }

    const map = new Map<number, number>();
    const current = new Date(dateRange.from);
    current.setHours(0, 0, 0, 0);
    const endLoop = new Date(dateRange.to);
    endLoop.setHours(0, 0, 0, 0);

    while (current <= endLoop) {
      map.set(current.valueOf(), 0);
      current.setDate(current.getDate() + 1);
    }

    events.forEach((ev) => {
      const d = new Date(ev.timestamp);
      d.setHours(0, 0, 0, 0);
      const key = d.valueOf();
      if (map.has(key)) {
        map.set(key, (map.get(key) || 0) + 1);
      }
    });

    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([k, v]) => {
        const d = new Date(k);
        return {
          date: d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
          fullDate: d.toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          detections: v,
        };
      });
  }, [events, dateRange, hourlyChartData]);

  const wordCloudData = useMemo(() => {
    const stopwords = new Set([
      "и", "в", "во", "на", "с", "со", "у", "о", "об", "а", "но", "что", "как",
      "это", "этот", "все", "меня", "тебе", "тебя", "мне", "мы", "вы", "они",
      "он", "она", "был", "была", "было", "были", "нет", "да", "же", "бы",
      "ли", "то", "так", "за", "от", "до", "для", "из", "по", "к", "ко", "при",
      "уже", "или", "тут", "там", "где", "когда", "кто", "чтобы", "этого",
      "этой", "этим", "этом", "эти", "этих", "эта", "не", "нет", "хочу", "те",
      "кто", "раз", "сто", "лет", "был", "был", "что", "кто", "как", "вам",
    ]);

    const counts: Record<string, number> = {};
    events.forEach((ev) => {
      const transcript = ev.meta?.transcript || "";
      if (!transcript) return;
      const words = transcript
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
        .split(/\s+/);

      words.forEach((w) => {
        const clean = w.trim();
        if (clean.length > 2 && !stopwords.has(clean)) {
          counts[clean] = (counts[clean] || 0) + 1;
        }
      });
    });

    return Object.entries(counts)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [events]);

  const sentimentData = useMemo(() => {
    let positive = 0;
    let neutral = 0;
    let negative = 0;

    events.forEach((ev) => {
      const text = (ev.meta?.transcript || "").toLowerCase();
      const type = ev.type;

      if (type === "profanity" || type === "abuse") {
        negative++;
      } else if (type === "SOS") {
        negative++;
      } else {
        const posWords = [
          "спасибо", "отлично", "хорошо", "здравствуйте", "привет", "помог",
          "пожалуйста", "молодец", "супер", "класс",
        ];
        let isPos = false;
        posWords.forEach((pw) => {
          if (text.includes(pw)) isPos = true;
        });
        if (isPos) positive++;
        else neutral++;
      }
    });

    return [
      { name: "Позитивный", value: positive, color: "#10b981" },
      { name: "Нейтральный", value: neutral, color: "#94a3b8" },
      { name: "Негативный", value: negative, color: "#f43f5e" },
    ].filter((d) => d.value > 0);
  }, [events]);

  const dominantSentiment = useMemo(() => {
    if (sentimentData.length === 0) return null;
    const total = sentimentData.reduce((acc, curr) => acc + curr.value, 0);
    const max = sentimentData.reduce(
      (prev, curr) => (curr.value > prev.value ? curr : prev),
      sentimentData[0]
    );
    const percent = Math.round((max.value / total) * 100);
    return {
      name: max.name,
      percent,
      color: max.color,
    };
  }, [sentimentData]);

  const handleSelectRange = (range: DateRange | undefined) => {
    if (!range) return;
    const newParams = new URLSearchParams(searchParams);
    if (range.from) {
      newParams.set("from", range.from.toISOString().split("T")[0]);
      newParams.set("period", "custom");
    } else {
      newParams.delete("from");
    }
    if (range.to) {
      newParams.set("to", range.to.toISOString().split("T")[0]);
    } else {
      newParams.delete("to");
    }
    setSearchParams(newParams);
  };

  const setQuickRange = (rangeType: "day" | "week" | "month" | "all") => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("from");
    newParams.delete("to");
    newParams.set("period", rangeType);
    setSearchParams(newParams);
  };

  const formatDateDisplay = (from: Date, to: Date) => {
    if (period === "all") return "За всё время";
    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
    };
    if (from.toDateString() === to.toDateString()) {
      return from.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    return `${from.toLocaleDateString("ru-RU", options)} — ${to.toLocaleDateString("ru-RU", options)}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-slate-900">
      {/* Шапка и фильтры даты */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white/50 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm">
            Главная панель
          </h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            Обзор активности и мониторинг безопасности в реальном времени
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Быстрые фильтры */}
          <div className="bg-slate-50/80 p-0.5 rounded-xl flex items-center gap-0.5 border border-slate-200/80 shadow-inner">
            <Button
              variant={period === "day" ? "default" : "ghost"}
              size="sm"
              onClick={() => setQuickRange("day")}
              className={cn(
                "rounded-lg transition-all font-semibold text-xs h-8 px-3.5",
                period === "day" ? "bg-indigo-600 text-slate-900 shadow-[0_0_15px_-3px_rgba(79,70,229,0.5)]" : "text-slate-500 hover:text-slate-900"
              )}
            >
              Сегодня
            </Button>
            <Button
              variant={period === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setQuickRange("week")}
              className={cn(
                "rounded-lg transition-all font-semibold text-xs h-8 px-3.5",
                period === "week" ? "bg-indigo-600 text-slate-900 shadow-[0_0_15px_-3px_rgba(79,70,229,0.5)]" : "text-slate-500 hover:text-slate-900"
              )}
            >
              Неделя
            </Button>
            <Button
              variant={period === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setQuickRange("month")}
              className={cn(
                "rounded-lg transition-all font-semibold text-xs h-8 px-3.5",
                period === "month" ? "bg-indigo-600 text-slate-900 shadow-[0_0_15px_-3px_rgba(79,70,229,0.5)]" : "text-slate-500 hover:text-slate-900"
              )}
            >
              Месяц
            </Button>
            <Button
              variant={period === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setQuickRange("all")}
              className={cn(
                "rounded-lg transition-all font-semibold text-xs h-8 px-3.5",
                period === "all" ? "bg-indigo-600 text-slate-900 shadow-[0_0_15px_-3px_rgba(79,70,229,0.5)]" : "text-slate-500 hover:text-slate-900"
              )}
            >
              Все время
            </Button>
          </div>

          {/* Кастомный календарь */}
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
                {formatDateDisplay(dateRange.from, dateRange.to)}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl bg-white"
              align="end"
            >
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
        </div>
      </div>

      {/* Grid с карточками с общими цифрами */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Уникальные посетители */}
        <Card className="relative overflow-hidden border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.15)] transition-all duration-300 hover:-translate-y-1 bg-white/50 backdrop-blur-xl rounded-3xl group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-cyan-400" />
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-indigo-500/10 rounded-full group-hover:scale-125 group-hover:bg-indigo-500/20 transition-all duration-700 blur-2xl" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              Уникальные посетители
            </CardTitle>
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
              ) : (
                <Users className="h-4 w-4 text-indigo-400" />
              )}
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            {loading ? (
              <div className="h-9 w-16 bg-slate-100 animate-pulse rounded-lg mt-1" />
            ) : (
              <div className="text-4xl font-extrabold tracking-tight text-slate-900 mt-1 drop-shadow-md">
                {uniqueVisitorsCount}
              </div>
            )}
            <p className="text-[11px] text-slate-500 font-medium mt-3">
              Идентифицировано в реальном времени
            </p>
          </CardContent>
        </Card>

        {/* Общее количество детекций */}
        <Card className="relative overflow-hidden border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(244,63,94,0.15)] transition-all duration-300 hover:-translate-y-1 bg-white/50 backdrop-blur-xl rounded-3xl group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-orange-400" />
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-rose-500/10 rounded-full group-hover:scale-125 group-hover:bg-rose-500/20 transition-all duration-700 blur-2xl" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              Всего детекций
            </CardTitle>
            <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-rose-400" />
              ) : (
                <Activity className="h-4 w-4 text-rose-400" />
              )}
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            {loading ? (
              <div className="h-9 w-16 bg-slate-100 animate-pulse rounded-lg mt-1" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tracking-tight text-slate-900 mt-1 drop-shadow-md">
                  {totalDetections}
                </span>
                {detectionsTrend && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold rounded-md shadow-inner",
                      detectionsTrend.isUp
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                        : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                    )}
                  >
                    {detectionsTrend.isUp ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {detectionsTrend.percent}%
                  </span>
                )}
              </div>
            )}
            <p className="text-[11px] text-slate-500 font-medium mt-3">
              Инциденты за выбранный период
            </p>
          </CardContent>
        </Card>

        {/* Пиковый час активности */}
        <Card className="relative overflow-hidden border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(234,179,8,0.15)] transition-all duration-300 hover:-translate-y-1 bg-white/50 backdrop-blur-xl rounded-3xl group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-yellow-500" />
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-500/10 rounded-full group-hover:scale-125 group-hover:bg-amber-500/20 transition-all duration-700 blur-2xl" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              Пиковый час
            </CardTitle>
            <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
              ) : (
                <Zap className="h-4 w-4 text-amber-400" />
              )}
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            {loading ? (
              <div className="h-9 w-24 bg-slate-100 animate-pulse rounded-lg mt-1" />
            ) : (
              <div className="text-4xl font-extrabold tracking-tight text-slate-900 mt-1 drop-shadow-md">
                {peakHour}
              </div>
            )}
            <p className="text-[11px] text-slate-500 font-medium mt-3">
              Максимальная плотность событий
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Раздел с табами графиков */}
      <Tabs defaultValue="progression" className="w-full">
        <Card className="border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl bg-white/50 backdrop-blur-xl overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 gap-4 border-b border-slate-200/40">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
                <TrendingUp className="h-5 w-5 text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                Анализ динамики безопасности
              </CardTitle>
              <CardDescription className="text-xs font-medium text-slate-500">
                Интеграция активности и фиксации угроз во времени
              </CardDescription>
            </div>

            <TabsList className="bg-slate-50/50 p-1 rounded-xl border border-slate-200/80 shadow-inner">
              <TabsTrigger
                value="progression"
                className="rounded-lg text-xs py-1.5 px-4 font-semibold data-[state=active]:bg-indigo-600 data-[state=active]:text-slate-900 data-[state=active]:shadow-[0_0_15px_-3px_rgba(79,70,229,0.5)] text-slate-500"
              >
                Динамика событий
              </TabsTrigger>
              <TabsTrigger
                value="hourly"
                className="rounded-lg text-xs py-1.5 px-4 font-semibold data-[state=active]:bg-indigo-600 data-[state=active]:text-slate-900 data-[state=active]:shadow-[0_0_15px_-3px_rgba(79,70,229,0.5)] text-slate-500"
              >
                Активность по часам
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-4 pl-1 pr-6 pb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent pointer-events-none" />
            <TabsContent value="progression" className="outline-none relative z-10">
              <div
                className={cn(
                  "transition-all duration-300",
                  loading ? "opacity-50 blur-[2px]" : "opacity-100"
                )}
              >
                {dailyChartData.length > 0 ? (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={dailyChartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#818cf8" stopOpacity={0.6} />
                            <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0} />
                          </linearGradient>
                          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                          </filter>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={10}
                          className="text-[11px] font-medium fill-slate-500"
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={10}
                          allowDecimals={false}
                          className="text-[11px] font-medium fill-slate-500"
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-white/90 backdrop-blur-xl text-slate-900 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] p-3 border border-slate-300/80 text-xs">
                                  <p className="font-semibold mb-1 text-slate-800">
                                    {d.fullDate || d.date}
                                  </p>
                                  <p className="text-indigo-400">
                                    Детекций:{" "}
                                    <span className="font-bold text-slate-900 text-sm">
                                      {payload[0].value}
                                    </span>
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="detections"
                          stroke="#818cf8"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorProgress)"
                          activeDot={{ r: 6, strokeWidth: 2, stroke: "#1e1b4b", fill: "#818cf8", filter: "url(#glow)" }}
                          style={{ filter: "drop-shadow(0 0 8px rgba(129,140,248,0.5))" }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-200 rounded-xl bg-white/20">
                    <CalendarIcon className="w-10 h-10 opacity-30 mb-3" />
                    <p className="text-sm">Нет данных за выбранный период</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="hourly" className="outline-none relative z-10">
              <div
                className={cn(
                  "transition-all duration-300",
                  loading ? "opacity-50 blur-[2px]" : "opacity-100"
                )}
              >
                {events.length > 0 ? (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={hourlyChartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorActivity" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#22d3ee" />
                            <stop offset="50%" stopColor="#818cf8" />
                            <stop offset="100%" stopColor="#c084fc" />
                          </linearGradient>
                          <filter id="glowLine" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                          </filter>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                          dataKey="hour"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={10}
                          className="text-[11px] font-medium fill-slate-500"
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={10}
                          allowDecimals={false}
                          className="text-[11px] font-medium fill-slate-500"
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white/90 backdrop-blur-xl text-slate-900 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] p-3 border border-slate-300/80 text-xs">
                                  <p className="font-semibold mb-1 text-slate-800">
                                    Время суток: {payload[0].payload.hour}
                                  </p>
                                  <p className="text-cyan-400">
                                    Детекций:{" "}
                                    <span className="font-bold text-slate-900 text-sm">
                                      {payload[0].value}
                                    </span>
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="detections"
                          stroke="url(#colorActivity)"
                          strokeWidth={3}
                          dot={false}
                          activeDot={{ r: 6, strokeWidth: 2, stroke: "#0f172a", fill: "#22d3ee", filter: "url(#glowLine)" }}
                          style={{ filter: "drop-shadow(0 0 6px rgba(34,211,238,0.6))" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-200 rounded-xl bg-white/20">
                    <CalendarIcon className="w-10 h-10 opacity-30 mb-3" />
                    <p className="text-sm">Нет данных за выбранный период</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      {/* Grid с фидом идентификации и аналитикой слов/тональности */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Re-Identification Feed */}
        <Card className="lg:col-span-3 border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl bg-white/50 backdrop-blur-xl flex flex-col overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-200/40 bg-white/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">
                  Идентификация и перемещение
                </CardTitle>
                <CardDescription className="text-xs font-medium text-slate-500">
                  Журнал перемещений и распознавания личностей
                </CardDescription>
              </div>
              <Badge variant="outline" className="px-3 py-1 text-[11px] font-bold bg-slate-100/50 text-slate-700 border-slate-300 rounded-lg shadow-inner">
                {visitors.length} человек(а)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto max-h-[380px] p-2 pr-4 custom-scrollbar">
            {loading ? (
              <div className="space-y-3 pt-2">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-14 bg-slate-100/50 animate-pulse rounded-2xl border border-slate-300/50"
                  />
                ))}
              </div>
            ) : visitors.length > 0 ? (
              <div className="space-y-2 pt-2">
                {visitors.map((v) => {
                  const lastSeenDate = new Date(v.lastSeen);
                  const isToday =
                    lastSeenDate.toDateString() === new Date().toDateString();
                  const timeFormatted = lastSeenDate.toLocaleTimeString(
                    "ru-RU",
                    { hour: "2-digit", minute: "2-digit" }
                  );
                  const dateFormatted = lastSeenDate.toLocaleDateString(
                    "ru-RU",
                    { day: "numeric", month: "short" }
                  );
                  const timeString = isToday
                    ? `Сегодня в ${timeFormatted}`
                    : `${dateFormatted}, ${timeFormatted}`;

                  // Установить маркер активности (если замечен за последние 12 часов)
                  const isRecentlySeen =
                    new Date().getTime() - lastSeenDate.getTime() <
                    12 * 60 * 60 * 1000;

                  return (
                    <div
                      key={v.id}
                      className="flex items-center justify-between py-3 px-4 hover:bg-slate-100/60 rounded-2xl transition-all border border-transparent hover:border-slate-300/50 group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="h-11 w-11 border border-slate-300 shadow-lg group-hover:scale-105 transition-transform">
                            <AvatarFallback
                              className={cn(
                                "text-slate-900 font-extrabold text-sm bg-gradient-to-tr",
                                v.avatarGradient
                              )}
                            >
                              {v.source === "voice" ? "🎙️" : "👤"}
                            </AvatarFallback>
                          </Avatar>
                          {isRecentlySeen && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-900"></span>
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800 group-hover:text-indigo-400 transition-colors drop-shadow-sm">
                            {v.alias}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                            <Clock className="h-3 w-3 text-slate-500" />
                            {timeString}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Источник распознавания */}
                        <div>
                          {v.source === "voice" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-lg shadow-inner">
                              <Mic className="h-3 w-3" /> голос
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg shadow-inner">
                              <Video className="h-3 w-3" /> лицо
                            </span>
                          )}
                        </div>

                        {/* Количество детекций */}
                        <Badge
                          variant="secondary"
                          className="bg-slate-100 text-slate-700 font-semibold px-2.5 py-0.5 text-[10px] rounded-md border border-slate-300"
                        >
                          {v.count} раз
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-200 rounded-2xl bg-white/20 m-2">
                <Users className="w-8 h-8 opacity-30 mb-2" />
                <p className="text-xs font-medium">Нет зафиксированных посетителей</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Word Cloud & Sentiment Donut */}
        <div className="lg:col-span-2 space-y-6 flex flex-col justify-between">
          {/* Word Cloud */}
          <Card className="border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl bg-white/50 backdrop-blur-xl flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-2 bg-white/30 border-b border-slate-200/40">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
                <CardTitle className="text-md font-bold text-slate-900">
                  Облако обсуждаемых слов
                </CardTitle>
              </div>
              <CardDescription className="text-[11px] font-medium text-slate-500">
                Популярные ключевые слова из диалогов
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center p-4 relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-transparent to-transparent pointer-events-none" />
              {loading ? (
                <div className="h-[120px] w-full bg-slate-100/50 animate-pulse rounded-2xl" />
              ) : wordCloudData.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-2 p-4 bg-slate-50/40 border border-slate-200/60 rounded-2xl min-h-[140px] w-full shadow-inner relative z-10">
                  {wordCloudData.map((w, idx) => {
                    const maxVal = wordCloudData[0].value;
                    const minVal = wordCloudData[wordCloudData.length - 1].value;
                    const range = maxVal - minVal || 1;
                    const percentage = (w.value - minVal) / range;
                    const fontSize = 0.8 + percentage * 0.55;

                    const colors = [
                      "text-indigo-300 bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.1)]",
                      "text-purple-300 bg-purple-500/10 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.1)]",
                      "text-cyan-300 bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]",
                      "text-emerald-300 bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]",
                      "text-rose-300 bg-rose-500/10 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.1)]",
                      "text-amber-300 bg-amber-500/10 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]",
                    ];
                    const colorClass = colors[idx % colors.length];

                    return (
                      <span
                        key={w.text}
                        style={{ fontSize: `${fontSize}rem` }}
                        className={cn(
                          "px-3 py-1.5 rounded-xl border font-bold transition-all hover:scale-110 cursor-default duration-300 hover:brightness-125",
                          colorClass
                        )}
                        title={`Частота: ${w.value} раз`}
                      >
                        {w.text}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div className="text-slate-500 text-xs text-center p-6 border border-dashed border-slate-200 rounded-2xl bg-white/20 w-full z-10">
                  Нет ключевых слов для отображения
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sentiment: Тональность диалогов (Donut Chart) */}
          <Card className="border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl bg-white/50 backdrop-blur-xl flex-1 flex flex-col overflow-hidden mt-6 lg:mt-0">
            <CardHeader className="pb-1 bg-white/30 border-b border-slate-200/40">
              <div className="flex items-center gap-2">
                <Smile className="h-5 w-5 text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
                <CardTitle className="text-md font-bold text-slate-900">
                  Тональность инцидентов
                </CardTitle>
              </div>
              <CardDescription className="text-[11px] font-medium text-slate-500">
                Анализ эмоционального фона речевых событий
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center p-4">
              {loading ? (
                <div className="h-[120px] w-full bg-slate-100/50 animate-pulse rounded-2xl" />
              ) : sentimentData.length > 0 ? (
                <div className="w-full flex flex-col items-center">
                  <div className="relative flex items-center justify-center h-[140px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <defs>
                          <filter id="glowPie" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                          </filter>
                        </defs>
                        <Pie
                          data={sentimentData}
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={62}
                          paddingAngle={6}
                          dataKey="value"
                          stroke="none"
                          cornerRadius={8}
                        >
                          {sentimentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: "drop-shadow(0 0 6px " + entry.color + "80)" }} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-white/90 backdrop-blur-xl text-slate-900 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] p-2 px-3 border border-slate-300/80 text-xs flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color, boxShadow: `0 0 10px ${d.color}` }} />
                                  <span className="font-semibold text-slate-800">
                                    {d.name}: <span className="text-slate-900">{d.value}</span>
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {dominantSentiment && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-extrabold text-slate-900 drop-shadow-md tracking-tight">
                          {dominantSentiment.percent}%
                        </span>
                        <span
                          className="text-[10px] font-bold tracking-wider uppercase drop-shadow-sm mt-0.5"
                          style={{ color: dominantSentiment.color }}
                        >
                          {dominantSentiment.name}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Легенда */}
                  <div className="flex justify-center flex-wrap gap-4 text-[11px] font-semibold text-slate-700 mt-4 bg-slate-50/40 px-4 py-2 rounded-xl border border-slate-200/60 shadow-inner">
                    {sentimentData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shadow-sm"
                          style={{ backgroundColor: d.color, boxShadow: `0 0 8px ${d.color}80` }}
                        />
                        <span>
                          {d.name} <span className="text-slate-500 ml-0.5">({d.value})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-xs text-center p-6 border border-dashed border-slate-200 rounded-2xl bg-white/20 w-full">
                  Нет тональностей для анализа
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end pt-4 pb-8">
        <Button onClick={onNavigateToIncidents} className="group bg-indigo-600 hover:bg-indigo-500 text-slate-900 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.4)] border border-indigo-400/30 transition-all hover:scale-105" size="lg">
          <span className="font-bold tracking-wide">Перейти к журналу</span>
          <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  );
}
