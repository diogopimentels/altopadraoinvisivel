-- Oferta: quem leva o produto gatilho ganha % no produto alvo, no mesmo carrinho.
create table if not exists cross_sell_rules (
  id text primary key,
  trigger_product_id text not null references products(id) on delete cascade,
  target_product_id text not null references products(id) on delete cascade,
  discount_percent integer not null check (discount_percent between 1 and 99),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (trigger_product_id, target_product_id)
);

alter table cross_sell_rules enable row level security;
