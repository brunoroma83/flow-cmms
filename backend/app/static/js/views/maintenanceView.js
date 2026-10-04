import api from '../api.js';

export async function renderMaintenanceView(container) {
  let maintenances = [];
  let equipmentList = [];
  let filters = { search: '', type: '', status: '', equipment_id: '', start_date: '', end_date: '' };

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2>Gestão de Manutenção Preventiva e Corretiva</h2>
        <p class="subtitle">Controle de Ordens de Serviço (OS), tempos de parada e histórico técnico</p>
      </div>
      <div class="header-actions">
        <button id="btn-export-maint-csv" class="btn btn-secondary">📥 Exportar CSV</button>
        <button id="btn-new-maint" class="btn btn-primary">+ Abrir Nova Ordem de Serviço</button>
      </div>
    </div>

    <!-- Filter Panel -->
    <div class="filter-panel">
      <div class="filter-header">
        <span>🔍 Filtros de Busca</span>
        <button id="btn-clear-maint-filters" class="btn-logout" style="font-size:0.8rem; display:none;">Limpar Filtros</button>
      </div>
      <div class="filter-grid">
        <div class="filter-item search-item">
          <label>Buscar por Texto</label>
          <input type="text" id="filter-maint-search" placeholder="Nº OS, equipamento, relato, técnico, problema...">
        </div>
        <div class="filter-item">
          <label>Tipo de Manutenção</label>
          <select id="filter-maint-type">
            <option value="">Todos os Tipos</option>
            <option value="corrective">Corretiva</option>
            <option value="preventive">Preventiva</option>
          </select>
        </div>
        <div class="filter-item">
          <label>Status da OS</label>
          <select id="filter-maint-status">
            <option value="">Todos os Status</option>
            <option value="pending">Pendente</option>
            <option value="in_progress">Em Andamento</option>
            <option value="completed">Concluída</option>
          </select>
        </div>
        <div class="filter-item">
          <label>Equipamento Médico</label>
          <select id="filter-maint-equipment">
            <option value="">Todos os Equipamentos</option>
          </select>
        </div>
        <div class="filter-item">
          <label>Data Inicial</label>
          <input type="date" id="filter-maint-start-date">
        </div>
        <div class="filter-item">
          <label>Data Final</label>
          <input type="date" id="filter-maint-end-date">
        </div>
      </div>
      <div class="filter-footer" id="maint-filter-count">
        Carregando contagem...
      </div>
    </div>

    <!-- Table Container -->
    <div class="table-container" id="maint-table-wrapper">
      <div class="loading-spinner">Carregando ordens de serviço do banco de dados...</div>
    </div>
  `;

  const tableWrapper = container.querySelector('#maint-table-wrapper');
  const searchInput = container.querySelector('#filter-maint-search');
  const typeSelect = container.querySelector('#filter-maint-type');
  const statusSelect = container.querySelector('#filter-maint-status');
  const eqSelect = container.querySelector('#filter-maint-equipment');
  const startDateInput = container.querySelector('#filter-maint-start-date');
  const endDateInput = container.querySelector('#filter-maint-end-date');
  const clearBtn = container.querySelector('#btn-clear-maint-filters');
  const countFooter = container.querySelector('#maint-filter-count');
  const exportBtn = container.querySelector('#btn-export-maint-csv');
  const newBtn = container.querySelector('#btn-new-maint');

  const loadData = async () => {
    try {
      const [records, equip] = await Promise.all([
        api.getMaintenance(),
        api.getEquipment()
      ]);
      maintenances = records;
      equipmentList = equip;

      eqSelect.innerHTML = `<option value="">Todos os Equipamentos</option>` +
        equipmentList.map(eq => `<option value="${eq.id}">${eq.name} (${eq.serial_number})</option>`).join('');

      applyFiltersAndRender();
    } catch (err) {
      tableWrapper.innerHTML = `<div class="login-error-alert">Erro ao carregar ordens de serviço: ${err.message}</div>`;
    }
  };

  const getFilteredMaintenances = () => {
    return maintenances.filter(item => {
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const eq = equipmentList.find(e => e.id === item.equipment_id);
        const matches = `os-${item.id}`.includes(s) ||
                        (item.description || '').toLowerCase().includes(s) ||
                        (item.opening_report || '').toLowerCase().includes(s) ||
                        (item.technician || '').toLowerCase().includes(s) ||
                        (eq && eq.name.toLowerCase().includes(s)) ||
                        (eq && eq.serial_number.toLowerCase().includes(s));
        if (!matches) return false;
      }

      if (filters.type && item.type !== filters.type) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (filters.equipment_id && String(item.equipment_id) !== String(filters.equipment_id)) return false;

      const targetDate = item.scheduled_date ? new Date(item.scheduled_date) : new Date(item.created_at);
      if (filters.start_date) {
        const start = new Date(filters.start_date); start.setHours(0,0,0,0);
        if (targetDate < start) return false;
      }
      if (filters.end_date) {
        const end = new Date(filters.end_date); end.setHours(23,59,59,999);
        if (targetDate > end) return false;
      }

      return true;
    });
  };

  const applyFiltersAndRender = () => {
    const filtered = getFilteredMaintenances();
    const isFiltered = filters.search || filters.type || filters.status || filters.equipment_id || filters.start_date || filters.end_date;
    clearBtn.style.display = isFiltered ? 'inline-block' : 'none';

    countFooter.innerHTML = `Exibindo <strong>${filtered.length}</strong> de <strong>${maintenances.length}</strong> ordens de serviço.`;

    if (filtered.length === 0) {
      tableWrapper.innerHTML = `<div class="empty-state">${isFiltered ? 'Nenhuma ordem de serviço corresponde aos filtros.' : 'Nenhuma ordem de serviço cadastrada.'}</div>`;
      return;
    }

    tableWrapper.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>OS #</th>
            <th>Equipamento</th>
            <th>Tipo</th>
            <th>Descrição / Relato</th>
            <th>Status</th>
            <th>Técnico</th>
            <th>Custo</th>
            <th style="text-align: center;">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(item => {
            const eq = equipmentList.find(e => e.id === item.equipment_id);
            const eqName = eq ? `${eq.name} (${eq.serial_number})` : `Equipamento #${item.equipment_id}`;
            return `
              <tr>
                <td><strong>OS-${item.id}</strong></td>
                <td>${eqName}</td>
                <td><span class="badge ${item.type === 'preventive' ? 'badge-info' : 'badge-warning'}">${item.type === 'preventive' ? 'Preventiva' : 'Corretiva'}</span></td>
                <td>
                  <div>${item.description}</div>
                  ${item.opening_report ? `<div style="font-size:0.75rem; color:var(--text-muted);"><em>Relato: ${item.opening_report.length > 45 ? item.opening_report.substring(0, 45) + '...' : item.opening_report}</em></div>` : ''}
                </td>
                <td>
                  <span class="badge ${item.status === 'completed' ? 'badge-success' : item.status === 'in_progress' ? 'badge-warning' : 'badge-danger'}">
                    ${item.status === 'completed' ? 'Concluída' : item.status === 'in_progress' ? 'Em Andamento' : 'Pendente'}
                  </span>
                </td>
                <td>${item.technician || 'Não atribuído'}</td>
                <td>${item.cost ? `R$ ${item.cost.toFixed(2)}` : 'R$ 0,00'}</td>
                <td style="text-align: center;">
                  <button class="btn btn-outline btn-sm btn-maint-details" data-id="${item.id}">🔍 Detalhes</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    tableWrapper.querySelectorAll('.btn-maint-details').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        const item = maintenances.find(m => m.id === id);
        if (item) openMaintDetailModal(item, equipmentList, loadData);
      });
    });
  };

  // Filter Event Handlers
  searchInput.addEventListener('input', (e) => { filters.search = e.target.value; applyFiltersAndRender(); });
  typeSelect.addEventListener('change', (e) => { filters.type = e.target.value; applyFiltersAndRender(); });
  statusSelect.addEventListener('change', (e) => { filters.status = e.target.value; applyFiltersAndRender(); });
  eqSelect.addEventListener('change', (e) => { filters.equipment_id = e.target.value; applyFiltersAndRender(); });
  startDateInput.addEventListener('change', (e) => { filters.start_date = e.target.value; applyFiltersAndRender(); });
  endDateInput.addEventListener('change', (e) => { filters.end_date = e.target.value; applyFiltersAndRender(); });

  clearBtn.addEventListener('click', () => {
    filters = { search: '', type: '', status: '', equipment_id: '', start_date: '', end_date: '' };
    searchInput.value = ''; typeSelect.value = ''; statusSelect.value = ''; eqSelect.value = '';
    startDateInput.value = ''; endDateInput.value = '';
    applyFiltersAndRender();
  });

  // CSV Export
  exportBtn.addEventListener('click', () => {
    const filtered = getFilteredMaintenances();
    if (filtered.length === 0) { alert('Nenhuma ordem de serviço para exportar.'); return; }

    const headers = ['OS ID', 'Equipamento', 'Série', 'Tipo', 'Status', 'Técnico', 'Custo (R$)', 'Data Agendada', 'Descrição', 'Relato de Abertura'];
    const rows = filtered.map(item => {
      const eq = equipmentList.find(e => e.id === item.equipment_id);
      return [
        `OS-${item.id}`, eq ? eq.name : '', eq ? eq.serial_number : '',
        item.type, item.status, item.technician || '', item.cost ? item.cost.toFixed(2) : '0.00',
        item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString('pt-BR') : '',
        item.description || '', item.opening_report || ''
      ].map(v => `"${String(v).replace(/"/g, '""')}"`);
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ordens_servico_cmms_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  });

  // New OS Modal
  newBtn.addEventListener('click', () => {
    openNewOSModal(equipmentList, loadData);
  });

  await loadData();
}

