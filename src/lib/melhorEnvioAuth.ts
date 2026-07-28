import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const PROVIDER = 'melhor_envio';
/** Renova se faltar menos de 48h pro access_token expirar */
const REFRESH_SKEW_MS = 48 * 60 * 60 * 1000;

function meOAuthBase() {
  return process.env.MELHOR_ENVIO_ENVIRONMENT === 'sandbox'
    ? 'https://sandbox.melhorenvio.com.br'
    : 'https://www.melhorenvio.com.br';
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
