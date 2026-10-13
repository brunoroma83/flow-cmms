import api, { getManagerUser, getManagerToken, setActiveTenant, getActiveTenant } from '../api.js';

export async function renderClientsManagerView(container) {
  const managerUser = getManagerUser();
  const isSuperAdmin = managerUser && managerUser.role === 'superadmin';
  const managerToken = getManagerToken();

  // If not logged in as manager, prompt manager login form
  if (!managerToken) {
    renderManagerLoginForm(container);
    return;
  }

  container.innerHTML = `
    <div class="page-header" style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <h2>🏢 Gerenciador Central de Clientes (Multi-Tenant)</h2>
        <p class="subtitle">
          Ambiente: <strong>${managerUser.username}</strong> | 
          Nível: <span class="badge ${isSuperAdmin ? 'badge-primary' : 'badge-secondary'}">${isSuperAdmin ? '👑 Admin da Plataforma (Superadmin)' : '👤 Gestor de Clientes'}</span>
        </p>
      </div>
      <div style="display:flex; gap:10px;">
        ${isSuperAdmin ? '<button id="btn-open-new-user" class="btn btn-secondary">➕ Novo Usuário Gestor</button>' : ''}
        <button id="btn-open-new-client" class="btn btn-primary">➕ Novo Cliente</button>
        <button id="btn-manager-logout" class="btn btn-secondary" title="Encerrar sessão de gerenciador">🚪 Sair do Gerenciador</button>
      </div>
    </div>

    <!-- Active Tenant Banner -->
    <div id="tenant-current-banner" style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px 16px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <strong>Cliente Ativo na Sessão:</strong>
        <span id="label-active-tenant" style="margin-left:8px; font-weight:600; color:#1d4ed8;">Nenhum selecionado (Usando Matriz padrão)</span>
      </div>
      <button id="btn-clear-active-tenant" class="btn btn-sm btn-secondary" style="padding:4px 10px; font-size:0.8rem;">Restaurar Padrão</button>
    </div>

    <!-- Feedback alerts -->
    <div id="manager-feedback" style="display:none; padding:12px; margin-bottom:16px; border-radius:6px;"></div>

    <!-- Section: Clientes / Tenants -->
    <div class="filter-panel" style="margin-bottom:24px;">
      <div class="filter-header" style="display:flex; justify-content:space-between; align-items:center;">
        <span>📋 Clientes Disponíveis (${isSuperAdmin ? 'Todos os Clientes' : 'Seus Clientes Autorizados'})</span>
      </div>
      <div id="tenants-list-container" style="overflow-x:auto;">
        <div style="text-align:center; padding:20px; color:#64748b;">Carregando lista de clientes...</div>
      </div>
    </div>

    <!-- Section: Operadores / Gestores (Superadmin Only) -->
    ${isSuperAdmin ? `
      <div class="filter-panel">
        <div class="filter-header">
          <span>👥 Usuários do Gerenciador & Vínculos de Acesso</span>
        </div>
        <div id="manager-users-container" style="overflow-x:auto;">
          <div style="text-align:center; padding:20px; color:#64748b;">Carregando operadores gestores...</div>
        </div>
      </div>
    ` : ''}

    <!-- Modal Container for Client / Manager User Creation -->
    <div id="manager-modal-wrap"></div>
  `;

  // Update current active tenant banner
  updateActiveTenantBanner();

  document.getElementById('btn-clear-active-tenant').onclick = () => {
    setActiveTenant('');
    updateActiveTenantBanner();
    showFeedback('Contexto do cliente restaurado para a Matriz padrão.', 'success');
  };

  document.getElementById('btn-manager-logout').onclick = () => {
    api.managerLogout();
    renderClientsManagerView(container);
  };

  document.getElementById('btn-open-new-client').onclick = () => {
    openNewClientModal();
  };

  if (isSuperAdmin) {
    const btnNewUser = document.getElementById('btn-open-new-user');
    if (btnNewUser) {
      btnNewUser.onclick = () => openNewManagerUserModal();
    }
  }

  // Load Tenants & Managers Data
  await loadTenants();
  if (isSuperAdmin) {
    await loadManagerUsers();
  }
}

