import { z } from 'zod';

// Contrato de dados compartilhado entre cliente e servidor.

const num = z.number().finite();

export const AccessorySchema = z.object({
  id: z.string(),
  name: z.string(),
  qty: num,
  cost: num,
});

export const PartSchema = z.object({
  id: z.string(),
  name: z.string(),
  hours: num,
  weight: num,
  units: num,
  /** null = usa o primeiro material / impressora cadastrado */
  materialId: z.string().nullable(),
  printerId: z.string().nullable(),
  /** preço de venda desejado (consumidor), para o cálculo inverso */
  targetPrice: num.nullable(),
  acc: z.array(AccessorySchema),
});

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  customer: z.string(),
  markups: z.array(num),
  parts: z.array(PartSchema),
});

export const MaterialSchema = z.object({
  id: z.string(),
  name: z.string(),
  pricePerKg: num,
});

export const PrinterSchema = z.object({
  id: z.string(),
  name: z.string(),
  power: num,
  value: num,
  lifeHours: num,
});

export const RatesSchema = z.object({
  duty: num,
  kwh: num,
  fixedMonth: num,
  unitsMonth: num,
  failPct: num,
  taxPct: num,
  cardPct: num,
  adPct: num,
});

export const AppStateSchema = z.object({
  version: z.literal(1),
  rates: RatesSchema,
  materials: z.array(MaterialSchema).min(1),
  printers: z.array(PrinterSchema).min(1),
  projects: z.array(ProjectSchema).min(1),
  activeProjectId: z.string(),
});

export type Accessory = z.infer<typeof AccessorySchema>;
export type Part = z.infer<typeof PartSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Material = z.infer<typeof MaterialSchema>;
export type Printer = z.infer<typeof PrinterSchema>;
export type Rates = z.infer<typeof RatesSchema>;
export type AppState = z.infer<typeof AppStateSchema>;

/** Resposta de GET /api/state. `state` é null quando ainda não há nada salvo. */
export interface StateResponse {
  state: AppState | null;
}
