import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture
def auth_headers():
    response = client.post(
        "/api/auth/token",
        json={"username": "admin", "password": "admin123"}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_equipment_anvisa_type_and_soft_delete(auth_headers):
    unique_id = str(uuid.uuid4())[:8]

    # 1. Create equipment with ANVISA register and Equipment Type
    payload = {
        "name": f"Raio-X Digital Movimento {unique_id}",
        "serial_number": f"RX-DIG-{unique_id}",
        "anvisa_register": "80099887766",
        "equipment_type": "Diagnóstico por Imagem",
        "manufacturer": "Siemens Healthineers",
        "model": "Mobilett Elara Max",
        "status": "active",
        "location": "Centro Cirúrgico - Sala 01",
        "description": "Sistema móvel de radiografia digital",
        "category_id": 1
    }

    create_resp = client.post("/api/equipment/", json=payload, headers=auth_headers)
    assert create_resp.status_code == 200
    eq_data = create_resp.json()
    eq_id = eq_data["id"]
    assert eq_data["anvisa_register"] == "80099887766"
    assert eq_data["equipment_type"] == "Diagnóstico por Imagem"
    assert eq_data["is_deleted"] is False

    # 2. Verify it appears in active equipment list
    list_resp = client.get("/api/equipment/", headers=auth_headers)
    assert list_resp.status_code == 200
    active_items = list_resp.json()
    assert any(item["id"] == eq_id for item in active_items)

    # 3. Soft delete the equipment
    del_resp = client.delete(f"/api/equipment/{eq_id}", headers=auth_headers)
    assert del_resp.status_code == 200
    assert "soft delete" in del_resp.json()["message"]

    # 4. Verify soft deleted item is no longer returned in default active equipment list
    list_resp_after = client.get("/api/equipment/", headers=auth_headers)
    assert list_resp_after.status_code == 200
    active_items_after = list_resp_after.json()
    assert not any(item["id"] == eq_id for item in active_items_after)

    # 5. Verify item can still be queried with include_deleted=True for audit purposes
    audit_resp = client.get("/api/equipment/?include_deleted=true", headers=auth_headers)
    assert audit_resp.status_code == 200
    audit_items = audit_resp.json()
    soft_deleted_item = next((item for item in audit_items if item["id"] == eq_id), None)
    assert soft_deleted_item is not None
    assert soft_deleted_item["is_deleted"] is True
