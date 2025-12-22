// src/hooks/useEventsStats.ts
import { useEffect, useMemo, useState } from "react";
import { listEvents, type EventItem } from "../lib/events";

export type TimePeriod = "day" | "week" | "month";

// Теперь принимает filters как второй аргумент
export function useEventsStats(
  period: TimePeriod,
  filters?: { school_id?: string }
) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const { from, to } = getRange(period);

    setLoading(true);
    setErr(null);

    listEvents({
      from,
      to,
      limit: 2000,
      school_id: filters?.school_id, // Используем переданный фильтр
    })
      .then(setEvents)
      .catch((e) => setErr(e?.message || "Ошибка загрузки событий"))
      .finally(() => setLoading(false));
  }, [period, filters?.school_id]);

  const prepared = useMemo(() => {
    // нормализация timestamp: поддержка ISO, миллисекунд и секунд
    const toDate = (t: string | number) => {
      if (typeof t === "number") {
        // если это похоже на секунды
        const ms = t < 1e12 ? t * 1000 : t;
        return new Date(ms);
      }
      // если строка — попробуем как число (сек/мс), иначе как ISO
      const n = Number(t);
      if (Number.isFinite(n)) {
        const ms = n < 1e12 ? n * 1000 : n;
        return new Date(ms);
      }
      return new Date(t);
    };

    const normalized = events
      .map((e) => ({ ...e, _dt: toDate(e.timestamp) }))
      .filter((e) => !isNaN(e._dt.getTime())); // выкинем битые даты на всякий

    if (period === "day") {
      const byHour = Array.from({ length: 24 }, (_, h) => ({
        hour: String(h).padStart(2, "0") + ":00",
        count: 0,
      }));
      let total = 0;

      normalized.forEach((e) => {
        const h = e._dt.getHours();
        byHour[h].count += 1;
        total += 1;
      });

      const byTypeMap = new Map<string, number>();
      normalized.forEach((e) =>
        byTypeMap.set(e.type, (byTypeMap.get(e.type) || 0) + 1)
      );
      const byType = Array.from(byTypeMap.entries()).map(
        ([name, value], i) => ({
          name,
          value,
          color: pickColor(i),
        })
      );

      const recent = normalized
        .sort((a, b) => b._dt.getTime() - a._dt.getTime())
        .slice(0, 5)
        .map((e) => ({
          id: e.id,
          description: readableType(e.type),
          time: e._dt.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isAI: true,
          status: "new",
        }));

      return {
        total,
        changePct: null,
        hourly: byHour,
        daily: [{ day: "Сегодня", count: total }],
        byType,
        recent,
      };
    }

    if (period === "week") {
      const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
      const last7: { day: string; dateKey: string; count: number }[] = [];
      const now = new Date();

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        d.setHours(0, 0, 0, 0);
        last7.push({
          day: dayNames[d.getDay()],
          dateKey: d.toISOString().slice(0, 10),
          count: 0,
        });
      }

      const idxByDate = new Map(last7.map((x, i) => [x.dateKey, i]));
      normalized.forEach((e) => {
        const key = toIsoDateKey(e._dt);
        const idx = idxByDate.get(key);
        if (idx !== undefined) last7[idx].count += 1;
      });

      const byTypeMap = new Map<string, number>();
      normalized.forEach((e) =>
        byTypeMap.set(e.type, (byTypeMap.get(e.type) || 0) + 1)
      );
      const byType = Array.from(byTypeMap.entries()).map(
        ([name, value], i) => ({
          name,
          value,
          color: pickColor(i),
        })
      );

      const total = last7.reduce((s, x) => s + x.count, 0);

      const recent = normalized
        .sort((a, b) => b._dt.getTime() - a._dt.getTime())
        .slice(0, 5)
        .map((e) => ({
          id: e.id,
          description: readableType(e.type),
          time: e._dt.toLocaleString([], {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }),
          isAI: true,
          status: "new",
        }));

      return {
        total,
        changePct: null,
        hourly: last7.map((d) => ({ hour: d.day, count: d.count })),
        daily: last7.map((d) => ({ day: d.day, count: d.count })),
        byType,
        recent,
      };
    }

    // month
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const buckets = [
      {
        label: "1 неделя",
        from: daysAgo(29, now),
        to: daysAgo(22, now),
        count: 0,
      },
      {
        label: "2 неделя",
        from: daysAgo(21, now),
        to: daysAgo(15, now),
        count: 0,
      },
      {
        label: "3 неделя",
        from: daysAgo(14, now),
        to: daysAgo(8, now),
        count: 0,
      },
      { label: "4 неделя", from: daysAgo(7, now), to: now, count: 0 },
    ];
    normalized.forEach((e) => {
      const t = e._dt.getTime();
      for (const b of buckets) {
        if (
          t >= b.from.getTime() &&
          t <= b.to.getTime() + 24 * 60 * 60 * 1000 - 1
        ) {
          b.count += 1;
          break;
        }
      }
    });

    const dailyDist = buildDailyCounts(normalized);

    const byTypeMap = new Map<string, number>();
    normalized.forEach((e) =>
      byTypeMap.set(e.type, (byTypeMap.get(e.type) || 0) + 1)
    );
    const byType = Array.from(byTypeMap.entries()).map(([name, value], i) => ({
      name,
      value,
      color: pickColor(i),
    }));

    const total = normalized.length;

    const recent = normalized
      .sort((a, b) => b._dt.getTime() - a._dt.getTime())
      .slice(0, 5)
      .map((e) => ({
        id: e.id,
        description: readableType(e.type),
        time:
          e._dt.toLocaleDateString([], { day: "2-digit", month: "2-digit" }) +
          " " +
          e._dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isAI: true,
        status: "new",
      }));

    return {
      total,
      changePct: null,
      hourly: buckets.map((b) => ({ hour: b.label, count: b.count })),
      daily: dailyDist,
      byType,
      recent,
    };
  }, [events, period]);

  return { loading, error: err, data: prepared };
}

/* helpers */
function getRange(period: TimePeriod): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();

  let fromDate: Date;
  if (period === "day") {
    fromDate = new Date();
    fromDate.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    fromDate.setHours(0, 0, 0, 0);
  } else {
    fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    fromDate.setHours(0, 0, 0, 0);
  }

  // страховка на случай Invalid Date
  if (isNaN(fromDate.getTime())) {
    fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    fromDate.setHours(0, 0, 0, 0);
  }

  return { from: fromDate.toISOString(), to };
}

function daysAgo(n: number, from: Date) {
  return new Date(from.getTime() - n * 24 * 60 * 60 * 1000);
}
function buildDailyCounts(evts: { _dt: Date }[]) {
  const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const agg = new Array(7).fill(0);
  evts.forEach((e) => {
    agg[e._dt.getDay()] += 1;
  });
  return agg.map((c, i) => ({ day: dayNames[i], count: c }));
}
function pickColor(i: number) {
  const palette = [
    "#ef4444",
    "#8b5cf6",
    "#6366f1",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#0ea5e9",
  ];
  return palette[i % palette.length];
}
function readableType(t: string) {
  const map: Record<string, string> = {
    profanity_scream: "Ненормативная лексика",
    scream: "Крик/Призыв о помощи",
    fight: "Драка",
  };
  return map[t] || t;
}
function toIsoDateKey(d: Date) {
  const dd = new Date(d.getTime());
  dd.setHours(0, 0, 0, 0);
  return dd.toISOString().slice(0, 10);
}
