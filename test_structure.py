#!/usr/bin/env python3
"""
Test script to verify the project structure is working correctly
"""

import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_imports():
    """Test that all key modules can be imported"""
    try:
        from app.main import app
        print("✓ Main application imported successfully")
        
        from app.core.config import settings
        print("✓ Configuration imported successfully")
        
        from app.db.session import engine, Base
        print("✓ Database session imported successfully")
        
        from app.models import asset, maintenance, inventory, user
        print("✓ Models imported successfully")
        
        from app.schemas.asset import Asset
        print("✓ Schemas imported successfully")
        
        from app.api.endpoints.assets import router as assets_router
        print("✓ API endpoints imported successfully")
        
        print("\nAll imports successful! Project structure is working correctly.")
        return True
        
    except Exception as e:
        print(f"✗ Error importing modules: {e}")
        return False

if __name__ == "__main__":
    success = test_imports()
    sys.exit(0 if success else 1)