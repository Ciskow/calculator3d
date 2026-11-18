import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  CloudOff,
  Copy,
  FileText,
  LoaderCircle,
  Plus,
  Settings,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import type { AppState, Project } from '../../shared/types.ts';
import {
  addProject,
  deleteProject,
  duplicateProject,
  patchProject,
  switchProject,
  useStore,
  type SyncStatus,
} from '../store.ts';
import { Button, IconButton, Labeled, cx } from './ui.tsx';

interface Props {
  state: AppState;
  project: Project;
  onOpenSettings: () => void;
  onOpenQuote: () => void;
}

export function TopBar({ state, project, onOpenSettings, onOpenQuote }: Props) {
  const status = useStore((s) => s.status);
  return (
    <header className="relative z-20 flex h-12 shrink-0 items-center gap-3 border-b border-line bg-panel px-3">
      <div className="flex items-center gap-2 pr-1">
        <img src="/favicon.svg" alt="" className="size-6" />
        <span className="font-semibold tracking-tight max-sm:hidden">Calculadora 3D</span>
      </div>

      <div className="h-5 w-px bg-line max-sm:hidden" />

      <ProjectMenu state={state} project={project} />

      <div className="ml-auto flex items-center gap-1.5">
        <SyncBadge status={status} />
        <Button
          icon={<FileText className="size-4" />}
          onClick={onOpenQuote}
          disabled={project.parts.length === 0}
          title={project.parts.length === 0 ? 'Adicione uma peça para gerar o orçamento' : undefined}
        >
          <span className="max-sm:hidden">Orçamento</span>
        </Button>
        <IconButton label="Configurações" variant="secondary" onClick={onOpenSettings}>
          <Settings className="size-4" />
        </IconButton>
      </div>
    </header>
  );
}

function SyncBadge({ status }: { status: SyncStatus }) {
  const map: Record<SyncStatus, { icon: React.ReactNode; text: string; tone: string; title: string }> = {
    loading: { icon: <LoaderCircle className="size-3.5 animate-spin" />, text: 'Carregando', tone: 'text-faint', title: '' },
    saving: { icon: <LoaderCircle className="size-3.5 animate-spin" />, text: 'Salvando', tone: 'text-faint', title: '' },
    saved: { icon: <Check className="size-3.5" />, text: 'Salvo', tone: 'text-faint', title: 'Alterações salvas no servidor' },
    error: {
      icon: <TriangleAlert className="size-3.5" />,
      text: 'Não salvou',
      tone: 'text-cost',
      title: 'Não foi possível salvar no servidor. Tentando de novo a cada 5 s; as alterações estão guardadas neste navegador.',
    },
    local: {
      icon: <CloudOff className="size-3.5" />,
      text: 'Só neste navegador',
      tone: 'text-cost',
      title: 'O servidor não respondeu ao abrir. As alterações ficam só neste navegador; recarregue a página quando o servidor voltar.',
    },
  };
  const s = map[status];
  return (
    <span
      role="status"
      title={s.title}
      className={cx('mr-1 inline-flex items-center gap-1.5 text-[12px]', s.tone)}
    >
      {s.icon}
      <span className="max-sm:hidden">{s.text}</span>
    </span>
  );
}

function ProjectMenu({ state, project }: { state: AppState; project: Project }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const single = state.projects.length <= 1;

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 max-w-[44vw] items-center gap-1.5 rounded-md px-2 text-[13px] transition-colors hover:bg-hover"
      >
        <span className="truncate font-medium">{project.name || 'Sem nome'}</span>
        <ChevronDown className="size-3.5 shrink-0 text-faint" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Projeto"
          className="absolute top-10 left-0 w-[320px] max-w-[calc(100vw-1.5rem)] rounded-lg border border-line bg-panel p-3 shadow-xl shadow-black/40"
        >
          <div className="grid gap-3">
            <Labeled label="Nome do projeto" htmlFor="proj-name">
              <input
                id="proj-name"
                className="field"
                value={project.name}
                onChange={(e) => patchProject({ name: e.target.value })}
              />
            </Labeled>
            <Labeled label="Cliente" htmlFor="proj-customer" hint="Aparece no orçamento.">
              <input
                id="proj-customer"
                className="field"
                placeholder="Opcional"
                value={project.customer}
                onChange={(e) => patchProject({ customer: e.target.value })}
              />
            </Labeled>
            <div className="flex gap-1.5">
              <Button className="flex-1" icon={<Copy className="size-3.5" />} onClick={duplicateProject}>
                Duplicar
              </Button>
              <Button
                variant="danger"
                icon={<Trash2 className="size-3.5" />}
                disabled={single}
                title={single ? 'É o único projeto' : undefined}
                onClick={() => {
                  if (confirm(`Excluir o projeto "${project.name}" e suas ${project.parts.length} peça(s)?`)) {
                    deleteProject();
                    setOpen(false);
                  }
                }}
              >
                Excluir
              </Button>
            </div>
          </div>

          <div className="-mx-3 mt-3 border-t border-line px-1.5 pt-1.5">
            <ul className="max-h-56 overflow-y-auto">
              {state.projects.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    aria-current={p.id === project.id ? 'true' : undefined}
                    onClick={() => {
                      switchProject(p.id);
                      setOpen(false);
                    }}
                    className={cx(
                      'flex h-8 w-full items-center gap-2 rounded-md px-2 text-left transition-colors hover:bg-hover',
                      p.id === project.id && 'bg-select hover:bg-select',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{p.name || 'Sem nome'}</span>
                    <span className="num text-[12px] text-faint">
                      {p.parts.length} {p.parts.length === 1 ? 'peça' : 'peças'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                addProject();
              }}
              className="mt-0.5 flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-primary transition-colors hover:bg-hover"
            >
              <Plus className="size-3.5" /> Novo projeto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
