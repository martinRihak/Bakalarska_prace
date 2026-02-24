# Backend Improvement Remediation Checklist

## 1) Security and Access Control (highest priority)
1. Externalize JWT secret and all security config to env (`JWT_SECRET`, cookie flags, CORS origins).  
Effort: **S**
2. Enforce secure refresh-token cookie in production (`Secure`, `HttpOnly`, `SameSite`, optional domain/path).  
Effort: **S**
3. Fix `login_required` API detection (do not rely on `/api/*`; return JSON 401 for API routes).  
Effort: **S**
4. Prevent `None` user crash in auth middleware (`setup_user_session`).  
Effort: **S**
5. Add auth guard to sensitive routes (for example `/modbus/getValue`, backup import).  
Effort: **S**
6. Add ownership checks everywhere IDs are accepted (`sensor_id`, `widget_id`, `dashboard_id`).  
Effort: **M**
7. Remove manual `user_id = count()+1`; rely on DB autoincrement.  
Effort: **S**

## 2) Data Model and Sensor Pipeline Correctness
1. Align `SensorService.create_sensor_from_form()` fields with `Sensor` model (remove nonexistent `register`, `description`, `is_virtual` or add migration if needed).  
Effort: **M**
2. Fix Modbus manager field mismatch (`register_address` vs `address`) and ensure `functioncode/scaling` are used correctly.  
Effort: **M**
3. Ensure sensor map is loaded at startup (or lazy-loaded) before reads.  
Effort: **S**
4. Fix `get_latest_data()` to support both live float read and DB object shape consistently.  
Effort: **M**
5. Fix `ModbusService.get_sensor_data()` double-read and response structure.  
Effort: **L**

## 3) API Contract and Architecture Cleanup
1. Standardize routes to REST naming (for example `/sensors/{id}/history`, `/dashboards/{id}/widgets`).  
Effort: **M**
2. Remove redirect/flash from backend API endpoints; return JSON only.  
Effort: **M**
3. Remove session-coupled dashboard selection (`session['dashboard_id']`) for stateless API behavior.  
Effort: **M**
4. Add consistent error format and status codes across all routes.  
Effort: **S**

## 4) Reliability and Operations
1. Replace `db.create_all()` with Alembic/Flask-Migrate migrations.  
Effort: **M**
2. Add graceful lifecycle hooks for Modbus background threads (startup/shutdown, no duplicates under Gunicorn workers).  
Effort: **M**
3. Add structured logging (request id, user id, sensor id, error category).  
Effort: **S**
4. Move hardcoded backup CSV path to config and protect endpoint (auth + role).  
Effort: **S**

## 5) Test Coverage (must-have before production)
1. Auth tests: login, refresh, invalid token, expired token, logout.  
Effort: **M**
2. Authorization tests: cross-user access attempts for dashboards/widgets/sensors.  
Effort: **M**
3. Sensor API tests: create/update/toggle/history/export edge cases.  
Effort: **M**
4. Modbus integration tests with mock/stub manager.  
Effort: **M**
5. Regression tests for known bugs (field mismatch, latest-data shape, unauthorized route behavior).  
Effort: **S**

## 6) Documentation and Runbook
1. Populate `README.md` with setup, env vars, DB migration commands, Gunicorn run command, and hardware assumptions (RS-485/tty settings).  
Effort: **S**
2. Add API reference (auth, sensors, dashboards, widgets, modbus, backup).  
Effort: **M**
3. Add operational runbook (healthcheck, logs, failure recovery, backup process).  
Effort: **S**

## Suggested Execution Plan
1. Week 1: Section 1 + critical items from Section 2.
2. Week 2: Section 3 + Section 4.
3. Week 3: Section 5 + Section 6.
