import { create } from 'zustand';
import { defaultState, migrateLegacy, newId, newPart, newProject } from '../shared/defaults.ts';
import {
  AppStateSchema,
  type Accessory,
  type AppState,
  type Material,
  type Part,
  type Printer,
  type Project,
  type Rates,
  type StateResponse,
} from '../shared/types.ts';

/**
 * loading: buscando do servidor
 * saved / saving / error: sincronizado com o servidor
 * local: o servidor não respondeu ao abrir; os dados ficam só neste navegador
 *        e nada é enviado, para não sobrescrever o que está salvo lá.
 */
export type SyncStatus = 'loading' | 'saved' | 'saving' | 'error' | 'local';

interface Store {
  data: AppState | null;
  status: SyncStatus;
  selPartId: string | null;
}

const CACHE_KEY = 'calc3d.v2';
const LEGACY_KEY = 'calc3d';

export const useStore = create<Store>(() => ({ data: null, status: 'loading', selPartId: null }));

function readLocal(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function localFallback(): AppState {
  const cached = AppStateSchema.safeParse(readLocal(CACHE_KEY));
  if (cached.success) return cached.data;
  return migrateLegacy(readLocal(LEGACY_KEY)) ?? defaultState();
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let saving = false;
let dirty = false;

async function push() {
  if (saving) {
    dirty = true;
    return;
  }
  const { data } = useStore.getState();
  if (!data) return;
  saving = true;
  dirty = false;
  try {
    const res = await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    saving = false;
    if (dirty) return void push();
    useStore.setState({ status: 'saved' });
  } catch {
    saving = false;
    useStore.setState({ status: 'error' });
    clearTimeout(saveTimer);
    saveTimer = setTimeout(push, 5000);
  }
}

function scheduleSave() {
  const { data, status } = useStore.getState();
  if (!data) return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* armazenamento indisponível: segue só com o servidor */
  }
  if (status === 'local') return;
  useStore.setState({ status: 'saving' });
  clearTimeout(saveTimer);
  saveTimer = setTimeout(push, 400);
}

export async function loadState() {
  try {
    const res = await fetch('/api/state');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as StateResponse;
    if (body.state) {
      const parsed = AppStateSchema.parse(body.state);
      useStore.setState({ data: parsed, status: 'saved' });
      return;
    }
    // Servidor vazio (primeiro uso): sobe o que houver neste navegador.
    useStore.setState({ data: localFallback(), status: 'saved' });
    scheduleSave();
  } catch {
    useStore.setState({ data: localFallback(), status: 'local' });
  }
}

/** Envia ao servidor qualquer alteração pendente antes de fechar a aba. */
export function flushOnExit() {
  const { data, status } = useStore.getState();
  if (!data || status !== 'saving') return;
  clearTimeout(saveTimer);
  void fetch('/api/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    keepalive: true,
  });
}

// ---------- mutações ----------

function mutate(fn: (s: AppState) => AppState) {
  const { data } = useStore.getState();
  if (!data) return;
  useStore.setState({ data: fn(data) });
  scheduleSave();
}

function mutateProject(fn: (p: Project) => Project) {
  mutate((s) => ({
    ...s,
    projects: s.projects.map((p) => (p.id === s.activeProjectId ? fn(p) : p)),
  }));
}

export function activeProject(s: AppState): Project {
  return s.projects.find((p) => p.id === s.activeProjectId) ?? s.projects[0];
}

export const selectPart = (id: string) => useStore.setState({ selPartId: id });

// projetos
export function switchProject(id: string) {
  mutate((s) => ({ ...s, activeProjectId: id }));
  useStore.setState({ selPartId: null });
}
export function addProject() {
  const project = newProject();
  mutate((s) => ({ ...s, projects: [...s.projects, project], activeProjectId: project.id }));
  useStore.setState({ selPartId: null });
}
export function duplicateProject() {
  mutate((s) => {
    const src = activeProject(s);
    const copy: Project = {
      ...src,
      id: newId(),
      name: `${src.name} (cópia)`,
      parts: src.parts.map((p) => ({
        ...p,
        id: newId(),
        acc: p.acc.map((a) => ({ ...a, id: newId() })),
      })),
    };
    return { ...s, projects: [...s.projects, copy], activeProjectId: copy.id };
  });
  useStore.setState({ selPartId: null });
}
export function deleteProject() {
  mutate((s) => {
    if (s.projects.length <= 1) return s;
    const projects = s.projects.filter((p) => p.id !== s.activeProjectId);
    return { ...s, projects, activeProjectId: projects[0].id };
  });
  useStore.setState({ selPartId: null });
}
export const patchProject = (patch: Partial<Pick<Project, 'name' | 'customer'>>) =>
  mutateProject((p) => ({ ...p, ...patch }));

