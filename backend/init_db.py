#!/usr/bin/env python3
"""
Script to initialize the database with sample data
"""

import os
import sys
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from app.core.config import settings
from app.db.session import Base
from app.models import asset, maintenance, inventory, user

def init_db():
    # Create engine and tables
    engine = create_engine(settings.DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    
    print("Database initialized successfully")
    return engine

if __name__ == "__main__":
    init_db()