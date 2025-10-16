import { useState } from "react";
import { AlertTriangle, Camera, ChevronRight, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
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
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DashboardProps {
  onNavigateToIncidents: () => void;
}

export default function Dashboard({ onNavigateToIncidents }: DashboardProps) {
  const [timePeriod, setTimePeriod] = useState<"day" | "week" | "month">("day");

  // Mock data for charts based on time period
  const chartDataByPeriod = {
    day: {
      hourly: [
        { hour: "00:00", count: 2 },
        { hour: "04:00", count: 1 },
        { hour: "08:00", count: 3 },
        { hour: "12:00", count: 4 },
        { hour: "16:00", count: 2 },
        { hour: "20:00", count: 1 },
      ],
      daily: [
        { day: "Сегодня", count: 7 },
      ],
    },
    week: {
      hourly: [
        { hour: "Пн", count: 12 },
        { hour: "Вт", count: 15 },
        { hour: "Ср", count: 10 },
        { hour: "Чт", count: 18 },
        { hour: "Пт", count: 14 },
        { hour: "Сб", count: 8 },
        { hour: "Вс", count: 6 },
      ],
      daily: [
        { day: "Пн", count: 12 },
        { day: "Вт", count: 15 },
        { day: "Ср", count: 10 },
        { day: "Чт", count: 18 },
        { day: "Пт", count: 14 },
        { day: "Сб", count: 8 },
        { day: "Вс", count: 6 },
      ],
    },
    month: {
      hourly: [
        { hour: "1 неделя", count: 83 },
        { hour: "2 неделя", count: 92 },
        { hour: "3 неделя", count: 78 },
        { hour: "4 неделя", count: 87 },
      ],
      daily: [
        { day: "Пн", count: 48 },
        { day: "Вт", count: 52 },
        { day: "Ср", count: 44 },
        { day: "Чт", count: 61 },
        { day: "Пт", count: 58 },
        { day: "Сб", count: 29 },
        { day: "Вс", count: 20 },
      ],
    },
  };

  const incidentsByCategory = [
    { name: "Ненормативная лексика", value: 45, color: "#ef4444" },
    { name: "Призыв о помощи", value: 30, color: "#8b5cf6" },
    { name: "Другое", value: 25, color: "#6366f1" },
  ];

  const summaryStatsByPeriod = {
    day: {
      count: 7,
      change: 12,
      isPositive: false,
      label: "Сегодня",
      compareText: "от вчера",
    },
    week: {
      count: 83,
      change: 5,
      isPositive: false,
      label: "На этой неделе",
      compareText: "от прошлой недели",
    },
    month: {
      count: 312,
      change: 8,
      isPositive: false,
      label: "В этом месяце",
      compareText: "от прошлого месяца",
    },
  };

  const currentStats = summaryStatsByPeriod[timePeriod];
  const currentChartData = chartDataByPeriod[timePeriod];

  // Mock data
  const recentIncidents = [
    {
      id: "1",
      description: "Распознана ненормативная лексика (аудио)",
      time: "13:45",
      isAI: true,
      status: "new",
    },
    {
      id: "2",
      description: "Возможный призыв о помощи («help») (аудио)",
      time: "12:20",
      isAI: true,
      status: "in-progress",
    },
    {
      id: "3",
      description: "Вандализм в раздевалке",
      time: "10:15",
      isAI: false,
      status: "new",
    },
    {
      id: "4",
      description: "Конфликт между учениками",
      time: "09:30",
      isAI: false,
      status: "in-progress",
    },
    {
      id: "5",
      description: "Распознана ненормативная лексика (аудио)",
      time: "08:15",
      isAI: true,
      status: "new",
    },
  ];

  const getStatusBadge = (status: string) => {
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
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-slate-900 mb-1">Панель мониторинга</h2>
          <p className="text-slate-600">
            Обзор инцидентов и активности ИИ-камер
          </p>
        </div>

        {/* Time Period Filter */}
        <div className="flex gap-2 bg-white p-1 rounded-lg border border-slate-200">
          <Button
            variant={timePeriod === "day" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTimePeriod("day")}
          >
            День
          </Button>
          <Button
            variant={timePeriod === "week" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTimePeriod("week")}
          >
            Неделя
          </Button>
          <Button
            variant={timePeriod === "month" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTimePeriod("month")}
          >
            Месяц
          </Button>
        </div>
      </div>

      {/* Summary Statistics Card - Dynamic based on time period */}
      <Card className="bg-gradient-to-br from-slate-50 to-white border border-slate-200">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <p className="text-slate-600 text-sm font-medium">{currentStats.label}</p>
            <div className="flex items-center justify-between">
              <div className="text-4xl font-bold text-slate-900">
                {currentStats.count}
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                timePeriod === 'day' ? 'bg-blue-100' :
                timePeriod === 'week' ? 'bg-purple-100' :
                'bg-indigo-100'
              }`}>
                <AlertTriangle className={`h-6 w-6 ${
                  timePeriod === 'day' ? 'text-blue-600' :
                  timePeriod === 'week' ? 'text-purple-600' :
                  'text-indigo-600'
                }`} />
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
                {currentStats.change}% {currentStats.compareText}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart - Incidents by Hour */}
        <Card className="bg-gradient-to-br from-slate-50 to-white border border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Инциденты по часам</CardTitle>
            <CardDescription>Распределение событий за сегодня</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={incidentsByHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.5rem",
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
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart - Incidents by Day */}
        <Card className="bg-gradient-to-br from-slate-50 to-white border border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Инциденты по дням недели</CardTitle>
            <CardDescription>Данные за текущую неделю</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={incidentsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.5rem",
                  }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Donut Chart - Incidents by Category */}
      <Card className="bg-gradient-to-br from-slate-50 to-white border border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Инциденты по категориям</CardTitle>
          <CardDescription>Распределение инцидент��в в этом месяце</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
            <ResponsiveContainer width="100%" height={300} minWidth={250}>
              <PieChart>
                <Pie
                  data={incidentsByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {incidentsByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.5rem",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-4">
              {incidentsByCategory.map((category) => (
                <div key={category.name} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-900 text-sm font-medium">
                      {category.name}
                    </span>
                    <span className="text-slate-500 text-sm">
                      {category.value} инцидентов
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Incidents */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Последние инциденты</CardTitle>
            <CardDescription>
              Зафиксированные события требующие внимания
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {incident.isAI && (
                      <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-slate-900">
                          {incident.description}
                        </span>
                        {incident.isAI && (
                          <Badge
                            variant="outline"
                            className="text-purple-600 border-purple-300"
                          >
                            AI
                          </Badge>
                        )}
                      </div>
                      <span className="text-slate-500">{incident.time}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(incident.status)}
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full mt-6"
              onClick={onNavigateToIncidents}
            >
              Перейти ко всем инцидентам
            </Button>
          </CardContent>
        </Card>

        {/* AI Camera Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Активность ИИ-камер</CardTitle>
            <CardDescription>Мониторинг системы безопасности</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Camera preview placeholder */}
              <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="h-12 w-12 text-slate-600" />
                </div>
                <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded flex items-center gap-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  LIVE
                </div>
                <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded backdrop-blur-sm">
                  Камера #1 - Главный вход
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Всего камер</span>
                  <span className="text-slate-900">24</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Активны</span>
                  <span className="text-green-600">24</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">События за час</span>
                  <span className="text-slate-900">12</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center gap-2 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Система работает нормально</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
