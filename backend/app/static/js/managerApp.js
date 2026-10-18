import api, { getManagerUser, getManagerToken, setManagerToken, setManagerUser, removeManagerToken, removeManagerUser } from './api.js';

const appRoot = document.getElementById('manager-app-root');
const modalContainer = document.getElementById('manager-modal-container');

async function init() {
  const token = getManagerToken();
  const user = getManagerUser();

  if (!token || !user) {
    renderManagerLogin();
    return;
  }

  renderManagerDashboard(user);
}

function renderManagerLogin() {
  appRoot.innerHTML = `
    <div style="max-width:440px; margin:60px auto; background:#fff; padding:36px; border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.06); border:1px solid #e2e8f0;">
      <div style="text-align:center; margin-bottom:24px;">
        <span style="font-size:3rem;">🏢</span>
        <h2 style="margin:10px 0 6px 0; color:#1e293b;">Gerenciador de Unidades</h2>
        <p style="color:#64748b; font-size:0.875rem;">Painel de Controle Central Multi-Tenant</p>
      </div>

      <div id="mlogin-alert" style="display:none; padding:10px; border-radius:6px; margin-bottom:16px; font-size:0.875rem; background:#fee2e2; color:#991b1b;"></div>

      <form id="form-manager-login">
        <div class="form-group" style="margin-bottom:14px;">
          <label style="font-size:0.875rem; font-weight:600; color:#334155; margin-bottom:6px; display:block;">Usuário Gestor</label>
          <input type="text" id="mlogin-user" placeholder="Ex: superadmin ou gestor_hospital" required style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:6px;">
        </div>

        <div class="form-group" style="margin-bottom:20px;">
          <label style="font-size:0.875rem; font-weight:600; color:#334155; margin-bottom:6px; display:block;">Senha</label>
          <input type="password" id="mlogin-pass" placeholder="••••••••" required style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:6px;">
        </div>

        <button type="submit" id="btn-mlogin-submit" class="btn btn-primary" style="width:100%; padding:11px; font-size:1rem; font-weight:600;">
          Acessar Gerenciador
        </button>

        <div style="text-align:center; margin-top:20px; font-size:0.825rem; color:#64748b;">
          Acesso de técnicos/unidades? <a href="/" style="color:#2563eb; text-decoration:none; font-weight:600;">Ir para Login da Unidade</a>
        </div>
      </form>
    </div>
  `;

  document.getElementById('form-manager-login').onsubmit = async (e) => {
    e.preventDefault();
    const alertDiv = document.getElementById('mlogin-alert');
    const btn = document.getElementById('btn-mlogin-submit');
    alertDiv.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Verificando permissões...';

    try {
      const data = await api.managerLogin(
        document.getElementById('mlogin-user').value.trim(),
        document.getElementById('mlogin-pass').value
      );
      renderManagerDashboard(data.user);
    } catch (err) {
      alertDiv.style.display = 'block';
      alertDiv.textContent = err.message || 'Erro ao efetuar login.';
      btn.disabled = false;
      btn.textContent = 'Acessar Gerenciador';
    }
  };
}

async function renderManagerDashboard(user) {
  const isSuperAdmin = user.role === 'superadmin';

  appRoot.innerHTML = `
    <!-- Top Header -->
    <header style="display:flex; justify-content:space-between; align-items:center; background:#fff; padding:18px 24px; border-radius:12px; border:1px solid #e2e8f0; margin-bottom:24px;">
      <div>
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:1.8rem;">🏢</span>
          <h1 style="font-size:1.35rem; margin:0; color:#0f172a;">Gerenciador de Unidades & Clientes</h1>
        </div>
        <p style="margin:4px 0 0 0; color:#64748b; font-size:0.875rem;">
          Conectado como: <strong>${user.username}</strong> | 
          Perfil: <span class="badge ${isSuperAdmin ? 'badge-primary' : 'badge-secondary'}">${isSuperAdmin ? '👑 Admin da Plataforma' : '👤 Gestor de Unidades'}</span>
        </p>
      </div>
      <div style="display:flex; gap:10px;">
        <button id="btn-change-my-password" class="btn btn-secondary" style="display:flex; align-items:center; gap:6px;">
          🔑 Alterar Minha Senha
        </button>
        <a href="/" target="_blank" class="btn btn-secondary" style="text-decoration:none; display:flex; align-items:center; gap:6px;">
          🌐 Acessar Portal do Cliente
        </a>
        <button id="btn-logout-manager" class="btn btn-secondary">🚪 Sair</button>
      </div>
    </header>

    <div id="dashboard-alert" style="display:none; padding:12px; border-radius:8px; margin-bottom:18px;"></div>


    <!-- Tenants Section -->
    <section style="background:#fff; border-radius:12px; border:1px solid #e2e8f0; padding:20px; margin-bottom:24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div>
          <h2 style="font-size:1.15rem; margin:0; color:#0f172a;">Hospital e Unidades Gerenciadas</h2>
          <p style="font-size:0.8rem; color:#64748b; margin:2px 0 0 0;">
            ${isSuperAdmin ? 'Visão global de todos os clientes cadastrados.' : 'Apenas unidades autorizadas para o seu usuário.'}
          </p>
        </div>
        <button id="btn-add-tenant" class="btn btn-primary">➕ Nova Unidade / Cliente</button>
      </div>

      <div id="tenants-table-wrap">
        <div style="padding:30px; text-align:center; color:#64748b;">Carregando unidades...</div>
      </div>
    </section>

    <!-- Superadmin Platform Operators Section -->
    ${isSuperAdmin ? `
      <section style="background:#fff; border-radius:12px; border:1px solid #e2e8f0; padding:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h2 style="font-size:1.15rem; margin:0; color:#0f172a;">Operadores e Gestores da Plataforma</h2>
            <p style="font-size:0.8rem; color:#64748b; margin:2px 0 0 0;">Controle quem pode gerenciar cada unidade hospitalar.</p>
          </div>
          <button id="btn-add-manager-user" class="btn btn-secondary">➕ Novo Usuário Gestor</button>
        </div>

        <div id="managers-table-wrap">
          <div style="padding:20px; text-align:center; color:#64748b;">Carregando gestores...</div>
        </div>
      </section>
    ` : ''}
  `;

  document.getElementById('btn-logout-manager').onclick = () => {
    api.managerLogout();
    renderManagerLogin();
  };

  document.getElementById('btn-change-my-password').onclick = () => {
    openChangeMyPasswordModal(user.username);
  };

  document.getElementById('btn-add-tenant').onclick = () => openCreateTenantModal();


  if (isSuperAdmin) {
    document.getElementById('btn-add-manager-user').onclick = () => openCreateManagerUserModal();
  }

  await loadTenantsTable(isSuperAdmin);
  if (isSuperAdmin) {
    await loadManagersTable();
  }
}

