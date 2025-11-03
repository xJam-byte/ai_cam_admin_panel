// src/components/pages/Dashboard.tsx
import { useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useEventsStats, type TimePeriod } from "../../hooks/useEventsStats";

interface DashboardProps {
  onNavigateToIncidents: () => void;
}

export default function Dashboard({ onNavigateToIncidents }: DashboardProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("day");
  const { loading, error, data } = useEventsStats(timePeriod);

  const incidentsByCategory =
    data?.byType?.map((x) => ({
      name: x.name,
      value: x.value,
      color: x.color,
    })) || [];

  const currentStats = {
    count: data?.total ?? 0,
    change: data?.changePct ?? 0,
    isPositive: (data?.changePct ?? 0) >= 0,
    label:
      timePeriod === "day"
        ? "Сегодня"
        : timePeriod === "week"
        ? "Последние 7 дней"
        : "Последние 30 дней",
    compareText:
      timePeriod === "day" ? "к вчера" : "к предыдущему периоду",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-slate-900 mb-1">Панель мониторинга</h2>
          <p className="text-slate-600">
            Обзор инцидентов и активности ИИ-камер
          </p>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-lg border border-slate-200">
          {["day", "week", "month"].map((p) => (
            <Button
              key={p}
              variant={timePeriod === p ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimePeriod(p as TimePeriod)}
            >
              {p === "day"
                ? "День"
                : p === "week"
                ? "Неделя"
                : "Месяц"}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <Card className="bg-gradient-to-br from-slate-50 to-white border border-slate-200">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <p className="text-slate-600 text-sm font-medium">
              {currentStats.label}
            </p>
            <div className="flex items-center justify-between">
              <div className="text-4xl font-bold text-slate-900">
                {loading ? "…" : currentStats.count}
              </div>
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  timePeriod === "day"
                    ? "bg-blue-100"
                    : timePeriod === "week"
                    ? "bg-purple-100"
                    : "bg-indigo-100"
                }`}
              >
                <AlertTriangle
                  className={`h-6 w-6 ${
                    timePeriod === "day"
                      ? "text-blue-600"
                      : timePeriod === "week"
                      ? "text-purple-600"
                      : "text-indigo-600"
                  }`}
                />
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm">
              {currentStats.isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span
                className={
                  currentStats.isPositive
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {loading || data?.changePct == null
                  ? "—"
                  : `${currentStats.change}%`}{" "}
                {currentStats.compareText}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700">{error}</CardContent>
        </Card>
      )}

      {/* Charts */}
      {timePeriod === "day" && (
        <ChartCard
          title="Инциденты по времени"
          desc="Распределение событий за сегодня"
          type="line"
          data={data?.hourly || []}
        />
      )}
      {timePeriod === "week" && (
        <>
          <ChartCard
            title="Инциденты по дням"
            desc="Последние 7 дней"
            type="bar"
            data={data?.daily || []}
          />
          <PieCard data={incidentsByCategory} />
        </>
      )}
      {timePeriod === "month" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Инциденты по неделям"
              desc="30 дней, суммарно"
              type="line"
              data={data?.hourly || []}
            />
            <ChartCard
              title="Инциденты по дням недели"
              desc="Среднее за месяц"
              type="bar"
              data={data?.daily || []}
            />
          </div>
          <PieCard data={incidentsByCategory} />
        </>
      )}

      {/* Recent */}
      <RecentEventsCard
        loading={loading}
        recent={data?.recent || []}
        onNavigate={onNavigateToIncidents}
      />
    </div>
  );
}

/* --- Subcomponents --- */

function ChartCard({
  title,
  desc,
  type,
  data,
}: {
  title: string;
  desc: string;
  type: "bar" | "line";
  data: any[];
}) {
  return (
    <Card className="bg-gradient-to-br from-slate-50 to-white border border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {type === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ background: "#fff" }} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="hour" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ background: "#fff" }} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function PieCard({ data }: { data: any[] }) {
  return (
    <Card className="bg-gradient-to-br from-slate-50 to-white border border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg">Инциденты по категориям</CardTitle>
        <CardDescription>Распределение типов</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
          <ResponsiveContainer width="100%" height={300} minWidth={250}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#fff" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-4">
            {data.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-900 text-sm font-medium">
                    {c.name}
                  </span>
                  <span className="text-slate-500 text-sm">
                    {c.value} инцидентов
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentEventsCard({
  loading,
  recent,
  onNavigate,
}: {
  loading: boolean;
  recent: any[];
  onNavigate: () => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Последние инциденты</CardTitle>
          <CardDescription>Зафиксированные события</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-slate-500">Загрузка…</div>
          ) : (
            <div className="space-y-3">
              {recent.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-slate-900">
                          {incident.description}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-purple-600 border-purple-300"
                        >
                          AI
                        </Badge>
                      </div>
                      <span className="text-slate-500">{incident.time}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>
              ))}
            </div>
          )}
          <Button
            variant="outline"
            className="w-full mt-6"
            onClick={onNavigate}
          >
            Перейти ко всем инцидентам
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
