import type { AppState, Material, Part, Printer } from './types.ts';

// Cálculo de custo e precificação. As fórmulas são as mesmas da planilha
// original (e da versão anterior em legacy/index.html); tests/calc.test.ts
// trava os resultados.

export interface CostInputs {
  filamentKg: number;
  power: number;
  duty: number;
  kwh: number;
  machineVal: number;
  machineLife: number;
  fixedMonth: number;
  unitsMonth: number;
  failPct: number;
}

export interface Fees {
  taxPct: number;
  cardPct: number;
  adPct: number;
}

export interface CostBreakdown {
  mat: number;
  energy: number;
  accTot: number;
  fixed: number;
  amort: number;
  fail: number;
  total: number;
  unit: number;
}

export interface Pricing {
  consumer: number;
  lojista: number;
  gbC: number;
  gbL: number;
  netC: number;
  netL: number;
}

type CostPart = Pick<Part, 'hours' | 'weight' | 'units'> & {
  acc: ReadonlyArray<{ qty: number; cost: number }>;
};

export function calcCost(p: CostPart, c: CostInputs): CostBreakdown {
  const mat = (p.weight / 1000) * c.filamentKg;
  const energy = (c.power * p.hours * c.duty * c.kwh) / 1000;
  const accTot = p.acc.reduce((s, a) => s + a.qty * a.cost, 0);
  const fixed = c.unitsMonth > 0 ? c.fixedMonth / c.unitsMonth : 0;
  const amort = c.machineLife > 0 ? (c.machineVal / c.machineLife) * p.hours : 0;
  const fail = (c.failPct / 100) * (mat + energy + amort) * 0.7;
  const total = mat + energy + accTot + fixed + amort + fail;
  const unit = p.units > 0 ? total / p.units : total;
  return { mat, energy, accTot, fixed, amort, fail, total, unit };
}

/**
 * Preço lojista = preço consumidor ÷ 2. As taxas incidem sobre o lucro bruto
 * (como na planilha), não sobre o preço de venda.
 */
export function calcPricing(unit: number, markup: number, f: Fees): Pricing {
  const consumer = unit * markup;
  const lojista = consumer / 2;
  const gbC = consumer - unit;
  const gbL = lojista - unit;
  const netC = gbC - gbC * (f.taxPct / 100) - gbC * (f.cardPct / 100) - gbC * (f.adPct / 100);
  const netL = gbL - gbL * (f.taxPct / 100);
  return { consumer, lojista, gbC, gbL, netC, netL };
}

/** Markup equivalente a um preço de venda ao consumidor. */
export function markupForPrice(unit: number, price: number): number {
  return unit > 0 ? price / unit : 0;
}

/** Fração do preço que sobra como lucro líquido (0 quando não há preço). */
export function margin(net: number, price: number): number {
  return price > 0 ? net / price : 0;
}

export function materialFor(state: AppState, part: Part): Material {
  return state.materials.find((m) => m.id === part.materialId) ?? state.materials[0];
}

export function printerFor(state: AppState, part: Part): Printer {
  return state.printers.find((m) => m.id === part.printerId) ?? state.printers[0];
}

export function costInputsFor(state: AppState, part: Part): CostInputs {
  const material = materialFor(state, part);
  const printer = printerFor(state, part);
  const r = state.rates;
  return {
    filamentKg: material.pricePerKg,
    power: printer.power,
    machineVal: printer.value,
    machineLife: printer.lifeHours,
    duty: r.duty,
    kwh: r.kwh,
    fixedMonth: r.fixedMonth,
    unitsMonth: r.unitsMonth,
    failPct: r.failPct,
  };
}

export function partCost(state: AppState, part: Part): CostBreakdown {
  return calcCost(part, costInputsFor(state, part));
}
