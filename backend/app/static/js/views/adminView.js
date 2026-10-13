import api, { getUser } from '../api.js';

export async function renderAdminView(container) {
  const user = getUser();
  const username = user ? user.username : 'admin';

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2>Configurações do Usuário</h2>
        <p class="subtitle">Gerenciamento de credenciais e troca de senha de acesso</p>
      </div>
    </div>

    <div style="max-width: 520px;">
      <!-- Card: Alteração de Senha do Usuário -->
      <div class="filter-panel" style="margin-bottom:0;">
        <div class="filter-header">
          <span>🔒 Alterar Minha Senha de Acesso</span>
        </div>
        <div id="password-alert" style="display:none; margin-bottom:12px;" class="login-error-alert"></div>
        <form id="form-change-password" class="form-grid" style="grid-template-columns: 1fr;">
          <div class="form-group">
            <label>Usuário Atual</label>
            <input type="text" value="${username}" disabled style="background-color:#f1f5f9;">
          </div>
          <div class="form-group">
            <label>Senha Atual *</label>
            <input type="password" id="pwd-current" placeholder="Digite sua senha atual" required>
          </div>
          <div class="form-group">
            <label>Nova Senha *</label>
            <input type="password" id="pwd-new" placeholder="Digite a nova senha" required minlength="4">
          </div>
          <div class="form-group">
            <label>Confirmar Nova Senha *</label>
            <input type="password" id="pwd-confirm" placeholder="Confirme a nova senha" required minlength="4">
          </div>
          <div style="margin-top:8px;">
            <button type="submit" id="btn-save-pwd" class="btn btn-primary" style="width:100%;">
              💾 Salvar Nova Senha
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Change Password Form Handling
  const pwdForm = container.querySelector('#form-change-password');
  const alertBox = container.querySelector('#password-alert');
  const btnSavePwd = container.querySelector('#btn-save-pwd');

  pwdForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.style.display = 'none';

    const currentPwd = container.querySelector('#pwd-current').value;
    const newPwd = container.querySelector('#pwd-new').value;
    const confirmPwd = container.querySelector('#pwd-confirm').value;

    if (newPwd !== confirmPwd) {
      alertBox.textContent = 'As senhas digitadas não coincidem.';
      alertBox.style.display = 'block';
      return;
    }

    btnSavePwd.disabled = true;
    btnSavePwd.textContent = 'Salvando...';

    try {
      await api.changePassword(currentPwd, newPwd);
      alert('Senha alterada com sucesso! Utilize a nova senha no próximo login.');
      pwdForm.reset();
    } catch (err) {
      alertBox.textContent = err.message || 'Erro ao alterar senha.';
      alertBox.style.display = 'block';
    } finally {
      btnSavePwd.disabled = false;
      btnSavePwd.textContent = '💾 Salvar Nova Senha';
    }
  });
}
