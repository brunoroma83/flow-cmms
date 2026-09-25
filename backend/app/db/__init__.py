# Database initialization and setup

from .session import engine, Base
from ..models import asset, maintenance, inventory, user

def init_db():
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    print("Database initialized successfully")