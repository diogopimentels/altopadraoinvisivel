import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/auth';
import { z } from 'zod';

const supplierSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nome obrigatório').max(200).trim(),
  phone: z.string().nullish(),
  email: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
  cep: z.string().min(8, 'CEP obrigatório'),
  street: z.string().min(1, 'Rua obrigatória').trim(),
  number: z.string().min(1, 'Número obrigatório').trim(),
  complement: z.string().nullish(),
  neighborhood: z.string().min(1, 'Bairro obrigatório').trim(),
  city: z.string().min(1, 'Cidade obrigatória').trim(),
  state: z.string().min(2, 'Estado obrigatório').max(2).trim(),
  notes: z.string().nullish(),
});

export type SupplierData = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  cep: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  notes?: string | null;
};

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth !== true) return auth;

    const { data, error } = await supabaseAdmin
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Erro ao ler fornecedores:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth !== true) return auth;

    const rawBody = await request.json();
    const result = supplierSchema.safeParse(rawBody);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.format() },
        { status: 400 }
      );
    }

    const body = result.data;
    if (!body.id) body.id = 'sup_' + Date.now();

    const cep = body.cep.replace(/\D/g, '');
    if (cep.length !== 8) {
      return NextResponse.json({ error: 'CEP inválido' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('suppliers')
      .upsert({
        id: body.id,
        name: body.name,
        phone: body.phone || null,
        email: body.email || null,
        cep,
        street: body.street,
        number: body.number,
        complement: body.complement || null,
        neighborhood: body.neighborhood,
        city: body.city,
        state: body.state.toUpperCase(),
        notes: body.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, supplier: data });
  } catch (error: any) {
    console.error('Erro ao salvar fornecedor:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth !== true) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('suppliers').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar fornecedor:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno' },
      { status: 500 }
    );
  }
}
