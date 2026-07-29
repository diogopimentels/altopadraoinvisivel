-- Passo a passo:
-- 1. Acesse o painel do seu projeto no Supabase
-- 2. Vá em "SQL Editor" (ícone de código na barra lateral esquerda)
-- 3. Crie uma "New Query"
-- 4. Cole tudo isso aqui em baixo e clique em "RUN" (ou aperte Cmd/Ctrl + Enter)

-- Cria a tabela de produtos
create table if not exists products (
  id text primary key,
  name text not null,
  price numeric not null,
  images jsonb default '[]'::jsonb,
  isFeatured boolean default false,
  category text,
  description text,
  weight numeric default 0.5,
  width numeric default 20,
  height numeric default 15,
  length numeric default 20,
  is_published boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Cria a tabela de pedidos
create table if not exists orders (
  id text primary key,
  customer_name text,
  customer_phone text,
  customer_email text,
  address_cep text,
  address_street text,
  address_number text,
  address_complement text,
  address_neighborhood text,
  address_city text,
  address_state text,
  items jsonb,
  total_amount numeric,
  shipping_cost numeric default 0,
  stripe_session_id text,
  payment_status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilita segurança de acesso a nível de linha (útil para garantir que só nós podemos editar se quiser no futuro)
alter table products enable row level security;

-- Política para todos poderem ler os produtos (vitrine)
create policy "Allow public read access"
  on products for select
  using ( true );

-- Remove políticas inseguras que permitiam acesso anônimo
drop policy if exists "Allow insert access" on products;
drop policy if exists "Allow update access" on products;
drop policy if exists "Allow delete access" on products;

-- Políticas para a tabela de pedidos
alter table orders enable row level security;
create policy "Allow admin read orders" on orders for select using (true);
create policy "Allow insert orders" on orders for insert with check (true);
create policy "Allow update orders" on orders for update using (true);

-- =========================================================================
-- PARTE 2: Criando o Storage para as imagens
-- =========================================================================

-- Cria o bucket
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Libera o acesso de leitura público para qualquer um ver as fotos
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'product-images' );

-- Remove políticas inseguras do Storage
drop policy if exists "Upload Access" on storage.objects;
drop policy if exists "Update Access" on storage.objects;
drop policy if exists "Delete Access" on storage.objects;

-- =========================================================================
-- PARTE 3: Migrações (Atualizações)
-- =========================================================================

-- Adiciona a coluna de Rascunho/Publicado aos produtos existentes (se ainda não existir)
alter table products add column if not exists is_published boolean default false;

-- Marca todos os produtos antigos como PUBLICADOS para não tirá-los do ar
update products set is_published = true where is_published is false;

-- =========================================================================
-- PARTE 4: Fornecedores (dropshipping) + origem de frete
-- =========================================================================

create table if not exists suppliers (
  id text primary key,
  name text not null,
  phone text,
  email text,
  cep text not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state text not null,
  notes text,
  -- IDs Melhor Envio (ex.: 1=PAC, 2=SEDEX, 3=Jadlog.Package, 12=LATAM, 15=Azul…).
  -- Catálogo completo: src/lib/melhorEnvioServices.ts
  allowed_service_ids integer[] not null default array[1, 2],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table suppliers
  add column if not exists allowed_service_ids integer[] not null default array[1, 2];

alter table suppliers enable row level security;

-- Sem policy pública de SELECT: PII (telefone/endereço/notas) só via service_role no backend.
drop policy if exists "Allow public read suppliers" on suppliers;

alter table products add column if not exists supplier_id text references suppliers(id) on delete set null;

create index if not exists products_supplier_id_idx on products (supplier_id);

-- Breakdown de frete multi-fornecedor no pedido (opcional)
alter table orders add column if not exists shipping_breakdown jsonb;

-- Tokens Melhor Envio (refresh automático). Só service_role.
create table if not exists integration_tokens (
  provider text primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table integration_tokens enable row level security;
