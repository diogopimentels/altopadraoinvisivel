-- Frete grátis por produto (cliente não paga frete desse item).
alter table products
  add column if not exists free_shipping boolean not null default false;

comment on column products.free_shipping is
  'Se true, o produto não adiciona custo de frete no checkout (loja absorve).';
