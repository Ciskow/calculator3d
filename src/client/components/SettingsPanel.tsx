import { useEffect, useRef, type ReactNode } from 'react';
import { Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { DEFAULT_RATES } from '../../shared/defaults.ts';
import type { AppState, Rates } from '../../shared/types.ts';
import {
  addMaterial,
  addPrinter,
  patchMaterial,
  patchPrinter,
  patchRates,
  removeMaterial,
  removePrinter,
  resetRates,
} from '../store.ts';
import { Button, IconButton, Labeled, NumberField } from './ui.tsx';
import { UndoToast } from './UndoToast.tsx';

interface Props {
  state: AppState;
  open: boolean;
  /** id do campo que recebe o foco ao abrir (ex.: "rate-fixedMonth") */
  focusId?: string | null;
  onClose: () => void;
}

/** Liga um <dialog> nativo a um estado `open` do React. */
export function useDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return ref;
}

export function SettingsPanel({ state, open, focusId, onClose }: Props) {
  const ref = useDialog(open);
  const r = state.rates;

  useEffect(() => {
    if (!open || !focusId) return;
    const el = document.getElementById(focusId);
    el?.scrollIntoView({ block: 'center' });
    el?.focus();
  }, [open, focusId]);

  const rate = (key: keyof Rates, label: string, opts: { suffix?: string; prefix?: string; step?: number; max?: number; hint?: string } = {}) => (
    <Labeled label={label} htmlFor={`rate-${key}`} hint={opts.hint}>
      <NumberField
        id={`rate-${key}`}
        label={label}
        value={r[key]}
        step={opts.step ?? 1}
        max={opts.max}
        prefix={opts.prefix}
        suffix={opts.suffix}
        onChange={(v) => patchRates({ [key]: v })}
      />
    </Labeled>
  );

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="settings-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex h-full flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-line pr-2 pl-5">
          <h2 id="settings-title" className="text-[15px] font-semibold">Configurações</h2>
          <IconButton label="Fechar" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          <Group
            title="Materiais"
            note="Cada peça escolhe um material; o preço por quilo entra na matéria-prima."
            action={<Button variant="ghost" icon={<Plus className="size-4" />} onClick={addMaterial}>Material</Button>}
          >
            <ul className="grid gap-1.5">
              {state.materials.map((m) => (
                <li key={m.id} className="flex items-center gap-1.5">
                  <input
                    aria-label="Nome do material"
                    className="field flex-1"
                    value={m.name}
                    onChange={(e) => patchMaterial(m.id, { name: e.target.value })}
                  />
                  <NumberField
                    label={`Preço por quilo de ${m.name}`}
                    className="w-32 shrink-0"
                    prefix="R$"
                    suffix="/kg"
                    value={m.pricePerKg}
                    onChange={(pricePerKg) => patchMaterial(m.id, { pricePerKg })}
                  />
                  <IconButton
                    label={state.materials.length <= 1 ? 'É o único material' : `Remover ${m.name}`}
                    disabled={state.materials.length <= 1}
                    onClick={() => removeMaterial(m.id)}
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                </li>
              ))}
            </ul>
          </Group>

          <Group
            title="Impressoras"
            note="Potência entra na energia; valor e vida útil entram na amortização."
            action={<Button variant="ghost" icon={<Plus className="size-4" />} onClick={addPrinter}>Impressora</Button>}
          >
            <ul className="grid gap-4">
              {state.printers.map((p) => (
                <li key={p.id} className="grid gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      aria-label="Nome da impressora"
                      className="field flex-1"
                      value={p.name}
                      onChange={(e) => patchPrinter(p.id, { name: e.target.value })}
                    />
                    <IconButton
                      label={state.printers.length <= 1 ? 'É a única impressora' : `Remover ${p.name}`}
                      disabled={state.printers.length <= 1}
                      onClick={() => removePrinter(p.id)}
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 pr-[38px]">
                    <Labeled label="Potência">
                      <NumberField label={`Potência de ${p.name}`} suffix="W" step={10} value={p.power} onChange={(power) => patchPrinter(p.id, { power })} />
                    </Labeled>
                    <Labeled label="Valor">
                      <NumberField id={`printer-${p.id}`} label={`Valor de ${p.name}`} prefix="R$" step={100} value={p.value} onChange={(value) => patchPrinter(p.id, { value })} />
                    </Labeled>
                    <Labeled label="Vida útil">
                      <NumberField label={`Vida útil de ${p.name}`} suffix="h" step={1000} value={p.lifeHours} onChange={(lifeHours) => patchPrinter(p.id, { lifeHours })} />
                    </Labeled>
                  </div>
                </li>
              ))}
            </ul>
          </Group>

          <Group title="Energia" note="Energia = potência × tempo × fator de uso × custo do kWh.">
            <div className="grid grid-cols-2 gap-3">
              {rate('kwh', 'Custo do kWh', { prefix: 'R$', step: 0.01 })}
              {rate('duty', 'Fator de uso', { step: 0.05, max: 1, hint: 'De 0 a 1. Parcela do tempo em potência cheia.' })}
            </div>
          </Group>

          <Group title="Custos fixos e falhas" note="O custo fixo mensal é dividido pelas unidades produzidas no mês e somado a cada peça.">
            <div className="grid grid-cols-3 gap-3">
              {rate('fixedMonth', 'Custo fixo mensal', { prefix: 'R$', step: 10 })}
              {rate('unitsMonth', 'Unidades por mês', { suffix: 'un' })}
              {rate('failPct', 'Falhas', { suffix: '%', max: 100 })}
            </div>
          </Group>

          <Group title="Taxas sobre a venda" note="Descontadas do lucro bruto para chegar ao lucro líquido.">
            <div className="grid grid-cols-3 gap-3">
              {rate('taxPct', 'Imposto', { suffix: '%', max: 100 })}
              {rate('cardPct', 'Cartão', { suffix: '%', max: 100 })}
              {rate('adPct', 'Anúncio', { suffix: '%', max: 100 })}
            </div>
          </Group>

          <div className="mt-8 border-t border-line pt-4">
            <Button
              icon={<RotateCcw className="size-3.5" />}
              onClick={() => resetRates(DEFAULT_RATES)}
            >
              Restaurar taxas padrão
            </Button>
            <p className="mt-1.5 text-[12px] text-faint">Energia, custos fixos, falhas e taxas. Materiais e impressoras não mudam.</p>
          </div>
        </div>
      </div>
      {open && <UndoToast className="left-auto! w-[min(460px,100vw)]" />}
    </dialog>
  );
}

function Group({ title, note, action, children }: { title: string; note?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-6">
      <div className="flex min-h-8 items-center justify-between gap-2">
        <h3 className="text-[14px] font-semibold">{title}</h3>
        {action}
      </div>
      {note && <p className="mb-2.5 text-[12px] text-faint">{note}</p>}
      {children}
    </section>
  );
}
