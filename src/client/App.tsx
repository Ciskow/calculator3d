import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { calcPricing, partCost } from '../shared/calc.ts';
import type { AppState, Part, Project } from '../shared/types.ts';
import { activeProject, priceIdx, useStore } from './store.ts';
import { fmtBRL, fmtNum } from './format.ts';
import { UndoToast } from './components/UndoToast.tsx';
import { TopBar } from './components/TopBar.tsx';
import { PartsPane } from './components/PartsPane.tsx';
import { EditorPane } from './components/EditorPane.tsx';
import { PricingPane } from './components/PricingPane.tsx';
import { SettingsPanel } from './components/SettingsPanel.tsx';
import { QuoteDialog } from './components/QuoteDialog.tsx';
import { cx } from './components/ui.tsx';

type Tab = 'parts' | 'part' | 'pricing';
const TABS: { id: Tab; label: string }[] = [
  { id: 'parts', label: 'Peças' },
  { id: 'part', label: 'Custo' },
  { id: 'pricing', label: 'Preço' },
];

export function App() {
  const data = useStore((s) => s.data);
  const selPartId = useStore((s) => s.selPartId);
  const [tab, setTab] = useState<Tab>('parts');
  /** null = fechado; focus = campo a destacar ao abrir */
  const [settings, setSettings] = useState<{ focus: string | null } | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);

  if (!data) return <LoadingShell />;

  const project = activeProject(data);
  const part = project.parts.find((p) => p.id === selPartId) ?? project.parts[0] ?? null;

  return (
    <div className="flex h-full flex-col">
      <TopBar
        state={data}
        project={project}
        onOpenSettings={() => setSettings({ focus: null })}
        onOpenQuote={() => setQuoteOpen(true)}
      />

      {/* Abaixo de 768px os três painéis viram abas */}
      <nav aria-label="Seções" className="flex shrink-0 border-b border-line bg-panel md:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
            className={cx(
              'h-10 flex-1 border-b-2 text-[13px] transition-colors',
              tab === t.id
                ? 'border-primary font-semibold text-ink'
                : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="grid min-h-0 flex-1 md:grid-cols-[272px_minmax(0,1fr)] xl:grid-cols-[296px_minmax(0,1fr)]">
        <PartsPane
          state={data}
          project={project}
          selectedId={part?.id ?? null}
          onPicked={() => setTab('part')}
          className={cx(tab !== 'parts' && 'max-md:hidden')}
        />

        {/* 768–1279px: custo e preço rolam juntos; ≥1280px: lado a lado */}
        <div
          className={cx(
            'min-h-0 min-w-0 overflow-y-auto xl:grid xl:grid-cols-[minmax(0,1fr)_472px] xl:overflow-hidden',
            tab === 'parts' && 'max-md:hidden',
          )}
        >
          <EditorPane
            state={data}
            part={part}
            onOpenSettings={(focus) => setSettings({ focus })}
            className={cx('xl:overflow-y-auto', tab !== 'part' && 'max-md:hidden')}
          />
          <PricingPane
            state={data}
            project={project}
            part={part}
            className={cx('xl:overflow-y-auto', tab !== 'pricing' && 'max-md:hidden')}
          />
        </div>
      </main>

      {tab === 'part' && part && (
        <PriceSummaryBar state={data} project={project} part={part} onShowPricing={() => setTab('pricing')} />
      )}

      <SettingsPanel
        state={data}
        open={settings !== null}
        focusId={settings?.focus}
        onClose={() => setSettings(null)}
      />
      <QuoteDialog state={data} project={project} open={quoteOpen} onClose={() => setQuoteOpen(false)} />
      {/* Dentro de um <dialog> modal o resto da página fica inerte; o painel de configurações tem o seu. */}
      {!settings && !quoteOpen && (
        <UndoToast className={cx(tab === 'part' && part && 'max-md:bottom-16')} />
      )}
    </div>
  );
}

/** Abaixo de 768px custo e preço ficam em abas: esta barra mostra o preço sem trocar de aba. */
function PriceSummaryBar({
  state,
  project,
  part,
  onShowPricing,
}: {
  state: AppState;
  project: Project;
  part: Part;
  onShowPricing: () => void;
}) {
  const cost = partCost(state, part);
  const i = priceIdx(project);
  const mk = project.markups[i];
  if (mk === undefined) return null;
  const price = calcPricing(cost.unit, mk, state.rates).consumer;
  return (
    <button
      type="button"
      onClick={onShowPricing}
      aria-label={`Custo ${fmtBRL(cost.unit)}, preço ${fmtBRL(price)} com markup ${fmtNum(mk)}×. Ver preços`}
      className="flex h-12 shrink-0 items-center gap-3 border-t border-line bg-panel px-4 text-left md:hidden"
    >
      <span className="num text-[12px] text-muted">
        Custo <span className="text-cost">{fmtBRL(cost.unit)}</span>
      </span>
      <span className="num ml-auto text-[12px] text-muted">{fmtNum(mk)}×</span>
      <span className="num text-[15px] font-semibold">{fmtBRL(price)}</span>
      <ChevronRight className="size-4 text-faint" aria-hidden />
    </button>
  );
}

function LoadingShell() {
  const bar = 'animate-pulse rounded bg-raised';
  return (
    <div className="flex h-full flex-col" aria-busy="true" aria-label="Carregando">
      <div className="h-12 shrink-0 border-b border-line bg-panel" />
      <div className="grid min-h-0 flex-1 md:grid-cols-[272px_minmax(0,1fr)]">
        <div className="space-y-3 border-r border-line bg-panel p-4 max-md:hidden">
          <div className={cx(bar, 'h-8')} />
          <div className={cx(bar, 'h-12')} />
          <div className={cx(bar, 'h-12')} />
        </div>
        <div className="space-y-4 p-6">
          <div className={cx(bar, 'h-8 w-64')} />
          <div className={cx(bar, 'h-8 max-w-xl')} />
          <div className={cx(bar, 'h-40 max-w-xl')} />
        </div>
      </div>
    </div>
  );
}
