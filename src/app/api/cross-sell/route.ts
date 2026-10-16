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

function mapRule(row: RuleRow, names: Map<string, string>) {
  return {
    id: row.id,
    triggerProductId: row.trigger_product_id,
    targetProductId: row.target_product_id,
    discountPercent: Number(row.discount_percent),
    triggerName: names.get(row.trigger_product_id) || row.trigger_product_id,
    targetName: names.get(row.target_product_id) || row.target_product_id,
    active: row.active,
  };
}

async function loadRules(activeOnly: boolean) {
  const admin = getSupabaseAdmin();
  let query = admin.from('cross_sell_rules').select('*').order('created_at', { ascending: false });
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;

  const rows = (data || []) as RuleRow[];
  const ids = [...new Set(rows.flatMap((row) => [row.trigger_product_id, row.target_product_id]))];
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data: products } = await admin.from('products').select('id, name').in('id', ids);
    for (const product of products || []) names.set(product.id, product.name);
  }
  return rows.map((row) => mapRule(row, names));
}

export async function GET() {
  try {
    const rules = await loadRules(true);
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
      .select('id')
      .in('id', [triggerProductId, targetProductId]);
    if (productsError) throw productsError;
    if ((products || []).length !== 2) {
      return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 400 });
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
