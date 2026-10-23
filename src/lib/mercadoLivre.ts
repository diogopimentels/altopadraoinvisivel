export type CheckoutMode = "store" | "mercado_livre";

const MERCADO_LIVRE_HOSTS = [
  "mercadolivre.com.br",
  "mercadolivre.com",
  "meli.la",
];

export function isMercadoLivreUrl(value?: string | null) {
  if (!value) return false;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();

    return (
      url.protocol === "https:" &&
      MERCADO_LIVRE_HOSTS.some(
        (host) => hostname === host || hostname.endsWith(`.${host}`)
      )
    );
  } catch {
    return false;
  }
}

export function mercadoLivreDestination(
  checkoutMode?: CheckoutMode | string | null,
  mercadoLivreUrl?: string | null
) {
  return checkoutMode === "mercado_livre" && isMercadoLivreUrl(mercadoLivreUrl)
    ? mercadoLivreUrl!.trim()
    : null;
}