// markups
export const setMarkup = (i: number, v: number) =>
  mutateProject((p) => ({ ...p, markups: p.markups.map((m, j) => (j === i ? v : m)) }));
export const addMarkup = () =>
  mutateProject((p) => ({
    ...p,
    markups: [...p.markups, Math.round(((p.markups.at(-1) ?? 1.5) + 0.5) * 100) / 100],
  }));
export const removeMarkup = (i: number) =>
  mutateProject((p) => ({ ...p, markups: p.markups.filter((_, j) => j !== i) }));

// peças
export function addPart() {
  const part = newPart();
  mutateProject((p) => ({ ...p, parts: [...p.parts, part] }));
  useStore.setState({ selPartId: part.id });
  return part.id;
}
export function duplicatePart(id: string) {
  const copyId = newId();
  mutateProject((p) => {
    const i = p.parts.findIndex((x) => x.id === id);
    if (i < 0) return p;
    const src = p.parts[i];
    const copy: Part = {
      ...src,
      id: copyId,
      name: `${src.name} (cópia)`,
      acc: src.acc.map((a) => ({ ...a, id: newId() })),
    };
    return { ...p, parts: [...p.parts.slice(0, i + 1), copy, ...p.parts.slice(i + 1)] };
  });
  useStore.setState({ selPartId: copyId });
}
export function deletePart(id: string) {
  const { data } = useStore.getState();
  if (!data) return;
  const parts = activeProject(data).parts;
  const i = parts.findIndex((x) => x.id === id);
  const neighbour = parts[i + 1] ?? parts[i - 1];
  mutateProject((p) => ({ ...p, parts: p.parts.filter((x) => x.id !== id) }));
  useStore.setState({ selPartId: neighbour?.id ?? null });
}
export const patchPart = (id: string, patch: Partial<Omit<Part, 'id' | 'acc'>>) =>
  mutateProject((p) => ({
    ...p,
    parts: p.parts.map((x) => (x.id === id ? { ...x, ...patch } : x)),
  }));

// acessórios
const mapAcc = (partId: string, fn: (acc: Accessory[]) => Accessory[]) =>
  mutateProject((p) => ({
    ...p,
    parts: p.parts.map((x) => (x.id === partId ? { ...x, acc: fn(x.acc) } : x)),
  }));
export const addAccessory = (partId: string) =>
  mapAcc(partId, (acc) => [...acc, { id: newId(), name: '', qty: 1, cost: 0 }]);
export const patchAccessory = (partId: string, id: string, patch: Partial<Omit<Accessory, 'id'>>) =>
  mapAcc(partId, (acc) => acc.map((a) => (a.id === id ? { ...a, ...patch } : a)));
export const removeAccessory = (partId: string, id: string) =>
  mapAcc(partId, (acc) => acc.filter((a) => a.id !== id));

// configurações
export const patchRates = (patch: Partial<Rates>) =>
  mutate((s) => ({ ...s, rates: { ...s.rates, ...patch } }));

export const addMaterial = () =>
  mutate((s) => ({
    ...s,
    materials: [...s.materials, { id: newId(), name: 'Novo material', pricePerKg: 120 }],
  }));
export const patchMaterial = (id: string, patch: Partial<Omit<Material, 'id'>>) =>
  mutate((s) => ({
    ...s,
    materials: s.materials.map((m) => (m.id === id ? { ...m, ...patch } : m)),
  }));
export const removeMaterial = (id: string) =>
  mutate((s) => (s.materials.length <= 1 ? s : { ...s, materials: s.materials.filter((m) => m.id !== id) }));

export const addPrinter = () =>
  mutate((s) => ({
    ...s,
    printers: [
      ...s.printers,
      { id: newId(), name: 'Nova impressora', power: 360, value: 5000, lifeHours: 20000 },
    ],
  }));
export const patchPrinter = (id: string, patch: Partial<Omit<Printer, 'id'>>) =>
  mutate((s) => ({
    ...s,
    printers: s.printers.map((m) => (m.id === id ? { ...m, ...patch } : m)),
  }));
export const removePrinter = (id: string) =>
  mutate((s) => (s.printers.length <= 1 ? s : { ...s, printers: s.printers.filter((m) => m.id !== id) }));
