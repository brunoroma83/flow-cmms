import os
import re
from typing import Dict
from urllib.parse import urlparse, urlunparse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from app.models.base import Base

class TenantDatabaseManager:
    """
    Manages dynamic database connections and engines per tenant.
    Provides cached connection pools and schema/table provisioning for new tenants.
    """
    _engines: Dict[str, any] = {}
    _sessionmakers: Dict[str, sessionmaker] = {}

    @classmethod
    def get_base_db_url(cls) -> str:
        return settings.DATABASE_URL

    @classmethod
    def get_tenant_db_url(cls, db_name: str) -> str:
        """
        Builds a connection URL for the tenant database replacing the dbname path.
        """
        parsed = urlparse(settings.DATABASE_URL)
        # replace path with /db_name
        new_path = f"/{db_name}"
        return urlunparse((parsed.scheme, parsed.netloc, new_path, parsed.params, parsed.query, parsed.fragment))

    @classmethod
    def get_engine(cls, db_name: str):
        if db_name not in cls._engines:
            tenant_url = cls.get_tenant_db_url(db_name)
            engine = create_engine(
                tenant_url,
                pool_pre_ping=True,
                pool_recycle=300
            )
            cls._engines[db_name] = engine
            cls._sessionmakers[db_name] = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        return cls._engines[db_name]

    @classmethod
    def get_session(cls, db_name: str) -> Session:
        if db_name not in cls._sessionmakers:
            cls.get_engine(db_name)
        return cls._sessionmakers[db_name]()

    @classmethod
    def sanitize_db_name(cls, slug: str) -> str:
        """
        Produces a safe postgres identifier: flow_cmms_tenant_<slug>
        """
        cleaned = re.sub(r'[^a-zA-Z0-9_]', '_', slug.lower().strip())
        return f"flow_cmms_tenant_{cleaned}"

    @classmethod
    def create_tenant_database(cls, db_name: str) -> bool:
        """
        Connects to the master/default database and executes CREATE DATABASE if not exists.
        """
        parsed = urlparse(settings.DATABASE_URL)
        # Connect to 'postgres' default database to execute CREATE DATABASE
        admin_url = urlunparse((parsed.scheme, parsed.netloc, "/postgres", parsed.params, parsed.query, parsed.fragment))
        admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")

        with admin_engine.connect() as conn:
            # Check if database exists
            res = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :dbname"),
                {"dbname": db_name}
            ).scalar()

            if not res:
                # PostgreSQL requires double quotes around identifier or valid alphanumeric name
                conn.execute(text(f'CREATE DATABASE "{db_name}" ENCODING "UTF8";'))
                # Grant privileges to the user if user is present
                if parsed.username:
                    try:
                        conn.execute(text(f'GRANT ALL PRIVILEGES ON DATABASE "{db_name}" TO "{parsed.username}";'))
                    except Exception:
                        pass
                return True
        return False

    @classmethod
    def drop_tenant_database(cls, db_name: str) -> bool:
        """
        Terminates connections and drops a tenant database.
        """
        # Close cached pool if present
        if db_name in cls._engines:
            cls._engines[db_name].dispose()
            del cls._engines[db_name]
            del cls._sessionmakers[db_name]

        parsed = urlparse(settings.DATABASE_URL)
        admin_url = urlunparse((parsed.scheme, parsed.netloc, "/postgres", parsed.params, parsed.query, parsed.fragment))
        admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")

        with admin_engine.connect() as conn:
            # Terminate active sessions
            conn.execute(
                text("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = :dbname AND pid <> pg_backend_pid()"),
                {"dbname": db_name}
            )
            conn.execute(text(f'DROP DATABASE IF EXISTS "{db_name}";'))
            return True

    @classmethod
    def provision_tenant_schema(cls, db_name: str):
        """
        Creates all tables on the newly created tenant database.
        """
        engine = cls.get_engine(db_name)
        # Import models so Base has all tenant table definitions
        from app.models import equipment, maintenance, user, report, inventory, traceability
        Base.metadata.create_all(bind=engine)
