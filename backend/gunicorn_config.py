import multiprocessing
import os

# Základní konfigurace
bind = os.environ.get("GUNICORN_BIND", "0.0.0.0:" + str(os.environ.get("PORT", "5000")))
default_workers = multiprocessing.cpu_count() * 2 + 1
workers = int(os.environ.get("WEB_CONCURRENCY", default_workers))
worker_class = os.environ.get("GUNICORN_WORKER_CLASS", "sync")
threads = int(os.environ.get("GUNICORN_THREADS", "2"))

# Timeouty
timeout = int(os.environ.get("GUNICORN_TIMEOUT", "120"))
keepalive = int(os.environ.get("GUNICORN_KEEPALIVE", "5"))

# Logging
accesslog = os.environ.get("GUNICORN_ACCESS_LOG", "-")
errorlog = os.environ.get("GUNICORN_ERROR_LOG", "-")
loglevel = os.environ.get("GUNICORN_LOG_LEVEL", "info")

# SSL (odkomentujte a nastavte cesty k certifikátům pro HTTPS)
# keyfile = "path/to/keyfile"
# certfile = "path/to/certfile"

# Bezpečnostní nastavení
limit_request_line = 4096
limit_request_fields = 100
limit_request_field_size = 8190
