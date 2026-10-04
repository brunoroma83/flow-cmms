import api from '../api.js';

export async function renderInventoryView(container) {
  let inventory = [];

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2>Controle de Estoque de Peças e Consumíveis</h2>
        <p class="subtitle">Gestão de insumos biomédicos, almoxarifado e níveis críticos</p>
      </div>
      <div class="header-actions">
        <button id="btn-new-inventory" class="btn btn-primary">+ Cadastrar Novo Item</button>
      </div>
    </div>

    <!-- Table Container -->
    <div class="table-container" id="inventory-table-wrapper">
      <div class="loading-spinner">Carregando itens de estoque...</div>
    </div>
  `;

  const tableWrapper = container.querySelector('#inventory-table-wrapper');
  const newBtn = container.querySelector('#btn-new-inventory');

  const loadInventory = async () => {
    try {
      inventory = await api.getInventory();
      if (inventory.length === 0) {
        tableWrapper.innerHTML = `<div class="empty-state">Nenhum item cadastrado no estoque ainda.</div>`;
        return;
      }

      tableWrapper.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Item / Insumo</th>
              <th>Cód. Peça</th>
              <th>Categoria</th>
              <th>Quantidade em Estoque</th>
              <th>Mín / Máx</th>
              <th>Preço Unitário</th>
              <th>Localização</th>
              <th style="text-align: center;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${inventory.map(item => {
              const isLow = item.quantity <= item.min_quantity;
              return `
                <tr>
                  <td>
                    <strong>${item.name}</strong>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${item.supplier || ''}</div>
                  </td>
                  <td><code>${item.part_number || '-'}</code></td>
                  <td><span class="badge badge-info">${item.category || 'Geral'}</span></td>
                  <td>
                    <span class="badge ${isLow ? 'badge-danger' : 'badge-success'}" style="font-size:0.85rem;">
                      ${item.quantity} ${isLow ? '⚠️ Crítico' : ''}
                    </span>
                  </td>
                  <td>${item.min_quantity} / ${item.max_quantity}</td>
                  <td>R$ ${item.unit_price ? item.unit_price.toFixed(2) : '0,00'}</td>
                  <td>${item.location || '-'}</td>
                  <td style="text-align: center;">
                    <button class="btn btn-outline btn-sm btn-adjust-stock" data-id="${item.id}" data-name="${item.name}" data-qty="${item.quantity}">
                      ⚡ Ajustar Estoque
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;

      tableWrapper.querySelectorAll('.btn-adjust-stock').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = parseInt(btn.dataset.id, 10);
          const name = btn.dataset.name;
          const currentQty = parseInt(btn.dataset.qty, 10);
          openStockAdjustModal(id, name, currentQty, loadInventory);
        });
      });
    } catch (err) {
      tableWrapper.innerHTML = `<div class="login-error-alert">Erro ao carregar estoque: ${err.message}</div>`;
    }
  };

  newBtn.addEventListener('click', () => {
    openNewInventoryModal(loadInventory);
  });

  await loadInventory();
}

function openStockAdjustModal(id, name, currentQty, onSuccess) {
  const container = document.getElementById('modal-container');
  container.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container">
        <div class="modal-header">
          <h3>⚡ Ajuste de Estoque - ${name}</h3>
          <button class="modal-close" id="modal-close-btn">✕</button>
        </div>
        <form id="form-adjust-stock">
          <div class="modal-body form-grid">
            <div class="form-group full-width">
              <p>Quantidade atual em estoque: <strong>${currentQty} unidades</strong></p>
            </div>
            <div class="form-group full-width">
              <label>Quantidade a Adicionar (+) ou Remover (-)</label>
              <input type="number" id="adjust-value" placeholder="Ex: +5 para entrada ou -2 para saída" required>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btn-cancel-adjust">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="btn-save-adjust">Confirmar Ajuste</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const close = () => { container.innerHTML = ''; };
  container.querySelector('#modal-close-btn').onclick = close;
  container.querySelector('#btn-cancel-adjust').onclick = close;

  container.querySelector('#form-adjust-stock').onsubmit = async (e) => {
    e.preventDefault();
    const val = parseInt(container.querySelector('#adjust-value').value, 10);
    if (isNaN(val) || val === 0) { alert('Digite um valor numérico diferente de zero.'); return; }

    const btn = container.querySelector('#btn-save-adjust');
    btn.disabled = true; btn.textContent = 'Processando...';

    try {
      await api.adjustStock(id, val);
      close();
      await onSuccess();
    } catch (err) {
      alert('Erro ao ajustar estoque: ' + err.message);
      btn.disabled = false; btn.textContent = 'Confirmar Ajuste';
    }
  };
}

