// src/components/pages/Login.tsx
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../providers/AuthProvider";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Shield } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [schoolRaw, setSchoolRaw] = useState(""); // ID или название — опционально
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload: {
        username: string;
        password: string;
        schoolId?: string;
        schoolName?: string;
      } = {
        username: username.trim(),
        password,
      };

      const s = schoolRaw.trim();
      if (s) {
        // угадаем тип: UUID -> schoolId, иначе -> schoolName
        const uuidRe =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (uuidRe.test(s)) payload.schoolId = s;
        else payload.schoolName = s;
      }
      // ВАЖНО: если schoolRaw пустой — мы НИЧЕГО не добавляем (никакого дефолта)

      await login(payload.username, payload.password, {
        schoolId: payload.schoolId,
        schoolName: payload.schoolName,
      });

      nav(sp.get("next") || "/", { replace: true });
    } catch (e: any) {
      const msg = (e?.message || "").toLowerCase();
      if (msg.includes("invalid credentials")) setError("Неверный логин или пароль.");
      else if (msg.includes("provide schoolid or schoolname"))
        setError("Укажите школу (ID или название) или оставьте пустым, если на бэке настроено авто-определение одной школы.");
      else if (msg.includes("unauthorized"))
        setError("Сессия недействительна. Войдите снова.");
      else setError("Не удалось войти. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-slate-200 shadow-sm">
        <CardContent className="p-6">
          {/* Маркер бренда */}
          <div className="mx-auto mb-6 h-10 w-10 rounded-xl bg-slate-900 text-white grid place-items-center">
            <Shield className="h-5 w-5" />
          </div>

          {/* Заголовок */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-slate-900">Вход</h1>
            <p className="text-slate-500 text-sm mt-1">Панель директора AI-Camera</p>
          </div>

          {/* Форма */}
          <form className="space-y-3" onSubmit={onSubmit}>
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[15px] outline-none focus:border-slate-300"
              placeholder="Логин"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />

            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[15px] outline-none focus:border-slate-300"
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[15px] outline-none focus:border-slate-300"
              placeholder="Школа (ID или название) — необязательно"
              value={schoolRaw}
              onChange={(e) => setSchoolRaw(e.target.value)}
            />

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full h-9 rounded-lg">
              {loading ? "Входим…" : "Войти"}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} AI-Camera
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
