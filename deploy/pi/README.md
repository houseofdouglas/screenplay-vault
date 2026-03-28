# Screenplay Vault — Raspberry Pi deployment

Runs the app as a single Node.js process on your local network.
No cloud, no Cognito, no nginx — just the Pi.

## How it works

The Pi server (`packages/backend/src/pi/server.ts`) starts the Hono API **and** serves the Vite-built frontend from a single port (default **8080**).

- `NODE_ENV=development` enables the auth bypass (`DEV_USER_ID` is trusted as-is).
- SQLite data is written to `./local-data/` inside the repo (relative to where you run the server — always run from the repo root).
- The frontend uses relative API paths (`/api/v1/…`), so everything works through the single origin.

---

## Prerequisites (on the Pi)

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 | `curl -fsSL https://deb.nodesource.com/setup_20.x \| sudo -E bash - && sudo apt-get install -y nodejs` |
| pnpm | ≥ 9 | `npm install -g pnpm` |
| git | any | pre-installed on Raspberry Pi OS |

---

## One-time setup

### 1 — Clone the repos

This project uses a pnpm workspace that includes a sibling package at `../../ulca`.
Both repos must live side-by-side:

```
~/
└── screenplay-vault-idea/    ← this repo
    └── ...
~/  (two levels up from screenplay-vault-idea/packages)
└── ulca/                     ← sibling repo required by pnpm-workspace.yaml
    └── ...
```

```bash
cd ~
git clone <your-screenplay-vault-idea-remote> screenplay-vault-idea
git clone <your-ulca-remote> ulca
```

If you are copying the repos from your Mac instead of cloning, mirror the same directory structure.

### 2 — Install dependencies

```bash
cd ~/screenplay-vault-idea
pnpm install
```

`pnpm install` will compile the `better-sqlite3` native addon for the Pi's ARM architecture automatically (this takes a few minutes on the first run).

### 3 — Configure the environment

```bash
cp deploy/pi/.env.example packages/backend/.env.pi
```

Edit `packages/backend/.env.pi`:

```dotenv
NODE_ENV=development
DEV_USER_ID=peter        # any stable string — this is your "user ID"
# PORT=8080              # uncomment to change the port
```

### 4 — Build everything

```bash
pnpm -r build
```

This runs `tsc` in each package and `vite build` for the frontend.
The Pi server entry point is compiled to `packages/backend/dist/pi/server.js`.

### 5 — Test it manually

```bash
node --env-file=packages/backend/.env.pi packages/backend/dist/pi/server.js
```

You should see:
```json
{"level":"info","message":"Pi server started","port":8080,"url":"http://localhost:8080"}
```

Open `http://<pi-ip>:8080` in your phone's browser.
Find the Pi's IP with: `hostname -I | awk '{print $1}'`

---

## Running as a systemd service (auto-start on boot)

### Install the service

```bash
sudo cp deploy/pi/screenplay-vault.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable screenplay-vault
sudo systemctl start screenplay-vault
```

### Check status / logs

```bash
sudo systemctl status screenplay-vault
sudo journalctl -u screenplay-vault -f        # live log tail
```

### Stop / restart

```bash
sudo systemctl stop screenplay-vault
sudo systemctl restart screenplay-vault
```

---

## Updating after code changes

Pull the latest code on the Pi, rebuild, and restart:

```bash
cd ~/screenplay-vault-idea
git pull
pnpm install          # only needed if package.json changed
pnpm -r build
sudo systemctl restart screenplay-vault
```

---

## Accessing from your phone

1. Make sure your phone is on the same Wi-Fi network as the Pi.
2. Find the Pi's local IP: `hostname -I | awk '{print $1}'` (e.g. `192.168.1.42`).
3. Navigate to `http://192.168.1.42:8080` in your phone's browser.
4. Optional: assign the Pi a static IP via your router's DHCP settings so the address never changes.

---

## Data location

All data is stored in `./local-data/` (relative to the repo root).
Back up this directory to preserve your ideas and projects.

```bash
# Quick backup to your Mac over SSH
scp -r pi:~/screenplay-vault-idea/local-data ./local-data-backup-$(date +%F)
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `DEV_USER_ID not set` error | `.env.pi` not found or missing variable | Check path: `packages/backend/.env.pi` |
| `Cannot find module '…/pi/server.js'` | Build not run | `pnpm -r build` |
| `better-sqlite3` binding error | Wrong arch binary | `pnpm install` to recompile |
| Port 8080 already in use | Another process | `PORT=8081 node --env-file=...` or `sudo lsof -i :8080` |
| Phone can't reach Pi | Different subnet | Check Wi-Fi on phone; check `ufw` firewall (`sudo ufw allow 8080`) |
