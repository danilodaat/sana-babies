import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, createSessionToken, hashPassword, isJson, normalizeUsername, sessionCookieOptions, validPassword, MIN_PASSWORD } from '@/lib/server/auth';
import { readJson, userPath, writeJson, type UserRecord } from '@/lib/server/storage';

/** Crear cuenta: { username, password } */
export async function POST(req: NextRequest) {
  if (!isJson(req)) return NextResponse.json({ error: 'Formato inválido' }, { status: 415 });
  const body = await req.json().catch(() => null);
  const username = normalizeUsername(body?.username);
  if (!username) return NextResponse.json({ error: 'El usuario debe tener de 3 a 20 letras, números o _ (sin espacios ni tildes)' }, { status: 400 });
  if (!validPassword(body?.password)) return NextResponse.json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` }, { status: 400 });

  if (await readJson<UserRecord>(userPath(username))) {
    return NextResponse.json({ error: 'Ese usuario ya existe. Prueba con otro o entra con tu contraseña.' }, { status: 409 });
  }
  const { salt, hash } = await hashPassword(body.password);
  const record: UserRecord = { username, salt, hash, createdAt: Date.now(), failed: 0, lockedUntil: 0 };
  try {
    await writeJson(userPath(username), record, { create: true });
  } catch {
    // Otra persona lo creó en el mismo instante
    return NextResponse.json({ error: 'Ese usuario ya existe. Prueba con otro.' }, { status: 409 });
  }

  const res = NextResponse.json({ username });
  res.cookies.set(SESSION_COOKIE, createSessionToken(username), sessionCookieOptions);
  return res;
}
