import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const PROVIDER = 'melhor_envio';
/** Renova se faltar menos de 48h pro access_token expirar */
const REFRESH_SKEW_MS = 48 * 60 * 60 * 1000;

function meOAuthBase() {
  return process.env.MELHOR_ENVIO_ENVIRONMENT === 'sandbox'
    ? 'https://sandbox.melhorenvio.com.br'
    : 'https://www.melhorenvio.com.br';
}

/** Callback cadastrado no app da Área Dev. Tem que ser idêntico. */
export const MELHOR_ENVIO_REDIRECT_URI = 'https://loja.altopadraoinvisivel.com.br';

const MELHOR_ENVIO_SCOPES = [
  'cart-read',
  'cart-write',
  'companies-read',
  'coupons-read',
  'shipping-calculate',
  'shipping-cancel',
  'shipping-checkout',
  'shipping-companies',
  'shipping-generate',
  'shipping-preview',
  'shipping-print',
  'shipping-share',
  'shipping-tracking',
  'ecommerce-shipping',
  'transactions-read',
  'users-read',
].join(' ');

export function buildMelhorEnvioAuthorizeUrl(state: string) {
  const clientId = process.env.MELHOR_ENVIO_CLIENT_ID;
  if (!clientId) {
    throw new Error('MELHOR_ENVIO_CLIENT_ID ausente');
  }
  const authorizeBase = process.env.MELHOR_ENVIO_ENVIRONMENT === 'sandbox'
    ? 'https://sandbox.melhorenvio.com.br'
    : 'https://melhorenvio.com.br';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: MELHOR_ENVIO_REDIRECT_URI,
    response_type: 'code',
    state,
    scope: MELHOR_ENVIO_SCOPES,
  });
  return `${authorizeBase}/oauth/authorize?${params.toString()}`;
}

function userAgent() {
  return 'AltoPadraoInvisivel (pimentel.bm01@gmail.com)';
}

