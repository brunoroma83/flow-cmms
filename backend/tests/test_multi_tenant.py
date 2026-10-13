import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal, get_master_db
from app.models.master import ManagerUser, Tenant
from app.models.equipment import Equipment
from app.auth.security import get_password_hash
from app.db.tenant_manager import TenantDatabaseManager

@pytest.fixture(scope="module")
def client():
    return TestClient(app)

@pytest.fixture(scope="module")
def superadmin_token(client):
    res = client.post(
        "/api/manager/auth/token",
        json={"username": "superadmin", "password": "superadmin123"}
    )
    assert res.status_code == 200, f"Superadmin login failed: {res.text}"
    return res.json()["access_token"]

def test_manager_login_and_me(client, superadmin_token):
    res = client.get(
        "/api/manager/auth/me",
        headers={"Authorization": f"Bearer {superadmin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "superadmin"
    assert data["role"] == "superadmin"

def test_superadmin_can_list_tenants(client, superadmin_token):
    res = client.get(
        "/api/manager/tenants",
        headers={"Authorization": f"Bearer {superadmin_token}"}
    )
    assert res.status_code == 200
    tenants = res.json()
    slugs = [t["slug"] for t in tenants]
    assert "matriz" in slugs

def test_tenant_creation_provisions_isolated_database_and_admin(client, superadmin_token):
    slug = "test_hospital_clinica"
    name = "Clínica Teste Isolada"

    # Ensure clean state in case leftover
    db = SessionLocal()
    existing = db.query(Tenant).filter(Tenant.slug == slug).first()
    if existing:
        client.delete(
            f"/api/manager/tenants/{existing.id}?drop_database=true",
            headers={"Authorization": f"Bearer {superadmin_token}"}
        )
    db.close()

    # Create new Tenant
    res = client.post(
        "/api/manager/tenants",
        headers={"Authorization": f"Bearer {superadmin_token}"},
        json={
            "name": name,
            "slug": slug,
            "description": "Hospital com banco dedicado",
            "initial_admin_username": "admin_clinica",
            "initial_admin_password": "senha_clinica_123"
        }
    )
    assert res.status_code == 201, f"Create tenant failed: {res.text}"
    tenant_data = res.json()
    assert tenant_data["slug"] == slug
    assert tenant_data["db_name"] == f"flow_cmms_tenant_{slug}"

    # Verify that connecting with X-Tenant-ID header targets this isolated database
    # 1. Login with tenant specific admin credentials on this tenant
    res_login = client.post(
        "/api/auth/token",
        headers={"X-Tenant-ID": slug},
        json={"username": "admin_clinica", "password": "senha_clinica_123"}
    )
    assert res_login.status_code == 200, f"Tenant admin login failed: {res_login.text}"
    tenant_token = res_login.json()["access_token"]

    # 2. In this isolated database, equipment table starts empty
    res_eq = client.get(
        "/api/equipment/",
        headers={
            "X-Tenant-ID": slug,
            "Authorization": f"Bearer {tenant_token}"
        }
    )
    assert res_eq.status_code == 200
    assert len(res_eq.json()) == 0

    # 3. Add an equipment inside this tenant DB
    res_new_eq = client.post(
        "/api/equipment/",
        headers={
            "X-Tenant-ID": slug,
            "Authorization": f"Bearer {tenant_token}"
        },
        json={
            "name": "Eletrocardiógrafo Portátil Clínica",
            "equipment_type": "Diagnóstico",
            "serial_number": "ECG-CLINICA-001",
            "category_id": 1,
            "status": "active"
        }
    )
    assert res_new_eq.status_code == 200

    # 4. Query Matriz default DB - must NOT contain this equipment!
    res_matriz_eq = client.get(
        "/api/equipment/",
        headers={"X-Tenant-ID": "matriz"}
    )
    assert res_matriz_eq.status_code == 200
    matriz_items = res_matriz_eq.json()
    matriz_names = [e["name"] for e in matriz_items]
    assert "Eletrocardiógrafo Portátil Clínica" not in matriz_names, "Data leakage between tenant databases!"

    # 5. Clean up: Delete tenant and its physical database
    del_res = client.delete(
        f"/api/manager/tenants/{tenant_data['id']}?drop_database=true",
        headers={"Authorization": f"Bearer {superadmin_token}"}
    )
    assert del_res.status_code == 200

def test_rbac_manager_sees_only_assigned_tenants(client, superadmin_token):
    # Ensure clean state for test manager
    db = SessionLocal()
    old_u = db.query(ManagerUser).filter(ManagerUser.username == "gestor_restrito").first()
    if old_u:
        db.delete(old_u)
        db.commit()
    db.close()

    # 1. Create a tenant for testing
    res_t = client.post(
        "/api/manager/tenants",
        headers={"Authorization": f"Bearer {superadmin_token}"},
        json={"name": "Hospital Privado Beta", "slug": "hospital_beta"}
    )
    assert res_t.status_code in [201, 400]
    db = SessionLocal()
    tenant_beta = db.query(Tenant).filter(Tenant.slug == "hospital_beta").first()
    db.close()


    # 2. Create a manager user without access to Beta
    user_res = client.post(
        "/api/manager/users",
        headers={"Authorization": f"Bearer {superadmin_token}"},
        json={
            "username": "gestor_restrito",
            "email": "gestor@flowcmms.com",
            "password": "gestorpass123",
            "role": "manager",
            "assigned_tenant_ids": []
        }
    )
    assert user_res.status_code in [201, 400]

    # 3. Login as this restricted manager
    login_res = client.post(
        "/api/manager/auth/token",
        json={"username": "gestor_restrito", "password": "gestorpass123"}
    )
    assert login_res.status_code == 200
    gestor_token = login_res.json()["access_token"]

    # 4. List tenants: gestor_restrito must see 0 tenants
    list_res = client.get(
        "/api/manager/tenants",
        headers={"Authorization": f"Bearer {gestor_token}"}
    )
    assert list_res.status_code == 200
    assert len(list_res.json()) == 0

    # 5. Assign hospital_beta to gestor_restrito
    update_res = client.put(
        f"/api/manager/users/{user_res.json()['id'] if user_res.status_code == 201 else login_res.json()['user']['id']}",
        headers={"Authorization": f"Bearer {superadmin_token}"},
        json={"assigned_tenant_ids": [tenant_beta.id]}
    )
    assert update_res.status_code == 200

    # 6. List tenants again: now gestor_restrito sees only hospital_beta
    list_res2 = client.get(
        "/api/manager/tenants",
        headers={"Authorization": f"Bearer {gestor_token}"}
    )
    assert list_res2.status_code == 200
    tenants = list_res2.json()
    assert len(tenants) == 1
    assert tenants[0]["slug"] == "hospital_beta"

    # Clean up test tenant
    client.delete(
        f"/api/manager/tenants/{tenant_beta.id}?drop_database=true",
        headers={"Authorization": f"Bearer {superadmin_token}"}
    )

def test_unit_manager_can_create_client_users_and_client_logs_in(client, superadmin_token):
    slug = "hospital_santa_maria"
    # 1. Create a tenant
    res_t = client.post(
        "/api/manager/tenants",
        headers={"Authorization": f"Bearer {superadmin_token}"},
        json={
            "name": "Hospital Santa Maria",
            "slug": slug,
            "description": "Unidade de teste para gestor criar usuarios"
        }
    )
    assert res_t.status_code == 201
    tenant_id = res_t.json()["id"]

    # 2. Gestor creates a technician user for this tenant
    res_u = client.post(
        f"/api/manager/tenants/{tenant_id}/users",
        headers={"Authorization": f"Bearer {superadmin_token}"},
        json={
            "username": "tecnico_joao",
            "email": "joao@santamaria.com",
            "password": "senha_do_joao_123",
            "role": "technician"
        }
    )
    assert res_u.status_code == 201
    assert res_u.json()["username"] == "tecnico_joao"

    # 3. List users for this tenant
    res_list = client.get(
        f"/api/manager/tenants/{tenant_id}/users",
        headers={"Authorization": f"Bearer {superadmin_token}"}
    )
    assert res_list.status_code == 200
    usernames = [u["username"] for u in res_list.json()]
    assert "tecnico_joao" in usernames

    # 4. Now user 'tecnico_joao' logs in directly via tenant portal with header X-Tenant-ID
    res_client_login = client.post(
        "/api/auth/token",
        headers={"X-Tenant-ID": slug},
        json={"username": "tecnico_joao", "password": "senha_do_joao_123"}
    )
    assert res_client_login.status_code == 200
    user_token = res_client_login.json()["access_token"]
    assert user_token is not None

    # 5. Access /api/auth/me with tenant token
    res_me = client.get(
        "/api/auth/me",
        headers={
            "X-Tenant-ID": slug,
            "Authorization": f"Bearer {user_token}"
        }
    )
    assert res_me.status_code == 200
    assert res_me.json()["username"] == "tecnico_joao"
    assert res_me.json()["role"] == "technician"

    # 6. Verify static routes: /gerenciador and /
    res_mgr_route = client.get("/gerenciador")
    assert res_mgr_route.status_code == 200
    assert "Gerenciador Central de Unidades" in res_mgr_route.text

    res_root_route = client.get("/")
    assert res_root_route.status_code == 200

    # Clean up
    client.delete(
        f"/api/manager/tenants/{tenant_id}?drop_database=true",
        headers={"Authorization": f"Bearer {superadmin_token}"}
    )

def test_manager_and_superadmin_can_change_own_password(client, superadmin_token):
    # 1. Create a test manager
    res_m = client.post(
        "/api/manager/users",
        headers={"Authorization": f"Bearer {superadmin_token}"},
        json={
            "username": "gestor_senha_teste",
            "email": "senha_teste@flowcmms.com",
            "password": "senha_inicial_123",
            "role": "manager"
        }
    )
    assert res_m.status_code == 201
    mgr_id = res_m.json()["id"]

    # 2. Login as the manager
    res_l1 = client.post(
        "/api/manager/auth/token",
        json={"username": "gestor_senha_teste", "password": "senha_inicial_123"}
    )
    assert res_l1.status_code == 200
    mgr_token = res_l1.json()["access_token"]

    # 3. Manager changes own password
    res_ch = client.post(
        "/api/manager/auth/change-password",
        headers={"Authorization": f"Bearer {mgr_token}"},
        json={"current_password": "senha_inicial_123", "new_password": "nova_senha_gestor_456"}
    )
    assert res_ch.status_code == 200
    assert "sucesso" in res_ch.json()["message"].lower()

    # 4. Old password must fail
    res_l_old = client.post(
        "/api/manager/auth/token",
        json={"username": "gestor_senha_teste", "password": "senha_inicial_123"}
    )
    assert res_l_old.status_code == 401

    # 5. New password must succeed
    res_l_new = client.post(
        "/api/manager/auth/token",
        json={"username": "gestor_senha_teste", "password": "nova_senha_gestor_456"}
    )
    assert res_l_new.status_code == 200

    # 6. Superadmin edits manager info and resets manager's password
    res_edit = client.put(
        f"/api/manager/users/{mgr_id}",
        headers={"Authorization": f"Bearer {superadmin_token}"},
        json={
            "email": "novo_email@flowcmms.com",
            "password": "senha_resetada_pelo_admin_789"
        }
    )
    assert res_edit.status_code == 200
    assert res_edit.json()["email"] == "novo_email@flowcmms.com"

    # 7. Login with reset password succeeds
    res_l_reset = client.post(
        "/api/manager/auth/token",
        json={"username": "gestor_senha_teste", "password": "senha_resetada_pelo_admin_789"}
    )
    assert res_l_reset.status_code == 200

    # Clean up test manager
    client.delete(
        f"/api/manager/users/{mgr_id}",
        headers={"Authorization": f"Bearer {superadmin_token}"}
    )


