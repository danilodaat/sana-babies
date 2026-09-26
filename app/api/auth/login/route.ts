import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, createSessionToken, isJson, normalizeUsername, sessionCookieOptions, verifyPassword } from '@/lib/server/auth';
import { readJson, userPath, writeJson, type UserRecord } from '@/lib/server/storage';

const MAX_FAILS = 8;
const LOCK_MS = 10 * 60 * 1000;
const WRONG = 'Usuario o contraseña incorrectos';

/** Entrar: { username, password }. Tras 8 intentos fallidos la cuenta se bloquea 10 minutos. */
export async function POST(req: NextRequest) {
  if (!isJson(req)) return NextResponse.json({ error: 'Formato inválido' }, { status: 415 });
  const body = await req.json().catch(() => null);
  const username = normalizeUsername(body?.username);
  const password = typeof body?.password === 'string' ? body.password : '';
  // Pequeña pausa fija: hace inútil probar contraseñas a toda velocidad
  await new Promise((r) => setTimeout(r, 300));
  if (!username || !password) return NextResponse.json({ error: WRONG }, { status: 401 });

  const user = await readJson<UserRecord>(userPath(username));
  if (!user) return NextResponse.json({ error: WRONG }, { status: 401 });
  if (user.lockedUntil > Date.now()) {
    const min = Math.ceil((user.lockedUntil - Date.now()) / 60000);
    return NextResponse.json({ error: `Demasiados intentos. Prueba de nuevo en ${min} min.` }, { status: 429 });
  }

  const ok = await verifyPassword(password, user.salt, user.hash);
  if (!ok) {
    const failed = (user.failed ?? 0) + 1;
    await writeJson(userPath(username), { ...user, failed: failed >= MAX_FAILS ? 0 : failed, lockedUntil: failed >= MAX_FAILS ? Date.now() + LOCK_MS : 0 });
    return NextResponse.json({ error: WRONG }, { status: 401 });
  }
  if (user.failed) await writeJson(userPath(username), { ...user, failed: 0, lockedUntil: 0 });

  const res = NextResponse.json({ username });
  res.cookies.set(SESSION_COOKIE, createSessionToken(username), sessionCookieOptions);
  return res;
}
