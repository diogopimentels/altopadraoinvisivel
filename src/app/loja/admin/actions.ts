"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const password = formData.get("password");
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error("ADMIN_PASSWORD não está configurado no .env.local!");
    return { error: "Erro de configuração do servidor" };
  }

  if (password === adminPassword) {
    // Seta o cookie seguro (httpOnly para não ser lido via JS)
    const cookieStore = await cookies();
    cookieStore.set("admin_token", adminPassword, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: "/",
    });
    
    // Redireciona para o painel principal do admin
    redirect("/admin");
  }

  return { error: "Senha incorreta" };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_token");
  redirect("/admin/login");
}
