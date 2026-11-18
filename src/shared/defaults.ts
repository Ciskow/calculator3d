import type { AppState, Part, Project, Rates } from './types.ts';

// crypto.randomUUID exige contexto seguro (https), e o app roda em http na rede local.
export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export const DEFAULT_RATES: Rates = {
  duty: 0.5,
  kwh: 0.9,
  fixedMonth: 0,
  unitsMonth: 1,
  failPct: 15,
  taxPct: 8,
  cardPct: 5,
  adPct: 20,
};

export const DEFAULT_MARKUPS = [2, 2.5, 3, 4];

export function newPart(name = 'Nova peça'): Part {
  return {
    id: newId(),
    name,
    hours: 1,
    weight: 50,
    units: 1,
    materialId: null,
    printerId: null,
    targetPrice: null,
    acc: [],
  };
}

export function newProject(name = 'Novo projeto'): Project {
  return { id: newId(), name, customer: '', markups: [...DEFAULT_MARKUPS], parts: [] };
}

export function defaultState(): AppState {
  const project = newProject('Meu projeto');
  project.parts = [
    {
      ...newPart('Quarteto Bob'),
      hours: 5,
      weight: 120,
      acc: [
        { id: newId(), name: 'Embalagem', qty: 0, cost: 0.25 },
        { id: newId(), name: 'Ímã', qty: 0, cost: 0.56 },
      ],
    },
  ];
  return {
    version: 1,
    rates: { ...DEFAULT_RATES },
    materials: [{ id: newId(), name: 'PLA', pricePerKg: 120 }],
    printers: [{ id: newId(), name: 'Impressora', power: 360, value: 5000, lifeHours: 20000 }],
    projects: [project],
    activeProjectId: project.id,
  };
}

const n = (v: unknown, fallback: number): number => {
  const x = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(x) ? x : fallback;
};

/**
 * Converte os dados da versão anterior (localStorage "calc3d":
 * { cfg, markups, parts, sel }) para o formato atual. Retorna null se o
 * conteúdo não for reconhecível.
 */
export function migrateLegacy(raw: unknown): AppState | null {
  if (!raw || typeof raw !== 'object') return null;
  const old = raw as { cfg?: Record<string, unknown>; markups?: unknown; parts?: unknown };
  if (!old.cfg || !Array.isArray(old.parts)) return null;
  const c = old.cfg;
  const base = defaultState();

  const parts: Part[] = old.parts.map((p: any) => ({
    id: newId(),
    name: String(p?.name ?? ''),
    hours: n(p?.hours, 0),
    weight: n(p?.weight, 0),
    units: n(p?.units, 1),
    materialId: null,
    printerId: null,
    targetPrice: null,
    acc: Array.isArray(p?.acc)
      ? p.acc.map((a: any) => ({
          id: newId(),
          name: String(a?.name ?? ''),
          qty: n(a?.qty, 0),
          cost: n(a?.cost, 0),
        }))
      : [],
  }));

  const project: Project = {
    ...newProject('Meu projeto'),
    markups: Array.isArray(old.markups) && old.markups.length
      ? old.markups.map((m) => n(m, 2))
      : [...DEFAULT_MARKUPS],
    parts,
  };

  return {
    version: 1,
    rates: {
      duty: n(c.duty, DEFAULT_RATES.duty),
      kwh: n(c.kwh, DEFAULT_RATES.kwh),
      fixedMonth: n(c.fixedMonth, DEFAULT_RATES.fixedMonth),
      unitsMonth: n(c.unitsMonth, DEFAULT_RATES.unitsMonth),
      failPct: n(c.failPct, DEFAULT_RATES.failPct),
      taxPct: n(c.taxPct, DEFAULT_RATES.taxPct),
      cardPct: n(c.cardPct, DEFAULT_RATES.cardPct),
      adPct: n(c.adPct, DEFAULT_RATES.adPct),
    },
    materials: [{ ...base.materials[0], pricePerKg: n(c.filamentKg, 120) }],
    printers: [
      {
        ...base.printers[0],
        power: n(c.power, 360),
        value: n(c.machineVal, 5000),
        lifeHours: n(c.machineLife, 20000),
      },
    ],
    projects: [project],
    activeProjectId: project.id,
  };
}
