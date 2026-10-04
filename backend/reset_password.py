#!/usr/bin/env python3
"""
CLI script to change or reset a user password (e.g., admin) in Flow CMMS.

Usage:
  1. Interactive mode:
     python backend/reset_password.py

  2. Command-line arguments mode:
     python backend/reset_password.py --username admin --password novasenha
     OR
     python backend/reset_password.py admin novasenha

  3. Inside Docker container:
     docker compose exec backend python backend/reset_password.py admin novasenha
"""

import sys
import argparse
import getpass
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.user import User
from app.auth.security import get_password_hash

def change_password(username: str, new_password: str):
    if not username or not username.strip():
        print("❌ Erro: O nome de usuário não pode estar em branco.")
        sys.exit(1)
        
    if not new_password or not new_password.strip():
        print("❌ Erro: A nova senha não pode estar em branco.")
        sys.exit(1)

    username = username.strip()
    new_password = new_password.strip()

    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        user = db.query(User).filter(User.username == username).first()
        hashed_pwd = get_password_hash(new_password)

        if user:
            user.hashed_password = hashed_pwd
            db.commit()
            print(f"✅ Senha do usuário '{username}' alterada com sucesso!")
        else:
            # Create user if it does not exist
            new_user = User(
                username=username,
                email=f"{username}@flowcmms.com",
                hashed_password=hashed_pwd,
                role="admin",
                is_active=True
            )
            db.add(new_user)
            db.commit()
            print(f"✅ Usuário '{username}' criado com a nova senha fornecida!")
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao atualizar senha no banco de dados: {e}")
        sys.exit(1)
    finally:
        db.close()

def main():
    parser = argparse.ArgumentParser(description="Altera a senha de um usuário no Flow CMMS.")
    parser.add_argument("pos_username", nargs="?", help="Nome de usuário (ex: admin)")
    parser.add_argument("pos_password", nargs="?", help="Nova senha")
    parser.add_argument("-u", "--username", dest="opt_username", help="Nome de usuário (ex: admin)")
    parser.add_argument("-p", "--password", dest="opt_password", help="Nova senha")

    args = parser.parse_args()

    username = args.opt_username or args.pos_username
    password = args.opt_password or args.pos_password

    # Interactive mode if arguments are missing
    if not username:
        try:
            username_input = input("Digite o nome de usuário [admin]: ").strip()
            username = username_input if username_input else "admin"
        except (KeyboardInterrupt, EOFError):
            print("\nOperação cancelada.")
            sys.exit(0)

    if not password:
        try:
            password = getpass.getpass(f"Digite a nova senha para '{username}': ").strip()
            if not password:
                print("❌ Senha vazia fornecida. Operação cancelada.")
                sys.exit(1)
            confirm_password = getpass.getpass("Confirme a nova senha: ").strip()
            if password != confirm_password:
                print("❌ As senhas digitadas não coincidem. Operação cancelada.")
                sys.exit(1)
        except (KeyboardInterrupt, EOFError):
            print("\nOperação cancelada.")
            sys.exit(0)

    change_password(username, password)

if __name__ == "__main__":
    main()
