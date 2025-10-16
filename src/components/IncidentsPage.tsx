import { useState } from "react";
import {
  Plus,
  Filter,
  Search,
  Sparkles,
  User,
  ChevronRight,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

interface IncidentsPageProps {
  onViewDetails: (id: string) => void;
}

export default function IncidentsPage({ onViewDetails }: IncidentsPageProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Mock data
  // Mock data (обновлены описания для source: 'ai')
  const incidents = [
    {
      id: "1",
      date: "15.10.2025",
      time: "13:45",
      source: "ai",
      description: "Распознана ненормативная лексика (аудио)",
      participants: "Иванов П. (8А), Петров С. (8Б)",
      status: "new",
    },
    {
      id: "2",
      date: "15.10.2025",
      time: "12:20",
      source: "ai",
      description: "Возможный призыв о помощи («help») (аудио)",
      participants: "Сидоров А. (10В)",
      status: "in-progress",
    },
    {
      id: "3",
      date: "15.10.2025",
      time: "10:15",
      source: "manual",
      description: "Вандализм в раздевалке",
      participants: "Неизвестно",
      status: "new",
    },
    {
      id: "4",
      date: "15.10.2025",
      time: "09:30",
      source: "manual",
      description: "Конфликт между учениками",
      participants: "Козлова М. (7А), Новикова О. (7А)",
      status: "in-progress",
    },
    {
      id: "5",
      date: "14.10.2025",
      time: "15:10",
      source: "ai",
      description: "Распознана ненормативная лексика (аудио)",
      participants: "Группа учеников 6Б класса",
      status: "resolved",
    },
    {
      id: "6",
      date: "14.10.2025",
      time: "14:25",
      source: "manual",
      description: "Пропуск урока без уважительной причины",
      participants: "Смирнов Д. (9В)",
      status: "resolved",
    },
    {
      id: "7",
      date: "14.10.2025",
      time: "11:50",
      source: "ai",
      description: "Возможный призыв о помощи («help») (аудио)",
      participants: "Волков И. (11А)",
      status: "resolved",
    },
    {
      id: "8",
      date: "13.10.2025",
      time: "13:00",
      source: "ai",
      description: "Распознана ненормативная лексика (аудио)",
      participants: "Неизвестное лицо",
      status: "resolved",
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

  const getSourceIcon = (source: string) => {
    return source === "ai" ? (
      <div className="flex items-center gap-1.5 text-purple-600">
        <Sparkles className="h-4 w-4" />
        <span>ИИ-камера</span>
      </div>
    ) : (
      <div className="flex items-center gap-1.5 text-slate-600">
        <User className="h-4 w-4" />
        <span>Вручную</span>
      </div>
    );
  };

  const filteredIncidents = incidents.filter((incident) => {
    const matchesStatus =
      statusFilter === "all" || incident.status === statusFilter;
    const matchesSource =
      sourceFilter === "all" || incident.source === sourceFilter;
    const matchesSearch =
      incident.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.participants.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSource && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-slate-900 mb-1">Журнал инцидентов</h2>
          <p className="text-slate-600">
            Управление и мониторинг всех зафиксированных событий
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Добавить инцидент вручную
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Добавить новый инцидент</DialogTitle>
              <DialogDescription>
                Заполните информацию о произошедшем инциденте
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="description">Описание инцидента</Label>
                <Input
                  id="description"
                  placeholder="Краткое описание произошедшего"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="participants">Участники</Label>
                <Input
                  id="participants"
                  placeholder="Имена и классы учеников"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="details">Подробности</Label>
                <Textarea
                  id="details"
                  placeholder="Детальное описание инцидента"
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Отмена
              </Button>
              <Button onClick={() => setIsAddDialogOpen(false)}>
                Сохранить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Поиск по описанию или участникам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
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
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Источник" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все источники</SelectItem>
                  <SelectItem value="ai">ИИ-камера</SelectItem>
                  <SelectItem value="manual">Вручную</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="text-slate-600">
        Найдено инцидентов:{" "}
        <span className="text-slate-900">{filteredIncidents.length}</span>
      </div>

      {/* Incidents Table - Desktop */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата и время</TableHead>
                <TableHead>Источник</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-[100px]">Действие</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIncidents.map((incident) => (
                <TableRow
                  key={incident.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => onViewDetails(incident.id)}
                >
                  <TableCell>
                    <div>
                      <div className="text-slate-900">{incident.date}</div>
                      <div className="text-slate-500">{incident.time}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getSourceIcon(incident.source)}</TableCell>
                  <TableCell className="text-slate-900">
                    {incident.description}
                  </TableCell>
                  <TableCell>{getStatusBadge(incident.status)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(incident.id);
                      }}
                    >
                      Подробнее
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Incidents List - Mobile */}
      <div className="lg:hidden space-y-3">
        {filteredIncidents.map((incident) => (
          <Card
            key={incident.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onViewDetails(incident.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-slate-900 mb-1">
                    {incident.description}
                  </div>
                  <div className="text-slate-500">
                    {incident.date} в {incident.time}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
              </div>

              <div className="flex items-center gap-2 mb-2">
                {getSourceIcon(incident.source)}
              </div>

              <div className="text-slate-600 mb-3">{incident.participants}</div>

              <div className="flex items-center justify-between">
                {getStatusBadge(incident.status)}
                <Button variant="ghost" size="sm">
                  Подробнее
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
