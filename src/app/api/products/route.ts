import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/auth';
import { z } from 'zod';
import { cookies } from 'next/headers';

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "O nome é obrigatório").max(200, "O nome é muito longo").trim(),
  price: z.number().nonnegative("O preço não pode ser negativo"),
  images: z.array(z.string().url("A imagem deve ser uma URL válida")).default([]),
  isFeatured: z.boolean().default(false),
  category: z.string().nullish(),
  description: z.string().nullish(),
  weight: z.number().nullish().transform(val => val ?? 0.5),
  width: z.number().nullish().transform(val => val ?? 20),
  height: z.number().nullish().transform(val => val ?? 15),
  length: z.number().nullish().transform(val => val ?? 20),
  is_published: z.boolean().default(false),
  supplier_id: z.string().min(1, "Selecione um fornecedor"),
  free_shipping: z.boolean().default(false),
});

export interface ProductData {
  id: string;
  name: string;
  price: number;
  images: string[];
  isFeatured: boolean;
  category?: string;
  description?: string;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  is_published: boolean;
  supplier_id?: string | null;
  free_shipping?: boolean;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin_token')?.value;
    const isAdmin = Boolean(process.env.ADMIN_PASSWORD) && adminToken === process.env.ADMIN_PASSWORD;

    let query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('is_published', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!isAdmin) {
      const publicProducts = (data || []).map(({ supplier_id: _s, ...rest }) => rest);
      return NextResponse.json(publicProducts);
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Erro ao ler produtos do Supabase:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth !== true) return auth;

    const rawBody = await request.json();
    const result = productSchema.safeParse(rawBody);
    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.format() },
        { status: 400 }
      );
    }

    const body = result.data;

    if (body.isFeatured) {
      await supabaseAdmin
        .from('products')
        .update({ isFeatured: false })
        .neq('id', '0');
    }

    if (!body.id) body.id = 'prod_' + Date.now();

    const { data, error } = await supabaseAdmin
      .from('products')
      .upsert({
        id: body.id,
        name: body.name,
        price: body.price,
        images: body.images,
        isFeatured: body.isFeatured,
        category: body.category || null,
        description: body.description || null,
        weight: body.weight ?? 0.5,
        width: body.width ?? 20,
        height: body.height ?? 15,
        length: body.length ?? 20,
        is_published: body.is_published,
        supplier_id: body.supplier_id,
        free_shipping: body.free_shipping ?? false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, product: data });
  } catch (error: any) {
    console.error("Erro ao salvar produto no Supabase:", error);
    return NextResponse.json({ error: error?.message || "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth !== true) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar produto no Supabase:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
