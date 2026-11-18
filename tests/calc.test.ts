import { describe, expect, it } from 'vitest';
import { calcCost, calcPricing, costInputsFor, margin, markupForPrice } from '../src/shared/calc.ts';
import { defaultState, migrateLegacy } from '../src/shared/defaults.ts';
import { AppStateSchema } from '../src/shared/types.ts';

// Implementação de referência: cópia literal de legacy/index.html.
// Se estes testes falharem, o redesign mudou um resultado da planilha.
function legacyCalc(p: any, c: any) {
  const mat = p.weight / 1000 * c.filamentKg;
  const energy = (c.power * p.hours * c.duty) * c.kwh / 1000;
  const accTot = p.acc.reduce((s: number, a: any) => s + a.qty * a.cost, 0);
  const fixed = c.unitsMonth > 0 ? c.fixedMonth / c.unitsMonth : 0;
  const amort = c.machineLife > 0 ? c.machineVal / c.machineLife * p.hours : 0;
  const fail = (c.failPct / 100) * (mat + energy + amort) * 0.7;
  const total = mat + energy + accTot + fixed + amort + fail;
  const unit = p.units > 0 ? total / p.units : total;
  return { mat, energy, accTot, fixed, amort, fail, total, unit };
}
function legacyPricing(unit: number, mk: number, c: any) {
  const consumer = unit * mk, lojista = consumer / 2;
  const gbC = consumer - unit, gbL = lojista - unit;
  const netC = gbC - gbC * (c.taxPct / 100) - gbC * (c.cardPct / 100) - gbC * (c.adPct / 100);
  const netL = gbL - gbL * (c.taxPct / 100);
  return { consumer, lojista, gbC, gbL, netC, netL };
}

const CFG = {
  filamentKg: 120, power: 360, duty: 0.5, kwh: 0.9, machineVal: 5000, machineLife: 20000,
  fixedMonth: 0, unitsMonth: 1, failPct: 15, taxPct: 8, cardPct: 5, adPct: 20,
};

const CASES = [
  { hours: 5, weight: 120, units: 1, acc: [{ qty: 0, cost: 0.25 }, { qty: 0, cost: 0.56 }] },
  { hours: 12.5, weight: 430, units: 6, acc: [{ qty: 6, cost: 0.25 }, { qty: 12, cost: 0.56 }] },
  { hours: 0.3, weight: 4, units: 20, acc: [] },
  { hours: 0, weight: 0, units: 0, acc: [{ qty: 1, cost: 3 }] },
];
const CFGS = [
  CFG,
  { ...CFG, fixedMonth: 350, unitsMonth: 80, failPct: 7.5, kwh: 1.12, duty: 0.65 },
  { ...CFG, machineLife: 0, unitsMonth: 0, fixedMonth: 100 },
];

describe('calcCost', () => {
  it('valores conhecidos da peça padrão', () => {
    const r = calcCost(CASES[0], CFG);
    expect(r.mat).toBeCloseTo(14.4, 10);
    expect(r.energy).toBeCloseTo(0.81, 10);
    expect(r.amort).toBeCloseTo(1.25, 10);
    expect(r.fail).toBeCloseTo(1.7283, 10);
    expect(r.total).toBeCloseTo(18.1883, 10);
    expect(r.unit).toBeCloseTo(18.1883, 10);
  });

  it('é idêntico à versão anterior em todos os casos', () => {
    for (const cfg of CFGS) {
      for (const p of CASES) {
        const a = calcCost(p, cfg);
        const b = legacyCalc(p, cfg);
        for (const k of Object.keys(b) as (keyof typeof b)[]) {
          expect(a[k]).toBeCloseTo(b[k], 10);
        }
      }
    }
  });
});

describe('calcPricing', () => {
  it('valores conhecidos com markup 2', () => {
    const r = calcPricing(18.1883, 2, CFG);
    expect(r.consumer).toBeCloseTo(36.3766, 10);
    expect(r.lojista).toBeCloseTo(18.1883, 10);
    expect(r.gbC).toBeCloseTo(18.1883, 10);
    expect(r.netC).toBeCloseTo(12.186161, 10);
    expect(r.gbL).toBeCloseTo(0, 10);
    expect(r.netL).toBeCloseTo(0, 10);
  });

  it('é idêntico à versão anterior', () => {
    for (const unit of [0, 3.07, 18.1883, 250]) {
      for (const mk of [0, 1, 2, 2.5, 3, 4]) {
        const a = calcPricing(unit, mk, CFG);
        const b = legacyPricing(unit, mk, CFG);
        for (const k of Object.keys(b) as (keyof typeof b)[]) {
          expect(a[k]).toBeCloseTo(b[k], 10);
        }
      }
    }
  });
});

describe('preço alvo', () => {
  it('markupForPrice inverte o preço ao consumidor', () => {
    const mk = markupForPrice(18.1883, 49.9);
    expect(calcPricing(18.1883, mk, CFG).consumer).toBeCloseTo(49.9, 10);
    expect(markupForPrice(0, 49.9)).toBe(0);
  });
  it('margin não divide por zero', () => {
    expect(margin(10, 40)).toBeCloseTo(0.25, 10);
    expect(margin(10, 0)).toBe(0);
  });
});

describe('estado', () => {
  it('o estado padrão é válido e reproduz o custo da versão anterior', () => {
    const s = defaultState();
    expect(AppStateSchema.safeParse(s).success).toBe(true);
    const part = s.projects[0].parts[0];
    expect(calcCost(part, costInputsFor(s, part)).total).toBeCloseTo(18.1883, 10);
  });

  it('migra os dados do localStorage antigo sem alterar custos', () => {
    const legacy = {
      cfg: { ...CFG, filamentKg: 98.5, power: 220, machineVal: 3200, machineLife: 15000, failPct: 10 },
      markups: [2, 3.5],
      parts: [
        { name: 'Vaso', hours: 7.5, weight: 210, units: 2, acc: [{ name: 'Caixa', qty: 2, cost: 1.9 }] },
        { name: 'Chaveiro', hours: 0.4, weight: 6, units: 10, acc: [] },
      ],
      sel: 1,
    };
    const s = migrateLegacy(legacy)!;
    expect(AppStateSchema.safeParse(s).success).toBe(true);
    expect(s.projects[0].markups).toEqual([2, 3.5]);
    legacy.parts.forEach((old, i) => {
      const part = s.projects[0].parts[i];
      expect(part.name).toBe(old.name);
      const a = calcCost(part, costInputsFor(s, part));
      const b = legacyCalc(old, legacy.cfg);
      expect(a.total).toBeCloseTo(b.total, 10);
      expect(a.unit).toBeCloseTo(b.unit, 10);
    });
  });

  it('recusa dados antigos irreconhecíveis', () => {
    expect(migrateLegacy(null)).toBeNull();
    expect(migrateLegacy({ foo: 1 })).toBeNull();
  });
});
