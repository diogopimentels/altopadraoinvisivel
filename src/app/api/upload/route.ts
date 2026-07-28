import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth !== true) return auth;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "O arquivo excede o limite de 5MB" }, { status: 400 });
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de arquivo não suportado. Apenas JPG, PNG ou WEBP são aceitos." }, { status: 400 });
    }

    // Evita path traversal no nome
    const safeBase = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${safeBase}`;

    const { error } = await supabaseAdmin.storage
      .from('product-images')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filename);

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error("Erro no upload para o Supabase:", error);
    return NextResponse.json({ error: "Erro interno ao processar upload" }, { status: 500 });
  }
}
