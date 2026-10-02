import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_full_cmms_lifecycle():
    unique_id = str(uuid.uuid4())[:8]

    # 1. Login to get access token
    login_resp = client.post(
        "/api/auth/token",
        json={"username": "admin", "password": "admin123"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Register a new medical equipment
    equip_payload = {
        "name": f"Bomba de Infusão {unique_id}",
        "serial_number": f"INF-TEST-{unique_id}",
        "manufacturer": "B. Braun",
        "model": "Space",
        "status": "active",
        "location": "UTI Neonatal - Leito 02",
        "description": "Bomba de infusão peristáltica linear",
        "category_id": 1
    }
    equip_resp = client.post("/api/equipment/", json=equip_payload, headers=headers)
    assert equip_resp.status_code == 200
    equipment_data = equip_resp.json()
    equipment_id = equipment_data["id"]
    assert equipment_data["name"] == equip_payload["name"]
    assert equipment_data["serial_number"] == equip_payload["serial_number"]

    # 3. Create a maintenance work order for the equipment
    maint_payload = {
        "equipment_id": equipment_id,
        "type": "preventive",
        "description": "Inspeção anual de segurança elétrica e calibração de fluxo",
        "scheduled_date": "2026-10-01T00:00:00",
        "status": "pending",
        "technician": "Eng. Ana Souza",
        "cost": 350.0
    }
    maint_resp = client.post("/api/maintenance/", json=maint_payload, headers=headers)
    assert maint_resp.status_code == 200
    maint_data = maint_resp.json()
    assert maint_data["equipment_id"] == equipment_id
    assert maint_data["status"] == "pending"

    # 4. Create an inventory item
    inv_payload = {
        "name": f"Equipo Dedicado {unique_id}",
        "part_number": f"EQP-TEST-{unique_id}",
        "category": "Consumíveis de Infusão",
        "quantity": 20,
        "min_quantity": 5,
        "max_quantity": 50,
        "unit_price": 25.0,
        "supplier": "B. Braun Medical"
    }
    inv_resp = client.post("/api/inventory/", json=inv_payload, headers=headers)
    assert inv_resp.status_code == 200
    inv_data = inv_resp.json()
    inv_id = inv_data["id"]
    assert inv_data["quantity"] == 20

    # 5. Adjust stock quantity (-5 units used in maintenance)
    adjust_resp = client.post(
        f"/api/inventory/{inv_id}/adjust-stock",
        json={"adjustment_value": -5},
        headers=headers
    )
    assert adjust_resp.status_code == 200
    assert adjust_resp.json()["quantity"] == 15

    # 6. Check dashboard indicators reflecting live data
    dash_resp = client.get("/api/dashboard/indicators", headers=headers)
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()
    assert dash_data["total_equipment"] >= 1
    assert dash_data["total_maintenance"] >= 1
    assert "indicators" in dash_data
