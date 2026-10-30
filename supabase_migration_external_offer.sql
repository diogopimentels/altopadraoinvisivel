-- Promoção informativa para produtos comprados em uma plataforma externa.
-- O preço atual do produto é o preço promocional; esta coluna guarda o preço anterior.
alter table products
  add column if not exists external_offer_active boolean not null default false;

alter table products
  add column if not exists external_offer_original_price numeric;

alter table products
  drop constraint if exists products_external_offer_original_price_check;

alter table products
  add constraint products_external_offer_original_price_check
  check (external_offer_original_price is null or external_offer_original_price > 0);

comment on column products.external_offer_active is
  'Exibe uma promoção informativa na vitrine para produtos com checkout externo.';

comment on column products.external_offer_original_price is
  'Preço anterior exibido riscado; o campo price contém o preço promocional atual.';
