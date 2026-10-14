import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { exchangeAuthorizationCode } from '@/lib/melhorEnvioAuth';

export const dynamic = 'force-dynamic';

function originOf(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'loja.altopadraoinvisivel.com.br';
  const proto = host.includes('localhost') ? 'http' : 'https';
  return `${proto}://${host}`;
}

function finish(request: NextRequest, me: string) {
  const response = NextResponse.redirect(new URL(`/admin?me=${me}`, originOf(request)));
  response.cookies.set('me_oauth_state', '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  const admin = request.cookies.get('admin_token')?.value;
  if (!expected || admin !== expected) {
    return finish(request, 'auth');
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const expectedState = request.cookies.get('me_oauth_state')?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return finish(request, 'state');
  }

  try {
    await exchangeAuthorizationCode(code);
    return finish(request, 'ok');
  } catch (error) {
    console.error('Melhor Envio callback:', error);
    return finish(request, 'erro');
  }
}
