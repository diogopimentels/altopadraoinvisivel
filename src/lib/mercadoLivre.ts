export type CheckoutMode = "store" | "external_link";

/**
 * Valida se a string é uma URL https válida (qualquer domínio).
 * Usada para o modo de link externo (ex: Mercado Livre, Shopee, afiliados, etc.).
 */
export function isValidExternalUrl(value?: string | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * @deprecated Use isValidExternalUrl. Mantido para compatibilidade com dados legados.
 */
export function isMercadoLivreUrl(value?: string | null): boolean {
  return isValidExternalUrl(value);
}

export function externalLinkDestination(
  checkoutMode?: CheckoutMode | string | null,
  externalUrl?: string | null
) {
  const isExternal =
    checkoutMode === "external_link" ||
    // suporte a registros antigos gravados como "mercado_livre"
    checkoutMode === "mercado_livre";

  return isExternal && isValidExternalUrl(externalUrl)
    ? externalUrl!.trim()
    : null;
}

/**
 * @deprecated Use externalLinkDestination. Mantido para compatibilidade.
 */
export function mercadoLivreDestination(
  checkoutMode?: CheckoutMode | string | null,
  mercadoLivreUrl?: string | null
) {
  return externalLinkDestination(checkoutMode, mercadoLivreUrl);
}
