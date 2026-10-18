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
    <div class="login-card" style="max-width: 420px;">
      <div class="login-header">
        <div class="login-logo">🏥</div>
        <h1>Flow CMMS</h1>
        <p>Portal do Cliente • Gestão Hospitalar</p>
      </div>

      <div id="login-error" class="login-error-alert" style="display: none;"></div>

      <!-- Formulário de Login Único: Sempre com Usuário e Senha -->
      <form id="login-form" class="login-form">
        <div class="form-group">
          <label for="login-tenant">
            Unidade / Hospital (Slug) *
            ${paramSlug ? '<small style="color:#2563eb; font-weight:bold;">(Definido via URL)</small>' : ''}
          </label>
          <input
            id="login-tenant"
            type="text"
            placeholder="Ex: hospital-xyz ou matriz"
            value="${initialTenant}"
            required
            style="font-family:monospace;"
          />
        </div>

        <div class="form-group">
          <label for="login-username">Nome de Usuário *</label>
          <input
            id="login-username"
            type="text"
            placeholder="Digite seu usuário"
            required
            autocomplete="username"
          />
        </div>

        <div class="form-group">
          <label for="login-password">Senha de Acesso *</label>
          <input
            id="login-password"
            type="password"
            placeholder="Digite sua senha"
            required
            autocomplete="current-password"
          />
        </div>

        <button type="submit" id="btn-login-submit" class="login-button">
          Entrar no Sistema ➜
        </button>
      </form>

      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; margin-top:20px; font-size:0.8rem; color:#64748b; line-height:1.4;">
        ℹ️ <strong>Acesso do Solicitante sem senha:</strong> É realizado exclusivamente através do link direto com token fornecido pela administração do hospital.
      </div>

      <div style="text-align:center; margin-top:16px; font-size:0.8rem; color:#64748b;">
        Acesso administrativo da plataforma? <a href="/gerenciador" style="color:#2563eb; text-decoration:none; font-weight:600;">Ir para o Gerenciador</a>
      </div>
    </div>
  `;

  const loginForm = container.querySelector('#login-form');
  const errorBox = container.querySelector('#login-error');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.style.display = 'none';
    const submitBtn = loginForm.querySelector('#btn-login-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Conectando ao banco da unidade...';

    const tenantSlug = loginForm.querySelector('#login-tenant').value.trim().toLowerCase();
    const username = loginForm.querySelector('#login-username').value.trim();
    const password = loginForm.querySelector('#login-password').value;

    setActiveTenant(tenantSlug);

    try {
      await api.login(username, password);
      onLoginSuccess();
    } catch (err) {
      errorBox.textContent = err.message || 'Credenciais inválidas para esta unidade.';
      errorBox.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar no Sistema ➜';
    }
  });
}