function showMsg(msg, type = 'success') {
  const al = document.getElementById('dashboard-alert');
  if (!al) return;
  al.style.display = 'block';
  al.style.background = type === 'success' ? '#dcfce7' : '#fee2e2';
  al.style.color = type === 'success' ? '#166534' : '#991b1b';
  al.style.border = `1px solid ${type === 'success' ? '#86efac' : '#fca5a5'}`;
  al.textContent = msg;
  setTimeout(() => { al.style.display = 'none'; }, 4000);
}

async function loadTenantsTable(isSuperAdmin) {
  const wrap = document.getElementById('tenants-table-wrap');
  try {
    const tenants = await api.getTenants();
    if (!tenants || tenants.length === 0) {
      wrap.innerHTML = `<div style="padding:24px; text-align:center; color:#64748b;">Nenhuma unidade hospitalar associada ao seu usuário.</div>`;
      return;
    }

    wrap.innerHTML = `
      <table class="data-table" style="width:100%;">
        <thead>
          <tr>
            <th>Nome da Unidade</th>
            <th>Slug (Link de Acesso)</th>
            <th>Banco de Dados Físico</th>
            <th>Status</th>
            <th style="text-align:right;">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${tenants.map(t => `
            <tr>
              <td>
                <strong>${t.name}</strong>
                ${t.description ? `<br><small style="color:#64748b;">${t.description}</small>` : ''}
              </td>
              <td>
                <code>${t.slug}</code>
                <br>
                <a href="/?s=${t.slug}" target="_blank" style="font-size:0.75rem; color:#2563eb; text-decoration:none;">
                  🔗 Abrir Link Direto
                </a>
              </td>
              <td><code>${t.db_name}</code></td>
              <td>
                <span class="badge ${t.is_active ? 'badge-success' : 'badge-danger'}">
                  ${t.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td style="text-align:right;">
                <div style="display:flex; justify-content:flex-end; gap:6px;">
                  <button class="btn btn-sm btn-primary btn-manage-users" data-id="${t.id}" data-name="${t.name}" data-slug="${t.slug}">
                    👥 Usuários
                  </button>
                  <button class="btn btn-sm btn-success btn-tenant-mcp-token" data-id="${t.id}" data-name="${t.name}" data-slug="${t.slug}" title="Gerar Token MCP Isolado para este hospital">
                    🤖 Token MCP
                  </button>
                  <a href="/?s=${t.slug}" target="_blank" class="btn btn-sm btn-secondary" style="text-decoration:none;">
                    🚀 Entrar
                  </a>
                  ${isSuperAdmin ? `
                    <button class="btn btn-sm btn-danger btn-del-tenant" data-id="${t.id}" data-name="${t.name}">
                      🗑️
                    </button>
                  ` : ''}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    document.querySelectorAll('.btn-manage-users').forEach(btn => {
      btn.onclick = () => {
        const tid = parseInt(btn.getAttribute('data-id'));
        const tname = btn.getAttribute('data-name');
        const tslug = btn.getAttribute('data-slug');
        openTenantUsersModal(tid, tname, tslug);
      };
    });

    document.querySelectorAll('.btn-tenant-mcp-token').forEach(btn => {
      btn.onclick = () => {
        const tid = parseInt(btn.getAttribute('data-id'));
        const tname = btn.getAttribute('data-name');
        const tslug = btn.getAttribute('data-slug');
        openTenantMCPTokenModal(tid, tname, tslug);
      };
    });


    if (isSuperAdmin) {
      document.querySelectorAll('.btn-del-tenant').forEach(btn => {
        btn.onclick = async () => {
          const tid = btn.getAttribute('data-id');
          const tname = btn.getAttribute('data-name');
          if (confirm(`Excluir a unidade "${tname}" e apagar seu banco de dados isolado? Esta ação é irreversível!`)) {
            try {
              await api.deleteTenant(tid);
              showMsg(`Unidade "${tname}" e banco de dados removidos.`, 'success');
              loadTenantsTable(isSuperAdmin);
            } catch (err) {
              alert(`Erro: ${err.message}`);
            }
          }
        };
      });
    }

  } catch (err) {
    wrap.innerHTML = `<div style="color:#ef4444; padding:20px;">Erro ao carregar clientes: ${err.message}</div>`;
  }
}

// Modal: Gerenciar Usuários do Cliente (Unidade)
async function openTenantUsersModal(tenantId, tenantName, tenantSlug) {
  modalContainer.innerHTML = `
    <div class="modal-backdrop" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;">
      <div class="modal-content" style="background:#fff; border-radius:12px; width:95%; max-width:700px; padding:24px; max-height:85vh; overflow-y:auto; box-shadow:0 10px 25px rgba(0,0,0,0.15);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h3 style="margin:0; color:#0f172a;">👥 Usuários de Acesso: ${tenantName}</h3>
            <p style="margin:2px 0 0 0; color:#64748b; font-size:0.85rem;">
              Estes usuários acessam exclusivamente a unidade <code>${tenantSlug}</code> em <code>/?s=${tenantSlug}</code>.
            </p>
          </div>
          <button id="btn-close-users-modal" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">✕</button>
        </div>

        <div style="display:flex; justify-content:flex-end; margin-bottom:14px;">
          <button id="btn-create-tenant-user" class="btn btn-sm btn-primary">➕ Novo Usuário na Unidade</button>
        </div>

        <div id="tenant-users-list-wrap">
          <div style="text-align:center; padding:20px; color:#64748b;">Carregando usuários da unidade...</div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-close-users-modal').onclick = () => { modalContainer.innerHTML = ''; };

  const loadUsers = async () => {
    const wrap = document.getElementById('tenant-users-list-wrap');
    try {
      const users = await api.getTenantUsers(tenantId);
      if (!users || users.length === 0) {
        wrap.innerHTML = `<div style="text-align:center; padding:20px; color:#64748b;">Nenhum usuário cadastrado nesta unidade ainda.</div>`;
        return;
      }

      wrap.innerHTML = `
        <table class="data-table" style="width:100%;">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>E-mail</th>
              <th>Função / Perfil</th>
              <th>Status</th>
              <th style="text-align:right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td><strong>${u.username}</strong></td>
                <td>${u.email}</td>
                <td><span class="badge badge-secondary">${u.role}</span></td>
                <td><span class="badge ${u.is_active ? 'badge-success' : 'badge-danger'}">${u.is_active ? 'Ativo' : 'Inativo'}</span></td>
                <td style="text-align:right;">
                  <button class="btn btn-sm btn-danger btn-del-tuser" data-uid="${u.id}" data-uname="${u.username}">🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      document.querySelectorAll('.btn-del-tuser').forEach(btn => {
        btn.onclick = async () => {
          const uid = btn.getAttribute('data-uid');
          const uname = btn.getAttribute('data-uname');
          if (confirm(`Excluir o usuário "${uname}" da unidade ${tenantName}?`)) {
            try {
              await api.deleteTenantUser(tenantId, uid);
              loadUsers();
            } catch (e) {
              alert(`Erro: ${e.message}`);
            }
          }
        };
      });

    } catch (err) {
      wrap.innerHTML = `<div style="color:#ef4444; padding:15px;">Erro ao carregar usuários: ${err.message}</div>`;
    }
  };

  document.getElementById('btn-create-tenant-user').onclick = () => {
    openAddUserToTenantForm(tenantId, tenantName, () => loadUsers());
  };

  await loadUsers();
}

