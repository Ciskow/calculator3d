import { useState } from 'react';
import { activeProject, useStore } from './store.ts';
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);

  if (!data) return <LoadingShell />;

  const project = activeProject(data);
  const part = project.parts.find((p) => p.id === selPartId) ?? project.parts[0] ?? null;

  return (
    <div className="flex h-full flex-col">
      <TopBar
        state={data}
        project={project}
        onOpenSettings={() => setSettingsOpen(true)}
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

      <SettingsPanel state={data} open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <QuoteDialog state={data} project={project} open={quoteOpen} onClose={() => setQuoteOpen(false)} />
    </div>
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
