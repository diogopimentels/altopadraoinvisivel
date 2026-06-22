import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('isFeatured', true)
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({ active: false });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao carregar destaque do Supabase:", error);
    return NextResponse.json({ active: false });
  }
}
