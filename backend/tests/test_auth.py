import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.user import User
from app.auth.security import get_password_hash

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_user():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "testuser").first()
        if not user:
            user = User(
                username="testuser",
                email="testuser@flowcmms.com",
                hashed_password=get_password_hash("password123"),
                role="user",
                is_active=True
            )
            db.add(user)
            db.commit()
    finally:
        db.close()

def test_login_success():
    response = client.post(
        "/api/auth/token",
        json={"username": "testuser", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_invalid_password():
    response = client.post(
        "/api/auth/token",
        json={"username": "testuser", "password": "wrongpassword"}
    )
    assert response.status_code == 401

def test_get_current_user_me():
    # Login first
    login_resp = client.post(
        "/api/auth/token",
        json={"username": "testuser", "password": "password123"}
    )
    token = login_resp.json()["access_token"]

    # Access /me
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["username"] == "testuser"
    assert user_data["email"] == "testuser@flowcmms.com"
