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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilita segurança de acesso a nível de linha (apenas para garantir que só nós podemos editar se quiser no futuro)
alter table products enable row level security;

-- Política para todos poderem ler os produtos (vitrine)
create policy "Allow public read access"
  on products for select
  using ( true );

-- Remove políticas inseguras que permitiam acesso anônimo
drop policy if exists "Allow insert access" on products;
drop policy if exists "Allow update access" on products;
drop policy if exists "Allow delete access" on products;

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
