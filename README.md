# calculator3d

Cost and pricing calculator for 3D prints (interface in Brazilian Portuguese). Enter print time, filament weight and accessories to get the cost per unit, consumer and reseller prices, and net profit after tax, card fee and ad cost.

**Stack:** React 18 + Vite + Tailwind on the client, Fastify on the server (Node 24 runs the `.ts` server files directly), zod, zustand, vitest.

## Requirements

- Node.js 24+ (the server is TypeScript run natively by Node)
- Or Docker

## Run locally (development)

```bash
git clone https://github.com/Ciskow/calculator3d.git
cd calculator3d
npm install
npm run dev
```

- Web: http://localhost:5380 (Vite, proxies `/api` to the API)
- API: http://localhost:8381
- Dev data is saved in `data/dev.json`.

Other scripts:

| Command | What it does |
| --- | --- |
| `npm test` | Run the vitest suite |
| `npm run typecheck` | Type-check with `tsc --noEmit` |
| `npm run build` | Build the client into `dist/client` |
| `npm start` | Run the production server (serves the built client) |

## Run with Docker

```bash
docker build -t calculator3d .
docker run -d --name calculator3d -p 8380:80 -v ./data:/data calculator3d
```

Open http://localhost:8380. Data is stored in `/data/db.json` inside the container (mount a volume to keep it).

### Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `80` in Docker, `8381` otherwise | HTTP port |
| `DATA_FILE_PATH` | `/data/db.json` in Docker, `data/dev.json` otherwise | JSON file with saved data |

### docker-compose

```yaml
calculator3d:
  build: ./calculator3d
  container_name: calculator3d
  restart: always
  ports:
    - "8380:80"
  volumes:
    - ./calculator3d/data:/data
```
