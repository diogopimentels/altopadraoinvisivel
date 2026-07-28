-- Tokens Melhor Envio (refresh automático). Só acessível via service_role.
create table if not exists integration_tokens (
  provider text primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table integration_tokens enable row level security;
-- Sem policies públicas: só service_role.