function openAddUserToTenantForm(tenantId, tenantName, onDone) {
  const formWrap = document.createElement('div');
  formWrap.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:10000;';
  formWrap.innerHTML = `
    <div style="background:#fff; border-radius:10px; width:90%; max-width:440px; padding:22px; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
      <h4 style="margin:0 0 12px 0;">➕ Cadastrar Usuário para ${tenantName}</h4>
      <div id="new-tuser-alert" style="display:none; padding:8px; border-radius:6px; margin-bottom:12px; font-size:0.85rem;"></div>
      <form id="form-new-tuser">
        <div class="form-group" style="margin-bottom:10px;">
          <label style="font-size:0.8rem;">Nome de Usuário *</label>
          <input type="text" id="tuser-username" required style="width:100%; padding:8px;">
        </div>
        <div class="form-group" style="margin-bottom:10px;">
          <label style="font-size:0.8rem;">E-mail *</label>
          <input type="email" id="tuser-email" required style="width:100%; padding:8px;">
        </div>
        <div class="form-group" style="margin-bottom:10px;">
          <label style="font-size:0.8rem;">Senha *</label>
          <input type="password" id="tuser-password" required minlength="4" style="width:100%; padding:8px;">
        </div>
        <div class="form-group" style="margin-bottom:16px;">
          <label style="font-size:0.8rem;">Perfil de Acesso</label>
          <select id="tuser-role" style="width:100%; padding:8px;">
            <option value="solicitante" selected>Solicitante (Apenas Chamados & Consulta)</option>
            <option value="technician">Técnico / Operador</option>
            <option value="admin">Administrador Local da Unidade</option>
            <option value="user">Visualizador / Usuário</option>
          </select>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" id="btn-cancel-tuser" class="btn btn-secondary">Cancelar</button>
          <button type="submit" id="btn-save-tuser" class="btn btn-primary">Salvar Usuário</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(formWrap);
  formWrap.querySelector('#btn-cancel-tuser').onclick = () => formWrap.remove();

  formWrap.querySelector('#form-new-tuser').onsubmit = async (e) => {
    e.preventDefault();
    const btn = formWrap.querySelector('#btn-save-tuser');
    const al = formWrap.querySelector('#new-tuser-alert');
    btn.disabled = true;
    btn.textContent = 'Gravando...';

    try {
      await api.createTenantUser(tenantId, {
        username: formWrap.querySelector('#tuser-username').value.trim(),
        email: formWrap.querySelector('#tuser-email').value.trim(),
        password: formWrap.querySelector('#tuser-password').value,
        role: formWrap.querySelector('#tuser-role').value
      });
      formWrap.remove();
      onDone();
    } catch (err) {
      al.style.display = 'block';
      al.style.background = '#fee2e2';
      al.style.color = '#991b1b';
      al.textContent = err.message;
      btn.disabled = false;
      btn.textContent = 'Salvar Usuário';
    }
  };
}

function openCreateTenantModal() {
  modalContainer.innerHTML = `
    <div class="modal-backdrop" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;">
      <div class="modal-content" style="background:#fff; border-radius:10px; width:90%; max-width:520px; padding:24px; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
        <h3 style="margin-top:0;">➕ Cadastrar Nova Unidade / Cliente</h3>
        <p style="color:#64748b; font-size:0.875rem;">
          Criação automática do banco de dados isolado no PostgreSQL para esta instituição.
        </p>
        <div id="ctenant-alert" style="display:none; padding:10px; border-radius:6px; margin-bottom:12px; font-size:0.85rem;"></div>
        <form id="form-create-unit">
          <div class="form-group" style="margin-bottom:12px;">
            <label>Nome do Hospital / Unidade *</label>
            <input type="text" id="unit-name" placeholder="Ex: Hospital Samaritano" required style="width:100%; padding:8px;">
          </div>
          <div class="form-group" style="margin-bottom:12px;">
            <label>Slug (identificador URL, ex: hospital-samaritano) *</label>
            <input type="text" id="unit-slug" placeholder="hospital-samaritano" required style="width:100%; padding:8px; font-family:monospace;">
          </div>
          <div class="form-group" style="margin-bottom:12px;">
            <label>Descrição</label>
            <input type="text" id="unit-desc" placeholder="Ex: Bloco Cirúrgico e Maternidade" style="width:100%; padding:8px;">
          </div>
          <div style="background:#f8fafc; padding:12px; border-radius:6px; margin-bottom:16px;">
            <strong style="font-size:0.85rem; color:#334155;">Primeiro Usuário Administrador da Unidade</strong>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px;">
              <div>
                <label style="font-size:0.75rem;">Usuário</label>
                <input type="text" id="unit-admin-user" value="admin" style="width:100%; padding:6px; font-size:0.85rem;">
              </div>
              <div>
                <label style="font-size:0.75rem;">Senha</label>
                <input type="text" id="unit-admin-pass" value="admin123" style="width:100%; padding:6px; font-size:0.85rem;">
              </div>
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px;">
            <button type="button" id="btn-cancel-unit" class="btn btn-secondary">Cancelar</button>
            <button type="submit" id="btn-submit-unit" class="btn btn-primary">Criar Unidade & Banco</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('btn-cancel-unit').onclick = () => { modalContainer.innerHTML = ''; };

  const nameInput = document.getElementById('unit-name');
  const slugInput = document.getElementById('unit-slug');
  nameInput.oninput = () => {
    if (!slugInput.dataset.manual) {
      slugInput.value = nameInput.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
  };
  slugInput.oninput = () => { slugInput.dataset.manual = 'true'; };

  document.getElementById('form-create-unit').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-unit');
    const al = document.getElementById('ctenant-alert');
    btn.disabled = true;
    btn.textContent = 'Provisionando banco de dados...';

    try {
      await api.createTenant({
        name: nameInput.value,
        slug: slugInput.value,
        description: document.getElementById('unit-desc').value,
        initial_admin_username: document.getElementById('unit-admin-user').value,
        initial_admin_password: document.getElementById('unit-admin-pass').value
      });
      modalContainer.innerHTML = '';
      showMsg(`Unidade "${nameInput.value}" criada com sucesso!`, 'success');
      const user = getManagerUser();
      loadTenantsTable(user && user.role === 'superadmin');
    } catch (err) {
      al.style.display = 'block';
      al.style.background = '#fee2e2';
      al.style.color = '#991b1b';
      al.textContent = err.message;
      btn.disabled = false;
      btn.textContent = 'Criar Unidade & Banco';
    }
  };
}

