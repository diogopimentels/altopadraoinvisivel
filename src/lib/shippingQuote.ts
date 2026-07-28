import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getMelhorEnvioAccessToken } from '@/lib/melhorEnvioAuth';

export type ShipItemInput = {
  id: string;
  quantity: number;
  price?: number;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  supplier_id?: string | null;
  name?: string;
};

export type ShippingQuoteOption = {
  id: string;
  name: string;
  price: number;
  delivery_time: number;
  company: string;
  breakdown: { supplier_id: string; supplier_name: string; price: number }[];
};

type MeOption = {
  id: number;
  name: string;
  price: string | number;
  delivery_time?: number;
  custom_delivery_time?: number;
  company?: { name?: string };
  error?: string;
};

function meBaseUrl() {
  return process.env.MELHOR_ENVIO_ENVIRONMENT === 'sandbox'
    ? 'https://sandbox.melhorenvio.com.br'
    : 'https://www.melhorenvio.com.br';
}

async function calculateFromOrigin(
  token: string,
  baseUrl: string,
  originCep: string,
  destinationCep: string,
  products: Required<Pick<ShipItemInput, 'id' | 'quantity' | 'price' | 'weight' | 'width' | 'height' | 'length'>>[]
) {
  const fromCep = originCep.replace(/\D/g, '');
  const toCep = destinationCep.replace(/\D/g, '');

  if (fromCep.length !== 8 || toCep.length !== 8) {
    throw new Error(`CEP inválido (origem=${fromCep || 'vazio'}, destino=${toCep || 'vazio'})`);
  }

  const payload = {
    from: { postal_code: fromCep },
    to: { postal_code: toCep },
    products: products.map((item) => ({
      id: String(item.id),
      width: Math.max(Number(item.width) || 20, 11),
      height: Math.max(Number(item.height) || 15, 2),
      length: Math.max(Number(item.length) || 20, 16),
      weight: Math.max(Number(item.weight) || 0.5, 0.1),
      insurance_value: Math.max(Number(item.price) || 0, 1),
      quantity: Math.max(Number(item.quantity) || 1, 1),
    })),
  };

  const response = await fetch(`${baseUrl}/api/v2/me/shipment/calculate`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'AltoPadraoInvisivel (pimentel.bm01@gmail.com)',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const raw = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Melhor Envio ${response.status}: resposta inválida`);
  }

  if (!response.ok) {
    const msg = (data as any)?.message || (data as any)?.error || raw.slice(0, 300);
    const err = new Error(`Melhor Envio (${response.status}): ${msg}`) as Error & {
      status?: number;
    };
    err.status = response.status;
    throw err;
  }

  if (!Array.isArray(data)) {
    const msg = (data as any)?.message || JSON.stringify(data).slice(0, 300);
    throw new Error(`Melhor Envio: ${msg}`);
  }

  return data as MeOption[];
}

export type QuoteShippingResult =
  | { ok: true; options: ShippingQuoteOption[]; suppliers_count: number }
  | { ok: false; error: string; details?: string[] };

/** Cotação server-side. Usa service_role só para ler CEP do fornecedor (não expõe PII). */
export async function quoteShipping(
  destinationCep: string,
  items: ShipItemInput[]
): Promise<QuoteShippingResult> {
  let token: string;
  try {
    token = await getMelhorEnvioAccessToken();
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message || 'Frete não configurado (token Melhor Envio ausente).',
    };
  }

  if (!items.length) {
    return { ok: false, error: 'Carrinho vazio' };
  }

  const admin = getSupabaseAdmin();
  const productIds = [...new Set(items.map((i) => i.id))];

  const { data: productsDb, error: productsError } = await admin
    .from('products')
    .select('id, supplier_id, weight, width, height, length, name, price, is_published')
    .in('id', productIds);

  if (productsError) throw productsError;

  const productMap = new Map((productsDb || []).map((p) => [p.id, p]));
  const supplierIds = [
    ...new Set(
      items
        .map((item) => item.supplier_id || productMap.get(item.id)?.supplier_id)
        .filter(Boolean) as string[]
    ),
  ];

  if (supplierIds.length === 0) {
    return {
      ok: false,
      error: 'Produto(s) sem fornecedor. Cadastre a origem no admin e vincule ao produto.',
    };
  }

  const { data: suppliers, error: suppliersError } = await admin
    .from('suppliers')
    .select('id, name, cep')
    .in('id', supplierIds);

  if (suppliersError) throw suppliersError;

  const supplierMap = new Map((suppliers || []).map((s) => [s.id, s]));
  const groups = new Map<
    string,
    {
      supplier: { id: string; name: string; cep: string };
      items: Required<Pick<ShipItemInput, 'id' | 'quantity' | 'price' | 'weight' | 'width' | 'height' | 'length'>>[];
    }
  >();
  const routeErrors: string[] = [];

  for (const item of items) {
    const dbProduct = productMap.get(item.id);
    if (!dbProduct) {
      return { ok: false, error: `Produto inválido: ${item.id}` };
    }

    const quantity = Math.max(1, Math.min(99, Math.floor(Number(item.quantity) || 1)));
    const supplierId = dbProduct.supplier_id || item.supplier_id;
    if (!supplierId) {
      return { ok: false, error: `Produto "${dbProduct.name}" sem fornecedor.` };
    }

    const supplier = supplierMap.get(supplierId);
    if (!supplier?.cep) {
      return { ok: false, error: `Fornecedor do produto "${dbProduct.name}" sem CEP.` };
    }

    const enriched = {
      id: dbProduct.id,
      quantity,
      price: Number(dbProduct.price),
      weight: Number(dbProduct.weight ?? 0.5),
      width: Number(dbProduct.width ?? 20),
      height: Number(dbProduct.height ?? 15),
      length: Number(dbProduct.length ?? 20),
    };

    const existing = groups.get(supplierId);
    if (existing) existing.items.push(enriched);
    else groups.set(supplierId, { supplier, items: [enriched] });
  }

  const baseUrl = meBaseUrl();
  const allowedServices = [1, 2];
  const merged = new Map<number, ShippingQuoteOption>();

  async function calculateWithAuthRetry(
    originCep: string,
    products: Required<Pick<ShipItemInput, 'id' | 'quantity' | 'price' | 'weight' | 'width' | 'height' | 'length'>>[]
  ) {
    try {
      return await calculateFromOrigin(token, baseUrl, originCep, destinationCep, products);
    } catch (err: any) {
      const msg = String(err?.message || '');
      const unauthenticated =
        err?.status === 401 ||
        /unauthenticated/i.test(msg);

      if (unauthenticated) {
        // Docs ME: guardar a req → refresh → repetir a mesma chamada
        token = await getMelhorEnvioAccessToken({ forceRefresh: true });
        return calculateFromOrigin(token, baseUrl, originCep, destinationCep, products);
      }
      throw err;
    }
  }

  for (const [, group] of groups) {
    const meData = await calculateWithAuthRetry(group.supplier.cep, group.items);

    let groupHadOption = false;
    for (const opt of meData) {
      if (opt.error) {
        routeErrors.push(`${group.supplier.name}/${opt.name}: ${opt.error}`);
        continue;
      }
      if (!allowedServices.includes(opt.id) || opt.price == null) continue;

      groupHadOption = true;
      const price = parseFloat(String(opt.price));
      if (Number.isNaN(price)) continue;

      const delivery = opt.custom_delivery_time || opt.delivery_time || 0;
      const current = merged.get(opt.id);

      if (!current) {
        merged.set(opt.id, {
          id: String(opt.id),
          name: opt.name,
          price,
          delivery_time: delivery,
          company: opt.company?.name || 'Correios',
          breakdown: [
            {
              supplier_id: group.supplier.id,
              supplier_name: group.supplier.name,
              price,
            },
          ],
        });
      } else {
        current.price += price;
        current.delivery_time = Math.max(current.delivery_time, delivery);
        current.breakdown.push({
          supplier_id: group.supplier.id,
          supplier_name: group.supplier.name,
          price,
        });
      }
    }

    if (!groupHadOption) {
      console.warn('Nenhuma opção ME para fornecedor', group.supplier.name, routeErrors);
    }
  }

  const supplierCount = groups.size;
  const options = Array.from(merged.values())
    .filter((o) => o.breakdown.length === supplierCount)
    .map((o) => ({ ...o, price: Number(o.price.toFixed(2)) }));

  if (options.length === 0) {
    return {
      ok: false,
      error: routeErrors[0] || 'Nenhuma opção de frete disponível para este CEP (PAC/SEDEX).',
      details: routeErrors,
    };
  }

  return { ok: true, options, suppliers_count: groups.size };
}
