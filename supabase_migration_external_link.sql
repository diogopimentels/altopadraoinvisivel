-- Atualiza o constraint de checkout_mode para aceitar 'external_link'
-- (substitui o modo específico 'mercado_livre' por um modo genérico de link externo)

alter table products
  drop constraint if exists products_checkout_mode_check;

alter table products
  add constraint products_checkout_mode_check
  check (checkout_mode in ('store', 'mercado_livre', 'external_link'));

comment on column products.checkout_mode is
  'Destino da compra: store usa o checkout próprio; external_link redireciona a um link externo genérico (Mercado Livre, Shopee, afiliados etc.). O valor mercado_livre é legado.';
