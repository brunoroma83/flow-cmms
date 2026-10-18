import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="module")
def client():
    return TestClient(app)

def test_requester_login_passwordless_auto_register(client):
    # 1. Login sem senha de novo solicitante na unidade 'matriz'
    username = "enfermeira_paula"
    res = client.post(
        "/api/auth/requester-login",
        headers={"X-Tenant-ID": "matriz"},
        json={
            "username": username,
            "sector": "UTI Neonatal",
            "contact": "Ramal 1024"
        }
    )
    assert res.status_code == 200, f"Requester login failed: {res.text}"
    data = res.json()
    assert "access_token" in data
    assert data["user"]["username"] == username
    assert data["user"]["role"] == "solicitante"
    assert data["user"]["sector"] == "UTI Neonatal"
    token = data["access_token"]

    # 2. Consultar catálogo de equipamentos como solicitante
    res_eq = client.get(
        "/api/equipment/",
        headers={"Authorization": f"Bearer {token}", "X-Tenant-ID": "matriz"}
    )
    assert res_eq.status_code == 200
    equipments = res_eq.json()
    assert len(equipments) > 0
    target_equipment = equipments[0]

    # 3. Abertura rápida de chamado pelo solicitante
    res_ticket = client.post(
        "/api/maintenance/requester-ticket",
        headers={"Authorization": f"Bearer {token}", "X-Tenant-ID": "matriz"},
        json={
            "equipment_id": target_equipment["id"],
            "description": "Monitor piscando tela e reiniciando sozinho.",
            "requester_name": username,
            "requester_sector": "UTI Neonatal Leito 02",
            "requester_contact": "Ramal 1024",
            "urgency": "critical"
        }
    )
    assert res_ticket.status_code == 200
    ticket_data = res_ticket.json()
    assert ticket_data["id"] > 0
    assert ticket_data["status"] == "pending"
    assert ticket_data["requester_name"] == username
    assert ticket_data["urgency"] == "critical"
    ticket_id = ticket_data["id"]

    # 4. Solicitante consulta suas próprias ordens de serviço
    res_my_orders = client.get(
        f"/api/maintenance/?requester_name={username}",
        headers={"Authorization": f"Bearer {token}", "X-Tenant-ID": "matriz"}
    )
    assert res_my_orders.status_code == 200
    my_orders = res_my_orders.json()
    assert len(my_orders) >= 1
    found = [o for o in my_orders if o["id"] == ticket_id]
    assert len(found) == 1
    assert found[0]["requester_name"] == username

    # 5. Outro solicitante não deve ver as ordens da enfermeira_paula
    res_other = client.get(
        "/api/maintenance/?requester_name=outro_solicitante_aleatorio",
        headers={"Authorization": f"Bearer {token}", "X-Tenant-ID": "matriz"}
    )
    assert res_other.status_code == 200
    assert len(res_other.json()) == 0

    # 6. Re-login do mesmo solicitante (usuário já existente)
    res_relogin = client.post(
        "/api/auth/requester-login",
        headers={"X-Tenant-ID": "matriz"},
        json={"username": username}
    )
    assert res_relogin.status_code == 200
    relogin_data = res_relogin.json()
    assert relogin_data["user"]["username"] == username
    assert relogin_data["user"]["role"] == "solicitante"

def test_requester_full_details_and_technician_visibility(client):
    # 1. Login sem senha fornecendo nome completo, setor e ramal
    res = client.post(
        "/api/auth/requester-login",
        headers={"X-Tenant-ID": "matriz"},
        json={
            "username": "dr_roberto",
            "full_name": "Dr. Roberto de Souza",
            "sector": "Centro Cirúrgico Bloco A",
            "contact": "Ramal 3055"
        }
    )
    assert res.status_code == 200
    user_data = res.json()["user"]
    assert user_data["full_name"] == "Dr. Roberto de Souza"
    assert user_data["sector"] == "Centro Cirúrgico Bloco A"
    assert user_data["phone_extension"] == "Ramal 3055"
    token = res.json()["access_token"]

    # 2. Obter equipamento
    res_eq = client.get(
        "/api/equipment/",
        headers={"Authorization": f"Bearer {token}", "X-Tenant-ID": "matriz"}
    )
    eq_id = res_eq.json()[0]["id"]

    # 3. Abertura do chamado
    res_ticket = client.post(
        "/api/maintenance/requester-ticket",
        headers={"Authorization": f"Bearer {token}", "X-Tenant-ID": "matriz"},
        json={
            "equipment_id": eq_id,
            "description": "Bisturi elétrico com falha intermitente na caneta.",
            "requester_name": "dr_roberto",
            "urgency": "high"
        }
    )
    assert res_ticket.status_code == 200
    ticket = res_ticket.json()
    assert "Dr. Roberto de Souza" in ticket["requester_name"]
    assert ticket["requester_sector"] == "Centro Cirúrgico Bloco A"
    assert ticket["requester_contact"] == "Ramal 3055"
    os_id = ticket["id"]

    # 4. Na visão do técnico (GET /api/maintenance/), a OS traz nome, setor e ramal
    res_maint = client.get(
        "/api/maintenance/",
        headers={"X-Tenant-ID": "matriz"}
    )
    assert res_maint.status_code == 200
    all_os = res_maint.json()
    target_os = next((o for o in all_os if o["id"] == os_id), None)
    assert target_os is not None
    assert "Dr. Roberto de Souza" in target_os["requester_name"]
    assert target_os["requester_sector"] == "Centro Cirúrgico Bloco A"
    assert target_os["requester_contact"] == "Ramal 3055"

    # 5. O solicitante consegue consultar suas ordens pelo seu username
    res_my = client.get(
        "/api/maintenance/?requester_name=dr_roberto",
        headers={"Authorization": f"Bearer {token}", "X-Tenant-ID": "matriz"}
    )
    assert res_my.status_code == 200
    my_list = res_my.json()
    assert any(o["id"] == os_id for o in my_list)

