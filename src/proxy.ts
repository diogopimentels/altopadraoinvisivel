import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  
  // Get hostname (e.g. loja.altopadraoinvisivel.com.br, localhost:3000)
  const hostname = request.headers.get('host') || '';

  // Determine if it is the store subdomain
  const isLoja = hostname.startsWith('loja.');

  // Lógica de Autenticação para Rotas Admin
  if (url.pathname.startsWith('/admin') && !url.pathname.startsWith('/admin/login')) {
    const adminToken = request.cookies.get('admin_token')?.value;
    const expectedToken = process.env.ADMIN_PASSWORD;
    
    if (!expectedToken || adminToken !== expectedToken) {
      // Redireciona para o login na mesma URL base
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
  }

  // PROTEÇÃO CRÍTICA DAS ROTAS DE API
  // Apenas GET e endpoints específicos (webhook, checkout e shipping) são públicos. Mutações nos produtos exigem token de admin.
  if (
    url.pathname.startsWith('/api') && 
    !url.pathname.startsWith('/api/webhook') && 
    !url.pathname.startsWith('/api/checkout') &&
    !url.pathname.startsWith('/api/shipping')
  ) {
    if (request.method !== 'GET') {
      const adminToken = request.cookies.get('admin_token')?.value;
      const expectedToken = process.env.ADMIN_PASSWORD;
      
      if (!expectedToken || adminToken !== expectedToken) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  }

  // Skip rewriting for API routes
  if (url.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Rewrite to the appropriate app directory based on the subdomain
  if (isLoja) {
    url.pathname = `/loja${url.pathname}`;
  } else {
    url.pathname = `/bio${url.pathname}`;
  }

  return NextResponse.rewrite(url);
}

// Configuração para interceptar apenas as rotas necessárias
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * 
     * Also excludes all paths ending with common asset extensions (like .jpeg, .png, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
