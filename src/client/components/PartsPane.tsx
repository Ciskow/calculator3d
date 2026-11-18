import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { partCost } from '../../shared/calc.ts';
import type { AppState, Project } from '../../shared/types.ts';
import { fmtBRL, fmtNum } from '../format.ts';
import { addPart, selectPart } from '../store.ts';
import { Button, cx } from './ui.tsx';

interface Props {
  state: AppState;
  project: Project;
  selectedId: string | null;
  onPicked: () => void;
  className?: string;
}

export function PartsPane({ state, project, selectedId, onPicked, className }: Props) {
  const [query, setQuery] = useState('');

  const rows = useMemo(
    () => project.parts.map((part) => ({ part, cost: partCost(state, part) })),
    [state, project],
  );
  const q = query.trim().toLowerCase();
  const visible = q ? rows.filter((r) => r.part.name.toLowerCase().includes(q)) : rows;

  const totals = rows.reduce(
    (t, r) => ({
      hours: t.hours + r.part.hours,
      weight: t.weight + r.part.weight,
      units: t.units + r.part.units,
      cost: t.cost + r.cost.total,
    }),
    { hours: 0, weight: 0, units: 0, cost: 0 },
  );

  return (
    <aside
      aria-label="Peças do projeto"
      className={cx('flex min-h-0 flex-col border-line bg-panel md:border-r', className)}
    >
      <div className="flex shrink-0 items-center gap-1.5 p-2.5">
        <label className="field flex items-center gap-1.5">
          <Search className="size-3.5 shrink-0 text-faint" aria-hidden />
          <input
            type="search"
            aria-label="Buscar peça"
            placeholder="Buscar peça"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-full w-full min-w-0 bg-transparent outline-none"
          />
        </label>
        <Button
          variant="primary"
          icon={<Plus className="size-4" />}
          onClick={() => {
            setQuery('');
            addPart();
            onPicked();
          }}
        >
          Peça
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
        {rows.length === 0 ? (
          <p className="px-2 py-6 text-muted">
            Este projeto ainda não tem peças. Crie a primeira e informe o tempo e o peso que o
            fatiador mostra.
          </p>
        ) : visible.length === 0 ? (
          <p className="px-2 py-6 text-muted">Nenhuma peça com “{query.trim()}”.</p>
        ) : (
          <ul>
            {visible.map(({ part, cost }) => {
              const selected = part.id === selectedId;
              return (
                <li key={part.id}>
                  <button
                    type="button"
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => {
                      selectPart(part.id);
                      onPicked();
                    }}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors duration-150',
                      selected ? 'bg-select' : 'hover:bg-hover',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className={cx('block truncate', selected && 'font-semibold')}>
                        {part.name || 'Sem nome'}
                      </span>
                      <span className={cx('num block text-[12px]', selected ? 'text-muted' : 'text-faint')}>
                        {fmtNum(part.hours)} h · {fmtNum(part.weight)} g
                        {part.units !== 1 && ` · ${fmtNum(part.units)} un`}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="num block font-medium text-cost">{fmtBRL(cost.unit)}</span>
                      <span className={cx('block text-[12px]', selected ? 'text-muted' : 'text-faint')}>
                        por un
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {rows.length > 0 && (
        <dl className="shrink-0 border-t border-line px-4 py-3">
          <div className="flex items-baseline justify-between">
            <dt className="text-muted">Custo do lote</dt>
            <dd className="num text-[15px] font-semibold text-cost">{fmtBRL(totals.cost)}</dd>
          </div>
          <div className="num mt-0.5 text-[12px] text-faint">
            {rows.length} {rows.length === 1 ? 'peça' : 'peças'} · {fmtNum(totals.units)} un ·{' '}
            {fmtNum(totals.hours)} h · {fmtNum(totals.weight)} g
          </div>
        </dl>
      )}
    </aside>
  );
}
