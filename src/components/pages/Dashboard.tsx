// src/components/pages/Dashboard.tsx
import { useState } from "react";
import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
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

/* ------------------ labels ------------------ */

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

// если daily/hourly дают англ дни недели
const WEEKDAY_LABELS: Record<string, string> = {
  Mon: "Пн",
  Tue: "Вт",
  Wed: "Ср",
  Thu: "Чт",
  Fri: "Пт",
  Sat: "Сб",
  Sun: "Вс",

  Monday: "Понедельник",
  Tuesday: "Вторник",
  Wednesday: "Среда",
  Thursday: "Четверг",
  Friday: "Пятница",
  Saturday: "Суббота",
  Sunday: "Воскресенье",
};

function getTypeLabel(type?: string) {
  if (!type) return "—";
  return EVENT_TYPE_LABELS[type] || type.toUpperCase();
}

// универсальный перевод для осей/тултипов
function formatXAxisLabel(val: any) {
  const s = String(val);

  // если это тип события
  if (EVENT_TYPE_LABELS[s]) return EVENT_TYPE_LABELS[s];

  // если это день недели англ
  if (WEEKDAY_LABELS[s]) return WEEKDAY_LABELS[s];

  return s; // иначе как есть
}

interface DashboardProps {
  onNavigateToIncidents: () => void;
}

export default function Dashboard({ onNavigateToIncidents }: DashboardProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("day");
  const { loading, error, data } = useEventsStats(timePeriod);

  // переводим типы в русский (для pie)
  const incidentsByCategory =
    data?.byType?.map((x) => ({
      name: getTypeLabel(x.name),
      value: x.value,
      color: x.color,
      rawType: x.name,
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
    compareText: timePeriod === "day" ? "к вчера" : "к предыдущему периоду",
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
              {p === "day" ? "День" : p === "week" ? "Неделя" : "Месяц"}
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
                  currentStats.isPositive ? "text-green-600" : "text-red-600"
                }
              >
                {loading || data?.changePct == null
                  ? "—"
                  : `${currentStats.change}%`}{" "}
                {currentStats.compareText}
              </span>
            </div>

            <div className="pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onNavigateToIncidents}
              >
                Открыть журнал инцидентов
              </Button>
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
          xKey="hour"
        />
      )}

      {timePeriod === "week" && (
        <>
          <ChartCard
            title="Инциденты по дням"
            desc="Последние 7 дней"
            type="bar"
            data={data?.daily || []}
            xKey="day"
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
              xKey="week"
            />
            <ChartCard
              title="Инциденты по дням недели"
              desc="Среднее за месяц"
              type="bar"
              data={data?.daily || []}
              xKey="day"
            />
          </div>
          <PieCard data={incidentsByCategory} />
        </>
      )}
    </div>
  );
}

/* --- Subcomponents --- */

function ChartCard({
  title,
  desc,
  type,
  data,
  xKey,
}: {
  title: string;
  desc: string;
  type: "bar" | "line";
  data: any[];
  xKey: string; // hour/day/week etc
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
              <XAxis
                dataKey={xKey}
                stroke="#64748b"
                tickFormatter={formatXAxisLabel}
              />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{ background: "#fff" }}
                labelFormatter={formatXAxisLabel}
                formatter={(value: any, name: any) => {
                  if (name === "count") return [value, "Инцидентов"];
                  return [value, name];
                }}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey={xKey}
                stroke="#64748b"
                tickFormatter={formatXAxisLabel}
              />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{ background: "#fff" }}
                labelFormatter={formatXAxisLabel}
                formatter={(value: any, name: any) => {
                  if (name === "count") return [value, "Инцидентов"];
                  return [value, name];
                }}
              />
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
                nameKey="name"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>

              <Tooltip
                contentStyle={{ background: "#fff" }}
                formatter={(value: any, name: any, props: any) => {
                  // props.payload.name уже русский
                  return [value, props?.payload?.name || name];
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex flex-col gap-4">
            {data.map((c) => (
              <div
                key={c.rawType || c.name}
                className="flex items-center gap-3"
              >
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