function openNewOSModal(equipmentList, onSuccess) {
  const container = document.getElementById('modal-container');
  container.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container">
        <div class="modal-header">
          <h3>+ Abertura de Ordem de Serviço (OS)</h3>
          <button class="modal-close" id="modal-close-btn">✕</button>
        </div>
        <form id="form-new-os">
          <div class="modal-body form-grid">
            <div class="form-group full-width">
              <label>Equipamento Médico *</label>
              <select id="new-os-equipment" required>
                ${equipmentList.map(eq => `<option value="${eq.id}">${eq.name} - ${eq.serial_number} (${eq.location || 'Sem local'})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Tipo de Manutenção *</label>
              <select id="new-os-type">
                <option value="corrective">Corretiva (Reparo/Falha)</option>
                <option value="preventive">Preventiva (Calibração/Inspeção)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Status Inicial</label>
              <select id="new-os-status">
                <option value="pending">Pendente</option>
                <option value="in_progress">Em Andamento</option>
                <option value="completed">Concluída</option>
              </select>
            </div>
            <div class="form-group">
              <label>Técnico Responsável</label>
              <input type="text" id="new-os-technician" placeholder="Ex: Eng. Carlos Silva">
            </div>
            <div class="form-group">
              <label>Custo Estimado (R$)</label>
              <input type="number" step="0.01" id="new-os-cost" placeholder="0.00">
            </div>
            <div class="form-group">
              <label>Data Agendada *</label>
              <input type="date" id="new-os-scheduled" value="${new Date().toISOString().split('T')[0]}" required>
            </div>
            <div class="form-group">
              <label>Início do Atendimento (OS)</label>
              <input type="datetime-local" id="new-os-start-time">
            </div>
            <div class="form-group">
              <label>Início da Parada (Downtime)</label>
              <input type="datetime-local" id="new-os-downtime-start">
            </div>
            <div class="form-group full-width">
              <label>Descrição do Problema / Serviço Solicitado *</label>
              <textarea id="new-os-description" rows="3" placeholder="Descreva detalhadamente a falha apresentada pelo equipamento..." required></textarea>
            </div>
            <div class="form-group full-width">
              <label>Relato de Abertura do Chamado</label>
              <textarea id="new-os-opening-report" rows="2" placeholder="Relato inicial do operador ou setor solicitante..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btn-cancel-os">Cancelar</button>
            <button type="submit" class="btn btn-success" id="btn-save-os">Gerar Ordem de Serviço</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const close = () => { container.innerHTML = ''; };
  container.querySelector('#modal-close-btn').onclick = close;
  container.querySelector('#btn-cancel-os').onclick = close;

  container.querySelector('#form-new-os').onsubmit = async (e) => {
    e.preventDefault();
    const btn = container.querySelector('#btn-save-os');
    btn.disabled = true; btn.textContent = 'Gerando OS...';

    const parseISO = (v) => v ? new Date(v).toISOString() : null;

    const payload = {
      equipment_id: parseInt(container.querySelector('#new-os-equipment').value, 10),
      type: container.querySelector('#new-os-type').value,
      status: container.querySelector('#new-os-status').value,
      technician: container.querySelector('#new-os-technician').value.trim(),
      cost: parseFloat(container.querySelector('#new-os-cost').value || 0),
      scheduled_date: parseISO(container.querySelector('#new-os-scheduled').value),
      start_time: parseISO(container.querySelector('#new-os-start-time').value),
      downtime_start: parseISO(container.querySelector('#new-os-downtime-start').value),
      description: container.querySelector('#new-os-description').value.trim(),
      opening_report: container.querySelector('#new-os-opening-report').value.trim()
    };

    try {
      await api.createMaintenance(payload);
      close();
      await onSuccess();
    } catch (err) {
      alert('Erro ao gerar Ordem de Serviço: ' + err.message);
      btn.disabled = false; btn.textContent = 'Gerar Ordem de Serviço';
    }
  };
}

async function openMaintDetailModal(item, equipmentList, onSuccess) {
  const container = document.getElementById('modal-container');
  const toInputDate = (d) => d ? new Date(d).toISOString().split('T')[0] : '';
  const toInputDateTime = (d) => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    const pad = (n) => n < 10 ? '0' + n : n;
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  container.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container modal-lg">
        <div class="modal-header">
          <div>
            <h3>Ordem de Serviço #OS-${item.id}</h3>
            <p style="font-size:0.85rem; color:var(--text-muted);">Equipamento: <strong>${(equipmentList.find(e => e.id === item.equipment_id) || {}).name || item.equipment_id}</strong></p>
          </div>
          <button class="modal-close" id="modal-close-btn">✕</button>
        </div>
        <div class="modal-body">
          <form id="form-edit-os">
            <h4 style="margin-bottom:12px; font-size:1rem; color:var(--text-main);">📋 Informações da Ordem de Serviço</h4>
            <div class="form-grid" style="margin-bottom:20px;">
              <div class="form-group">
                <label>Tipo de Manutenção</label>
                <select id="edit-os-type">
                  <option value="corrective" ${item.type === 'corrective' ? 'selected' : ''}>Corretiva</option>
                  <option value="preventive" ${item.type === 'preventive' ? 'selected' : ''}>Preventiva</option>
                </select>
              </div>
              <div class="form-group">
                <label>Status da OS</label>
                <select id="edit-os-status">
                  <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>Pendente</option>
                  <option value="in_progress" ${item.status === 'in_progress' ? 'selected' : ''}>Em Andamento</option>
                  <option value="completed" ${item.status === 'completed' ? 'selected' : ''}>Concluída</option>
                </select>
              </div>
              <div class="form-group">
                <label>Técnico Responsável</label>
                <input type="text" id="edit-os-technician" value="${item.technician || ''}">
              </div>
              <div class="form-group">
                <label>Custo (R$)</label>
                <input type="number" step="0.01" id="edit-os-cost" value="${item.cost || 0}">
              </div>
              <div class="form-group">
                <label>Data Agendada</label>
                <input type="date" id="edit-os-scheduled" value="${toInputDate(item.scheduled_date)}">
              </div>
              <div class="form-group">
                <label>Início do Atendimento</label>
                <input type="datetime-local" id="edit-os-start-time" value="${toInputDateTime(item.start_time)}">
              </div>
              <div class="form-group">
                <label>Fechamento da OS</label>
                <input type="datetime-local" id="edit-os-completion-time" value="${toInputDateTime(item.completion_time)}">
              </div>
              <div class="form-group">
                <label>Início da Parada</label>
                <input type="datetime-local" id="edit-os-downtime-start" value="${toInputDateTime(item.downtime_start)}">
              </div>
              <div class="form-group">
                <label>Término da Parada</label>
                <input type="datetime-local" id="edit-os-downtime-end" value="${toInputDateTime(item.downtime_end)}">
              </div>
              <div class="form-group full-width">
                <label>Descrição do Problema / Serviço</label>
                <textarea id="edit-os-description" rows="2">${item.description || ''}</textarea>
              </div>
              <div class="form-group full-width">
                <label>Relato de Abertura do Chamado</label>
                <textarea id="edit-os-opening-report" rows="2">${item.opening_report || ''}</textarea>
              </div>
              <div class="full-width" style="text-align:right;">
                <button type="submit" class="btn btn-primary" id="btn-save-edit-os">💾 Salvar Alterações na OS</button>
              </div>
            </div>
          </form>

          <!-- 1:N Technical Entries Timeline -->
          <div style="border-top:2px solid var(--border-color); padding-top:16px;">
            <h4 style="margin-bottom:12px; font-size:1rem; color:var(--text-main);">💬 Histórico de Avaliações Técnicas, Peças e Soluções (1:N)</h4>
            
            <form id="form-add-entry" style="background:#f8fafc; border:1px solid var(--border-color); padding:14px; border-radius:8px; margin-bottom:16px;">
              <h5 style="margin-bottom:10px; color:var(--primary);">+ Incluir Informação Complementar / Parecer Técnico</h5>
              <div class="form-grid">
                <div class="form-group">
                  <label>Tipo de Informação</label>
                  <select id="new-entry-type">
                    <option value="technical_assessment">Avaliação Técnica</option>
                    <option value="technical_solution">Solução Técnica</option>
                    <option value="parts_used">Peças Utilizadas</option>
                    <option value="general_observation">Observação Geral</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Registrado Por (Nome/Técnico)</label>
                  <input type="text" id="new-entry-author" placeholder="Ex: Eng. Carlos / Resp. Técnico">
                </div>
                <div class="form-group full-width">
                  <label>Descrição / Observações Técnicas *</label>
                  <textarea id="new-entry-notes" rows="2" placeholder="Descreva a avaliação realizada, peças substituídas ou testes..." required></textarea>
                </div>
                <div class="full-width" style="text-align:right;">
                  <button type="submit" class="btn btn-success btn-sm" id="btn-save-entry">+ Salvar Registro Técnico</button>
                </div>
              </div>
            </form>

            <div id="entries-timeline-wrapper" class="entries-timeline">
              <div class="loading-spinner">Carregando pareceres técnicos...</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-close-footer">Fechar Janela</button>
        </div>
      </div>
    </div>
  `;

  const close = () => { container.innerHTML = ''; };
  container.querySelector('#modal-close-btn').onclick = close;
  container.querySelector('#modal-close-footer').onclick = close;

  const timelineWrapper = container.querySelector('#entries-timeline-wrapper');

  const loadEntries = async () => {
    try {
      const entries = await api.getMaintenanceEntries(item.id);
      if (!entries || entries.length === 0) {
        timelineWrapper.innerHTML = `<div class="empty-state">Nenhum parecer técnico ou informação registrada ainda.</div>`;
      } else {
        timelineWrapper.innerHTML = entries.map(e => {
          let label = 'Observação Geral'; let badgeClass = 'badge-secondary';
          if (e.entry_type === 'technical_assessment') { label = 'Avaliação Técnica'; badgeClass = 'badge-info'; }
          else if (e.entry_type === 'technical_solution') { label = 'Solução Técnica'; badgeClass = 'badge-success'; }
          else if (e.entry_type === 'parts_used') { label = 'Peças Utilizadas'; badgeClass = 'badge-warning'; }

          return `
            <div class="timeline-card">
              <div class="timeline-meta">
                <span class="badge ${badgeClass}">${label}</span>
                <span>${new Date(e.created_at).toLocaleString('pt-BR')} ${e.registered_by ? `• por ${e.registered_by}` : ''}</span>
              </div>
              <div class="timeline-text">${e.notes}</div>
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      timelineWrapper.innerHTML = `<div class="empty-state">Sem pareceres técnicos registrados.</div>`;
    }
  };

  // Handle Edit OS form submit
  container.querySelector('#form-edit-os').onsubmit = async (e) => {
    e.preventDefault();
    const btn = container.querySelector('#btn-save-edit-os');
    btn.disabled = true; btn.textContent = 'Salvando...';

    const parseISO = (v) => v ? new Date(v).toISOString() : null;

    const payload = {
      type: container.querySelector('#edit-os-type').value,
      status: container.querySelector('#edit-os-status').value,
      technician: container.querySelector('#edit-os-technician').value.trim(),
      cost: parseFloat(container.querySelector('#edit-os-cost').value || 0),
      scheduled_date: parseISO(container.querySelector('#edit-os-scheduled').value),
      start_time: parseISO(container.querySelector('#edit-os-start-time').value),
      completion_time: parseISO(container.querySelector('#edit-os-completion-time').value),
      downtime_start: parseISO(container.querySelector('#edit-os-downtime-start').value),
      downtime_end: parseISO(container.querySelector('#edit-os-downtime-end').value),
      description: container.querySelector('#edit-os-description').value.trim(),
      opening_report: container.querySelector('#edit-os-opening-report').value.trim()
    };

    try {
      await api.updateMaintenance(item.id, payload);
      alert('Ordem de Serviço atualizada com sucesso!');
      await onSuccess();
      btn.disabled = false; btn.textContent = '💾 Salvar Alterações na OS';
    } catch (err) {
      alert('Erro ao atualizar OS: ' + err.message);
      btn.disabled = false; btn.textContent = '💾 Salvar Alterações na OS';
    }
  };

  // Handle Add Entry form submit
  container.querySelector('#form-add-entry').onsubmit = async (e) => {
    e.preventDefault();
    const btn = container.querySelector('#btn-save-entry');
    const notesInput = container.querySelector('#new-entry-notes');
    const authorInput = container.querySelector('#new-entry-author');
    btn.disabled = true;

    try {
      await api.addMaintenanceEntry(item.id, {
        entry_type: container.querySelector('#new-entry-type').value,
        notes: notesInput.value.trim(),
        registered_by: authorInput.value.trim() || undefined
      });
      notesInput.value = '';
      await loadEntries();
    } catch (err) {
      alert('Erro ao registrar parecer: ' + err.message);
    } finally {
      btn.disabled = false;
    }
  };

  await loadEntries();
}
