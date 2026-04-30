import os

# Základní konfigurace
bind = os.environ.get("GUNICORN_BIND", "0.0.0.0:" + str(os.environ.get("PORT", "5000")))

workers = int(os.environ.get("WEB_CONCURRENCY", "1"))
worker_class = os.environ.get("GUNICORN_WORKER_CLASS", "sync")
threads = int(os.environ.get("GUNICORN_THREADS", "2"))

# Timeouty
timeout = int(os.environ.get("GUNICORN_TIMEOUT", "120"))
keepalive = int(os.environ.get("GUNICORN_KEEPALIVE", "5"))

# Logging
accesslog = os.environ.get("GUNICORN_ACCESS_LOG", "-")
errorlog = os.environ.get("GUNICORN_ERROR_LOG", "-")
loglevel = os.environ.get("GUNICORN_LOG_LEVEL", "info")


# Bezpečnostní nastavení
limit_request_line = 4096
limit_request_fields = 100
limit_request_field_size = 8190