function updateActiveTenantBanner() {
  const lbl = document.getElementById('label-active-tenant');
  const active = getActiveTenant();
  if (lbl) {
    lbl.textContent = active ? `${active.toUpperCase()} (Isolado)` : 'Matriz Padrão';
  }
}

function showFeedback(msg, type = 'success') {
  const fb = document.getElementById('manager-feedback');
  if (!fb) return;
  fb.style.display = 'block';
  fb.style.background = type === 'success' ? '#dcfce7' : '#fee2e2';
  fb.style.color = type === 'success' ? '#166534' : '#991b1b';
  fb.style.border = `1px solid ${type === 'success' ? '#86efac' : '#fca5a5'}`;
  fb.textContent = msg;
  setTimeout(() => { fb.style.display = 'none'; }, 4000);
}

async function loadTenants() {
  const listContainer = document.getElementById('tenants-list-container');
  try {
    const tenants = await api.getTenants();
    if (!tenants || tenants.length === 0) {
      listContainer.innerHTML = `<div style="padding:20px; text-align:center; color:#64748b;">Nenhum cliente disponível no momento.</div>`;
      return;
    }

    const activeTenantSlug = getActiveTenant();
    const managerUser = getManagerUser();
    const isSuperAdmin = managerUser && managerUser.role === 'superadmin';

    listContainer.innerHTML = `
      <table class="data-table" style="width:100%;">
        <thead>
          <tr>
            <th>Nome do Cliente</th>
            <th>Slug / Identificador</th>
            <th>Banco de Dados Físico</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${tenants.map(t => `
            <tr style="${activeTenantSlug === t.slug ? 'background-color:#f0fdf4;' : ''}">
              <td>
                <strong>${t.name}</strong>
                ${t.description ? `<br><small style="color:#64748b;">${t.description}</small>` : ''}
              </td>
              <td><code>${t.slug}</code></td>
              <td><code>${t.db_name}</code></td>
              <td>
                <span class="badge ${t.is_active ? 'badge-success' : 'badge-danger'}">
                  ${t.is_active ? 'Ativo' : 'Inativo'}
                </span>
                ${activeTenantSlug === t.slug ? '<span class="badge badge-primary" style="margin-left:6px;">EM USO</span>' : ''}
              </td>
              <td>
                <div style="display:flex; gap:6px;">
                  <button class="btn btn-sm btn-primary btn-select-tenant" data-slug="${t.slug}" data-name="${t.name}">
                    ${activeTenantSlug === t.slug ? '✓ Conectado' : '🚀 Conectar'}
                  </button>
                  ${isSuperAdmin ? `
                    <button class="btn btn-sm btn-danger btn-delete-tenant" data-id="${t.id}" data-name="${t.name}" data-db="${t.db_name}">
                      🗑️ Excluir
                    </button>
                  ` : ''}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    // Bind Connect buttons
    document.querySelectorAll('.btn-select-tenant').forEach(btn => {
      btn.onclick = () => {
        const slug = btn.getAttribute('data-slug');
        const name = btn.getAttribute('data-name');
        setActiveTenant(slug);
        updateActiveTenantBanner();
        showFeedback(`Conectado com sucesso ao banco do cliente: ${name} (${slug})! Todas as consultas de equipamentos e ordens de serviço agora apontam para seu banco isolado.`, 'success');
        loadTenants();
      };
    });

    // Bind Delete buttons
    document.querySelectorAll('.btn-delete-tenant').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        const dbName = btn.getAttribute('data-db');
        if (confirm(`Atenção: Tem certeza que deseja excluir o cliente "${name}" e DESTRUIR seu banco de dados "${dbName}"? Esta ação não pode ser desfeita!`)) {
          try {
            await api.deleteTenant(id);
            showFeedback(`Cliente "${name}" e seu banco de dados foram removidos com sucesso.`, 'success');
            if (getActiveTenant() === btn.getAttribute('data-slug')) {
              setActiveTenant('');
            }
            loadTenants();
          } catch (err) {
            alert(`Erro ao excluir cliente: ${err.message}`);
          }
        }
      };
    });

  } catch (e) {
    listContainer.innerHTML = `<div style="padding:20px; color:#ef4444;">Erro ao carregar clientes: ${e.message}</div>`;
  }
}

