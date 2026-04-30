"""Pomocný skript pro vytvoření prvního admin uživatele."""
from getpass import getpass
from werkzeug.security import generate_password_hash
from app import create_app, db
from models import User

app = create_app()
with app.app_context():
    db.create_all()

    username = input("Username: ").strip()
    email = input("Email: ").strip()
    password = getpass("Password: ")

    if User.query.filter_by(username=username).first():
        raise SystemExit(f"Uživatel '{username}' již existuje.")

    admin = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password),
        role="admin",
    )
    db.session.add(admin)
    db.session.commit()
    print(f"✅ Admin '{username}' byl vytvořen.")