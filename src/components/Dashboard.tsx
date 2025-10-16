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

      {/* Key Widget - Incidents Today */}
      <Card
        className="cursor-pointer hover:shadow-xl transition-all border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50"
        onClick={onNavigateToIncidents}
      >
        <CardContent className="pt-8 pb-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <div className="space-y-2">
              <div
                className="text-slate-900"
                style={{ fontSize: "4rem", lineHeight: "1" }}
              >
                7
              </div>
              <p className="text-slate-900">Инциденты за сегодня</p>
              <div className="flex items-center justify-center gap-2 text-amber-600 mt-4">
                <AlertTriangle className="h-5 w-5" />
                <span>3 требуют внимания</span>
              </div>
            </div>
            <Button className="mt-6" size="lg">
              Перейти к инцидентам
            </Button>
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