async function loadManagerUsers() {
  const usersContainer = document.getElementById('manager-users-container');
  if (!usersContainer) return;

  try {
    const users = await api.getManagerUsers();
    usersContainer.innerHTML = `
      <table class="data-table" style="width:100%;">
        <thead>
          <tr>
            <th>Usuário Gestor</th>
            <th>Email</th>
            <th>Nível</th>
            <th>Clientes Permitidos</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td><strong>${u.username}</strong></td>
              <td>${u.email}</td>
              <td>
                <span class="badge ${u.role === 'superadmin' ? 'badge-primary' : 'badge-secondary'}">
                  ${u.role === 'superadmin' ? 'Admin da Plataforma' : 'Gestor de Clientes'}
                </span>
              </td>
              <td>
                ${u.role === 'superadmin' 
                  ? '<em>Todos os Clientes (Acesso Global)</em>' 
                  : (u.assigned_tenants && u.assigned_tenants.length > 0 
                      ? u.assigned_tenants.map(t => `<span class="badge" style="background:#e0f2fe; color:#0369a1; margin-right:4px;">${t.name}</span>`).join('') 
                      : '<span style="color:#94a3b8;">Nenhum cliente atribuído</span>')}
              </td>
              <td>
                ${u.role !== 'superadmin' ? `
                  <button class="btn btn-sm btn-secondary btn-edit-user-tenants" data-id="${u.id}" data-name="${u.username}">
                    ⚙️ Atribuir Clientes
                  </button>
                  <button class="btn btn-sm btn-danger btn-delete-user" data-id="${u.id}" data-name="${u.username}">
                    🗑️
                  </button>
                ` : '<span style="color:#94a3b8;">Principal</span>'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    document.querySelectorAll('.btn-edit-user-tenants').forEach(btn => {
      btn.onclick = () => {
        const uid = parseInt(btn.getAttribute('data-id'));
        const userObj = users.find(x => x.id === uid);
        if (userObj) openAssignTenantsModal(userObj);
      };
    });

    document.querySelectorAll('.btn-delete-user').forEach(btn => {
      btn.onclick = async () => {
        const uid = btn.getAttribute('data-id');
        const uname = btn.getAttribute('data-name');
        if (confirm(`Excluir o gestor "${uname}"?`)) {
          try {
            await api.deleteManagerUser(uid);
            showFeedback(`Gestor "${uname}" excluído.`, 'success');
            loadManagerUsers();
          } catch (err) {
            alert(`Erro: ${err.message}`);
          }
        }
      };
    });

  } catch (e) {
    usersContainer.innerHTML = `<div style="padding:20px; color:#ef4444;">Erro ao carregar usuários: ${e.message}</div>`;
  }
}

function openNewClientModal() {
  const modalWrap = document.getElementById('manager-modal-wrap');
  modalWrap.innerHTML = `
    <div class="modal-backdrop" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;">
      <div class="modal-content" style="background:#fff; border-radius:10px; width:90%; max-width:550px; padding:24px; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
        <h3 style="margin-top:0;">➕ Cadastrar Novo Cliente & Provisionar Banco Isolado</h3>
        <p style="color:#64748b; font-size:0.875rem;">
          Será criado automaticamente um novo banco de dados PostgreSQL independente para este cliente.
        </p>
        <div id="client-modal-alert" style="display:none; padding:10px; border-radius:6px; margin-bottom:12px; font-size:0.85rem;"></div>
        <form id="form-create-tenant">
          <div class="form-group" style="margin-bottom:12px;">
            <label>Nome do Cliente / Hospital / Unidade *</label>
            <input type="text" id="new-client-name" placeholder="Ex: Hospital São Lucas" required style="width:100%; padding:8px;">
          </div>
          <div class="form-group" style="margin-bottom:12px;">
            <label>Slug (Identificador único - sem espaços) *</label>
            <input type="text" id="new-client-slug" placeholder="Ex: hospital-sao-lucas" required style="width:100%; padding:8px;">
          </div>
          <div class="form-group" style="margin-bottom:12px;">
            <label>Descrição Opcional</label>
            <input type="text" id="new-client-desc" placeholder="Ex: Unidade Cirúrgica e UTI" style="width:100%; padding:8px;">
          </div>
          <div style="background:#f8fafc; padding:12px; border-radius:6px; margin-bottom:16px;">
            <strong style="font-size:0.85rem; color:#334155;">Credenciais Iniciais do Admin deste Cliente</strong>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px;">
              <div>
                <label style="font-size:0.8rem;">Usuário Admin</label>
                <input type="text" id="new-client-admin-user" value="admin" style="width:100%; padding:6px; font-size:0.85rem;">
              </div>
              <div>
                <label style="font-size:0.8rem;">Senha Admin</label>
                <input type="text" id="new-client-admin-pass" value="admin123" style="width:100%; padding:6px; font-size:0.85rem;">
              </div>
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px;">
            <button type="button" id="btn-cancel-modal" class="btn btn-secondary">Cancelar</button>
            <button type="submit" id="btn-submit-client" class="btn btn-primary">Provisionar Cliente</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('btn-cancel-modal').onclick = () => { modalWrap.innerHTML = ''; };

  // Auto-slugify name
  const nameInput = document.getElementById('new-client-name');
  const slugInput = document.getElementById('new-client-slug');
  nameInput.oninput = () => {
    if (!slugInput.dataset.manual) {
      slugInput.value = nameInput.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
  };
  slugInput.oninput = () => { slugInput.dataset.manual = 'true'; };

  document.getElementById('form-create-tenant').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-client');
    const alertDiv = document.getElementById('client-modal-alert');
    btn.disabled = true;
    btn.textContent = '⏳ Criando banco de dados...';

    try {
      await api.createTenant({
        name: nameInput.value,
        slug: slugInput.value,
        description: document.getElementById('new-client-desc').value,
        initial_admin_username: document.getElementById('new-client-admin-user').value,
        initial_admin_password: document.getElementById('new-client-admin-pass').value
      });

      modalWrap.innerHTML = '';
      showFeedback(`Cliente "${nameInput.value}" e banco de dados isolado criados com sucesso!`, 'success');
      loadTenants();
    } catch (err) {
      alertDiv.style.display = 'block';
      alertDiv.style.background = '#fee2e2';
      alertDiv.style.color = '#991b1b';
      alertDiv.textContent = `Erro ao criar: ${err.message}`;
      btn.disabled = false;
      btn.textContent = 'Provisionar Cliente';
    }
  };
}

async function openAssignTenantsModal(userObj) {
  const modalWrap = document.getElementById('manager-modal-wrap');
  const allTenants = await api.getTenants();
  const assignedIds = (userObj.assigned_tenants || []).map(t => t.id);

  modalWrap.innerHTML = `
    <div class="modal-backdrop" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;">
      <div class="modal-content" style="background:#fff; border-radius:10px; width:90%; max-width:480px; padding:24px;">
        <h3 style="margin-top:0;">Permissões de Clientes para "${userObj.username}"</h3>
        <p style="color:#64748b; font-size:0.875rem;">
          Selecione apenas os clientes que este usuário gestor terá permissão para visualizar e operar:
        </p>
        <form id="form-assign-tenants">
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
            <button type="submit" class="btn btn-primary">Salvar Permissões</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('btn-cancel-assign').onclick = () => { modalWrap.innerHTML = ''; };

  document.getElementById('form-assign-tenants').onsubmit = async (e) => {
    e.preventDefault();
    const checked = Array.from(document.querySelectorAll('input[name="tenant_ids"]:checked')).map(cb => parseInt(cb.value));
    try {
      await api.updateManagerUser(userObj.id, { assigned_tenant_ids: checked });
      modalWrap.innerHTML = '';
      showFeedback(`Permissões do usuário ${userObj.username} atualizadas com sucesso!`, 'success');
      loadManagerUsers();
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };
}

function openNewManagerUserModal() {
  const modalWrap = document.getElementById('manager-modal-wrap');
  modalWrap.innerHTML = `
    <div class="modal-backdrop" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;">
      <div class="modal-content" style="background:#fff; border-radius:10px; width:90%; max-width:480px; padding:24px;">
        <h3 style="margin-top:0;">➕ Novo Usuário do Gerenciador</h3>
        <form id="form-create-muser">
          <div class="form-group" style="margin-bottom:12px;">
            <label>Nome de Usuário *</label>
            <input type="text" id="muser-username" required style="width:100%; padding:8px;">
          </div>
          <div class="form-group" style="margin-bottom:12px;">
            <label>E-mail *</label>
            <input type="email" id="muser-email" required style="width:100%; padding:8px;">
          </div>
          <div class="form-group" style="margin-bottom:12px;">
            <label>Senha de Acesso *</label>
            <input type="password" id="muser-pass" required minlength="4" style="width:100%; padding:8px;">
          </div>
          <div class="form-group" style="margin-bottom:16px;">
            <label>Perfil de Acesso</label>
            <select id="muser-role" style="width:100%; padding:8px;">
              <option value="manager" selected>Gestor de Clientes (Enxerga apenas atribuídos)</option>
              <option value="superadmin">Admin da Plataforma (Enxerga tudo)</option>
            </select>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px;">
            <button type="button" id="btn-cancel-muser" class="btn btn-secondary">Cancelar</button>
            <button type="submit" class="btn btn-primary">Criar Usuário</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('btn-cancel-muser').onclick = () => { modalWrap.innerHTML = ''; };

  document.getElementById('form-create-muser').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createManagerUser({
        username: document.getElementById('muser-username').value,
        email: document.getElementById('muser-email').value,
        password: document.getElementById('muser-pass').value,
        role: document.getElementById('muser-role').value
      });
      modalWrap.innerHTML = '';
      showFeedback('Novo usuário gestor cadastrado com sucesso!', 'success');
      loadManagerUsers();
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };
}

