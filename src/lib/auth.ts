import { httpGet, httpPost, getAuth, setAuth } from './http';

export type LoginDto = {
  username: string;
  password: string;
  // один из двух обязателен (ровно как на бэке)
  schoolId?: string;
  schoolName?: string;
};

export type LoginResp = {
  token: string;
  user: { id:string; username:string; role:'director'|'admin'|string; schoolId:string; createdAt:string };
};

export async function login(dto: LoginDto) {
  // /auth/login вернёт { token, user }
  const data = await httpPost<LoginResp>('/auth/login', dto);
  setAuth({ token: data.token, user: data.user });
  return data.user;
}

export async function me() {
  const data = await httpGet<LoginResp['user']>('/auth/me');
  // подстраховочно синхронизируем user в локали
  const a = getAuth();
  if (a?.token) setAuth({ token: a.token, user: data });
  return data;
}

export function logout() {
  setAuth(null);
}
