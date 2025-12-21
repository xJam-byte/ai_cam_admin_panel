// src/lib/http.ts
const AUTH_KEY = import.meta.env.VITE_AUTH_STORAGE_KEY || 'ai_cam__auth';
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, ''); // '' => через proxy
const ENV_PREFIX = (import.meta.env.VITE_API_PREFIX || '/api').replace(
	/\/+$/,
	''
); // пробуем сначала его

type AuthBundle = { token: string; user?: any };

// хранение и кэш префикса
const PREFIX_STORAGE_KEY = 'ai_cam__api_prefix_active';
let activePrefix: string | null = loadActivePrefix();

function loadActivePrefix(): string | null {
	try {
		return localStorage.getItem(PREFIX_STORAGE_KEY);
	} catch {
		return null;
	}
}
function saveActivePrefix(p: string) {
	try {
		localStorage.setItem(PREFIX_STORAGE_KEY, p);
	} catch {}
	activePrefix = p;
}

// auth utils
export function getAuth(): AuthBundle | null {
	try {
		return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
	} catch {
		return null;
	}
}
export function setAuth(v: AuthBundle | null) {
	if (!v) localStorage.removeItem(AUTH_KEY);
	else localStorage.setItem(AUTH_KEY, JSON.stringify(v));
}

function buildUrl(prefix: string, path: string) {
	const cleanPath = path.startsWith('/') ? path : `/${path}`;
	const p = prefix ? `/${prefix.replace(/^\/+/, '')}` : '';
	return `${API_BASE}${p}${cleanPath}`;
}

async function tryFetch(url: string, init: RequestInit) {
	const res = await fetch(url, init);
	return res;
}

/**
 * Главная обёртка: пытаемся с activePrefix/ENV_PREFIX, если 404 — без префикса.
 * Кэшируем рабочий вариант.
 */
export async function http<T>(
	path: string,
	init: RequestInit = {}
): Promise<T> {
	const auth = getAuth();
	const headers = new Headers(init.headers || {});
	headers.set('Accept', 'application/json');
	if (!(init.body instanceof FormData))
		headers.set('Content-Type', 'application/json');
	if (auth?.token) headers.set('Authorization', `Bearer ${auth.token}`);
	headers.set('ngrok-skip-browser-warning', 'true');

	const reqInit: RequestInit = {
		...init,
		headers,
		mode: 'cors',
		credentials: 'omit',
	};

	// 1) если уже знаем рабочий префикс — используем
	const prefixesToTry =
		activePrefix != null ? [activePrefix] : [ENV_PREFIX, '']; // сначала ENV, потом без префикса

	let lastErrText = '';
	for (const prefix of prefixesToTry) {
		const url = buildUrl(prefix, path);
		const res = await tryFetch(url, reqInit);
		if (res.status === 401) {
			setAuth(null);
			const msg = await res.text().catch(() => '');
			throw new Error(msg || `UNAUTHORIZED @ ${url}`);
		}
		if (res.ok) {
			// запомним удачный префикс
			if (activePrefix !== prefix) saveActivePrefix(prefix);
			return res.json() as Promise<T>;
		}
		// если 404 и есть ещё один вариант — пробуем следующий
		if (res.status === 404) {
			lastErrText = await res.text().catch(() => '');
			continue;
		} else {
			const body = await res.text().catch(() => '');
			throw new Error(body || `HTTP ${res.status} @ ${url}`);
		}
	}

	// дошли сюда — оба варианта дали 404
	const urlTried1 = buildUrl(prefixesToTry[0], path);
	const urlTried2 = buildUrl(prefixesToTry[1] ?? '', path);
	const extra = lastErrText ? `\n${lastErrText}` : '';
	throw new Error(`HTTP 404. Tried: ${urlTried1} and ${urlTried2}.${extra}`);
}

export const httpGet = <T>(path: string) => http<T>(path);
export const httpPost = <T>(path: string, body?: unknown) =>
	http<T>(path, {
		method: 'POST',
		body: body instanceof FormData ? body : JSON.stringify(body),
	});
export const httpPatch = <T>(path: string, body?: unknown) =>
	http<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
