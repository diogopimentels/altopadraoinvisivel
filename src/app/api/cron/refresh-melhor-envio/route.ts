import { NextResponse } from 'next/server';
import { forceRefreshMelhorEnvioToken } from '@/lib/melhorEnvioAuth';

/**
 * Cron / ping manual pra renovar token Melhor Envio.
 * Protegido por CRON_SECRET (header Authorization: Bearer ...)
 * ou cookie admin (fallback).
 */
export async function POST(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const auth = request.headers.get('authorization') || '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';

    const okCron = Boolean(cronSecret && bearer === cronSecret);
    if (!okCron) {
      // Fallback admin cookie
      const { requireAdmin } = await import('@/lib/auth');
      const admin = await requireAdmin();
      if (admin !== true) return admin;
    }

    const result = await forceRefreshMelhorEnvioToken();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Cron refresh Melhor Envio:', error);
    return NextResponse.json(
      { error: error?.message || 'Falha no refresh' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
