import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getMelhorEnvioTokenStatus } from '@/lib/melhorEnvioAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (auth !== true) return auth;

  try {
    const status = await getMelhorEnvioTokenStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Melhor Envio status:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
