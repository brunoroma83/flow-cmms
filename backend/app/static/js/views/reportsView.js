import api from '../api.js';

export async function renderReportsView(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2>Relatórios e Indicadores CMMS</h2>
        <p class="subtitle">Desempenho operacional da Engenharia Clínica e métricas do parque hospitalar</p>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📋</div>
        <div class="stat-info">
          <div class="stat-value" id="report-total-equip">-</div>
          <div class="stat-label">Total de Equipamentos Mapeados</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background-color: var(--warning-light);">🛠️</div>
        <div class="stat-info">
          <div class="stat-value" id="report-active-os">-</div>
          <div class="stat-label">OSs Ativas em Atendimento</div>
        </div>
      </div>
    </div>

    <div class="filter-panel" style="margin-top: 16px;">
      <h3 style="margin-bottom: 12px; font-size: 1.1rem; color: var(--text-main);">📈 Relatórios Disponíveis para Exportação</h3>
      <ul style="list-style: none; display: flex; flex-direction: column; gap: 10px;">
        <li style="padding: 12px; background: #f8fafc; border-radius: 6px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>Relatório de Ativos Médicos e Registro ANVISA</strong>
            <p style="font-size: 0.8rem; color: var(--text-muted);">Lista detalhada de equipamentos, números de série, setores e status.</p>
          </div>
          <a href="#assets" class="btn btn-outline btn-sm">Acessar e Exportar CSV</a>
        </li>
        <li style="padding: 12px; background: #f8fafc; border-radius: 6px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>Relatório de Manutenções e Controle de Downtime</strong>
            <p style="font-size: 0.8rem; color: var(--text-muted);">Histórico de Ordens de Serviço, tempos de atendimento, parada e custos.</p>
          </div>
          <a href="#maintenance" class="btn btn-outline btn-sm">Acessar e Exportar CSV</a>
        </li>
      </ul>
    </div>
  `;

  try {
    const data = await api.getDashboardIndicators();
    const stats = data.indicators || data;
    container.querySelector('#report-total-equip').textContent = stats.total_equipment || 0;
    container.querySelector('#report-active-os').textContent = stats.active_maintenances || 0;
  } catch (e) {}
}
