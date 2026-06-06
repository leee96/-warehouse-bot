# Deploy — SRK Host (Bot Hosting panel)

## Mit kell feltölteni

FTP/SFTP-vel vagy a panel fájlkezelőjével töltsd fel ezeket:

```
src/
prisma/
package.json
package-lock.json
.env.example        ← csak template, majd átnevezed .env-re
```

**Ne töltsd fel:**
- `node_modules/` — a panel telepíti (`npm install`)
- `tests/` — nem kell production-ban
- `deploy/` — csak helyi segédfájlok
- `.git/`, `vitest.config.js`, `eslint.config.js`, `.prettierrc`

---

## Panel beállítások

### Indító parancs
```
node src/index.js
```

### Környezeti változók (Environment Variables)
A panelen add meg ezeket (vagy töltsd fel a `.env` fájlt):

```
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id_here
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DATABASE
NODE_ENV=production
LOG_LEVEL=info
```

> A `DATABASE_URL`-t az SRK Host MySQL/MariaDB adatbázis adataiból állítsd össze.

---

## Első indítás előtt

Ha a panel SSH terminált vagy „Run command" funkciót nyújt, futtasd:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
node src/deploy-commands.js   # slash parancsok regisztrálása Discord-ra
```

Ha nincs terminál hozzáférés, kérd meg az SRK Host supportot hogy futtassák le, vagy nézd meg, van-e „Install dependencies" gomb a panelen.

---

## Frissítés

1. Töltsd fel az új fájlokat FTP-vel (felülírja a régieket)
2. Ha adatbázis változás volt: `npx prisma migrate deploy`
3. Panelen: **Restart bot**

---

## DB mentés

Ha a panel Cron Job funkciót támogat:
```
0 3 * * * bash ~/warehouse-bot/deploy/backup.sh
```

Vagy manuálisan SSH terminálból:
```bash
bash deploy/backup.sh
```
