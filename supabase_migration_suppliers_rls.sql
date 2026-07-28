-- Segurança: remove leitura pública total de fornecedores (PII).
-- Frete/checkout leem via service_role no backend.

drop policy if exists "Allow public read suppliers" on suppliers;

-- Nenhuma policy de SELECT pública: só service_role / bypass RLS no admin client.
-- (service_role ignora RLS por padrão)
