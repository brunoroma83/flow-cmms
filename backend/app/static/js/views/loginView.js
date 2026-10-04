import api from '../api.js';

export function renderLoginView(container, onLoginSuccess) {
  container.innerHTML = `
    <div class="login-card">
      <div class="login-header">
        <div class="login-logo">🏥</div>
        <h1>Flow CMMS</h1>
        <p>Gestão de Equipamentos Médicos</p>
      </div>

      <div id="login-error" class="login-error-alert" style="display: none;"></div>

      <form id="login-form" class="login-form">
        <div class="form-group">
          <label for="login-username">Usuário</label>
          <input
            id="login-username"
            type="text"
            placeholder="Digite seu usuário"
            required
          />
        </div>

        <div class="form-group">
          <label for="login-password">Senha</label>
          <input
            id="login-password"
            type="password"
            placeholder="Digite sua senha"
            required
          />
        </div>

        <button type="submit" id="btn-login-submit" class="login-button">
          Entrar no Sistema
        </button>
      </form>
    </div>
  `;

  const form = container.querySelector('#login-form');
  const usernameInput = container.querySelector('#login-username');
  const passwordInput = container.querySelector('#login-password');
  const submitBtn = container.querySelector('#btn-login-submit');
  const errorBox = container.querySelector('#login-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Autenticando...';

    try {
      await api.login(usernameInput.value.trim(), passwordInput.value);
      onLoginSuccess();
    } catch (err) {
      errorBox.textContent = err.message || 'Credenciais inválidas.';
      errorBox.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar no Sistema';
    }
  });
}
