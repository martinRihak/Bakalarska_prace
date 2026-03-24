# Environment setup (`run.py`)

`run.py` now supports profile-based env loading so you can switch between development and production without editing code.

## Load order

At startup, values are merged in this order:

1. `.env`
2. `.env.<APP_ENV>`
3. `.env.local`
4. `.env.<APP_ENV>.local`

Rules:

- Later files override earlier files.
- Real shell environment variables override all `.env*` files.
- `APP_ENV` is normalized to `development` or `production` (anything else becomes `development`).

## How to switch profile

Use `APP_ENV` when starting the app:

```bash
APP_ENV=development uv run python run.py
APP_ENV=production uv run python run.py
```

For Gunicorn:

```bash
APP_ENV=production uv run gunicorn -c gunicorn_config.py wsgi:app
```

## Recommended files

- Copy [`.env.development.example`](/home/rih/HDD/workspaces/Projects/Bakalarska_prace/backend/.env.development.example) to `.env.development`
- Copy [`.env.production.example`](/home/rih/HDD/workspaces/Projects/Bakalarska_prace/backend/.env.production.example) to `.env.production`
- Keep secrets in `.env.local` or `.env.production.local` when possible
