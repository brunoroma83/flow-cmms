import api, { setActiveTenant, getActiveTenant } from '../api.js';

export function renderLoginView(container, onLoginSuccess) {
  // Check URL parameters for tenant slug: ?s=hospital-xyz or ?tenant=hospital-xyz
  const urlParams = new URLSearchParams(window.location.search);
  const paramSlug = urlParams.get('s') || urlParams.get('tenant') || urlParams.get('slug');
  if (paramSlug) {
    setActiveTenant(paramSlug.trim().toLowerCase());
  }

  const initialTenant = getActiveTenant();

  container.innerHTML = `
    <div class="login-card" style="max-width: 440px;">
      <div class="login-header">
        <div class="login-logo">🏥</div>
        <h1>Flow CMMS</h1>
        <p>Portal do Cliente • Gestão Hospitalar</p>
      </div>

      <!-- Abas de Navegação do Login -->
      <div class="login-tabs" style="display:flex; gap:8px; margin-bottom:20px; background:#f1f5f9; padding:4px; border-radius:8px;">
        <button type="button" id="tab-requester" class="login-tab-btn active" style="flex:1; padding:8px 12px; border:none; background:#2563eb; color:#fff; font-weight:600; font-size:0.85rem; border-radius:6px; cursor:pointer; transition:all 0.2s;">
          🚀 Abertura Rápida (Sem Senha)
        </button>
        <button type="button" id="tab-tech" class="login-tab-btn" style="flex:1; padding:8px 12px; border:none; background:transparent; color:#64748b; font-weight:600; font-size:0.85rem; border-radius:6px; cursor:pointer; transition:all 0.2s;">
          🔐 Equipe Técnica (Com Senha)
        </button>
      </div>

      <div id="login-error" class="login-error-alert" style="display: none;"></div>

      <!-- Formulário 1: Solicitante (Sem Senha - Apenas Usuário) -->
      <form id="requester-login-form" class="login-form">
        <div class="form-group">
          <label for="req-tenant">
            Unidade / Hospital (Slug) *
            ${paramSlug ? '<small style="color:#2563eb; font-weight:bold;">(Definido via URL)</small>' : ''}
          </label>
          <input
            id="req-tenant"
            type="text"
            placeholder="Ex: hospital-xyz ou matriz"
            value="${initialTenant}"
            required
            style="font-family:monospace;"
          />
        </div>

        <div class="form-group">
          <label for="req-username">Seu Nome de Usuário / Identificação *</label>
          <input
            id="req-username"
            type="text"
            placeholder="Ex: maria.enfermagem ou dr.roberto"
            required
            autocomplete="username"
          />
          <small style="color:#64748b; font-size:0.75rem; margin-top:2px; display:block;">
            Não requer senha. Digite seu identificador para abrir chamados e acompanhar suas ordens.
          </small>
        </div>

        <div class="form-group">
          <label for="req-fullname">Nome Completo (Opcional)</label>
          <input
            id="req-fullname"
            type="text"
            placeholder="Ex: Maria dos Santos"
          />
        </div>

        <div class="form-group">
          <label for="req-sector">Setor / Leito / Sala (Opcional)</label>
          <input
            id="req-sector"
            type="text"
            placeholder="Ex: UTI Leito 03, Centro Cirúrgico Sala 2"
          />
        </div>

        <div class="form-group">
          <label for="req-contact">Ramal / Telefone de Contato (Opcional)</label>
          <input
            id="req-contact"
            type="text"
            placeholder="Ex: Ramal 2042 ou (11) 98888-0000"
          />
        </div>

        <button type="submit" id="btn-req-submit" class="login-button" style="background:#2563eb;">
          Entrar como Solicitante ➜
        </button>
      </form>

      <!-- Formulário 2: Login Técnico / Admin (Com Senha) -->
      <form id="tech-login-form" class="login-form" style="display: none;">
        <div class="form-group">
          <label for="tech-tenant">
            Unidade / Hospital (Slug) *
            ${paramSlug ? '<small style="color:#2563eb; font-weight:bold;">(Definido via URL)</small>' : ''}
          </label>
          <input
            id="tech-tenant"
            type="text"
            placeholder="Ex: hospital-xyz ou matriz"
            value="${initialTenant}"
            required
            style="font-family:monospace;"
          />
        </div>

        <div class="form-group">
          <label for="tech-username">Usuário Técnico / Administrador *</label>
          <input
            id="tech-username"
            type="text"
            placeholder="Digite seu usuário"
            required
          />
        </div>

        <div class="form-group">
          <label for="tech-password">Senha de Acesso *</label>
          <input
            id="tech-password"
            type="password"
            placeholder="Digite sua senha"
            required
          />
        </div>

        <button type="submit" id="btn-tech-submit" class="login-button">
          Entrar na Unidade
        </button>
      </form>

      <div style="text-align:center; margin-top:16px; font-size:0.8rem; color:#64748b;">
        Acesso administrativo da plataforma? <a href="/gerenciador" style="color:#2563eb; text-decoration:none; font-weight:600;">Ir para o Gerenciador</a>
      </div>
    </div>
  `;

  const tabReq = container.querySelector('#tab-requester');
  const tabTech = container.querySelector('#tab-tech');
  const reqForm = container.querySelector('#requester-login-form');
  const techForm = container.querySelector('#tech-login-form');
  const errorBox = container.querySelector('#login-error');

  // Alternar abas
  tabReq.addEventListener('click', () => {
    tabReq.style.background = '#2563eb';
    tabReq.style.color = '#fff';
    tabTech.style.background = 'transparent';
    tabTech.style.color = '#64748b';
    reqForm.style.display = 'block';
    techForm.style.display = 'none';
    errorBox.style.display = 'none';
  });

  tabTech.addEventListener('click', () => {
    tabTech.style.background = '#2563eb';
    tabTech.style.color = '#fff';
    tabReq.style.background = 'transparent';
    tabReq.style.color = '#64748b';
    techForm.style.display = 'block';
    reqForm.style.display = 'none';
    errorBox.style.display = 'none';
  });

  // Submit Solicitante (Sem Senha)
  reqForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.style.display = 'none';
    const submitBtn = reqForm.querySelector('#btn-req-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Acessando unidade...';

    const tenantSlug = reqForm.querySelector('#req-tenant').value.trim().toLowerCase();
    const username = reqForm.querySelector('#req-username').value.trim().toLowerCase();
    const fullName = (reqForm.querySelector('#req-fullname')?.value || '').trim();
    const sector = reqForm.querySelector('#req-sector').value.trim();
    const contact = reqForm.querySelector('#req-contact').value.trim();

    setActiveTenant(tenantSlug);

    try {
      await api.requesterLogin(username, fullName, sector, contact);
      onLoginSuccess();
    } catch (err) {
      errorBox.textContent = err.message || 'Não foi possível acessar a unidade como solicitante.';
      errorBox.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar como Solicitante ➜';
    }
  });

  // Submit Técnico (Com Senha)
  techForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.style.display = 'none';
    const submitBtn = techForm.querySelector('#btn-tech-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Conectando ao banco da unidade...';

    const tenantSlug = techForm.querySelector('#tech-tenant').value.trim().toLowerCase();
    const username = techForm.querySelector('#tech-username').value.trim();
    const password = techForm.querySelector('#tech-password').value;

    setActiveTenant(tenantSlug);

    try {
      await api.login(username, password);
      onLoginSuccess();
    } catch (err) {
      errorBox.textContent = err.message || 'Credenciais inválidas para esta unidade.';
      errorBox.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar na Unidade';
    }
  });
}