function openNewInventoryModal(onSuccess) {
  const container = document.getElementById('modal-container');
  container.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container">
        <div class="modal-header">
          <h3>+ Cadastrar Novo Item de Estoque</h3>
          <button class="modal-close" id="modal-close-btn">✕</button>
        </div>
        <form id="form-new-item">
          <div class="modal-body form-grid">
            <div class="form-group full-width">
              <label>Nome do Item / Peça *</label>
              <input type="text" id="new-item-name" placeholder="Ex: Sensor de SpO2 Adulto Reutilizável" required>
            </div>
            <div class="form-group">
              <label>Código / Part Number</label>
              <input type="text" id="new-item-part" placeholder="Ex: SENS-SPO2-01">
            </div>
            <div class="form-group">
              <label>Categoria</label>
              <input type="text" id="new-item-category" placeholder="Ex: Acessórios de Monitorização">
            </div>
            <div class="form-group">
              <label>Quantidade Inicial *</label>
              <input type="number" id="new-item-qty" value="10" required>
            </div>
            <div class="form-group">
              <label>Quantidade Mínima</label>
              <input type="number" id="new-item-min" value="5">
            </div>
            <div class="form-group">
              <label>Quantidade Máxima</label>
              <input type="number" id="new-item-max" value="30">
            </div>
            <div class="form-group">
              <label>Preço Unitário (R$)</label>
              <input type="number" step="0.01" id="new-item-price" placeholder="0.00">
            </div>
            <div class="form-group">
              <label>Fornecedor</label>
              <input type="text" id="new-item-supplier" placeholder="Ex: MedParts Distribuidora">
            </div>
            <div class="form-group">
              <label>Localização no Almoxarifado</label>
              <input type="text" id="new-item-location" placeholder="Ex: Prateleira A2">
            </div>
            <div class="form-group full-width">
              <label>Descrição</label>
              <textarea id="new-item-desc" rows="2" placeholder="Especificações adicionais da peça..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btn-cancel-item">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="btn-save-item">Cadastrar Item</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const close = () => { container.innerHTML = ''; };
  container.querySelector('#modal-close-btn').onclick = close;
  container.querySelector('#btn-cancel-item').onclick = close;

  container.querySelector('#form-new-item').onsubmit = async (e) => {
    e.preventDefault();
    const btn = container.querySelector('#btn-save-item');
    btn.disabled = true; btn.textContent = 'Cadastrando...';

    const payload = {
      name: container.querySelector('#new-item-name').value.trim(),
      part_number: container.querySelector('#new-item-part').value.trim(),
      category: container.querySelector('#new-item-category').value.trim(),
      quantity: parseInt(container.querySelector('#new-item-qty').value, 10),
      min_quantity: parseInt(container.querySelector('#new-item-min').value, 10),
      max_quantity: parseInt(container.querySelector('#new-item-max').value, 10),
      unit_price: parseFloat(container.querySelector('#new-item-price').value || 0),
      supplier: container.querySelector('#new-item-supplier').value.trim(),
      location: container.querySelector('#new-item-location').value.trim(),
      description: container.querySelector('#new-item-desc').value.trim()
    };

    try {
      await api.createInventoryItem(payload);
      close();
      await onSuccess();
    } catch (err) {
      alert('Erro ao cadastrar item de estoque: ' + err.message);
      btn.disabled = false; btn.textContent = 'Cadastrar Item';
    }
  };
}
