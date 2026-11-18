import { Plus, X } from 'lucide-react';
import { calcPricing, margin, markupForPrice, partCost, type Pricing } from '../../shared/calc.ts';
import type { AppState, Part, Project } from '../../shared/types.ts';
import { fmtBRL, fmtMoney, fmtNum, fmtPct } from '../format.ts';
import { addMarkup, patchPart, removeMarkup, setMarkup } from '../store.ts';
import { IconButton, NumberField, cx } from './ui.tsx';

interface Props {
  state: AppState;
  project: Project;
  part: Part | null;
  className?: string;
}

const MAX_MARKUPS = 5;
const tone = (v: number) => (v < -0.005 ? 'text-neg' : v > 0.005 ? 'text-pos' : 'text-muted');

export function PricingPane({ state, project, part, className }: Props) {
  const shell = cx('min-w-0 border-line bg-panel max-xl:border-t xl:border-l', className);

  if (!part) {
    return (
      <section aria-label="Preço de venda" className={shell}>
        <div className="px-5 py-5">
          <h2 className="text-[14px] font-semibold">Preço de venda</h2>
          <p className="mt-1.5 text-muted">Os preços aparecem aqui quando houver uma peça selecionada.</p>
        </div>
      </section>
    );
  }

  const cost = partCost(state, part);
  const fees = state.rates;
  const cols = project.markups.map((mk) => calcPricing(cost.unit, mk, fees));

  const target = part.targetPrice;
  const targetMk = target !== null ? markupForPrice(cost.unit, target) : 0;
  const targetPr = target !== null ? calcPricing(cost.unit, targetMk, fees) : null;

  const rows: { label: string; get: (p: Pricing) => string; cls?: (p: Pricing) => string }[][] = [
    [
      { label: 'Preço', get: (p) => fmtMoney(p.consumer), cls: () => 'font-semibold text-ink text-[14px]' },
      { label: 'Lucro bruto', get: (p) => fmtMoney(p.gbC), cls: () => 'text-muted' },
      { label: 'Lucro líquido', get: (p) => fmtMoney(p.netC), cls: (p) => tone(p.netC) },
      { label: 'Margem líquida', get: (p) => fmtPct(margin(p.netC, p.consumer)), cls: () => 'text-muted' },
    ],
    [
      { label: 'Preço', get: (p) => fmtMoney(p.lojista), cls: () => 'font-semibold text-ink text-[14px]' },
      { label: 'Lucro bruto', get: (p) => fmtMoney(p.gbL), cls: (p) => (p.gbL < -0.005 ? 'text-neg' : 'text-muted') },
      { label: 'Lucro líquido', get: (p) => fmtMoney(p.netL), cls: (p) => tone(p.netL) },
      { label: 'Margem líquida', get: (p) => fmtPct(margin(p.netL, p.lojista)), cls: () => 'text-muted' },
    ],
  ];
  const groups = ['Consumidor', 'Lojista'];

  return (
    <section aria-label="Preço de venda" className={shell}>
      <div className="mx-auto max-w-[760px] px-5 py-5 md:max-xl:px-7 xl:max-w-none">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[14px] font-semibold">Preço de venda</h2>
          <span className="num text-[12px] text-muted">
            custo <span className="text-cost">{fmtBRL(cost.unit)}</span> por un
          </span>
        </div>

        <div className="-mr-2 mt-1 overflow-x-auto pt-2 pr-2">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="pb-2 text-left align-middle text-[12px] font-normal text-muted">
                  Markup
                </th>
                {project.markups.map((mk, i) => (
                  <th key={i} className="w-[74px] pb-2 pl-1.5 font-normal">
                    <div className="group field relative flex items-center px-1.5!">
                      <NumberField
                        quiet
                        label={`Markup ${i + 1}`}
                        value={mk}
                        step={0.1}
                        suffix="×"
                        className="h-[26px]! border-0! bg-transparent! px-0!"
                        inputClassName="font-semibold"
                        onChange={(v) => setMarkup(i, v)}
                      />
                      {project.markups.length > 1 && (
                        <button
                          type="button"
                          aria-label={`Remover markup ${fmtNum(mk)}×`}
                          title="Remover"
                          onClick={() => removeMarkup(i)}
                          className="absolute -top-2 -right-2 grid size-[18px] place-items-center rounded-full border border-line-strong bg-panel text-muted opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 hover:text-ink focus-visible:opacity-100"
                        >
                          <X className="size-3" strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="w-8 pb-2 pl-1 align-middle">
                  {project.markups.length < MAX_MARKUPS && (
                    <IconButton label="Adicionar markup" onClick={addMarkup} className="size-7!">
                      <Plus className="size-4" />
                    </IconButton>
                  )}
                </th>
              </tr>
            </thead>
            {rows.map((group, g) => (
              <tbody key={g}>
                <tr>
                  <th
                    scope="rowgroup"
                    colSpan={project.markups.length + 2}
                    className={cx('pb-1 text-left text-[12px] font-semibold text-muted', g > 0 ? 'pt-4' : 'pt-1')}
                  >
                    {groups[g]}
                    {g === 1 && <span className="font-normal text-faint"> · metade do preço ao consumidor</span>}
                  </th>
                </tr>
                {group.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="border-t border-line/70 py-1.5 text-left font-normal text-muted">
                      {row.label}
                    </th>
                    {cols.map((p, i) => (
                      <td key={i} className={cx('num border-t border-line/70 py-1.5 pl-1.5 text-right', row.cls?.(p))}>
                        {row.get(p)}
                      </td>
                    ))}
                    <td className="border-t border-line/70" />
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>

        {/* Preço alvo */}
        <div className="mt-7 border-t border-line pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="target-h" className="text-[14px] font-semibold">Preço alvo</h2>
              <p className="text-[12px] text-faint">Quanto sobra se você vender por um preço definido.</p>
            </div>
            <NumberField
              label="Preço alvo ao consumidor"
              className="w-32 shrink-0"
              prefix="R$"
              step={1}
              placeholder="0,00"
              value={target ?? 0}
              emptyWhen={0}
              onChange={(v) => patchPart(part.id, { targetPrice: v > 0 ? v : null })}
            />
          </div>

          {targetPr && target !== null && (
            <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1.5" aria-labelledby="target-h">
              <dt className="text-muted">Markup equivalente</dt>
              <dd className={cx('num text-right font-semibold', targetMk < 1 && 'text-neg')}>
                {fmtNum(Math.round(targetMk * 100) / 100)}×
              </dd>
              <dt className="text-muted">Lucro líquido ao consumidor</dt>
              <dd className={cx('num text-right', tone(targetPr.netC))}>
                {fmtBRL(targetPr.netC)}
                <span className="text-faint"> · {fmtPct(margin(targetPr.netC, target))}</span>
              </dd>
              <dt className="text-muted">Preço lojista</dt>
              <dd className="num text-right">{fmtBRL(targetPr.lojista)}</dd>
              <dt className="text-muted">Lucro líquido no lojista</dt>
              <dd className={cx('num text-right', tone(targetPr.netL))}>
                {fmtBRL(targetPr.netL)}
                <span className="text-faint"> · {fmtPct(margin(targetPr.netL, targetPr.lojista))}</span>
              </dd>
              {targetMk < 1 && (
                <p className="col-span-2 mt-1 text-neg">
                  Esse preço fica abaixo do custo de {fmtBRL(cost.unit)}.
                </p>
              )}
            </dl>
          )}
        </div>

        <p className="mt-6 text-[12px] text-faint">
          Valores em R$ por unidade. O lucro líquido desconta imposto ({fmtNum(fees.taxPct)}%), cartão ({fmtNum(fees.cardPct)}%) e
          anúncio ({fmtNum(fees.adPct)}%) do lucro bruto ao consumidor, e só o imposto no lojista.
        </p>
      </div>
    </section>
  );
}
