import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function requireAdmin(): Promise<true | NextResponse> {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get('admin_token')?.value;
  const expectedToken = process.env.ADMIN_PASSWORD;

  if (!expectedToken || adminToken !== expectedToken) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  return true;
}

/** Origin confiável para back_urls / webhooks — nunca usar header Origin do cliente. */
export function getTrustedAppOrigin(): string {
  const configured =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://loja.altopadraoinvisivel.com.br';

  const allowed = new Set([
    'https://loja.altopadraoinvisivel.com.br',
    'https://altopadraoinvisivel.com.br',
  ]);

  // Tunnel local explícito no .env é ok
  if (configured.startsWith('https://') && (
    allowed.has(configured.replace(/\/$/, '')) ||
    configured.includes('trycloudflare.com') ||
    configured.includes('ngrok') ||
    configured.includes('localhost')
  )) {
    return configured.replace(/\/$/, '');
  }

  return 'https://loja.altopadraoinvisivel.com.br';
}
