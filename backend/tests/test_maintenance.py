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

def test_maintenance_enhancements_and_entries(auth_headers):
    unique_id = str(uuid.uuid4())[:8]

    # 1. Create test equipment
    eq_payload = {
        "name": f"Bomba de Infusão Conex {unique_id}",
        "serial_number": f"INF-{unique_id}",
        "anvisa_register": "1029384756",
        "equipment_type": "Bomba de Infusão",
        "manufacturer": "B. Braun",
        "model": "Space",
        "status": "active",
        "location": "UTI Neonatal",
        "category_id": 1
    }
    eq_resp = client.post("/api/equipment/", json=eq_payload, headers=auth_headers)
    assert eq_resp.status_code == 200
    eq_data = eq_resp.json()
    eq_id = eq_data["id"]

    # 2. Create OS with new fields
    start_time_iso = "2026-09-28T10:00:00Z"
    downtime_start_iso = "2026-09-28T09:30:00Z"

    os_data = {
        "equipment_id": eq_id,
        "type": "corrective",
        "description": "Bomba apresentando alarme de oclusão falso.",
        "opening_report": "Enfermeira da UTI relatou alarme E-04 recorrente.",
        "scheduled_date": "2026-09-28T00:00:00Z",
        "start_time": start_time_iso,
        "downtime_start": downtime_start_iso,
        "status": "in_progress",
        "technician": "Eng. Paulo",
        "cost": 150.00
    }

    response = client.post("/api/maintenance/", json=os_data, headers=auth_headers)
    assert response.status_code == 200, response.text
    m_data = response.json()
    m_id = m_data["id"]

    assert m_data["opening_report"] == "Enfermeira da UTI relatou alarme E-04 recorrente."
    assert m_data["status"] == "in_progress"

    # 3. Add 1:N technical entries (MaintenanceEntry)
    entry_1 = {
        "entry_type": "technical_assessment",
        "notes": "Sensor de pressão calibrado fora da tolerância.",
        "registered_by": "Eng. Paulo"
    }
    resp_entry1 = client.post(f"/api/maintenance/{m_id}/entries", json=entry_1, headers=auth_headers)
    assert resp_entry1.status_code == 200, resp_entry1.text
    e1_json = resp_entry1.json()
    assert e1_json["maintenance_id"] == m_id
    assert e1_json["entry_type"] == "technical_assessment"

    entry_2 = {
        "entry_type": "parts_used",
        "notes": "Substituída membrana de silicone do sensor de oclusão.",
        "registered_by": "Técnico Lucas"
    }
    resp_entry2 = client.post(f"/api/maintenance/{m_id}/entries", json=entry_2, headers=auth_headers)
    assert resp_entry2.status_code == 200

    # 4. Fetch entries for OS
    resp_entries = client.get(f"/api/maintenance/{m_id}/entries", headers=auth_headers)
    assert resp_entries.status_code == 200
    entries_list = resp_entries.json()
    assert len(entries_list) == 2

    # 5. Update OS to completed with completion_time and downtime_end
    update_payload = {
        "status": "completed",
        "completion_time": "2026-09-28T14:00:00Z",
        "downtime_end": "2026-09-28T13:45:00Z",
        "cost": 320.50
    }
    resp_update = client.put(f"/api/maintenance/{m_id}", json=update_payload, headers=auth_headers)
    assert resp_update.status_code == 200
    updated_data = resp_update.json()
    assert updated_data["status"] == "completed"
    assert updated_data["cost"] == 320.50
    assert updated_data["completion_time"] is not None
    assert updated_data["downtime_end"] is not None
