import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ruleSchema = z.object({
  triggerProductId: z.string().min(1),
  targetProductId: z.string().min(1),
  discountPercent: z.number().int().min(1).max(99),
});

type RuleRow = {
  id: string;
  trigger_product_id: string;
  target_product_id: string;
  discount_percent: number;
  active: boolean;
};

type ProductRow = {
  id: string;
  name: string;
  price: number;
  images: string[] | null;
  weight: number | null;
  width: number | null;
  height: number | null;
  length: number | null;
  stock: number | null;
  is_published: boolean | null;
  checkout_mode: string | null;
};

function isStoreProduct(product?: ProductRow) {
  return Boolean(product) && (!product!.checkout_mode || product!.checkout_mode === 'store');
}

function publicProduct(product?: ProductRow) {
  if (!product) return null;
  return {
    id: product.id,
    name: product.name,
    price: Number(product.price),
    images: Array.isArray(product.images) ? product.images : [],
    weight: Number(product.weight ?? 0.5),
    width: Number(product.width ?? 20),
    height: Number(product.height ?? 15),
    length: Number(product.length ?? 20),
    stock: Math.max(0, Math.floor(Number(product.stock) || 0)),
    isPublished: Boolean(product.is_published),
    checkoutMode: product.checkout_mode || 'store',
  };
}

function mapRule(row: RuleRow, products: Map<string, ProductRow>) {
  const trigger = products.get(row.trigger_product_id);
  const target = products.get(row.target_product_id);
  const compatible = isStoreProduct(trigger) && isStoreProduct(target);
  const compatibilityError = !trigger || !target
    ? 'Um dos produtos não existe mais.'
    : !compatible
      ? 'Ofertas automáticas funcionam somente entre produtos do checkout da loja.'
      : null;

  return {
    id: row.id,
    triggerProductId: row.trigger_product_id,
    targetProductId: row.target_product_id,
    discountPercent: Number(row.discount_percent),
    triggerName: trigger?.name || row.trigger_product_id,
    targetName: target?.name || row.target_product_id,
    triggerProduct: publicProduct(trigger),
    targetProduct: publicProduct(target),
    compatible,
    compatibilityError,
    active: row.active,
  };
}

async function loadRules(activeOnly: boolean, publicOnly: boolean) {
  const admin = getSupabaseAdmin();
  let query = admin.from('cross_sell_rules').select('*').order('created_at', { ascending: false });
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;

  const rows = (data || []) as RuleRow[];
  const ids = [...new Set(rows.flatMap((row) => [row.trigger_product_id, row.target_product_id]))];
  const productMap = new Map<string, ProductRow>();
  if (ids.length > 0) {
    const { data: products, error: productsError } = await admin
      .from('products')
      .select('id, name, price, images, weight, width, height, length, stock, is_published, checkout_mode')
      .in('id', ids);
    if (productsError) throw productsError;
    for (const product of (products || []) as ProductRow[]) productMap.set(product.id, product);
  }
  const mapped = rows.map((row) => mapRule(row, productMap));
  if (!publicOnly) return mapped;

  return mapped.filter((rule) =>
    rule.compatible &&
    rule.triggerProduct?.isPublished &&
    rule.targetProduct?.isPublished &&
    rule.triggerProduct.stock > 0 &&
    rule.targetProduct.stock > 0
  );
}

export async function GET(request: Request) {
  try {
    const all = new URL(request.url).searchParams.get('all') === '1';
    if (all) {
      const auth = await requireAdmin();
      if (auth !== true) return auth;
    }
    const rules = await loadRules(!all, !all);
    return NextResponse.json({ rules });
  } catch (error) {
    console.error('cross-sell GET:', error);
    return NextResponse.json({ rules: [] });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth !== true) return auth;

  try {
    const parsed = ruleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }
    const { triggerProductId, targetProductId, discountPercent } = parsed.data;
    if (triggerProductId === targetProductId) {
      return NextResponse.json({ error: 'O produto com desconto tem que ser outro.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: products, error: productsError } = await admin
      .from('products')
      .select('id, name, checkout_mode')
      .in('id', [triggerProductId, targetProductId]);
    if (productsError) throw productsError;
    if ((products || []).length !== 2) {
      return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 400 });
    }
    const externalProduct = (products || []).find((product) =>
      product.checkout_mode && product.checkout_mode !== 'store'
    );
    if (externalProduct) {
      return NextResponse.json(
        { error: `"${externalProduct.name}" usa link externo. A oferta automática só funciona no checkout da loja.` },
        { status: 400 }
      );
    }

    const { data: existing } = await admin
      .from('cross_sell_rules')
      .select('id')
      .eq('trigger_product_id', triggerProductId)
      .eq('target_product_id', targetProductId)
      .maybeSingle();

    const payload = {
      id: existing?.id || `xs_${Date.now()}`,
      trigger_product_id: triggerProductId,
      target_product_id: targetProductId,
      discount_percent: discountPercent,
      active: true,
    };
    const { error } = await admin.from('cross_sell_rules').upsert(payload);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('cross-sell POST:', error);
    const missing = String(error?.message || '').includes('cross_sell_rules');
    return NextResponse.json(
      { error: missing ? 'Falta criar a tabela cross_sell_rules no Supabase.' : 'Erro ao salvar a oferta.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (auth !== true) return auth;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { error } = await admin.from('cross_sell_rules').delete().eq('id', id);
  if (error) {
    console.error('cross-sell DELETE:', error);
    return NextResponse.json({ error: 'Erro ao apagar a oferta.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
