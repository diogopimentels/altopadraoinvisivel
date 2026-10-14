import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildMelhorEnvioAuthorizeUrl } from '@/lib/melhorEnvioAuth';

export const dynamic = 'force-dynamic';

function isAdmin(request: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  const token = request.cookies.get('admin_token')?.value;
  return Boolean(expected && token === expected);
}

function originOf(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'loja.altopadraoinvisivel.com.br';
  const proto = host.includes('localhost') ? 'http' : 'https';
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const origin = originOf(request);
  if (!isAdmin(request)) {
    return NextResponse.redirect(new URL('/admin/login', origin));
  }

  const state = crypto.randomUUID();
  let authorizeUrl: string;
  try {
    authorizeUrl = buildMelhorEnvioAuthorizeUrl(state);
  } catch (error) {
    console.error('Melhor Envio connect:', error);
    return NextResponse.redirect(new URL('/admin?me=erro', origin));
  }

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set('me_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10,
  });
  return response;
}
