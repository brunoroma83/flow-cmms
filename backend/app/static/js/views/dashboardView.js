import api from '../api.js';

export async function renderDashboardView(container) {
  container.innerHTML = `<div class="loading-spinner">Carregando indicadores do sistema CMMS...</div>`;

  try {
    const data = await api.getDashboardIndicators();

    const totalEquipment = data.total_equipment ?? 0;
    const activeMaintenances = data.active_maintenances ?? 0;
    const pendingMaintenances = data.pending_maintenances ?? 0;
    const lowStockItems = data.low_stock_items ?? 0;

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">🩺</div>
          <div class="stat-info">
            <div class="stat-value">${totalEquipment}</div>
            <div class="stat-label">Equipamentos Médicos Cadastrados</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--warning-light);">🔧</div>
          <div class="stat-info">
            <div class="stat-value">${activeMaintenances}</div>
            <div class="stat-label">Manutenções em Andamento</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--danger-light);">⏳</div>
          <div class="stat-info">
            <div class="stat-value">${pendingMaintenances}</div>
            <div class="stat-label">Ordens de Serviço Pendentes</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background-color: var(--primary-light);">📦</div>
          <div class="stat-info">
            <div class="stat-value">${lowStockItems}</div>
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
