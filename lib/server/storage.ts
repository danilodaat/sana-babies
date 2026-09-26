import 'server-only';
import { get, put } from '@vercel/blob';

/*
 * Almacenamiento en Vercel Blob privado (store "sanna-babys-saves").
 *   users/<usuario>.json → { username, salt, hash, createdAt, failed, lockedUntil }
 *   saves/<usuario>.json → { state, version, updatedAt }
 * Nada es público: se lee y escribe solo desde estas rutas del servidor.
 */

export interface UserRecord {
  username: string;
  salt: string;
  hash: string;
  createdAt: number;
  failed: number;
  lockedUntil: number;
}

export interface SaveRecord {
  state: Record<string, unknown>;
  version: number;
  updatedAt: number;
}

export const userPath = (u: string) => `users/${u}.json`;
export const savePath = (u: string) => `saves/${u}.json`;

export async function readJson<T>(pathname: string): Promise<T | null> {
  const res = await get(pathname, { access: 'private', useCache: false });
  if (!res) return null;
  const text = await new Response(res.stream).text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** `create`: falla si ya existe (así dos personas no pueden crear el mismo usuario a la vez) */
export async function writeJson(pathname: string, data: unknown, opts: { create?: boolean } = {}) {
  await put(pathname, JSON.stringify(data), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: !opts.create,
    cacheControlMaxAge: 60,
  });
}
