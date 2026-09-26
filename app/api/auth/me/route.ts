import { NextResponse, type NextRequest } from 'next/server';
import { readSession } from '@/lib/server/auth';

/** ¿Quién soy? (según la cookie de sesión) */
export async function GET(req: NextRequest) {
  const username = readSession(req);
  // Sin sesión no es un error (evita un 401 rojo en la consola en cada visita)
  if (!username) return NextResponse.json({ username: null });
  return NextResponse.json({ username });
}
