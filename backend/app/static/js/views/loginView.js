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
    <div class="login-card">
      <div class="login-header">
        <div class="login-logo">🏥</div>
        <h1>Flow CMMS</h1>
        <p>Portal do Cliente • Gestão Hospitalar</p>
      </div>

      <div id="login-error" class="login-error-alert" style="display: none;"></div>

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
          <small style="color:#64748b; font-size:0.75rem; margin-top:2px; display:block;">
            Identificador exclusivo da sua unidade hospitalar.
          </small>
        </div>

        <div class="form-group">
          <label for="login-username">Usuário *</label>
          <input
            id="login-username"
            type="text"
            placeholder="Digite seu usuário"
            required
          />
        </div>

        <div class="form-group">
          <label for="login-password">Senha *</label>
          <input
            id="login-password"
            type="password"
            placeholder="Digite sua senha"
            required
          />
        </div>

        <button type="submit" id="btn-login-submit" class="login-button">
          Entrar na Unidade
        </button>

        <div style="text-align:center; margin-top:16px; font-size:0.8rem; color:#64748b;">
          Acesso administrativo da plataforma? <a href="/gerenciador" style="color:#2563eb; text-decoration:none; font-weight:600;">Ir para o Gerenciador</a>
        </div>
      </form>
    </div>
  `;

  const form = container.querySelector('#login-form');
  const tenantInput = container.querySelector('#login-tenant');
  const usernameInput = container.querySelector('#login-username');
  const passwordInput = container.querySelector('#login-password');
  const submitBtn = container.querySelector('#btn-login-submit');
  const errorBox = container.querySelector('#login-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Conectando ao banco da unidade...';

    const tenantSlug = tenantInput.value.trim().toLowerCase();
    setActiveTenant(tenantSlug);

    try {
      await api.login(usernameInput.value.trim(), passwordInput.value);
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
