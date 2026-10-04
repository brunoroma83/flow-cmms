import api from '../api.js';

export async function renderAssetsView(container) {
  let assets = [];
  let filters = { search: '', equipment_type: '', status: '', location: '' };

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2>Gestão de Ativos Médicos</h2>
        <p class="subtitle">Inventário e rastreabilidade de parque tecnológico hospitalar</p>
      </div>
      <div class="header-actions">
        <button id="btn-export-assets-csv" class="btn btn-secondary">📥 Exportar CSV</button>
        <button id="btn-new-asset" class="btn btn-primary">+ Novo Equipamento Médico</button>
      </div>
    </div>

    <!-- Filter Panel -->
    <div class="filter-panel">
      <div class="filter-header">
        <span>🔍 Filtros de Busca</span>
        <button id="btn-clear-asset-filters" class="btn-logout" style="font-size:0.8rem; display:none;">Limpar Filtros</button>
      </div>
      <div class="filter-grid">
        <div class="filter-item search-item">
          <label>Buscar por Texto</label>
          <input type="text" id="filter-asset-search" placeholder="Nome, nº série, ANVISA, fabricante, modelo...">
        </div>
        <div class="filter-item">
          <label>Tipo de Equipamento</label>
          <select id="filter-asset-type">
            <option value="">Todos os Tipos</option>
            <option value="Diagnóstico por Imagem">Diagnóstico por Imagem</option>
            <option value="Monitorização Paciente">Monitorização Paciente</option>
            <option value="Suporte à Vida">Suporte à Vida</option>
            <option value="Emergência / Desfibrilação">Emergência / Desfibrilação</option>
            <option value="Bomba de Infusão">Bomba de Infusão</option>
            <option value="Laboratório / Análise">Laboratório / Análise</option>
          </select>
        </div>
        <div class="filter-item">
          <label>Status Operacional</label>
          <select id="filter-asset-status">
            <option value="">Todos os Status</option>
            <option value="active">Ativo (Em Operação)</option>
            <option value="maintenance">Em Manutenção</option>
            <option value="inactive">Inativo</option>
          </select>
        </div>
        <div class="filter-item">
          <label>Localização / Setor</label>
          <input type="text" id="filter-asset-location" placeholder="Ex: UTI, Centro Cirúrgico...">
        </div>
      </div>
      <div class="filter-footer" id="asset-filter-count">
        Carregando contagem...
      </div>
    </div>

    <!-- Assets Table Container -->
    <div class="table-container" id="assets-table-wrapper">
      <div class="loading-spinner">Carregando equipamentos do banco de dados...</div>
    </div>
  `;

  const tableWrapper = container.querySelector('#assets-table-wrapper');
  const searchInput = container.querySelector('#filter-asset-search');
  const typeSelect = container.querySelector('#filter-asset-type');
  const statusSelect = container.querySelector('#filter-asset-status');
  const locationInput = container.querySelector('#filter-asset-location');
  const clearBtn = container.querySelector('#btn-clear-asset-filters');
  const countFooter = container.querySelector('#asset-filter-count');
  const exportBtn = container.querySelector('#btn-export-assets-csv');
  const newBtn = container.querySelector('#btn-new-asset');

  const loadAssets = async () => {
    try {
      assets = await api.getEquipment();
      applyFiltersAndRender();
    } catch (err) {
      tableWrapper.innerHTML = `<div class="login-error-alert">Erro ao carregar equipamentos: ${err.message}</div>`;
    }
  };

  const getFilteredAssets = () => {
    return assets.filter(item => {
      if (item.is_deleted) return false;

      if (filters.search) {
        const s = filters.search.toLowerCase();
        const matches = (item.name || '').toLowerCase().includes(s) ||
                        (item.serial_number || '').toLowerCase().includes(s) ||
                        (item.anvisa_register || '').toLowerCase().includes(s) ||
                        (item.manufacturer || '').toLowerCase().includes(s) ||
                        (item.model || '').toLowerCase().includes(s) ||
                        (item.location || '').toLowerCase().includes(s);
        if (!matches) return false;
      }
      if (filters.equipment_type && item.equipment_type !== filters.equipment_type) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (filters.location && !(item.location || '').toLowerCase().includes(filters.location.toLowerCase())) return false;

      return true;
    });
  };

  const applyFiltersAndRender = () => {
    const filtered = getFilteredAssets();
    const isFiltered = filters.search || filters.equipment_type || filters.status || filters.location;
    clearBtn.style.display = isFiltered ? 'inline-block' : 'none';

    countFooter.innerHTML = `Exibindo <strong>${filtered.length}</strong> de <strong>${assets.filter(a => !a.is_deleted).length}</strong> equipamentos cadastrados.`;

    if (filtered.length === 0) {
      tableWrapper.innerHTML = `<div class="empty-state">${isFiltered ? 'Nenhum equipamento corresponde aos filtros.' : 'Nenhum equipamento cadastrado.'}</div>`;
      return;
    }

    tableWrapper.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Equipamento</th>
            <th>Nº de Série</th>
            <th>Reg. ANVISA</th>
            <th>Tipo</th>
            <th>Localização</th>
            <th>Status</th>
            <th style="text-align: center;">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(item => `
            <tr>
              <td>
                <strong>${item.name}</strong>
                <div style="font-size:0.75rem; color:var(--text-muted);">${item.manufacturer || ''} ${item.model ? `• ${item.model}` : ''}</div>
              </td>
              <td><code>${item.serial_number}</code></td>
              <td>${item.anvisa_register || '-'}</td>
              <td><span class="badge badge-info">${item.equipment_type || 'Geral'}</span></td>
              <td>${item.location || '-'}</td>
              <td>
                <span class="badge ${item.status === 'active' ? 'badge-success' : item.status === 'maintenance' ? 'badge-warning' : 'badge-secondary'}">
                  ${item.status === 'active' ? 'Ativo' : item.status === 'maintenance' ? 'Em Manutenção' : 'Inativo'}
                </span>
              </td>
              <td style="text-align: center;">
                <button class="btn btn-outline btn-sm btn-asset-details" data-id="${item.id}">🔍 Detalhes</button>
                <button class="btn btn-danger btn-sm btn-asset-delete" data-id="${item.id}" data-name="${item.name}">🗑️ Excluir</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    // Attach row events
    tableWrapper.querySelectorAll('.btn-asset-details').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        const item = assets.find(a => a.id === id);
        if (item) openAssetDetailModal(item);
      });
    });

    tableWrapper.querySelectorAll('.btn-asset-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id, 10);
        const name = btn.dataset.name;
        if (confirm(`Tem certeza que deseja inativar/excluir o equipamento "${name}"?\n\nEle será removido da lista ativa via Soft Delete.`)) {
          try {
            await api.deleteEquipment(id);
            await loadAssets();
          } catch (err) {
            alert('Erro ao excluir equipamento: ' + err.message);
          }
        }
      });
    });
  };

  // Event Listeners for Filters
  searchInput.addEventListener('input', (e) => { filters.search = e.target.value; applyFiltersAndRender(); });
  typeSelect.addEventListener('change', (e) => { filters.equipment_type = e.target.value; applyFiltersAndRender(); });
  statusSelect.addEventListener('change', (e) => { filters.status = e.target.value; applyFiltersAndRender(); });
  locationInput.addEventListener('input', (e) => { filters.location = e.target.value; applyFiltersAndRender(); });

  clearBtn.addEventListener('click', () => {
    filters = { search: '', equipment_type: '', status: '', location: '' };
    searchInput.value = ''; typeSelect.value = ''; statusSelect.value = ''; locationInput.value = '';
    applyFiltersAndRender();
  });

  // CSV Export
  exportBtn.addEventListener('click', () => {
    const filtered = getFilteredAssets();
    if (filtered.length === 0) { alert('Nenhum equipamento para exportar.'); return; }

    const headers = ['ID', 'Nome Equipamento', 'Número de Série', 'Registro ANVISA', 'Tipo do Equipamento', 'Fabricante', 'Modelo', 'Status', 'Localização', 'Descrição'];
    const rows = filtered.map(item => [
      item.id, item.name, item.serial_number, item.anvisa_register || '', item.equipment_type || '',
      item.manufacturer || '', item.model || '', item.status || '', item.location || '', item.description || ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`));

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_ativos_cmms_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  });

  // New Asset Modal
  newBtn.addEventListener('click', () => {
    openNewAssetModal(loadAssets);
  });

  await loadAssets();
}

function openNewAssetModal(onSuccess) {
  const container = document.getElementById('modal-container');
  container.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container">
        <div class="modal-header">
          <h3>+ Cadastrar Novo Equipamento Médico</h3>
          <button class="modal-close" id="modal-close-btn">✕</button>
        </div>
        <form id="form-new-asset">
          <div class="modal-body form-grid">
            <div class="form-group full-width">
              <label>Nome do Equipamento *</label>
              <input type="text" id="new-asset-name" placeholder="Ex: Tomógrafo Computadorizado Optima" required>
            </div>
            <div class="form-group">
              <label>Número de Série *</label>
              <input type="text" id="new-asset-serial" placeholder="Ex: TC-GE-2023-001" required>
            </div>
            <div class="form-group">
              <label>Registro ANVISA</label>
              <input type="text" id="new-asset-anvisa" placeholder="Ex: 80023450012">
            </div>
            <div class="form-group">
              <label>Tipo de Equipamento</label>
              <select id="new-asset-type">
                <option value="Diagnóstico por Imagem">Diagnóstico por Imagem</option>
                <option value="Monitorização Paciente">Monitorização Paciente</option>
                <option value="Suporte à Vida">Suporte à Vida</option>
                <option value="Emergência / Desfibrilação">Emergência / Desfibrilação</option>
                <option value="Bomba de Infusão">Bomba de Infusão</option>
                <option value="Laboratório / Análise">Laboratório / Análise</option>
              </select>
            </div>
            <div class="form-group">
              <label>Fabricante</label>
              <input type="text" id="new-asset-manufacturer" placeholder="Ex: GE Healthcare">
            </div>
            <div class="form-group">
              <label>Modelo</label>
              <input type="text" id="new-asset-model" placeholder="Ex: Optima 660">
            </div>
            <div class="form-group">
              <label>Localização / Setor</label>
              <input type="text" id="new-asset-location" placeholder="Ex: Radiologia - Sala 02">
            </div>
            <div class="form-group full-width">
              <label>Descrição / Especificações</label>
              <textarea id="new-asset-desc" rows="3" placeholder="Detalhes técnicos do equipamento..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btn-cancel-asset">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="btn-save-asset">Salvar Equipamento</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const close = () => { container.innerHTML = ''; };
  container.querySelector('#modal-close-btn').onclick = close;
  container.querySelector('#btn-cancel-asset').onclick = close;

  container.querySelector('#form-new-asset').onsubmit = async (e) => {
    e.preventDefault();
    const btn = container.querySelector('#btn-save-asset');
    btn.disabled = true; btn.textContent = 'Salvando...';

    const payload = {
      name: container.querySelector('#new-asset-name').value.trim(),
      serial_number: container.querySelector('#new-asset-serial').value.trim(),
      anvisa_register: container.querySelector('#new-asset-anvisa').value.trim(),
      equipment_type: container.querySelector('#new-asset-type').value,
      manufacturer: container.querySelector('#new-asset-manufacturer').value.trim(),
      model: container.querySelector('#new-asset-model').value.trim(),
      location: container.querySelector('#new-asset-location').value.trim(),
      description: container.querySelector('#new-asset-desc').value.trim(),
      status: 'active',
      category_id: 1
    };

    try {
      await api.createEquipment(payload);
      close();
      await onSuccess();
    } catch (err) {
      alert('Erro ao cadastrar equipamento: ' + err.message);
      btn.disabled = false; btn.textContent = 'Salvar Equipamento';
    }
  };
}

async function openAssetDetailModal(item) {
  const container = document.getElementById('modal-container');
  container.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container modal-lg">
        <div class="modal-header">
          <div>
            <h3>${item.name}</h3>
            <p style="font-size:0.85rem; color:var(--text-muted);">Série: <code>${item.serial_number}</code> ${item.anvisa_register ? `• ANVISA: ${item.anvisa_register}` : ''}</p>
          </div>
          <button class="modal-close" id="modal-close-btn">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid" style="margin-bottom: 20px;">
            <div><strong>Tipo:</strong> ${item.equipment_type || 'Geral'}</div>
            <div><strong>Fabricante:</strong> ${item.manufacturer || '-'}</div>
            <div><strong>Modelo:</strong> ${item.model || '-'}</div>
            <div><strong>Localização:</strong> ${item.location || '-'}</div>
            <div><strong>Status:</strong> ${item.status}</div>
          </div>
          <h4 style="margin-bottom:10px; border-bottom:1px solid var(--border-color); padding-bottom:6px;">🔧 Histórico de Manutenções da OS</h4>
          <div id="asset-history-wrapper"><div class="loading-spinner">Carregando histórico de OS...</div></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-close-footer">Fechar</button>
        </div>
      </div>
    </div>
  `;

  const close = () => { container.innerHTML = ''; };
  container.querySelector('#modal-close-btn').onclick = close;
  container.querySelector('#modal-close-footer').onclick = close;

  const historyWrapper = container.querySelector('#asset-history-wrapper');
  try {
    const history = await api.getMaintenanceHistory(item.id);
    if (!history || history.length === 0) {
      historyWrapper.innerHTML = `<div class="empty-state">Nenhuma Ordem de Serviço registrada para este equipamento.</div>`;
    } else {
      historyWrapper.innerHTML = `
        <table class="data-table">
          <thead>
            <tr><th>OS #</th><th>Tipo</th><th>Descrição</th><th>Status</th><th>Técnico</th><th>Custo</th></tr>
          </thead>
          <tbody>
            ${history.map(m => `
              <tr>
                <td><strong>OS-${m.id}</strong></td>
                <td><span class="badge badge-info">${m.type}</span></td>
                <td>${m.description}</td>
                <td><span class="badge ${m.status==='completed'?'badge-success':'badge-warning'}">${m.status}</span></td>
                <td>${m.technician || '-'}</td>
                <td>${m.cost ? `R$ ${m.cost.toFixed(2)}` : 'R$ 0,00'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  } catch (err) {
    historyWrapper.innerHTML = `<div class="empty-state">Sem histórico ou indisponível.</div>`;
  }
}
