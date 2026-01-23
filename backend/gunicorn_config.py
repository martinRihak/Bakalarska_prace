import multiprocessing
import os

# Základní konfigurace
bind = "0.0.0.0:" + str(os.environ.get("PORT", "5000"))
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
threads = 2

# Timeouty
timeout = 120
keepalive = 5

# Logging
accesslog = "access.log"
errorlog = "error.log"
loglevel = "info"

# SSL (odkomentujte a nastavte cesty k certifikátům pro HTTPS)
# keyfile = "path/to/keyfile"
# certfile = "path/to/certfile"

# Bezpečnostní nastavení
limit_request_line = 4096
limit_request_fields = 100
limit_request_field_size = 8190
