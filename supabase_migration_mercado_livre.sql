-- Permite escolher, por produto, entre o checkout da loja e um anúncio do Mercado Livre.
alter table products
  add column if not exists checkout_mode text not null default 'store';

alter table products
  add column if not exists mercado_livre_url text;

alter table products
  drop constraint if exists products_checkout_mode_check;

alter table products
  add constraint products_checkout_mode_check
  check (checkout_mode in ('store', 'mercado_livre'));

comment on column products.checkout_mode is
  'Destino da compra: store usa o checkout próprio; mercado_livre redireciona ao anúncio.';

comment on column products.mercado_livre_url is
  'URL do anúncio usada quando checkout_mode = mercado_livre.';
