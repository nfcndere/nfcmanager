import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ message: 'Session expirée.' }, { status: 401 });
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Vérification de session impossible:', error);
    return NextResponse.json({ message: 'API nfcwebsite indisponible.' }, { status: 502 });
  }
}
