import { useState } from "react";
import { ArrowLeft, Sparkles, Calendar, Clock, Camera } from "lucide-react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";
import { Alert, AlertDescription } from "./ui/alert";

interface IncidentDetailsProps {
  incidentId: string;
  onBack: () => void;
}

export default function IncidentDetails({
  incidentId,
  onBack,
}: IncidentDetailsProps) {
  const [status, setStatus] = useState("new");

  // Mock incident data - in real app would fetch by incidentId
  const incident = {
    id: incidentId,
    date: "15.10.2025",
    time: "13:45",
    source: "ai",
    description: "Распознана ненормативная лексика (аудио)",
    fullDescription:
      "Система ИИ-камер зафиксировала использование ненормативной лексики в зоне отдыха. Аудиоанализ определил повышенный тон и оскорбительные выражения. Событие автоматически зарегистрировано и передано администрации для проверки контекста и последующего разбора ситуации.",
    location: "Зона отдыха",
    cameraId: "CAM-007",
    status: "new",
    videoTimestamp: "13:45:23",
  };

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-slate-900 mb-1">
            Детали инцидента #{incident.id}
          </h2>
          <p className="text-slate-600">{incident.description}</p>
        </div>
        {getStatusBadge(incident.status)}
      </div>

      {incident.source === "ai" && (
        <Alert className="bg-purple-50 border-purple-200">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-900">
            Этот инцидент был автоматически зафиксирован системой ИИ-камер
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player (for AI incidents) */}
          {incident.source === "ai" && (
            <Card>
              <CardHeader>
                <CardTitle>Видеозапись инцидента</CardTitle>
                <CardDescription>
                  Камера {incident.cameraId} • {incident.videoTimestamp}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden mb-6">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera className="h-20 w-20 text-slate-600" />
                  </div>
                  <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1.5 rounded flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    REC
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                    <div className="flex items-center justify-between text-white">
                      <span className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Камера {incident.cameraId} - {incident.location}
                      </span>
                      <span>{incident.videoTimestamp}</span>
                    </div>
                  </div>
                  {/* Video controls would go here */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button variant="secondary" size="lg" className="gap-2">
                      ▶ Воспроизвести запись
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Описание инцидента</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 leading-relaxed">
                {incident.fullDescription}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle>Информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-slate-400" />
                <div>
                  <div className="text-slate-500">Дата</div>
                  <div className="text-slate-900">{incident.date}</div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-slate-400" />
                <div>
                  <div className="text-slate-500">Время</div>
                  <div className="text-slate-900">{incident.time}</div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                {incident.source === "ai" ? (
                  <Sparkles className="h-5 w-5 text-purple-600" />
                ) : (
                  <Users className="h-5 w-5 text-slate-400" />
                )}
                <div>
                  <div className="text-slate-500">Источник</div>
                  <div className="text-slate-900">
                    {incident.source === "ai"
                      ? "ИИ-камера"
                      : "Добавлен вручную"}
                  </div>
                </div>
              </div>

              {incident.source === "ai" && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Camera className="h-5 w-5 text-slate-400" />
                    <div>
                      <div className="text-slate-500">Камера</div>
                      <div className="text-slate-900">{incident.cameraId}</div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 flex items-center justify-center">
                      📍
                    </div>
                    <div>
                      <div className="text-slate-500">Место</div>
                      <div className="text-slate-900">{incident.location}</div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Status Management */}
          <Card>
            <CardHeader>
              <CardTitle>Управление статусом</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-slate-700">Текущий статус</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Новый</SelectItem>
                    <SelectItem value="in-progress">В работе</SelectItem>
                    <SelectItem value="resolved">Решен</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full" variant="outline">
                Обновить статус
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
