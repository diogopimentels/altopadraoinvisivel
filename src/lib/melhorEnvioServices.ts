/** Catálogo de serviços Melhor Envio usados na loja (IDs oficiais da API). */

export type MeServiceDef = {
  id: number;
  name: string;
  company: string;
};

export const ME_SERVICES: MeServiceDef[] = [
  { id: 1, name: 'PAC', company: 'Correios' },
  { id: 2, name: 'SEDEX', company: 'Correios' },
  { id: 3, name: '.Package', company: 'Jadlog' },
  { id: 4, name: '.Com', company: 'Jadlog' },
];

/** Grupos no admin: marcar a transportadora habilita todos os serviços dela. */
export const ME_CARRIER_GROUPS: {
  key: string;
  label: string;
  description: string;
  serviceIds: number[];
}[] = [
  {
    key: 'correios',
    label: 'Correios',
    description: 'PAC e SEDEX',
    serviceIds: [1, 2],
  },
  {
    key: 'jadlog',
    label: 'Jadlog',
    description: '.Package e .Com',
    serviceIds: [3, 4],
  },
];

/** Default histórico da loja (só Correios). */
export const DEFAULT_ALLOWED_SERVICE_IDS = [1, 2] as const;

const ALL_KNOWN_IDS = new Set(ME_SERVICES.map((s) => s.id));

export function normalizeAllowedServiceIds(
  raw: unknown,
  opts?: { fallback?: boolean }
): number[] {
  const fromArray = Array.isArray(raw)
    ? raw.map((n) => Number(n)).filter((n) => Number.isInteger(n) && ALL_KNOWN_IDS.has(n))
    : [];

  const unique = [...new Set(fromArray)].sort((a, b) => a - b);
  if (unique.length > 0) return unique;
  return opts?.fallback === false ? [] : [...DEFAULT_ALLOWED_SERVICE_IDS];
}

export function carrierKeysFromServiceIds(serviceIds: number[]): string[] {
  return ME_CARRIER_GROUPS.filter((g) =>
    g.serviceIds.every((id) => serviceIds.includes(id))
  ).map((g) => g.key);
}

export function serviceIdsFromCarrierKeys(keys: string[]): number[] {
  const ids = ME_CARRIER_GROUPS.filter((g) => keys.includes(g.key)).flatMap((g) => g.serviceIds);
  return normalizeAllowedServiceIds(ids, { fallback: false });
}

export function labelForServiceIds(serviceIds: number[]): string {
  const labels = ME_CARRIER_GROUPS.filter((g) =>
    g.serviceIds.some((id) => serviceIds.includes(id))
  ).map((g) => g.label);
  return labels.length > 0 ? labels.join(', ') : 'Nenhuma';
}
