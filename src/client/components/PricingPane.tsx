import { Plus, X } from 'lucide-react';
import { calcPricing, margin, markupForPrice, partCost, type Pricing } from '../../shared/calc.ts';
import type { AppState, Part, Project } from '../../shared/types.ts';
import { fmtBRL, fmtMoney, fmtNum, fmtPct } from '../format.ts';
import { addMarkup, patchPart, priceIdx, removeMarkup, setMarkup, setPriceIdx } from '../store.ts';
import { IconButton, NumberField, cx } from './ui.tsx';

interface Props {
  state: AppState;
  project: Project;
  part: Part | null;
  className?: string;
}

const MAX_MARKUPS = 5;
const ZERO = 0.005;
const tone = (v: number) => (v < -ZERO ? 'text-neg' : v > ZERO ? 'text-pos' : 'text-muted');
/** Lucro que arredonda a zero vira texto, para não depender da cor. */
const profit = (v: number) => (Math.abs(v) < ZERO ? 'sem lucro' : fmtMoney(v));

interface Row {
  label: string;
  /** rótulo curto para telas estreitas */
  short: string;
  get: (p: Pricing) => string;
  cls?: (p: Pricing) => string;
  /** a linha de preço escolhe o markup principal */
  price?: boolean;
}

const GROUPS: { title: string; note?: string; rows: Row[] }[] = [
  {
    title: 'Consumidor',
    rows: [
      { label: 'Preço', short: 'Preço', price: true, get: (p) => fmtMoney(p.consumer), cls: () => 'font-semibold text-ink text-[14px]' },
      { label: 'Lucro bruto', short: 'Bruto', get: (p) => profit(p.gbC), cls: (p) => (p.gbC < -ZERO ? 'text-neg' : 'text-muted') },
      { label: 'Lucro líquido', short: 'Líquido', get: (p) => profit(p.netC), cls: (p) => tone(p.netC) },
      { label: 'Margem líquida', short: 'Margem', get: (p) => fmtPct(margin(p.netC, p.consumer)), cls: () => 'text-muted' },
    ],
  },
  {
    title: 'Lojista',
    note: 'metade do preço ao consumidor',
    rows: [
      { label: 'Preço', short: 'Preço', price: true, get: (p) => fmtMoney(p.lojista), cls: () => 'font-semibold text-ink text-[14px]' },
      { label: 'Lucro bruto', short: 'Bruto', get: (p) => profit(p.gbL), cls: (p) => (p.gbL < -ZERO ? 'text-neg' : 'text-muted') },
      { label: 'Lucro líquido', short: 'Líquido', get: (p) => profit(p.netL), cls: (p) => tone(p.netL) },
      { label: 'Margem líquida', short: 'Margem', get: (p) => fmtPct(margin(p.netL, p.lojista)), cls: () => 'text-muted' },
    ],
  },
];

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
  const chosen = priceIdx(project);
  const main = cols[chosen];

  const target = part.targetPrice;
  const targetMk = target !== null ? markupForPrice(cost.unit, target) : 0;
  const targetPr = target !== null ? calcPricing(cost.unit, targetMk, fees) : null;
  const span = project.markups.length + (targetPr ? 3 : 2);

  const tint = (i: number) => i === chosen && 'bg-select/45';

  return (
    <section aria-label="Preço de venda" className={shell}>
      <div className="mx-auto max-w-[760px] px-5 py-5 md:max-xl:px-7 xl:max-w-none">
        {/* Preço principal: o número que o usuário veio buscar */}
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-[14px] font-semibold">Preço de venda</h2>
          {main && (
            <div className="text-right">
              <div className="num text-[22px] leading-none font-semibold">{fmtBRL(main.consumer)}</div>
              <div className="num mt-1 text-[12px] text-muted">
                {fmtNum(project.markups[chosen])}× sobre o custo de{' '}
                <span className="text-cost">{fmtBRL(cost.unit)}</span>
              </div>
              <div className="num text-[12px] text-muted">
                lucro líquido <span className={tone(main.netC)}>{fmtBRL(main.netC)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="-mr-2 mt-3 overflow-x-auto pt-2 pr-2">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="pb-2 text-left align-middle text-[12px] font-normal text-muted">Markup</th>
                {project.markups.map((mk, i) => (
                  <th key={i} className={cx('w-16 rounded-t-md pt-1 pr-1 pb-2 pl-1.5 font-normal sm:w-[74px]', tint(i))}>
                    <div className={cx('group field relative flex items-center px-1.5!', i === chosen && 'border-primary/60')}>
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
                          className="absolute -top-3 -right-3 grid size-6 place-items-center rounded-full text-muted opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 hover:text-ink focus-visible:opacity-100 pointer-coarse:opacity-100"
                        >
                          <span className="grid size-[18px] place-items-center rounded-full border border-line-strong bg-panel">
                            <X className="size-3" strokeWidth={2.5} />
                          </span>
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                {targetPr && (
                  <th className="w-16 pb-2 pl-1.5 text-right align-middle font-normal sm:w-[74px]">
                    <span className="block text-[12px] text-muted">Alvo</span>
                    <span className={cx('num block font-semibold', targetMk < 1 && 'text-neg')}>
                      {fmtNum(Math.round(targetMk * 100) / 100)}×
                    </span>
                  </th>
                )}
                <th className="w-8 pb-2 pl-1 align-middle">
                  {project.markups.length < MAX_MARKUPS && (
                    <IconButton label="Adicionar markup" onClick={addMarkup} className="size-7!">
                      <Plus className="size-4" />
                    </IconButton>
                  )}
                </th>
              </tr>
            </thead>
            {GROUPS.map((group, g) => (
              <tbody key={group.title}>
                <tr>
                  <th
                    scope="rowgroup"
                    colSpan={span}
                    className={cx('pb-1 text-left text-[12px] font-semibold text-muted', g > 0 ? 'pt-4' : 'pt-1')}
                  >
                    {group.title}
                    {group.note && <span className="font-normal text-faint"> · {group.note}</span>}
                  </th>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="border-t border-line/70 py-1.5 pr-2 text-left font-normal whitespace-nowrap text-muted">
                      <span className="sm:hidden">{row.short}</span>
                      <span className="max-sm:hidden">{row.label}</span>
                    </th>
                    {cols.map((p, i) => (
                      <td
                        key={i}
                        className={cx('num border-t border-line/70 py-1.5 pr-1 pl-1.5 text-right', tint(i), row.cls?.(p))}
                      >
                        {row.price ? (
                          <button
                            type="button"
                            aria-pressed={i === chosen}
                            title={i === chosen ? 'Preço principal' : 'Usar como preço principal'}
                            onClick={() => setPriceIdx(i)}
                            className="-mx-1 w-[calc(100%+0.5rem)] rounded px-1 text-right transition-colors hover:bg-hover"
                          >
                            {row.get(p)}
                          </button>
                        ) : (
                          row.get(p)
                        )}
                      </td>
                    ))}
                    {targetPr && (
                      <td className={cx('num border-t border-line/70 py-1.5 pl-1.5 text-right', row.cls?.(targetPr))}>
                        {row.get(targetPr)}
                      </td>
                    )}
                    <td className="border-t border-line/70" />
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
        <p className="mt-2 text-[12px] text-faint">
          Clique num preço para usá-lo como principal e no orçamento.
        </p>

        {/* Preço alvo */}
        <div className="mt-6 border-t border-line pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-semibold">Preço alvo</h2>
              <p className="text-[12px] text-faint">
                {target !== null
                  ? 'Comparado na coluna Alvo da tabela.'
                  : 'Informe um preço ao consumidor para comparar com os markups.'}
              </p>
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
          {targetPr && targetMk < 1 && (
            <p className="mt-2 text-neg">Esse preço fica abaixo do custo de {fmtBRL(cost.unit)}.</p>
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
