import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { calcPricing, partCost } from '../../shared/calc.ts';
import type { AppState, Project } from '../../shared/types.ts';
import { fmtBRL, fmtNum } from '../format.ts';
import { patchProject } from '../store.ts';
import { Button, IconButton, Labeled } from './ui.tsx';
import { useDialog } from './SettingsPanel.tsx';

interface Props {
  state: AppState;
  project: Project;
  open: boolean;
  onClose: () => void;
}

const cents = (v: number) => Math.round(v * 100) / 100;

export function QuoteDialog({ state, project, open, onClose }: Props) {
  const ref = useDialog(open);
  const [markupIdx, setMarkupIdx] = useState(0);
  const [kind, setKind] = useState<'consumer' | 'lojista'>('consumer');

  const idx = Math.min(markupIdx, project.markups.length - 1);
  const markup = project.markups[idx] ?? 1;

  const items = project.parts.map((part) => {
    const pr = calcPricing(partCost(state, part).unit, markup, state.rates);
    // Arredonda o preço unitário antes de multiplicar, para a soma no papel fechar.
    const unit = cents(kind === 'consumer' ? pr.consumer : pr.lojista);
    return { id: part.id, name: part.name || 'Sem nome', units: part.units, unit, total: cents(unit * part.units) };
  });
  const total = items.reduce((s, i) => s + i.total, 0);
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  // Fora de #root: na impressão o app some e só a folha fica.
  return createPortal(
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="quote-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="no-print flex h-12 items-center justify-between border-b border-line pr-2 pl-5">
        <h2 id="quote-title" className="text-[15px] font-semibold">Orçamento</h2>
        <IconButton label="Fechar" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </div>

      <div className="no-print grid grid-cols-2 gap-3 px-5 pt-4 sm:grid-cols-[1fr_140px_150px]">
        <Labeled label="Cliente" htmlFor="q-customer" className="max-sm:col-span-2">
          <input
            id="q-customer"
            className="field"
            placeholder="Opcional"
            value={project.customer}
            onChange={(e) => patchProject({ customer: e.target.value })}
          />
        </Labeled>
        <Labeled label="Markup" htmlFor="q-markup">
          <select id="q-markup" className="field" value={idx} onChange={(e) => setMarkupIdx(Number(e.target.value))}>
            {project.markups.map((m, i) => (
              <option key={i} value={i}>{fmtNum(m)}×</option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Tabela de preço" htmlFor="q-kind">
          <select id="q-kind" className="field" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="consumer">Consumidor</option>
            <option value="lojista">Lojista</option>
          </select>
        </Labeled>
      </div>

      <div className="p-5">
        <div className="quote-sheet rounded-md p-8 text-[13px]">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-[22px] font-semibold tracking-tight">Orçamento</div>
              <div className="mt-0.5 text-[#4a4f5a]">{project.name}</div>
            </div>
            <div className="text-right text-[#4a4f5a]">
              <div>{today}</div>
              {project.customer.trim() && (
                <div className="mt-0.5 text-[#16181d]">Cliente: <strong>{project.customer.trim()}</strong></div>
              )}
            </div>
          </div>

          <table className="mt-7 w-full">
            <thead>
              <tr className="border-b border-[#16181d] text-left text-[12px] text-[#4a4f5a]">
                <th className="pb-1.5 font-medium">Item</th>
                <th className="w-16 pb-1.5 text-right font-medium">Qtd</th>
                <th className="w-28 pb-1.5 text-right font-medium">Preço un.</th>
                <th className="w-28 pb-1.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b border-[#d9dce3]">
                  <td className="py-2">{i.name}</td>
                  <td className="num py-2 text-right">{fmtNum(i.units)}</td>
                  <td className="num py-2 text-right">{fmtBRL(i.unit)}</td>
                  <td className="num py-2 text-right">{fmtBRL(i.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-3 text-right font-semibold">Total</td>
                <td className="num pt-3 text-right text-[16px] font-semibold">{fmtBRL(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="no-print flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button onClick={onClose}>Fechar</Button>
        <Button variant="primary" icon={<Printer className="size-4" />} onClick={() => window.print()}>
          Imprimir ou salvar PDF
        </Button>
      </div>
    </dialog>,
    document.body,
  );
}
