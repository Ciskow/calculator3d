import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { AppStateSchema, type StateResponse } from '../shared/types.ts';

const ROOT = path.resolve(import.meta.dirname, '../..');
// Em desenvolvimento (--dev) a porta é fixa: o Vite fica na frente e encaminha /api para cá.
const DEV_PORT = 8381;
const PORT = process.argv.includes('--dev') ? DEV_PORT : Number(process.env.PORT ?? DEV_PORT);
const DATA_FILE = process.env.DATA_FILE_PATH ?? path.join(ROOT, 'data', 'dev.json');
const CLIENT_DIR = path.join(ROOT, 'dist', 'client');

const app = Fastify({ logger: { level: 'warn' }, bodyLimit: 5 * 1024 * 1024 });

async function readState(): Promise<StateResponse['state']> {
  let text: string;
  try {
    text = await readFile(DATA_FILE, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
  // Um arquivo corrompido deve falhar alto, não ser tratado como "vazio":
  // senão o cliente gravaria o estado padrão por cima dos dados.
  return AppStateSchema.parse(JSON.parse(text));
}

// Grava em arquivo temporário e renomeia, para nunca deixar um JSON pela metade.
let writing: Promise<void> = Promise.resolve();
function writeState(state: unknown): Promise<void> {
  const next = writing.then(async () => {
    await mkdir(path.dirname(DATA_FILE), { recursive: true });
    const tmp = DATA_FILE + '.tmp';
    await writeFile(tmp, JSON.stringify(state, null, 2), 'utf8');
    await rename(tmp, DATA_FILE);
  });
  writing = next.catch(() => {});
  return next;
}

app.get('/api/state', async (): Promise<StateResponse> => ({ state: await readState() }));

app.put('/api/state', async (req, reply) => {
  const parsed = AppStateSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Estado inválido', issues: parsed.error.issues });
  }
  await writeState(parsed.data);
  return { ok: true };
});

if (existsSync(CLIENT_DIR)) {
  await app.register(fastifyStatic, { root: CLIENT_DIR });
} else {
  app.get('/', async () => 'API da Calculadora 3D. Rode "npm run build" para servir o cliente.');
}

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Calculadora 3D em http://localhost:${PORT} (dados: ${DATA_FILE})`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
