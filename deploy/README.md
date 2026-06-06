# Deploy útmutató

## Fájlok

| Fájl | Cél |
|---|---|
| `warehouse-bot.service` | systemd service unit |
| `setup.sh` | Első telepítés (root) |
| `deploy.sh` | Kód frissítés (warehousebot user) |
| `backup.sh` | MariaDB napi mentés |
| `logrotate.conf` | Log rotáció |
| `sudoers.conf` | Jelszómentes systemctl jogok |

---

## Első telepítés

```bash
# 1. Kód feltöltése a szerverre
rsync -av --exclude=node_modules --exclude=.env \
  ./warehouse-bot/ root@YOUR_VPS_IP:/opt/warehouse-bot/

# 2. Setup futtatása root-ként
ssh root@YOUR_VPS_IP
bash /opt/warehouse-bot/deploy/setup.sh

# 3. .env kitöltése (a setup kiírja a DB jelszót)
nano /opt/warehouse-bot/.env

# 4. Bot indítása
systemctl start warehouse-bot
journalctl -u warehouse-bot -f
```

---

## Frissítés (CI/CD vagy manuális)

```bash
ssh warehousebot@YOUR_VPS_IP
cd /opt/warehouse-bot
bash deploy/deploy.sh
```

---

## Hasznos parancsok

```bash
# Logok élőben
journalctl -u warehouse-bot -f

# Utolsó 100 sor
journalctl -u warehouse-bot -n 100 --no-pager

# Service állapot
systemctl status warehouse-bot

# Manuális backup
bash /opt/warehouse-bot/deploy/backup.sh

# Slash parancsok újratelepítése
sudo -u warehousebot bash -c 'cd /opt/warehouse-bot && node src/deploy-commands.js'
```

---

## Cron / automatizmus

| Mi | Hol | Mikor |
|---|---|---|
| DB backup | `/etc/cron.daily/warehouse-bot-backup` | Minden nap (3:00 körül) |
| Log rotáció | `/etc/logrotate.d/warehouse-bot` | Napi, 14 nap megőrzés |

---

## Rollback

```bash
cd /opt/warehouse-bot
git log --oneline -10          # melyik commitig kell visszamenni
git checkout <commit-hash>
npm ci --omit=dev
npx prisma generate
sudo systemctl restart warehouse-bot
```
