-- Migração isolada: fornecedores + supplier_id nos produtos
-- Rode no SQL Editor do Supabase se o schema completo já foi aplicado antes.

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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table suppliers enable row level security;

-- Sem policy pública de SELECT: PII só via service_role no backend.
drop policy if exists "Allow public read suppliers" on suppliers;

alter table products add column if not exists supplier_id text references suppliers(id) on delete set null;

create index if not exists products_supplier_id_idx on products (supplier_id);

alter table orders add column if not exists shipping_breakdown jsonb;
