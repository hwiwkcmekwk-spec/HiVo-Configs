# HiVo Configs

**Intelligent Telegram Config Engine**

HiVo Configs is a production-grade Telegram automation system that monitors
source channels you already have authorized access to, detects proxy/network
configs (VLESS, VMess, Trojan, Shadowsocks, ShadowsocksR) inside incoming
messages, validates and deduplicates them, tags them with offline GeoIP data,
and republishes each config as its own clean, copy-friendly message in a
destination channel.

> This system only operates on Telegram resources your own account is
> already authorized to access. It is not designed to bypass access
> restrictions or facilitate unauthorized access.

---

## Features

- Real-time source channel monitoring via Telegram MTProto (your user account)
- Plugin-based protocol parser: VLESS, VMess, Trojan, Shadowsocks, ShadowsocksR
  (+ generic fallback for unknown schemes)
- Extracts multiple independent configs out of a single long message
- Structural validation before publishing
- Fingerprint-based duplicate detection (identity-based, not text-based)
- Offline GeoIP tagging (country / region / city) — never fabricates data
- One config = one destination message, rate-limited publish queue
- Full Telegram-native admin panel (Sources, Destinations, Settings,
  Dashboard, Logs)
- SQLite storage today, designed to migrate to PostgreSQL later
- Runs on Railway, Docker, or Android/Termux

---

## Architecture

```
Source Channel → New Message → Detector → Parser → Validator → GeoIP
   → Fingerprint/Dedup → Publish Queue → Formatter → Destination Channel
   → Publish History → Statistics
```

See `src/` for the full modular breakdown: `telegram/`, `parser/`,
`detector/`, `validator/`, `deduplication/`, `geoip/`, `publisher/`,
`queue/`, `admin/`, `database/`, `logger/`, `config/`, `utils/`.

---

## Requirements

- Node.js 18+
- A Telegram **user account** with access to the source channels
  (`TELEGRAM_API_ID` / `TELEGRAM_API_HASH` from https://my.telegram.org)
- A Telegram **bot** for the admin panel (create one with @BotFather)
- (Optional but recommended) a free MaxMind GeoLite2-City `.mmdb` file for
  GeoIP lookups

---

## Local Setup

```bash
git clone <your-repo-url> hivo-configs
cd hivo-configs
npm install
cp .env.example .env
```

Fill in `.env`:

```
TELEGRAM_API_ID=...
TELEGRAM_API_HASH=...
BOT_TOKEN=...
ADMIN_IDS=123456789
```

### First login (one-time)

The very first time, you need to authorize the user account:

```bash
npm run build
node dist/telegram/auth.js
```

Follow the prompts (phone number, login code, 2FA password if enabled).
At the end it prints a `TELEGRAM_SESSION` string — copy it into your `.env`
so you never have to log in again.

### Run

```bash
npm run build
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

### Run tests

```bash
npm test
```

---

## Telegram API Setup

1. Go to https://my.telegram.org → **API Development Tools**.
2. Create an app, copy `api_id` and `api_hash` into `.env`.
3. Create a bot via [@BotFather](https://t.me/BotFather), copy the token
   into `BOT_TOKEN`.
4. Get your numeric Telegram user ID (e.g. via [@userinfobot](https://t.me/userinfobot))
   and put it in `ADMIN_IDS` (comma-separated for multiple admins).

## Admin Setup

Once the bot is running, open a chat with your bot and send `/start`.
Only IDs listed in `ADMIN_IDS` will get a response — everyone else is
silently ignored. From the main menu you can add Sources, add a
Destination, and adjust Settings before anything gets published.

---

## Environment Variables

See `.env.example` for the full list with comments. Never commit a real
`.env` file — it's already covered by `.gitignore`.

---

## Database

SQLite by default (`better-sqlite3`), file path controlled by
`DATABASE_PATH`. Schema lives in `src/database/migrations/*.sql` and is
applied automatically and idempotently on every boot. The repository
layer (`src/database/repositories/`) is the only code that talks to SQL,
so migrating to PostgreSQL later means swapping that layer's
implementation, not rewriting business logic.

---

## Android / Termux

```bash
pkg update && pkg upgrade
pkg install nodejs git python make clang
git clone <your-repo-url> hivo-configs
cd hivo-configs
npm install
cp .env.example .env
# edit .env with nano/vim
npm run build
node dist/telegram/auth.js   # first-time login only
npm start
```

`better-sqlite3` compiles a native module — the `python make clang`
packages above are required for that build step on Termux.

---

## Railway Deployment

1. Push this repository to GitHub.
2. Create a new Railway project from that repo (Railway will detect the
   `Dockerfile` automatically, or use the included `railway.json`).
3. Add all variables from `.env.example` under **Variables**.
4. **Attach a Volume** mounted at `/app/data` — this is required. Railway's
   filesystem is not guaranteed to persist across deploys, and both the
   SQLite database and (if used) the GeoIP `.mmdb` file live under `data/`.
   Losing the DB means losing your sources/destinations/history; losing the
   session means logging in again.
5. Set `DATABASE_PATH=/app/data/hivo-configs.db` and
   `GEOIP_DB_PATH=/app/data/GeoLite2-City.mmdb` to point inside that volume.
6. Deploy. Railway will use the health check at `/health` to confirm the
   service is alive.

For the very first login on Railway, it's easiest to generate
`TELEGRAM_SESSION` locally (see "First login" above) and paste the
resulting string into Railway's environment variables — the interactive
login prompt has nowhere to run on a headless server.

---

## Security

- All secrets are read from environment variables only — never hardcoded,
  never logged (the logger redacts session/token/hash fields and scrubs
  bot-token-shaped strings from any log message).
- Only numeric IDs listed in `ADMIN_IDS` can use the admin bot; every
  other update is silently dropped.
- GeoIP never fabricates missing fields — it shows only what the offline
  database actually returns.
- One malformed message or config can never crash the whole pipeline —
  every processing stage is wrapped and isolated.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Bot doesn't respond to `/start` | Your Telegram ID isn't in `ADMIN_IDS` |
| "Missing required environment variable" on boot | Check `.env` against `.env.example` |
| Source shows `ERROR` status | The user account no longer has access to that chat, or the channel was deleted/renamed — use "Test" in the Sources menu |
| GeoIP always empty | `GEOIP_DB_PATH` doesn't point to a valid `.mmdb` file — GeoIP silently disables itself if the file is missing rather than crashing |
| Configs not publishing | Make sure a Destination is added **and** set as default, and that the bot account is an admin in that destination chat |
| `better-sqlite3` fails to build on Termux | Make sure `python`, `make`, and `clang` are installed before `npm install` |

---

## License

Private project — add your preferred license here before publishing.
