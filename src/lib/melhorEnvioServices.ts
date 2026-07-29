/** Catálogo de serviços Melhor Envio (IDs oficiais da API v2 / production). */

export type MeServiceDef = {
  id: number;
  name: string;
  company: string;
};

export const ME_SERVICES: MeServiceDef[] = [
  // Correios
  { id: 1, name: 'PAC', company: 'Correios' },
  { id: 2, name: 'SEDEX', company: 'Correios' },
  { id: 17, name: 'Mini Envios', company: 'Correios' },
  // Jadlog
  { id: 3, name: '.Package', company: 'Jadlog' },
  { id: 4, name: '.Com', company: 'Jadlog' },
  { id: 27, name: '.Package Centralizado', company: 'Jadlog' },
  // LATAM Cargo
  { id: 12, name: 'éFácil', company: 'LATAM Cargo' },
  // Total Express
  { id: 35, name: 'Standard', company: 'Total Express' },
  // Azul Cargo Express
  { id: 15, name: 'Expresso', company: 'Azul Cargo Express' },
  { id: 16, name: 'e-commerce', company: 'Azul Cargo Express' },
  // Buslog
  { id: 22, name: 'Rodoviário', company: 'Buslog' },
  // Loggi
  { id: 31, name: 'Express', company: 'Loggi' },
  { id: 32, name: 'Coleta', company: 'Loggi' },
  { id: 34, name: 'Loggi Ponto', company: 'Loggi' },
  // JeT
  { id: 33, name: 'Standard', company: 'JeT' },
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
    description: 'PAC, SEDEX e Mini Envios',
    serviceIds: [1, 2, 17],
  },
  {
    key: 'jadlog',
    label: 'Jadlog',
    description: '.Package, .Com e .Package Centralizado',
    serviceIds: [3, 4, 27],
  },
  {
    key: 'latam',
    label: 'LATAM Cargo',
    description: 'éFácil',
    serviceIds: [12],
  },
  {
    key: 'azul',
    label: 'Azul Cargo Express',
    description: 'Expresso e e-commerce',
    serviceIds: [15, 16],
  },
  {
    key: 'total_express',
    label: 'Total Express',
    description: 'Standard',
    serviceIds: [35],
  },
  {
    key: 'buslog',
    label: 'Buslog',
    description: 'Rodoviário',
    serviceIds: [22],
  },
  {
    key: 'loggi',
    label: 'Loggi',
    description: 'Express, Coleta e Loggi Ponto',
    serviceIds: [31, 32, 34],
  },
  {
    key: 'jet',
    label: 'JeT',
    description: 'Standard',
    serviceIds: [33],
  },
];

/** Default histórico da loja (PAC + SEDEX). */
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

/** Transportadora marcada se tiver ao menos um serviço dela. */
export function carrierKeysFromServiceIds(serviceIds: number[]): string[] {
  return ME_CARRIER_GROUPS.filter((g) =>
    g.serviceIds.some((id) => serviceIds.includes(id))
  ).map((g) => g.key);
}

export function serviceIdsFromCarrierKeys(keys: string[]): number[] {
  const ids = ME_CARRIER_GROUPS.filter((g) => keys.includes(g.key)).flatMap((g) => g.serviceIds);
  return normalizeAllowedServiceIds(ids, { fallback: false });
}

/** Liga/desliga todos os serviços de um grupo sem apagar os demais. */
export function toggleCarrierServiceIds(
  currentIds: number[],
  carrierKey: string
): number[] {
  const group = ME_CARRIER_GROUPS.find((g) => g.key === carrierKey);
  if (!group) return normalizeAllowedServiceIds(currentIds, { fallback: false });

  const set = new Set(normalizeAllowedServiceIds(currentIds, { fallback: false }));
  const isOn = group.serviceIds.some((id) => set.has(id));

  if (isOn) {
    group.serviceIds.forEach((id) => set.delete(id));
  } else {
    group.serviceIds.forEach((id) => set.add(id));
  }

  return [...set].sort((a, b) => a - b);
}

export function labelForServiceIds(serviceIds: number[]): string {
  const labels = ME_CARRIER_GROUPS.filter((g) =>
    g.serviceIds.some((id) => serviceIds.includes(id))
  ).map((g) => g.label);
  return labels.length > 0 ? labels.join(', ') : 'Nenhuma';
}
