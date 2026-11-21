import { Copy, Plus, Trash2, X } from 'lucide-react';
import { costInputsFor, calcCost, materialFor, printerFor } from '../../shared/calc.ts';
import type { AppState, Part } from '../../shared/types.ts';
import { fmtBRL, fmtNum, fmtPct } from '../format.ts';
import {
  addAccessory,
  addPart,
  deletePart,
  duplicatePart,
  patchAccessory,
  patchPart,
  removeAccessory,
} from '../store.ts';
import { Button, IconButton, Labeled, NumberField, cx } from './ui.tsx';

interface Props {
  state: AppState;
  part: Part | null;
  /** abre as configurações com o foco num campo (ex.: "rate-fixedMonth") */
  onOpenSettings: (focusId: string) => void;
  className?: string;
}

interface Line {
  key: string;
  label: string;
  detail: string;
  value: number;
  color: string;
  /** campo das configurações que falta preencher para esta linha */
  setup?: string;
}

export function EditorPane({ state, part, onOpenSettings, className }: Props) {
  if (!part) {
    return (
      <section className={cx('flex min-w-0 items-center justify-center p-8', className)}>
        <div className="max-w-sm">
          <h2 className="text-[16px] font-semibold">Nenhuma peça selecionada</h2>
          <p className="mt-1.5 text-muted">
            Cada peça recebe o tempo de impressão e o peso de filamento do fatiador. O custo e os
            preços de venda aparecem assim que você preencher.
          </p>
          <Button variant="primary" className="mt-4" icon={<Plus className="size-4" />} onClick={addPart}>
            Criar peça
          </Button>
        </div>
      </section>
    );
  }

  const inputs = costInputsFor(state, part);
  const cost = calcCost(part, inputs);
  const material = materialFor(state, part);
  const printer = printerFor(state, part);

  const lines: Line[] = [
    {
      key: 'mat',
      label: 'Matéria-prima',
      detail: `${fmtNum(part.weight)} g × ${fmtBRL(inputs.filamentKg)}/kg`,
      value: cost.mat,
      color: 'bg-c-mat',
    },
    {
      key: 'energy',
      label: 'Energia',
      detail: `${fmtNum(inputs.power)} W × ${fmtNum(part.hours)} h × ${fmtNum(inputs.duty)} × ${fmtBRL(inputs.kwh)}/kWh`,
      value: cost.energy,
      color: 'bg-c-energy',
    },
    {
      key: 'amort',
      label: 'Amortização da máquina',
      detail:
        inputs.machineLife > 0 && inputs.machineVal > 0
          ? `${fmtBRL(inputs.machineVal)} ÷ ${fmtNum(inputs.machineLife)} h × ${fmtNum(part.hours)} h`
          : 'valor ou vida útil da impressora não informados',
      value: cost.amort,
      color: 'bg-c-amort',
      setup: inputs.machineLife > 0 && inputs.machineVal > 0 ? undefined : `printer-${printer.id}`,
    },
    {
      key: 'fail',
      label: 'Provisão de falhas',
      detail: `${fmtNum(inputs.failPct)}% × (matéria-prima + energia + amortização) × 0,7`,
      value: cost.fail,
      color: 'bg-c-fail',
    },
    {
      key: 'acc',
      label: 'Acessórios e embalagens',
      detail: part.acc.length === 0 ? 'nenhum item' : `${part.acc.length} ${part.acc.length === 1 ? 'item' : 'itens'}`,
      value: cost.accTot,
      color: 'bg-c-acc',
    },
    {
      key: 'fixed',
      label: 'Custo fixo rateado',
      detail:
        inputs.fixedMonth > 0 && inputs.unitsMonth > 0
          ? `${fmtBRL(inputs.fixedMonth)} ÷ ${fmtNum(inputs.unitsMonth)} un/mês`
          : 'custo fixo mensal não configurado',
      value: cost.fixed,
      color: 'bg-c-fixed',
      setup: inputs.fixedMonth > 0 && inputs.unitsMonth > 0 ? undefined : 'rate-fixedMonth',
    },
  ];
  const share = (v: number) => (cost.total > 0 ? v / cost.total : 0);

  return (
    <section aria-label="Custo da peça" className={cx('min-w-0', className)}>
      <div className="mx-auto max-w-[760px] px-5 py-5 md:px-7">
        {/* Identificação */}
        <div className="flex items-center gap-1">
          <input
            aria-label="Nome da peça"
            placeholder="Nome da peça"
            value={part.name}
            onChange={(e) => patchPart(part.id, { name: e.target.value })}
            className="field-quiet -ml-2 h-9! flex-1 text-[18px] font-semibold tracking-tight"
          />
          <IconButton label="Duplicar peça" onClick={() => duplicatePart(part.id)}>
            <Copy className="size-4" />
          </IconButton>
          <IconButton label="Excluir peça" variant="danger" onClick={() => deletePart(part.id)}>
            <Trash2 className="size-4" />
          </IconButton>
        </div>

        {/* Entradas */}
        <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-3 sm:grid-cols-6">
          <Labeled label="Tempo de impressão" htmlFor="f-hours" className="sm:col-span-2">
            <NumberField
              id="f-hours"
              label="Tempo de impressão em horas"
              value={part.hours}
              step={0.1}
              suffix="h"
              onChange={(hours) => patchPart(part.id, { hours })}
            />
          </Labeled>
          <Labeled label="Peso de filamento" htmlFor="f-weight" className="sm:col-span-2">
            <NumberField
              id="f-weight"
              label="Peso de filamento em gramas"
              value={part.weight}
              suffix="g"
              onChange={(weight) => patchPart(part.id, { weight })}
            />
          </Labeled>
          <Labeled label="Unidades no lote" htmlFor="f-units" className="sm:col-span-2">
            <NumberField
              id="f-units"
              label="Unidades no lote"
              value={part.units}
              min={1}
              suffix="un"
              onChange={(units) => patchPart(part.id, { units })}
            />
          </Labeled>
          <Labeled label="Material" htmlFor="f-material" className="max-sm:col-span-3 sm:col-span-3">
            <select
              id="f-material"
              className="field"
              value={material.id}
              onChange={(e) => patchPart(part.id, { materialId: e.target.value })}
            >
              {state.materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {fmtBRL(m.pricePerKg)}/kg
                </option>
              ))}
            </select>
          </Labeled>
          <Labeled label="Impressora" htmlFor="f-printer" className="max-sm:col-span-3 sm:col-span-3">
            <select
              id="f-printer"
              className="field"
              value={printer.id}
              onChange={(e) => patchPart(part.id, { printerId: e.target.value })}
            >
              {state.printers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {fmtNum(p.power)} W
                </option>
              ))}
            </select>
          </Labeled>
        </div>

        {/* Acessórios */}
        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold">Acessórios e embalagens</h2>
          <Button variant="ghost" icon={<Plus className="size-4" />} onClick={() => addAccessory(part.id)}>
            Item
          </Button>
        </div>

        {part.acc.length === 0 ? (
          <p className="mt-1 text-muted">
            Ímãs, argolas, caixas e outros itens comprados que acompanham esta peça.
          </p>
        ) : (
          <table className="mt-1 w-full">
            <thead>
              <tr className="text-left text-[12px] text-muted">
                <th className="pb-1 pl-2 font-normal">Item</th>
                <th className="w-20 pb-1 pr-2 text-right font-normal">Qtd</th>
                <th className="w-28 pb-1 pr-2 text-right font-normal">Custo un.</th>
                <th className="w-24 pb-1 text-right font-normal">Total</th>
                <th className="w-9" />
              </tr>
            </thead>
            <tbody>
              {part.acc.map((a) => (
                <tr key={a.id} className="border-t border-line/70">
                  <td className="py-1">
                    <input
                      aria-label="Nome do item"
                      placeholder="Nome do item"
                      className="field-quiet"
                      value={a.name}
                      onChange={(e) => patchAccessory(part.id, a.id, { name: e.target.value })}
                    />
                  </td>
                  <td className="py-1">
                    <NumberField
                      quiet
                      label={`Quantidade de ${a.name || 'item'}`}
                      value={a.qty}
                      onChange={(qty) => patchAccessory(part.id, a.id, { qty })}
                    />
                  </td>
                  <td className="py-1">
                    <NumberField
                      quiet
                      label={`Custo unitário de ${a.name || 'item'}`}
                      value={a.cost}
                      step={0.05}
                      prefix="R$"
                      onChange={(c) => patchAccessory(part.id, a.id, { cost: c })}
                    />
                  </td>
                  <td className={cx('num py-1 text-right', a.qty * a.cost === 0 && 'text-faint')}>
                    {fmtBRL(a.qty * a.cost)}
                  </td>
                  <td className="py-1 text-right">
                    <IconButton
                      label={`Remover ${a.name || 'item'}`}
                      onClick={() => removeAccessory(part.id, a.id)}
                    >
                      <X className="size-4" />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Composição do custo */}
        <div className="mt-8 flex items-end justify-between gap-4">
          <h2 className="text-[14px] font-semibold">Composição do custo</h2>
          <div className="text-right">
            <div className="num text-[22px] leading-none font-semibold text-cost">{fmtBRL(cost.unit)}</div>
            <div className="mt-1 text-[12px] text-muted">
              {part.units > 1
                ? `por unidade · ${fmtBRL(cost.total)} no lote de ${fmtNum(part.units)}`
                : 'custo da unidade'}
            </div>
          </div>
        </div>

        <div
          className="mt-3 flex h-2.5 gap-px overflow-hidden rounded-full bg-raised"
          role="img"
          aria-label={
            'Participação no custo: ' +
            lines.map((l) => `${l.label} ${fmtPct(share(l.value))}`).join(', ')
          }
        >
          {lines.map(
            (l) =>
              l.value > 0 && (
                <div
                  key={l.key}
                  className={cx(l.color, 'transition-[flex-grow] duration-200 ease-out')}
                  style={{ flexGrow: l.value, flexBasis: 0 }}
                />
              ),
          )}
        </div>

        <table className="mt-2 w-full">
          <thead className="sr-only">
            <tr>
              <th>Componente</th>
              <th>Participação</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.key} className="border-b border-line/70">
                <td className="py-2 pr-3">
                  <div className="flex items-start gap-2.5">
                    <span className={cx('mt-[5px] size-2.5 shrink-0 rounded-[3px]', l.color)} aria-hidden />
                    <div className="min-w-0">
                      <div className={cx(l.value === 0 && 'text-muted')}>{l.label}</div>
                      <div className="num text-[12px] whitespace-normal text-faint">
                        {l.detail}
                        {l.setup && (
                          <>
                            {' · '}
                            <button
                              type="button"
                              onClick={() => onOpenSettings(l.setup!)}
                              className="rounded-sm text-primary underline-offset-2 hover:underline"
                            >
                              Configurar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="num w-16 py-2 text-right align-top text-faint">
                  {l.value > 0 ? fmtPct(share(l.value)) : '—'}
                </td>
                <td className={cx('num w-24 py-2 text-right align-top', l.value === 0 && 'text-faint')}>
                  {fmtBRL(l.value)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="py-2.5 font-semibold" colSpan={2}>
                Custo total{part.units > 1 ? ` do lote (${fmtNum(part.units)} un)` : ''}
              </td>
              <td className="num py-2.5 text-right font-semibold">{fmtBRL(cost.total)}</td>
            </tr>
          </tfoot>
        </table>

      </div>
    </section>
  );
}
