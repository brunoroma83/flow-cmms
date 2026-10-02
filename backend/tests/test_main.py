import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()

def test_import_structure():
    from app.core.config import settings
    from app.db.session import engine, Base
    from app.models import equipment, maintenance, inventory, user
    assert settings.PROJECT_NAME is not None
