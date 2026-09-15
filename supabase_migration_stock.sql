-- Estoque por produto
alter table products
  add column if not exists stock integer not null default 0;

comment on column products.stock is
  'Quantidade disponível em estoque. 0 = esgotado.';
