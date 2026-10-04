import api from '../api.js';

export async function renderDashboardView(container) {
  container.innerHTML = `<div class="loading-spinner">Carregando indicadores do sistema CMMS...</div>`;

  try {
    const data = await api.getDashboardIndicators();
    const stats = data.indicators || {
      total_equipment: data.total_equipment || 0,
      active_maintenances: data.active_maintenances || 0,
      pending_maintenances: data.pending_maintenances || 0,
      low_stock_items: data.low_stock_items || 0
    };

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">🩺</div>
          <div class="stat-info">
            <div class="stat-value">${stats.total_equipment}</div>
            <div class="stat-label">Equipamentos Médicos Cadastrados</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--warning-light);">🔧</div>
          <div class="stat-info">
            <div class="stat-value">${stats.active_maintenances}</div>
            <div class="stat-label">Manutenções em Andamento</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--danger-light);">⏳</div>
          <div class="stat-info">
            <div class="stat-value">${stats.pending_maintenances}</div>
            <div class="stat-label">Ordens de Serviço Pendentes</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--primary-light);">📦</div>
          <div class="stat-info">
            <div class="stat-value">${stats.low_stock_items}</div>
            <div class="stat-label">Peças em Estoque Crítico</div>
          </div>
        </div>
      </div>

      <div class="filter-panel" style="margin-top: 16px;">
        <div class="filter-header">
          <span>🚀 Atalhos e Ações Rápidas do CMMS</span>
        </div>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <a href="#assets" class="btn btn-primary">🩺 Ver Ativos Médicos</a>
          <a href="#maintenance" class="btn btn-success">🔧 Gestão de OS</a>
          <a href="#inventory" class="btn btn-outline">📦 Estoque de Peças</a>
          <a href="#reports" class="btn btn-secondary">📈 Relatórios Operacionais</a>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="login-error-alert">Erro ao carregar indicadores: ${err.message}</div>`;
  }
}