async function loadManagersTable() {
  const wrap = document.getElementById('managers-table-wrap');
  if (!wrap) return;

  try {
    const users = await api.getManagerUsers();
    wrap.innerHTML = `
      <table class="data-table" style="width:100%;">
        <thead>
          <tr>
            <th>Usuário Gestor</th>
            <th>E-mail</th>
            <th>Nível</th>
            <th>Unidades com Acesso</th>
            <th style="text-align:right;">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td><strong>${u.username}</strong></td>
              <td>${u.email}</td>
              <td><span class="badge ${u.role === 'superadmin' ? 'badge-primary' : 'badge-secondary'}">${u.role === 'superadmin' ? 'Admin Plataforma' : 'Gestor'}</span></td>
              <td>
                ${u.role === 'superadmin' 
                  ? '<em>Todas as Unidades</em>' 
                  : (u.assigned_tenants && u.assigned_tenants.length > 0 
                      ? u.assigned_tenants.map(t => `<span class="badge" style="background:#e0f2fe; color:#0369a1; margin-right:4px;">${t.name}</span>`).join('') 
                      : '<span style="color:#94a3b8;">Nenhuma unidade vinculada</span>')}
              </td>
              <td style="text-align:right;">
                <div style="display:flex; justify-content:flex-end; gap:6px;">
                  <button class="btn btn-sm btn-secondary btn-edit-manager" data-id="${u.id}" title="Editar Informações e Senha">
                    ✏️ Editar / Senha
                  </button>
                  ${u.role !== 'superadmin' ? `
                    <button class="btn btn-sm btn-secondary btn-assign-units" data-id="${u.id}">⚙️ Unidades</button>
                    <button class="btn btn-sm btn-danger btn-del-manager" data-id="${u.id}" data-name="${u.username}">🗑️</button>
                  ` : ''}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    document.querySelectorAll('.btn-edit-manager').forEach(btn => {
      btn.onclick = () => {
        const uid = parseInt(btn.getAttribute('data-id'));
        const u = users.find(x => x.id === uid);
        if (u) openEditManagerUserModal(u);
      };
    });


    document.querySelectorAll('.btn-assign-units').forEach(btn => {
      btn.onclick = () => {
        const uid = parseInt(btn.getAttribute('data-id'));
        const u = users.find(x => x.id === uid);
        if (u) openAssignUnitsModal(u);
      };
    });

    document.querySelectorAll('.btn-del-manager').forEach(btn => {
      btn.onclick = async () => {
        const uid = btn.getAttribute('data-id');
        const uname = btn.getAttribute('data-name');
        if (confirm(`Excluir o gestor "${uname}"?`)) {
          try {
            await api.deleteManagerUser(uid);
            showMsg(`Gestor "${uname}" excluído.`);
            loadManagersTable();
          } catch (e) {
            alert(`Erro: ${e.message}`);
          }
        }
      };
    });

  } catch (err) {
    wrap.innerHTML = `<div style="color:#ef4444; padding:15px;">Erro ao carregar gestores: ${err.message}</div>`;
  }
}

async function openAssignUnitsModal(userObj) {
  const allTenants = await api.getTenants();
  const assignedIds = (userObj.assigned_tenants || []).map(t => t.id);

  modalContainer.innerHTML = `
    <div class="modal-backdrop" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;">
      <div class="modal-content" style="background:#fff; border-radius:10px; width:90%; max-width:480px; padding:24px;">
        <h3 style="margin-top:0;">Vincular Unidades para "${userObj.username}"</h3>
        <p style="color:#64748b; font-size:0.875rem;">
          Selecione as unidades que este gestor poderá gerenciar e criar usuários:
        </p>
        <form id="form-assign-units">
          <div style="max-height:220px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:6px; padding:10px; margin-bottom:16px;">
            ${allTenants.map(t => `
              <label style="display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid #f1f5f9; cursor:pointer;">
                <input type="checkbox" name="tenant_ids" value="${t.id}" ${assignedIds.includes(t.id) ? 'checked' : ''}>
                <span><strong>${t.name}</strong> (<code>${t.slug}</code>)</span>
              </label>
            `).join('')}
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px;">
            <button type="button" id="btn-cancel-assign" class="btn btn-secondary">Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar Vínculos</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('btn-cancel-assign').onclick = () => { modalContainer.innerHTML = ''; };

  document.getElementById('form-assign-units').onsubmit = async (e) => {
    e.preventDefault();
    const checked = Array.from(document.querySelectorAll('input[name="tenant_ids"]:checked')).map(cb => parseInt(cb.value));
    try {
      await api.updateManagerUser(userObj.id, { assigned_tenant_ids: checked });
      modalContainer.innerHTML = '';
      showMsg(`Unidades vinculadas ao usuário ${userObj.username}!`, 'success');
      loadManagersTable();
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };
}

function openCreateManagerUserModal() {
  modalContainer.innerHTML = `
    <div class="modal-backdrop" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;">
      <div class="modal-content" style="background:#fff; border-radius:10px; width:90%; max-width:440px; padding:24px;">
        <h3 style="margin-top:0;">➕ Novo Usuário Gestor</h3>
        <form id="form-create-muser">
          <div class="form-group" style="margin-bottom:10px;">
            <label>Usuário *</label>
            <input type="text" id="muser-u" required style="width:100%; padding:8px;">
          </div>
          <div class="form-group" style="margin-bottom:10px;">
            <label>E-mail *</label>
            <input type="email" id="muser-e" required style="width:100%; padding:8px;">
          </div>
          <div class="form-group" style="margin-bottom:10px;">
            <label>Senha *</label>
            <input type="password" id="muser-p" required minlength="4" style="width:100%; padding:8px;">
          </div>
          <div class="form-group" style="margin-bottom:16px;">
            <label>Perfil</label>
            <select id="muser-r" style="width:100%; padding:8px;">
              <option value="manager" selected>Gestor de Unidades</option>
              <option value="superadmin">Admin da Plataforma</option>
            </select>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:8px;">
            <button type="button" id="btn-cancel-mu" class="btn btn-secondary">Cancelar</button>
            <button type="submit" class="btn btn-primary">Cadastrar Gestor</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('btn-cancel-mu').onclick = () => { modalContainer.innerHTML = ''; };

  document.getElementById('form-create-muser').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createManagerUser({
        username: document.getElementById('muser-u').value.trim(),
        email: document.getElementById('muser-e').value.trim(),
        password: document.getElementById('muser-p').value,
        role: document.getElementById('muser-r').value
      });
      modalContainer.innerHTML = '';
      showMsg('Novo gestor cadastrado!', 'success');
      loadManagersTable();
    } catch (e) {
      alert(`Erro: ${e.message}`);
    }
  };
}

// Modal: Gestor ou Superadmin alterar a sua própria senha
function openChangeMyPasswordModal(currentUsername) {
  modalContainer.innerHTML = `
    <div class="modal-backdrop" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;">
      <div class="modal-content" style="background:#fff; border-radius:10px; width:90%; max-width:440px; padding:24px; box-shadow:0 10px 25px rgba(0,0,0,0.15);">
        <h3 style="margin-top:0; color:#0f172a;">🔑 Alterar Minha Senha</h3>
        <p style="color:#64748b; font-size:0.875rem; margin-bottom:14px;">
          Usuário: <strong>${currentUsername}</strong>
        </p>
        <div id="pwd-change-alert" style="display:none; padding:10px; border-radius:6px; margin-bottom:12px; font-size:0.85rem;"></div>
        <form id="form-change-my-pwd">
          <div class="form-group" style="margin-bottom:12px;">
            <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:4px;">Senha Atual *</label>
            <input type="password" id="my-pwd-current" required placeholder="Digite sua senha atual" style="width:100%; padding:9px; border:1px solid #cbd5e1; border-radius:6px;">
          </div>
          <div class="form-group" style="margin-bottom:12px;">
            <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:4px;">Nova Senha *</label>
            <input type="password" id="my-pwd-new" required minlength="4" placeholder="Mínimo 4 caracteres" style="width:100%; padding:9px; border:1px solid #cbd5e1; border-radius:6px;">
          </div>
          <div class="form-group" style="margin-bottom:18px;">
            <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:4px;">Confirmar Nova Senha *</label>
            <input type="password" id="my-pwd-confirm" required minlength="4" placeholder="Confirme a nova senha" style="width:100%; padding:9px; border:1px solid #cbd5e1; border-radius:6px;">
          </div>
          <div style="display:flex; justify-content:flex-end; gap:8px;">
            <button type="button" id="btn-cancel-pwd" class="btn btn-secondary">Cancelar</button>
            <button type="submit" id="btn-submit-pwd" class="btn btn-primary">Salvar Nova Senha</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('btn-cancel-pwd').onclick = () => { modalContainer.innerHTML = ''; };

  document.getElementById('form-change-my-pwd').onsubmit = async (e) => {
    e.preventDefault();
    const cur = document.getElementById('my-pwd-current').value;
    const n = document.getElementById('my-pwd-new').value;
    const conf = document.getElementById('my-pwd-confirm').value;
    const al = document.getElementById('pwd-change-alert');
    const btn = document.getElementById('btn-submit-pwd');

    if (n !== conf) {
      al.style.display = 'block';
      al.style.background = '#fee2e2';
      al.style.color = '#991b1b';
      al.textContent = 'A nova senha e a confirmação não coincidem.';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Salvando...';

    try {
      await api.changeManagerPassword(cur, n);
      modalContainer.innerHTML = '';
      showMsg('Sua senha foi alterada com sucesso!', 'success');
    } catch (err) {
      al.style.display = 'block';
      al.style.background = '#fee2e2';
      al.style.color = '#991b1b';
      al.textContent = err.message || 'Erro ao alterar senha.';
      btn.disabled = false;
      btn.textContent = 'Salvar Nova Senha';
    }
  };
}

// Modal: Superadmin editar informações e/ou redefinir senha de outro gestor
function openEditManagerUserModal(userObj) {
  modalContainer.innerHTML = `
    <div class="modal-backdrop" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;">
      <div class="modal-content" style="background:#fff; border-radius:10px; width:90%; max-width:480px; padding:24px; box-shadow:0 10px 25px rgba(0,0,0,0.15);">
        <h3 style="margin-top:0; color:#0f172a;">✏️ Editar Gestor: ${userObj.username}</h3>
        <p style="color:#64748b; font-size:0.875rem; margin-bottom:14px;">
          Atualize os dados cadastrais ou redefina a senha deste usuário gestor.
        </p>
        <div id="edit-muser-alert" style="display:none; padding:10px; border-radius:6px; margin-bottom:12px; font-size:0.85rem;"></div>
        <form id="form-edit-muser">
          <div class="form-group" style="margin-bottom:12px;">
            <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:4px;">Nome de Usuário</label>
            <input type="text" value="${userObj.username}" disabled style="width:100%; padding:9px; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px;">
          </div>
          <div class="form-group" style="margin-bottom:12px;">
            <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:4px;">E-mail *</label>
            <input type="email" id="edit-muser-email" value="${userObj.email}" required style="width:100%; padding:9px; border:1px solid #cbd5e1; border-radius:6px;">
          </div>
          <div class="form-group" style="margin-bottom:12px;">
            <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:4px;">Perfil / Nível</label>
            <select id="edit-muser-role" style="width:100%; padding:9px; border:1px solid #cbd5e1; border-radius:6px;">
              <option value="manager" ${userObj.role === 'manager' ? 'selected' : ''}>Gestor de Unidades</option>
              <option value="superadmin" ${userObj.role === 'superadmin' ? 'selected' : ''}>Admin da Plataforma</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:12px;">
            <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:4px;">Status da Conta</label>
            <select id="edit-muser-active" style="width:100%; padding:9px; border:1px solid #cbd5e1; border-radius:6px;">
              <option value="true" ${userObj.is_active ? 'selected' : ''}>Ativo</option>
              <option value="false" ${!userObj.is_active ? 'selected' : ''}>Inativo / Desativado</option>
            </select>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:18px;">
            <label style="font-size:0.85rem; font-weight:600; color:#0f172a; display:block; margin-bottom:4px;">
              🔑 Redefinir Senha do Gestor (Opcional)
            </label>
            <input type="password" id="edit-muser-password" placeholder="Preencha apenas se desejar alterar a senha" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem;">
            <small style="color:#64748b; font-size:0.75rem; display:block; margin-top:2px;">Deixe em branco para manter a senha atual do gestor.</small>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:8px;">
            <button type="button" id="btn-cancel-edit-mu" class="btn btn-secondary">Cancelar</button>
            <button type="submit" id="btn-save-edit-mu" class="btn btn-primary">Salvar Alterações</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('btn-cancel-edit-mu').onclick = () => { modalContainer.innerHTML = ''; };

  document.getElementById('form-edit-muser').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save-edit-mu');
    const al = document.getElementById('edit-muser-alert');
    const email = document.getElementById('edit-muser-email').value.trim();
    const role = document.getElementById('edit-muser-role').value;
    const is_active = document.getElementById('edit-muser-active').value === 'true';
    const pwd = document.getElementById('edit-muser-password').value;

    const payload = { email, role, is_active };
    if (pwd && pwd.trim().length > 0) {
      if (pwd.trim().length < 4) {
        al.style.display = 'block';
        al.style.background = '#fee2e2';
        al.style.color = '#991b1b';
        al.textContent = 'A nova senha deve ter pelo menos 4 caracteres.';
        return;
      }
      payload.password = pwd.trim();
    }

    btn.disabled = true;
    btn.textContent = 'Salvando...';

    try {
      await api.updateManagerUser(userObj.id, payload);
      modalContainer.innerHTML = '';
      showMsg(`Dados do gestor "${userObj.username}" atualizados com sucesso!`, 'success');
      loadManagersTable();
    } catch (err) {
      al.style.display = 'block';
      al.style.background = '#fee2e2';
      al.style.color = '#991b1b';
      al.textContent = err.message || 'Erro ao atualizar dados.';
      btn.disabled = false;
      btn.textContent = 'Salvar Alterações';
    }
  };
}

// Modal: Gerar e visualizar Token MCP isolado por hospital
function openTenantMCPTokenModal(tenantId, tenantName, tenantSlug) {
  const mcpUrl = `${window.location.origin}/mcp/sse?s=${tenantSlug}`;

  modalContainer.innerHTML = `
    <div class="modal-backdrop" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;">
      <div class="modal-content" style="background:#fff; border-radius:12px; width:95%; max-width:580px; padding:26px; box-shadow:0 10px 25px rgba(0,0,0,0.15);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <div>
            <h3 style="margin:0; color:#0f172a;">🤖 Token MCP: ${tenantName}</h3>
            <p style="margin:2px 0 0 0; color:#64748b; font-size:0.85rem;">
              Agentes de IA e assistentes MCP conectados terão acesso <strong>exclusivo e isolado</strong> à base deste hospital.
            </p>
          </div>
          <button id="btn-close-mcp-modal" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">✕</button>
        </div>

        <div class="form-group" style="margin-bottom:14px;">
          <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:4px;">🌐 URL do Endpoint MCP da Unidade</label>
          <div style="display:flex; gap:8px;">
            <input type="text" id="tenant-mcp-url" value="${mcpUrl}" readonly style="width:100%; padding:8px; font-family:monospace; font-size:0.85rem; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px;">
            <button id="btn-copy-mcp-url" class="btn btn-secondary btn-sm" style="white-space:nowrap;">📋 Copiar</button>
          </div>
        </div>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin-bottom:18px;">
          <label style="font-size:0.85rem; font-weight:600; color:#0f172a; display:block; margin-bottom:6px;">
            🔑 Token de Acesso de Longa Duração (Bearer Token)
          </label>
          <div style="margin-bottom:10px;">
            <button id="btn-do-gen-mcp-token" class="btn btn-success" style="width:100%; font-weight:600; padding:10px;">
              ✨ Gerar Novo Token MCP Isolado (365 Dias)
            </button>
          </div>
          <div id="mcp-generated-token-wrap" style="display:none; flex-direction:column; gap:8px;">
            <textarea id="mcp-generated-token-text" rows="4" readonly style="width:100%; font-family:monospace; font-size:0.75rem; word-break:break-all; background:#fff; border:1px solid #cbd5e1; border-radius:6px; padding:8px;"></textarea>
            <button id="btn-copy-mcp-token" class="btn btn-secondary btn-sm">📋 Copiar Token de Acesso</button>
            <div style="font-size:0.8rem; color:#166534; font-weight:600; background:#dcfce7; padding:8px; border-radius:6px;">
              ✓ Token gerado com sucesso! Válido por 365 dias para a unidade <code>${tenantSlug}</code>.
            </div>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end;">
          <button id="btn-close-mcp-footer" class="btn btn-secondary">Fechar</button>
        </div>
      </div>
    </div>
  `;

  const close = () => { modalContainer.innerHTML = ''; };
  document.getElementById('btn-close-mcp-modal').onclick = close;
  document.getElementById('btn-close-mcp-footer').onclick = close;

  const copyUrlBtn = document.getElementById('btn-copy-mcp-url');
  copyUrlBtn.onclick = () => {
    const inp = document.getElementById('tenant-mcp-url');
    inp.select();
    navigator.clipboard.writeText(inp.value);
    copyUrlBtn.textContent = '✓ Copiado!';
    setTimeout(() => { copyUrlBtn.textContent = '📋 Copiar'; }, 2000);
  };

  const genBtn = document.getElementById('btn-do-gen-mcp-token');
  const tokenWrap = document.getElementById('mcp-generated-token-wrap');
  const tokenText = document.getElementById('mcp-generated-token-text');
  const copyTokenBtn = document.getElementById('btn-copy-mcp-token');

  genBtn.onclick = async () => {
    genBtn.disabled = true;
    genBtn.textContent = 'Gerando token isolado...';

    try {
      const res = await api.generateTenantMCPToken(tenantId);
      tokenText.value = res.mcp_token;
      tokenWrap.style.display = 'flex';
    } catch (err) {
      alert(`Erro ao gerar token MCP: ${err.message}`);
    } finally {
      genBtn.disabled = false;
      genBtn.textContent = '✨ Gerar Novo Token MCP Isolado (365 Dias)';
    }
  };

  copyTokenBtn.onclick = () => {
    tokenText.select();
    navigator.clipboard.writeText(tokenText.value);
    copyTokenBtn.textContent = '✓ Token Copiado!';
    setTimeout(() => { copyTokenBtn.textContent = '📋 Copiar Token de Acesso'; }, 2000);
  };
}

init();


