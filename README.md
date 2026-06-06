# warehouse-bot

Discord raktárkezelő bot — fegyverek és felszerelések nyilvántartása.

## Telepítés

### 1. Függőségek

```bash
npm install
```

### 2. Konfiguráció

```bash
cp .env.example .env
```

Töltsd ki a `.env` fájlt:

| Változó | Leírás |
|---|---|
| `DISCORD_TOKEN` | Bot token a Discord Developer Portalról |
| `CLIENT_ID` | Application ID a Developer Portalról |
| `GUILD_ID` | Szerver ID (dev-deploy-hoz; hagyj üresen globális deploy-hoz) |
| `DATABASE_URL` | PostgreSQL connection string |

### 3. Adatbázis

```bash
# Első migráció
npx prisma migrate dev --name init

# Prisma client generálás
npx prisma generate
```

### 4. Slash parancsok deploy

```bash
# Guild deploy (azonnal érvényes, fejlesztéshez)
npm run deploy

# Globális deploy (akár 1 óra propagáció, productionhoz)
# Töröld a GUILD_ID-t a .env-ből, majd:
npm run deploy
```

### 5. Bot indítása

```bash
npm start
# vagy fejlesztői módban (hot-reload):
npm run dev
```

---

## Discord szerver beállítása

Az első indítás után egy adminisztrátor fusson le:

```
/admin setup role    — Fegyverkezelő role beállítása
/admin setup logchannel — Audit log csatorna beállítása
```

---

## Parancsok

### `/targy` — Tárgykatalógus

| Parancs | Leírás | Jogosultság |
|---|---|---|
| `/targy add` | Új tárgy rögzítése | Armorer |
| `/targy edit` | Tárgy adatainak szerkesztése | Armorer |
| `/targy remove` | Tárgy archiválása | Armorer |
| `/targy info` | Tárgy részletei + aktív kiadások | Mindenki |
| `/targy list` | Teljes lista (kategória szűrővel) | Mindenki |
| `/targy search` | Keresés névtöredékre | Mindenki |

### `/keszlet` — Készletmozgás

| Parancs | Leírás | Jogosultság |
|---|---|---|
| `/keszlet in` | Beérkezés rögzítése | Armorer |
| `/keszlet out` | Kimenet rögzítése | Armorer |
| `/keszlet adjust` | Manuális kiigazítás | Armorer |

### `/kiadas` — Egyéni kiadás

| Parancs | Leírás | Jogosultság |
|---|---|---|
| `/kiadas new` | Tárgy kiadása felhasználónak | Armorer |
| `/kiadas return` | Kiadott tárgy visszavétele | Armorer |
| `/kiadas list` | Aktív kiadások listája | Armorer |
| `/kiadas my` | Saját kiadásaim | Mindenki |

### `/admin` — Adminisztráció

| Parancs | Leírás | Jogosultság |
|---|---|---|
| `/admin setup role` | Armorer role beállítása | Admin |
| `/admin setup logchannel` | Log csatorna beállítása | Admin |
| `/admin log` | Legutóbbi audit log bejegyzések | Armorer |
| `/admin lowstock` | Alacsony készletű tárgyak | Armorer |

---

## Production (Hetzner VPS)

```bash
# Deploy
git pull
npm ci
npx prisma migrate deploy
npm run deploy   # globális slash parancsok

# Systemd service: /etc/systemd/system/warehouse-bot.service
# Lásd: systemd.service.example
```

### systemd service example

```ini
[Unit]
Description=Warehouse Discord Bot
After=network.target

[Service]
Type=simple
User=warehousebot
WorkingDirectory=/opt/warehouse-bot
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=5
EnvironmentFile=/opt/warehouse-bot/.env

[Install]
WantedBy=multi-user.target
```
