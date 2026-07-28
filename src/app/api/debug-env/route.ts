import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

function mask(value: string) {
  if (!value) return 'VÁZIO / NÃO ENCONTRADO';
  if (value.length < 20) return `${value.substring(0, 4)}...`;
  return `${value.substring(0, 10)}...${value.substring(value.length - 8)}`;
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth !== true) return auth;

  const envStatus = {
    MELHOR_ENVIO_ENVIRONMENT: process.env.MELHOR_ENVIO_ENVIRONMENT || 'VÁZIO',
    MERCADOPAGO_ENVIRONMENT: process.env.MERCADOPAGO_ENVIRONMENT || 'VÁZIO',
    HAS_MELHOR_ENVIO_TOKEN: Boolean(process.env.MELHOR_ENVIO_ACCESS_TOKEN),
    HAS_MERCADOPAGO_TOKEN: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN),
    HAS_MERCADOPAGO_WEBHOOK_SECRET: Boolean(process.env.MERCADOPAGO_WEBHOOK_SECRET),
    HAS_SUPABASE_SERVICE_ROLE: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'VÁZIO',
    APP_URL: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'VÁZIO',
    // máscaras curtas só pra debug admin
    MERCADOPAGO_PUBLIC_KEY: mask(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || ''),
    IS_PRODUCTION: process.env.NODE_ENV === 'production',
  };

  return NextResponse.json(envStatus);
}
