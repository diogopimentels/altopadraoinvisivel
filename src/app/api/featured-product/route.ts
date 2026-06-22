import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data', 'settings.json');

export async function GET() {
  try {
    if (!fs.existsSync(dataFilePath)) {
      return NextResponse.json({ active: false });
    }
    const fileContents = fs.readFileSync(dataFilePath, 'utf8');
    const data = JSON.parse(fileContents);
    return NextResponse.json(data.featuredProduct || { active: false });
  } catch (error) {
    console.error("Erro ao ler settings:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Atualiza o arquivo json
    let data = { featuredProduct: {} };
    if (fs.existsSync(dataFilePath)) {
      data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    }
    
    data.featuredProduct = { ...data.featuredProduct, ...body };
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));

    return NextResponse.json({ success: true, featuredProduct: data.featuredProduct });
  } catch (error) {
    console.error("Erro ao salvar settings:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
