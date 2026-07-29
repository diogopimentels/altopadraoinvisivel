-- Transportadoras permitidas por fornecedor (IDs Melhor Envio).
-- Default [1,2] = PAC + SEDEX (comportamento anterior da loja).

alter table suppliers
  add column if not exists allowed_service_ids integer[] not null default array[1, 2];

comment on column suppliers.allowed_service_ids is
  'IDs de serviço Melhor Envio liberados p/ este fornecedor (ex: 1=PAC, 2=SEDEX, 3=Jadlog.Package, 4=Jadlog.Com)';
