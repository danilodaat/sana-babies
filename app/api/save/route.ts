import { NextResponse, type NextRequest } from 'next/server';
import { isJson, readSession } from '@/lib/server/auth';
import { readJson, savePath, writeJson, type SaveRecord } from '@/lib/server/storage';

const MAX_BYTES = 64 * 1024;

/** Bajar la partida guardada en la nube */
export async function GET(req: NextRequest) {
  const username = readSession(req);
  if (!username) return NextResponse.json({ error: 'Sin sesión' }, { status: 401 });
  const save = await readJson<SaveRecord>(savePath(username));
  return NextResponse.json({ save }, { headers: { 'Cache-Control': 'no-store' } });
}

/** Subir la partida: { state, version, updatedAt } */
export async function PUT(req: NextRequest) {
  const username = readSession(req);
  if (!username) return NextResponse.json({ error: 'Sin sesión' }, { status: 401 });
  if (!isJson(req)) return NextResponse.json({ error: 'Formato inválido' }, { status: 415 });
  const raw = await req.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ error: 'Partida demasiado grande' }, { status: 413 });
  let body: Partial<SaveRecord>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  if (!body || typeof body.state !== 'object' || body.state === null || Array.isArray(body.state) || typeof body.version !== 'number') {
    return NextResponse.json({ error: 'Partida inválida' }, { status: 400 });
  }
  const record: SaveRecord = { state: body.state, version: body.version, updatedAt: Date.now() };
  await writeJson(savePath(username), record);
  return NextResponse.json({ updatedAt: record.updatedAt });
}