type TokenRow = {
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

async function readStored(): Promise<TokenRow | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('integration_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('provider', PROVIDER)
    .maybeSingle();

  if (error) {
    // Tabela pode não existir ainda
    console.warn('integration_tokens read:', error.message);
    return null;
  }
  return data;
}

async function writeStored(row: TokenRow) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from('integration_tokens').upsert({
    provider: PROVIDER,
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expires_at: row.expires_at,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Falha ao salvar tokens Melhor Envio:', error.message);
    throw error;
  }
}

async function refreshWithMelhorEnvio(refreshToken: string): Promise<TokenRow> {
  const clientId = process.env.MELHOR_ENVIO_CLIENT_ID;
  const clientSecret = process.env.MELHOR_ENVIO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('MELHOR_ENVIO_CLIENT_ID/SECRET não configurados para refresh');
  }

  const res = await fetch(`${meOAuthBase()}/oauth/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': userAgent(),
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token || !data.refresh_token) {
    throw new Error(
      `Refresh Melhor Envio falhou (${res.status}): ${data.message || data.error || JSON.stringify(data).slice(0, 200)}`
    );
  }

  const expiresIn = Number(data.expires_in) || 2592000; // 30 dias default
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

/** Faz seed a partir do .env se o banco ainda não tem token. */
async function seedFromEnvIfNeeded(): Promise<TokenRow | null> {
  const access = process.env.MELHOR_ENVIO_ACCESS_TOKEN;
  const refresh = process.env.MELHOR_ENVIO_REFRESH_TOKEN;
  if (!access || !refresh) return null;

  // Sem expires conhecido no env — assume ~25 dias pra forçar refresh cedo
  const row: TokenRow = {
    access_token: access,
    refresh_token: refresh,
    expires_at: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
  };

  try {
    await writeStored(row);
  } catch {
    // Sem tabela ainda: usa só em memória nesta request
  }
  return row;
}

/**
 * Retorna access_token válido.
 * - Lê do Supabase (sobrevive deploy Vercel)
 * - Renova com refresh_token se perto de expirar / forçado
 * - Fallback pro .env na 1ª vez
 */
export async function getMelhorEnvioAccessToken(options?: {
  forceRefresh?: boolean;
}): Promise<string> {
  let row = await readStored();

  if (!row) {
    row = await seedFromEnvIfNeeded();
  }

  if (!row?.access_token) {
    throw new Error('Token Melhor Envio ausente. Autorize o app e salve access/refresh token.');
  }

  const expiresAt = new Date(row.expires_at).getTime();
  const needsRefresh =
    options?.forceRefresh ||
    !Number.isFinite(expiresAt) ||
    expiresAt - Date.now() < REFRESH_SKEW_MS;

  if (!needsRefresh) {
    return row.access_token;
  }

  try {
    const refreshed = await refreshWithMelhorEnvio(row.refresh_token);
    try {
      await writeStored(refreshed);
    } catch {
      // Continua com token renovado mesmo se DB falhar nesta request
    }
    // Também atualiza process.env nesta instância (útil em dev)
    process.env.MELHOR_ENVIO_ACCESS_TOKEN = refreshed.access_token;
    process.env.MELHOR_ENVIO_REFRESH_TOKEN = refreshed.refresh_token;
    return refreshed.access_token;
  } catch (err) {
    // Se refresh falhou mas token ainda não expirou, usa o atual
    if (Number.isFinite(expiresAt) && expiresAt > Date.now()) {
      console.warn('Refresh ME falhou; usando access_token atual ainda válido', err);
      return row.access_token;
    }
    throw err;
  }
}

export async function getMelhorEnvioTokenStatus(): Promise<{
  connected: boolean;
  expiresAt: string | null;
  expired: boolean;
}> {
  const row = await readStored();
  if (!row?.expires_at) {
    return { connected: false, expiresAt: null, expired: true };
  }
  const expiresAt = new Date(row.expires_at).getTime();
  return {
    connected: Boolean(row.access_token && row.refresh_token),
    expiresAt: row.expires_at,
    expired: !Number.isFinite(expiresAt) || expiresAt <= Date.now(),
  };
}

/** Troca o code do OAuth por access + refresh e grava no Supabase. */
export async function exchangeAuthorizationCode(code: string): Promise<{ expires_at: string }> {
  const clientId = process.env.MELHOR_ENVIO_CLIENT_ID;
  const clientSecret = process.env.MELHOR_ENVIO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('MELHOR_ENVIO_CLIENT_ID/SECRET não configurados');
  }

  const res = await fetch(`${meOAuthBase()}/oauth/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': userAgent(),
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: MELHOR_ENVIO_REDIRECT_URI,
      code,
    }),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token || !data.refresh_token) {
    throw new Error(
      `Autorização Melhor Envio falhou (${res.status}): ${data.message || data.error || 'sem token'}`
    );
  }

  const expiresIn = Number(data.expires_in) || 2592000;
  const row: TokenRow = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
  await writeStored(row);
  process.env.MELHOR_ENVIO_ACCESS_TOKEN = row.access_token;
  process.env.MELHOR_ENVIO_REFRESH_TOKEN = row.refresh_token;
  return { expires_at: row.expires_at };
}

/** Endpoint/cron: força refresh e persiste. */
export async function forceRefreshMelhorEnvioToken(): Promise<{ expires_at: string }> {
  const row = (await readStored()) || (await seedFromEnvIfNeeded());
  if (!row?.refresh_token) {
    throw new Error('Sem refresh_token para renovar');
  }
  const refreshed = await refreshWithMelhorEnvio(row.refresh_token);
  await writeStored(refreshed);
  process.env.MELHOR_ENVIO_ACCESS_TOKEN = refreshed.access_token;
  process.env.MELHOR_ENVIO_REFRESH_TOKEN = refreshed.refresh_token;
  return { expires_at: refreshed.expires_at };
}
