import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.MELHOR_ENVIO_ACCESS_TOKEN || "";
  const maskedToken = token ? `${token.substring(0, 10)}...${token.substring(token.length - 10)}` : "VÁZIO / NÃO ENCONTRADO";
  
  const envStatus = {
    MELHOR_ENVIO_ACCESS_TOKEN: maskedToken,
    MELHOR_ENVIO_ENVIRONMENT: process.env.MELHOR_ENVIO_ENVIRONMENT || "VÁZIO",
    INFINITEPAY_TAG: process.env.INFINITEPAY_TAG || "VÁZIO",
    IS_PRODUCTION: process.env.NODE_ENV === "production"
  };

  return NextResponse.json(envStatus);
}