function renderManagerLoginForm(container) {
  container.innerHTML = `
    <div style="max-width:440px; margin:40px auto; background:#fff; padding:30px; border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.08); border:1px solid #e2e8f0;">
      <div style="text-align:center; margin-bottom:20px;">
        <span style="font-size:2.5rem;">🏢</span>
        <h2 style="margin:8px 0;">Gerenciador Multi-Cliente</h2>
        <p style="color:#64748b; font-size:0.875rem;">Entre com suas credenciais de gestor ou administrador da plataforma.</p>
      </div>

      <div id="mlogin-alert" style="display:none; padding:10px; border-radius:6px; margin-bottom:14px; font-size:0.875rem; background:#fee2e2; color:#991b1b;"></div>

      <form id="form-manager-login">
        <div class="form-group" style="margin-bottom:14px;">
          <label>Usuário Gestor</label>
          <input type="text" id="mlogin-user" placeholder="Ex: superadmin" required style="width:100%; padding:10px;">
        </div>
        <div class="form-group" style="margin-bottom:18px;">
          <label>Senha</label>
          <input type="password" id="mlogin-pass" placeholder="••••••••" required style="width:100%; padding:10px;">
        </div>
        <button type="submit" id="btn-mlogin-submit" class="btn btn-primary" style="width:100%; padding:10px; font-size:1rem;">
          Entrar no Gerenciador
        </button>
      </form>
    </div>
  `;

  document.getElementById('form-manager-login').onsubmit = async (e) => {
    e.preventDefault();
    const alertDiv = document.getElementById('mlogin-alert');
    const btn = document.getElementById('btn-mlogin-submit');
    btn.disabled = true;
    btn.textContent = 'Verificando credenciais...';

    try {
      await api.managerLogin(
        document.getElementById('mlogin-user').value,
        document.getElementById('mlogin-pass').value
      );
      renderClientsManagerView(container);
    } catch (err) {
      alertDiv.style.display = 'block';
      alertDiv.textContent = err.message;
      btn.disabled = false;
      btn.textContent = 'Entrar no Gerenciador';
    }
  };
}
