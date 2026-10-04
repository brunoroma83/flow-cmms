import api, { getUser } from '../api.js';

export async function renderAdminView(container) {
  const user = getUser();
  const username = user ? user.username : 'admin';
  const mcpUrl = `${window.location.origin}/mcp/sse`;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2>Painel do Administrador & Configurações MCP</h2>
        <p class="subtitle">Gerenciamento de credenciais, troca de senha e tokens do protocolo MCP</p>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
      <!-- Card 1: Alteração de Senha -->
      <div class="filter-panel" style="margin-bottom:0;">
        <div class="filter-header">
          <span>🔒 Alterar Senha de Acesso</span>
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

      <!-- Card 2: Configuração e Token MCP -->
      <div class="filter-panel" style="margin-bottom:0;">
        <div class="filter-header">
          <span>🤖 Servidor MCP (Model Context Protocol)</span>
        </div>
        <div style="font-size:0.875rem; color:var(--text-main); margin-bottom:16px;">
          Use este servidor para conectar Agentes de IA (Antigravity, Cursor, Claude Desktop, LangChain) diretamente ao banco de dados do Flow CMMS.
        </div>

        <div class="form-group" style="margin-bottom:16px;">
          <label>🌐 URL do Servidor MCP (SSE Endpoint)</label>
          <div style="display:flex; gap:8px;">
            <input type="text" id="mcp-server-url" value="${mcpUrl}" readonly style="background-color:#f8fafc; font-family:monospace; font-size:0.85rem;">
            <button id="btn-copy-url" class="btn btn-outline btn-sm">📋 Copiar</button>
          </div>
        </div>

        <div class="form-group">
          <label>🔑 Token de Acesso de Longa Duração (Bearer Token)</label>
          <div style="margin-bottom:10px;">
            <button id="btn-generate-mcp-token" class="btn btn-success" style="width:100%;">
              ✨ Gerar Novo Token MCP (365 Dias)
            </button>
          </div>
          <div id="mcp-token-container" style="display:none; flex-direction:column; gap:8px;">
            <textarea id="mcp-token-display" rows="4" readonly style="font-family:monospace; font-size:0.75rem; word-break:break-all; background-color:#f8fafc;"></textarea>
            <button id="btn-copy-token" class="btn btn-outline btn-sm">📋 Copiar Token de Acesso</button>
            <div style="font-size:0.775rem; color:var(--success); font-weight:600;">
              ✓ Token gerado com sucesso! Válido por 365 dias.
            </div>
          </div>
        </div>
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

  // Copy MCP URL
  const copyUrlBtn = container.querySelector('#btn-copy-url');
  copyUrlBtn.addEventListener('click', () => {
    const urlInput = container.querySelector('#mcp-server-url');
    urlInput.select();
    navigator.clipboard.writeText(urlInput.value);
    copyUrlBtn.textContent = '✓ Copiado!';
    setTimeout(() => { copyUrlBtn.textContent = '📋 Copiar'; }, 2000);
  });

  // Generate MCP Token
  const genTokenBtn = container.querySelector('#btn-generate-mcp-token');
  const tokenContainer = container.querySelector('#mcp-token-container');
  const tokenDisplay = container.querySelector('#mcp-token-display');
  const copyTokenBtn = container.querySelector('#btn-copy-token');

  genTokenBtn.addEventListener('click', async () => {
    genTokenBtn.disabled = true;
    genTokenBtn.textContent = 'Gerando Token...';

    try {
      const res = await api.generateMCPToken();
      tokenDisplay.value = res.mcp_token;
      tokenContainer.style.display = 'flex';
    } catch (err) {
      alert('Erro ao gerar Token MCP: ' + err.message);
    } finally {
      genTokenBtn.disabled = false;
      genTokenBtn.textContent = '✨ Gerar Novo Token MCP (365 Dias)';
    }
  });

  copyTokenBtn.addEventListener('click', () => {
    tokenDisplay.select();
    navigator.clipboard.writeText(tokenDisplay.value);
    copyTokenBtn.textContent = '✓ Token Copiado!';
    setTimeout(() => { copyTokenBtn.textContent = '📋 Copiar Token de Acesso'; }, 2000);
  });
}
