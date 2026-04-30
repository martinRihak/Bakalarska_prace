
# 🌡️IoT Sensor Dashboard - Bakalářská  práce 2026

Webová aplikace pro sběr, ukládání a vizualizaci dat ze senzorů 
připojených k Raspberry Pi přes sběrnici RS-485 (Modbus RTU).
 
[![Python](https://img.shields.io/badge/Python-3.13-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.1-black.svg?logo=flask)](https://flask.palletsprojects.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57.svg?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](#-licence)
 
---

**— V repozitáři se nachází i PDF verze mé bakalářské práce v souboru `Bakalarska_prace.pdf`**

## 📖 Popis projektu
 
Aplikace umožňuje **sběr, ukládání a vizualizaci dat** z libovolného počtu senzorů připojených k jednodeskovému počítači **Raspberry Pi** přes sběrnici **RS-485** (protokol **Modbus RTU**). Cílem je nahradit cloudová úložiště výrobců domácí automatizace plně **lokálním řešením**, které:
 
- 🔌 komunikuje s libovolnými senzory na základě jejich definovaných parametrů (adresa registru, funkční kód, baudrate, dělící konstanta),
- 💾 ukládá naměřené hodnoty do **SQLite** databáze (s mezipamětí pro snížení zátěže SD karty),
- 📊 zobrazuje data v **konfigurovatelném dashboardu** s přesouvatelnými widgety (drag & drop),
- 👥 podporuje **víceuživatelský provoz** s rolemi `user` / `admin` a JWT autentizací,
- 📤 umožňuje **export** dat do CSV / JSON a jejich zpětný **import**.
> 🎓 Tato aplikace je výstupem bakalářské práce na FEI VŠB-TUO. Vedoucí práce: Ing. Martin Radvanský.
 
---

 
## 🐳 Spuštění pomocí Dockeru (doporučeno)
 
Repozitář obsahuje skript `install.sh`, který automaticky:
1. zkontroluje a případně doinstaluje Docker,
2. vygeneruje `.env` a `docker-compose.yml`,
3. stáhne připravené image z Docker Hubu,
4. spustí kontejnery (na Raspberry Pi automaticky namapuje `/dev/ttyUSB0`).
### Rychlý start
 
```bash
git clone https://github.com/martinRihak/Bakalarska_prace.git
cd Bakalarska_prace
chmod +x install.sh
./install.sh
```
 
Po dokončení je aplikace dostupná na **http://\<ip-adresa\>:5173**.

---
## 💻 Lokální vývojové prostředí
 
### Backend (uv + Flask)
 
```bash
cd backend
 
# 1) Instalace závislostí (vytvoří .venv automaticky)
uv sync
 
# 2) Vytvoření .env 
cp .env.development.example .env.development
 
# 3) Spuštění vývojového serveru 
uv run python run.py
 
# Alternativně produkční režim s Gunicornem:
APP_ENV=production uv run gunicorn -c gunicorn_config.py wsgi:app
```
 
Backend běží na **http://localhost:5000**.
 
> 💡 `uv` je řádově rychlejší než `pip` a `venv`. Pokud nemáš `uv`, nainstaluj jej příkazem `pip install uv`.
 
### Frontend (npm + Vite + React)
 
```bash
cd frontend
 
# 1) Instalace závislostí
npm install
 
# 2) Spuštění vývojového serveru s HMR
npm run dev
 
# Build pro produkci:
npm run build       # výsledek v ./dist
npm run preview     # náhled produkčního buildu
```
 
Frontend běží na **http://localhost:5173** a očekává backend na `http://localhost:5000`.
 
## 👤 Vytvoření admin uživatele
 
V adresáři `backend/utils` spusť:
 
```bash
cd backend/utils
uv run python create_admin.py

```

### V Dockeru
 
```bash
docker compose exec backend/utils uv run python create_admin.py
```
## Konfigurace (.env)

| Proměnná | Výchozí | Popis |
|----------|---------|-------|
| `SECRET_KEY` | — | JWT signing key |
| `DB` | `sqlite:///app.db` | Databáze URI |
| `USB_PORT` | `/dev/ttyUSB0` | RS-485 sériový port |
| `CORS_ORIGINS` | `http://localhost:5173` | Povolené origins |
| `APP_ENV` | `development` | Profil prostředí |

```bash
# Generování SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"
```
 
## 🩹 Řešení potíží
 
<details>
<summary><strong>❌ Backend hlásí <code>Permission denied: '/dev/ttyUSB0'</code></strong></summary>
Tvůj uživatel není v skupině `dialout`. Přidej ho:
 
```bash
sudo usermod -aG dialout $USER
# odhlas se a znovu přihlas
```
 
V Dockeru zkontroluj, že `docker-compose.yml` mapuje zařízení:
 
```yaml
devices:
  - "/dev/ttyUSB0:/dev/ttyUSB0"
```
</details>
<details>
<summary><strong>❌ Port 5000 nebo 5173 už je obsazen</strong></summary>

```bash
sudo lsof -i :5000        # zjisti, kdo port drží
sudo kill -9 <PID>        # ukonči proces
```
nebo přemapuj port v docker-compose.yml: "8080:5173"
</details>
<details>
<summary><strong>❌ <code>uv: command not found</code></strong></summary>

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
# nebo
pip install uv
```
</details>
<details>
<summary><strong>❌ Frontend hlásí <code>Network Error</code> / přesměrovává na <code>/server-error</code></strong></summary>
Backend neběží nebo není dostupný. Zkontroluj:
 
```bash
curl http://localhost:5000/auth/status   # mělo by vrátit 401, ne connection refused
docker compose logs backend              # zkontroluj logy
```
</details>
<details>
<summary><strong>❌ Senzor vrací <code>None</code> / chybu čtení</strong></summary>

- Ověř baudrate v nastavení senzoru — různé senzory mohou mít odlišný (typicky 9600 nebo 4800).
- Zkontroluj zapojení A/B vodičů (záměna je nejčastější chyba).
- Spusť diagnostické čtení přímo: `uv run python -c "import minimalmodbus; ..."`.
</details>

---