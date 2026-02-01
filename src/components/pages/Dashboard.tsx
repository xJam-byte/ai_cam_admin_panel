import { useEffect, useState } from "react";
// import { format } from "date-fns"; // unused, relying on Intl
import {
  ChevronRight,
  Activity,
  Loader2,
  TrendingUp,
  Calendar,
  Zap,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";
import { Button } from "../ui/button";
import { listEvents } from "../../lib/events";
import { useAuth } from "../../providers/AuthProvider";
import { cn } from "../ui/utils";

interface DashboardProps {
  onNavigateToIncidents: () => void;
}

export default function Dashboard({ onNavigateToIncidents }: DashboardProps) {
  const { user } = useAuth();
  // Default to last 7 days
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date(),
  });

  const [data, setData] = useState<{ ts: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"daily" | "hourly">("daily");

  useEffect(() => {
    async function load() {
      if (!date?.from) return;
      setLoading(true);
      try {
        const fromDate = date.from;
        const toDate = date.to || date.from;

        // Calculate difference in days to decide mode
        const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
        // If range is < 2 days (approx), use hourly
        const isHourly = diffTime < 2 * 24 * 60 * 60 * 1000;
        setViewMode(isHourly ? "hourly" : "daily");

        const fromISO = new Date(fromDate);
        fromISO.setHours(0, 0, 0, 0);

        const toISO = new Date(toDate);
        toISO.setHours(23, 59, 59, 999);

        console.log("📅 Dashboard: Fetching events from", fromISO, "to", toISO);

        const events = await listEvents({
          from: fromISO.toISOString(),
          to: toISO.toISOString(),
          limit: 10000,
          school_id: user?.schoolId,
        });

        console.log("📊 Dashboard: Received", events.length, "events");

        const map = new Map<number, number>();

        const current = new Date(fromISO);
        if (isHourly) current.setMinutes(0, 0, 0);
        else current.setHours(0, 0, 0, 0);

        const endLoop = new Date(toISO);

        while (current <= endLoop) {
          map.set(current.valueOf(), 0);
          if (isHourly) current.setHours(current.getHours() + 1);
          else current.setDate(current.getDate() + 1);
        }

        events.forEach((e) => {
          const d = new Date(e.timestamp);
          // Round to nearest bucket
          if (isHourly) d.setMinutes(0, 0, 0);
          else d.setHours(0, 0, 0, 0);

          const key = d.valueOf();
          if (map.has(key)) {
            map.set(key, (map.get(key) || 0) + 1);
          }
        });

        const points: { ts: string; count: number }[] = [];
        Array.from(map.entries())
          .sort((a, b) => a[0] - b[0])
          .forEach(([k, v]) => {
            points.push({ ts: new Date(k).toISOString(), count: v });
          });

        setData(points);
      } catch (e) {
        console.error("❌ Dashboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [date, user?.schoolId]);

  // Derived Statistics
  const totalEvents = data.reduce((acc, curr) => acc + curr.count, 0);
  const avgDaily =
    data.length > 0 ? (totalEvents / data.length).toFixed(1) : "0";
  const maxDay = data.reduce(
    (max, curr) => (curr.count > max.count ? curr : max),
    { count: 0, ts: "" },
  );

  const chartData = data.map((d) => {
    const dateObj = new Date(d.ts);
    return {
      date:
        viewMode === "hourly"
          ? dateObj.toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : dateObj.toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "short",
            }),
      fullDate: dateObj.toLocaleString("ru-RU"),
      count: d.count,
    };
  });

  const chartConfig = {
    count: {
      label: "События",
      color: "hsl(var(--primary))",
    },
  };

  const setRange = (days: number) => {
    const to = new Date();
    to.setHours(23, 59, 59, 999);

    if (days === 0) {
      // Today
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      setDate({ from, to });
    } else {
      const from = new Date();
      from.setDate(from.getDate() - days);
      from.setHours(0, 0, 0, 0);
      setDate({ from, to });
    }
  };

  const isRangeActive = (days: number) => {
    if (!date?.from || !date?.to) return false;
    const diff = Math.abs(date.to.getTime() - date.from.getTime());
    const dayMs = 24 * 60 * 60 * 1000;

    if (days === 0) return diff < dayMs; // Approx < 1 day
    // Allow slight wiggle room for time diffs
    return diff > (days - 1) * dayMs && diff < (days + 1) * dayMs;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
            Главная панель
          </h2>
          <p className="text-muted-foreground mt-2 text-lg">
            Обзор активности и мониторинг безопасности в реальном времени
          </p>
        </div>

        {/* Date Filters */}
        <div className="bg-muted/50 p-1 rounded-lg flex items-center gap-1 border border-border/50 backdrop-blur-sm">
          <Button
            variant={isRangeActive(0) ? "default" : "ghost"}
            size="sm"
            onClick={() => setRange(0)}
            className="rounded-md transition-all font-medium"
          >
            Сегодня
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant={isRangeActive(7) ? "default" : "ghost"}
            size="sm"
            onClick={() => setRange(7)}
            className="rounded-md transition-all font-medium"
          >
            7 дней
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant={isRangeActive(30) ? "default" : "ghost"}
            size="sm"
            onClick={() => setRange(30)}
            className="rounded-md transition-all font-medium"
          >
            30 дней
          </Button>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Total Events */}
        <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-background to-muted/20">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity className="w-24 h-24" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего событий
            </CardTitle>
            <div className="p-2 bg-primary/10 rounded-full">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Activity className="h-4 w-4 text-primary" />
              )}
            </div>
          </CardHeader>
          <CardContent className="z-10">
            {loading ? (
              <div className="h-9 w-24 bg-muted animate-pulse rounded mt-1" />
            ) : (
              <div className="text-4xl font-bold tracking-tight mt-1">
                {totalEvents}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <span className="text-primary font-medium">
                За выбранный период
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Average Daily */}
        <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-background to-muted/20">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="w-24 h-24" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Среднее в день
            </CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-full">
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="z-10">
            {loading ? (
              <div className="h-9 w-20 bg-muted animate-pulse rounded mt-1" />
            ) : (
              <div className="text-4xl font-bold tracking-tight mt-1">
                {avgDaily}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Интенсивность событий
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Peak Day */}
        <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-background to-muted/20">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Zap className="w-24 h-24" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Пиковая активность
            </CardTitle>
            <div className="p-2 bg-amber-500/10 rounded-full">
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent className="z-10">
            {loading ? (
              <div className="h-9 w-32 bg-muted animate-pulse rounded mt-1" />
            ) : maxDay.count > 0 ? (
              <div className="flex flex-col">
                <span className="text-2xl font-bold tracking-tight mt-1">
                  {new Date(maxDay.ts).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                  })}
                </span>
                <span className="text-xs font-medium text-amber-600">
                  {maxDay.count} событий
                </span>
              </div>
            ) : (
              <div className="text-2xl font-bold tracking-tight mt-1">-</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card className="border-none shadow-xl bg-card">
        <CardHeader>
          <CardTitle>Динамика инцидентов</CardTitle>
          <CardDescription>Визуализация активности во времени</CardDescription>
        </CardHeader>
        <CardContent className="pl-2 pt-4">
          <div
            className={cn(
              "transition-all duration-500",
              loading ? "opacity-50 blur-[2px]" : "opacity-100 blur-0",
            )}
          >
            {chartData.length > 0 ? (
              <div className="h-[400px] w-full">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  {viewMode === "hourly" ? (
                    <BarChart
                      data={chartData}
                      margin={{
                        top: 20,
                        left: 0,
                        right: 0,
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="4 4"
                        stroke="hsl(var(--border))"
                        strokeOpacity={0.4}
                      />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={12}
                        minTickGap={30}
                        className="text-xs font-medium fill-muted-foreground"
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={12}
                        allowDecimals={false}
                        className="text-xs font-medium fill-muted-foreground"
                      />
                      <ChartTooltip
                        cursor={{
                          fill: "hsl(var(--muted))",
                          opacity: 0.2,
                        }}
                        content={
                          <ChartTooltipContent
                            className="bg-background/80 backdrop-blur-md border border-border/50 shadow-2xl rounded-xl p-3"
                            indicator="dot"
                          />
                        }
                      />
                      <Bar
                        dataKey="count"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={50}
                        className="fill-primary"
                      />
                    </BarChart>
                  ) : (
                    <AreaChart
                      data={chartData}
                      margin={{
                        top: 20,
                        left: 0,
                        right: 0,
                        bottom: 0,
                      }}
                    >
                      <defs>
                        <linearGradient
                          id="fillCount"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0.5}
                          />
                          <stop
                            offset="50%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="95%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0.0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="lineGradient"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
                          <stop
                            offset="0%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="100%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={1}
                          />
                        </linearGradient>
                        <filter
                          id="glow"
                          height="300%"
                          width="300%"
                          x="-100%"
                          y="-100%"
                        >
                          <feGaussianBlur
                            stdDeviation="3"
                            result="coloredBlur"
                          />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="4 4"
                        stroke="hsl(var(--border))"
                        strokeOpacity={0.4}
                      />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={12}
                        minTickGap={30}
                        className="text-xs font-medium fill-muted-foreground"
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={12}
                        allowDecimals={false}
                        className="text-xs font-medium fill-muted-foreground"
                      />
                      <ChartTooltip
                        cursor={{
                          stroke: "hsl(var(--primary))",
                          strokeWidth: 2,
                          strokeDasharray: "4 4",
                          strokeOpacity: 0.5,
                        }}
                        content={
                          <ChartTooltipContent
                            className="bg-background/80 backdrop-blur-md border border-border/50 shadow-2xl rounded-xl p-3"
                            indicator="dot"
                          />
                        }
                      />
                      <Area
                        dataKey="count"
                        type="monotone"
                        fill="url(#fillCount)"
                        fillOpacity={1}
                        stroke="url(#lineGradient)"
                        strokeWidth={3}
                        filter="url(#glow)"
                        activeDot={{
                          r: 6,
                          strokeWidth: 0,
                          className: "fill-primary animate-pulse",
                        }}
                      />
                    </AreaChart>
                  )}
                </ChartContainer>
              </div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border/50">
                <Calendar className="w-12 h-12 opacity-20 mb-4" />
                <p>Нет данных за выбранный период</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button onClick={onNavigateToIncidents} className="group" size="lg">
          Перейти к журналу
          <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  );
}
