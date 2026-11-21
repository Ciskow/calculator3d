import { useEffect, useRef } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { dismissUndo, undo, useStore } from '../store.ts';
import { cx } from './ui.tsx';

const VISIBLE_MS = 8000;

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');

/**
 * Aviso de exclusão com "Desfazer". Some sozinho após alguns segundos (o
 * tempo para enquanto o ponteiro ou o foco estiver nele) e também responde
 * a Ctrl+Z quando o foco não está num campo de texto.
 *
 * Renderize um por camada visível: dentro de um <dialog> modal o resto da
 * página fica inerte, então o painel de configurações tem o seu próprio.
 */
export function UndoToast({ className }: { className?: string }) {
  const entry = useStore((s) => s.undo);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const stop = () => clearTimeout(timer.current);
  const start = () => {
    stop();
    timer.current = setTimeout(dismissUndo, VISIBLE_MS);
  };

  useEffect(() => {
    if (!entry) return;
    start();
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !isTyping(e.target)) {
        e.preventDefault();
        undo();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      stop();
      document.removeEventListener('keydown', onKey);
    };
  }, [entry?.id]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        'pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4',
        className,
      )}
    >
      {entry && (
        <div
          key={entry.id}
          onPointerEnter={stop}
          onPointerLeave={start}
          onFocus={stop}
          onBlur={start}
          className="toast-in pointer-events-auto flex h-10 items-center gap-1 rounded-lg border border-line-strong bg-raised pr-1 pl-3.5 shadow-xl shadow-black/40"
        >
          <span className="mr-2">{entry.label}</span>
          <button
            type="button"
            onClick={undo}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 font-semibold text-primary transition-colors hover:bg-hover"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Desfazer
          </button>
          <button
            type="button"
            aria-label="Fechar aviso"
            onClick={dismissUndo}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
