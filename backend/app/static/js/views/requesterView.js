import api, { getUser } from '../api.js';

export async function renderRequesterView(container, initialSubTab = 'create') {
  const currentUser = getUser() || { username: 'solicitante' };

  container.innerHTML = `
    <div class="requester-portal-container" style="max-width: 1100px; margin: 0 auto;">
      
      <!-- Cabeçalho do Portal do Solicitante -->
      <div style="background: linear-gradient(135deg, #1e293b, #0f172a); color: white; padding: 20px 24px; border-radius: 12px; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
        <div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            <span style="font-size: 1.5rem;">🏥</span>
            <h2 style="margin: 0; font-size: 1.35rem; color: #f8fafc;">Portal do Solicitante</h2>
          </div>
          <p style="margin: 0; font-size: 0.85rem; color: #94a3b8;">
            Abertura rápida de chamados técnicos e acompanhamento de ordens de serviço.
          </p>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="background: rgba(255,255,255,0.08); padding: 8px 14px; border-radius: 8px; font-size: 0.85rem;">
            Solicitante: <strong style="color:#38bdf8;">${currentUser.username}</strong>
          </div>
        </div>
      </div>

      <!-- Abas Principais do Solicitante -->
      <div class="requester-tabs" style="display: flex; gap: 8px; border-bottom: 2px solid #e2e8f0; margin-bottom: 24px;">
        <button id="req-tab-btn-create" class="req-tab-btn ${initialSubTab === 'create' ? 'active' : ''}" style="padding: 10px 18px; font-size: 0.95rem; font-weight: 600; border: none; background: none; border-bottom: 3px solid ${initialSubTab === 'create' ? '#2563eb' : 'transparent'}; color: ${initialSubTab === 'create' ? '#2563eb' : '#64748b'}; cursor: pointer;">
          ➕ Abrir Novo Chamado
        </button>
        <button id="req-tab-btn-list" class="req-tab-btn ${initialSubTab === 'list' ? 'active' : ''}" style="padding: 10px 18px; font-size: 0.95rem; font-weight: 600; border: none; background: none; border-bottom: 3px solid ${initialSubTab === 'list' ? '#2563eb' : 'transparent'}; color: ${initialSubTab === 'list' ? '#2563eb' : '#64748b'}; cursor: pointer;">
          📋 Minhas Solicitações (<span id="req-orders-count">0</span>)
        </button>
        <button id="req-tab-btn-assets" class="req-tab-btn ${initialSubTab === 'assets' ? 'active' : ''}" style="padding: 10px 18px; font-size: 0.95rem; font-weight: 600; border: none; background: none; border-bottom: 3px solid ${initialSubTab === 'assets' ? '#2563eb' : 'transparent'}; color: ${initialSubTab === 'assets' ? '#2563eb' : '#64748b'}; cursor: pointer;">
          🩺 Consultar Equipamentos
        </button>
      </div>

      <div id="requester-feedback-msg" style="display:none; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 0.9rem;"></div>

      <!-- Container do Conteúdo das Abas -->
      <div id="requester-tab-content">
        <!-- Renderizado dinamicamente -->
      </div>
    </div>
  `;

  const feedbackBox = container.querySelector('#requester-feedback-msg');
  const tabContent = container.querySelector('#requester-tab-content');
  const tabBtnCreate = container.querySelector('#req-tab-btn-create');
  const tabBtnList = container.querySelector('#req-tab-btn-list');
  const tabBtnAssets = container.querySelector('#req-tab-btn-assets');
  const ordersCountSpan = container.querySelector('#req-orders-count');

  let activeTab = initialSubTab;
  let cachedEquipments = [];

  function showFeedback(msg, type = 'success') {
    feedbackBox.style.display = 'block';
    if (type === 'success') {
      feedbackBox.style.background = '#dcfce7';
      feedbackBox.style.color = '#15803d';
      feedbackBox.style.border = '1px solid #86efac';
      feedbackBox.innerHTML = `✅ <strong>Sucesso:</strong> ${msg}`;
    } else {
      feedbackBox.style.background = '#fee2e2';
      feedbackBox.style.color = '#991b1b';
      feedbackBox.style.border = '1px solid #fca5a5';
      feedbackBox.innerHTML = `⚠️ <strong>Erro:</strong> ${msg}`;
    }
    setTimeout(() => {
      feedbackBox.style.display = 'none';
    }, 6000);
  }

  function setActiveTab(tab) {
    activeTab = tab;
    [tabBtnCreate, tabBtnList, tabBtnAssets].forEach(btn => {
      btn.style.color = '#64748b';
      btn.style.borderBottom = '3px solid transparent';
    });

    if (tab === 'create') {
      tabBtnCreate.style.color = '#2563eb';
      tabBtnCreate.style.borderBottom = '3px solid #2563eb';
      renderCreateOrderTab();
    } else if (tab === 'list') {
      tabBtnList.style.color = '#2563eb';
      tabBtnList.style.borderBottom = '3px solid #2563eb';
      renderListOrdersTab();
    } else if (tab === 'assets') {
      tabBtnAssets.style.color = '#2563eb';
      tabBtnAssets.style.borderBottom = '3px solid #2563eb';
      renderAssetsTab();
    }
  }

  tabBtnCreate.addEventListener('click', () => setActiveTab('create'));
  tabBtnList.addEventListener('click', () => setActiveTab('list'));
  tabBtnAssets.addEventListener('click', () => setActiveTab('assets'));

  // -------------------------------------------------------------
  // ABA 1: Abertura Rápida de Chamado (Formulário Limpo)
  // -------------------------------------------------------------
  async function renderCreateOrderTab(selectedEquipmentId = null) {
    tabContent.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b;">Carregando equipamentos disponíveis...</div>`;

    if (cachedEquipments.length === 0) {
      try {
        cachedEquipments = await api.getEquipment();
      } catch (err) {
        tabContent.innerHTML = `<div style="color:#ef4444; padding:20px;">Erro ao carregar equipamentos: ${err.message}</div>`;
        return;
      }
    }

    tabContent.innerHTML = `
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <h3 style="margin-top:0; margin-bottom:6px; color:#0f172a; font-size:1.15rem;">
          Nova Solicitação de Manutenção
        </h3>
        <p style="color:#64748b; font-size:0.875rem; margin-bottom:20px;">
          Preencha as informações abaixo para acionar a equipe de engenharia clínica.
        </p>

        <form id="requester-ticket-form">
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; margin-bottom: 18px;">
            <div class="form-group">
              <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:6px; color:#334155;">
                Equipamento com Defeito *
              </label>
              <select id="ticket-equipment-id" required style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem;">
                <option value="">Selecione o equipamento...</option>
                ${cachedEquipments.map(eq => `
                  <option value="${eq.id}" ${selectedEquipmentId && selectedEquipmentId == eq.id ? 'selected' : ''} data-location="${eq.location || ''}">
                    ${eq.name} • Patrimônio: ${eq.serial_number || 'S/N'} (${eq.location || 'Sem local'})
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="form-group">
              <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:6px; color:#334155;">
                Grau de Urgência *
              </label>
              <select id="ticket-urgency" required style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem;">
                <option value="medium" selected>🟡 Média - Impacta rotina, mas há alternativas</option>
                <option value="high">🟠 Alta - Equipamento essencial para o setor</option>
                <option value="critical">🔴 Crítica / Parada - Risco ao paciente / sem backup</option>
                <option value="low">🟢 Baixa - Ajuste preventivo ou suporte estético</option>
              </select>
            </div>
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; margin-bottom: 18px;">
            <div class="form-group">
              <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:6px; color:#334155;">
                Setor / Sala / Leito Onde o Equipamento Está *
              </label>
              <input type="text" id="ticket-sector" required placeholder="Ex: UTI Leito 04, Centro Cirúrgico Sala 2" value="${currentUser.sector || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem;">
            </div>

            <div class="form-group">
              <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:6px; color:#334155;">
                Ramal ou Contato para Dúvidas
              </label>
              <input type="text" id="ticket-contact" placeholder="Ex: Ramal 4022 ou celular da enfermaria" value="${currentUser.contact || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem;">
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 24px;">
            <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:6px; color:#334155;">
              Descrição do Problema Observado *
            </label>
            <textarea id="ticket-description" required rows="4" placeholder="Descreva com detalhes o que aconteceu (ex: tela não liga, alarme de pressão sonoro constante, cabo de alimentação danificado, etc.)" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; resize:vertical;"></textarea>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:12px;">
            <button type="submit" id="btn-submit-ticket" style="background:#2563eb; color:white; border:none; padding:12px 24px; border-radius:8px; font-weight:600; font-size:0.95rem; cursor:pointer; display:flex; align-items:center; gap:8px; box-shadow:0 2px 6px rgba(37,99,235,0.3);">
              🚀 Enviar Chamado para Engenharia Clínica
            </button>
          </div>
        </form>
      </div>
    `;

    const selectEq = tabContent.querySelector('#ticket-equipment-id');
    const inputSector = tabContent.querySelector('#ticket-sector');
    const form = tabContent.querySelector('#requester-ticket-form');
    const submitBtn = tabContent.querySelector('#btn-submit-ticket');

    selectEq.addEventListener('change', () => {
      const opt = selectEq.options[selectEq.selectedIndex];
      const loc = opt.getAttribute('data-location');
      if (loc && !inputSector.value) {
        inputSector.value = loc;
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Enviando chamado...';

      const eqId = parseInt(selectEq.value);
      const desc = tabContent.querySelector('#ticket-description').value.trim();
      const urg = tabContent.querySelector('#ticket-urgency').value;
      const sector = inputSector.value.trim();
      const contact = tabContent.querySelector('#ticket-contact').value.trim();

      try {
        const res = await api.createRequesterTicket({
          equipment_id: eqId,
          description: desc,
          requester_name: currentUser.username,
          requester_sector: sector,
          requester_contact: contact,
          urgency: urg
        });

        showFeedback(`Chamado #${res.id} aberto com sucesso! Nossa equipe técnica já foi notificada.`);
        setActiveTab('list');
      } catch (err) {
        showFeedback(err.message || 'Erro ao registrar chamado.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '🚀 Enviar Chamado para Engenharia Clínica';
      }
    });
  }

  // -------------------------------------------------------------
  // ABA 2: Minhas Solicitações (Acompanhamento Exclusivo do Solicitante)
  // -------------------------------------------------------------
  async function renderListOrdersTab() {
    tabContent.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b;">Carregando suas ordens de serviço...</div>`;

    try {
      const orders = await api.getMyRequests(currentUser.username);
      ordersCountSpan.textContent = orders.length;

      if (!orders || orders.length === 0) {
        tabContent.innerHTML = `
          <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; padding:48px 24px; text-align:center;">
            <div style="font-size:3rem; margin-bottom:12px;">📋</div>
            <h3 style="margin-top:0; color:#0f172a;">Você ainda não possui solicitações abertas</h3>
            <p style="color:#64748b; font-size:0.9rem; margin-bottom:20px;">
              Assim que abrir um chamado para algum equipamento, ele aparecerá aqui com o status em tempo real.
            </p>
            <button id="btn-go-open-ticket" style="background:#2563eb; color:white; border:none; padding:10px 20px; border-radius:8px; font-weight:600; cursor:pointer;">
              ➕ Abrir Meu Primeiro Chamado
            </button>
          </div>
        `;
        tabContent.querySelector('#btn-go-open-ticket').onclick = () => setActiveTab('create');
        return;
      }

      const urgencyLabels = {
        low: '<span style="color:#16a34a; font-weight:600;">🟢 Baixa</span>',
        medium: '<span style="color:#d97706; font-weight:600;">🟡 Média</span>',
        high: '<span style="color:#ea580c; font-weight:600;">🟠 Alta</span>',
        critical: '<span style="color:#dc2626; font-weight:700;">🔴 Crítica</span>'
      };

      const statusBadges = {
        pending: '<span class="badge" style="background:#fef3c7; color:#b45309; padding:4px 10px; border-radius:6px; font-weight:700;">⏳ Pendente</span>',
        in_progress: '<span class="badge" style="background:#dbeafe; color:#1d4ed8; padding:4px 10px; border-radius:6px; font-weight:700;">🔧 Em Atendimento</span>',
        completed: '<span class="badge" style="background:#dcfce7; color:#15803d; padding:4px 10px; border-radius:6px; font-weight:700;">✅ Concluído</span>',
        cancelled: '<span class="badge" style="background:#f1f5f9; color:#64748b; padding:4px 10px; border-radius:6px; font-weight:700;">❌ Cancelado</span>'
      };

      tabContent.innerHTML = `
        <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <div style="padding:16px 20px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
            <h4 style="margin:0; font-size:1.05rem; color:#0f172a;">Histórico de Solicitações do Usuário</h4>
            <button id="btn-refresh-orders" style="background:#f8fafc; border:1px solid #cbd5e1; padding:6px 12px; border-radius:6px; font-size:0.8rem; cursor:pointer;">
              🔄 Atualizar
            </button>
          </div>
          <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:0.875rem;">
              <thead>
                <tr style="background:#f8fafc; border-bottom:1px solid #e2e8f0; color:#475569; text-align:left;">
                  <th style="padding:12px 16px;">OS #</th>
                  <th style="padding:12px 16px;">Equipamento</th>
                  <th style="padding:12px 16px;">Data Abertura</th>
                  <th style="padding:12px 16px;">Urgência</th>
                  <th style="padding:12px 16px;">Status</th>
                  <th style="padding:12px 16px;">Técnico Responsável</th>
                  <th style="padding:12px 16px; text-align:right;">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${orders.map(o => {
                  const dt = new Date(o.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  });
                  return `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                      <td style="padding:12px 16px; font-weight:700; color:#0f172a;">#${o.id}</td>
                      <td style="padding:12px 16px;">
                        <div style="font-weight:600; color:#1e293b;">Equipamento ID #${o.equipment_id}</div>
                        <div style="font-size:0.75rem; color:#64748b;">${o.requester_sector || 'Setor não informado'}</div>
                      </td>
                      <td style="padding:12px 16px; color:#475569;">${dt}</td>
                      <td style="padding:12px 16px;">${urgencyLabels[o.urgency] || o.urgency || 'Normal'}</td>
                      <td style="padding:12px 16px;">${statusBadges[o.status] || o.status}</td>
                      <td style="padding:12px 16px; color:#475569;">
                        ${o.technician ? `👤 <strong>${o.technician}</strong>` : '<span style="color:#94a3b8; font-style:italic;">Aguardando atribuição</span>'}
                      </td>
                      <td style="padding:12px 16px; text-align:right;">
                        <button class="btn-view-order-details" data-id="${o.id}" style="background:#f1f5f9; border:1px solid #cbd5e1; padding:6px 12px; border-radius:6px; font-size:0.8rem; font-weight:600; color:#1e293b; cursor:pointer;">
                          🔍 Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      tabContent.querySelector('#btn-refresh-orders').onclick = () => renderListOrdersTab();

      tabContent.querySelectorAll('.btn-view-order-details').forEach(btn => {
        btn.onclick = async () => {
          const ordId = btn.getAttribute('data-id');
          await openOrderDetailsModal(ordId);
        };
      });

    } catch (err) {
      tabContent.innerHTML = `<div style="color:#ef4444; padding:20px;">Erro ao carregar solicitações: ${err.message}</div>`;
    }
  }

  // -------------------------------------------------------------
  // ABA 3: Catálogo de Equipamentos Médicos (Consulta e Abertura Rápida)
  // -------------------------------------------------------------
  async function renderAssetsTab() {
    tabContent.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b;">Carregando equipamentos da unidade...</div>`;

    try {
      if (cachedEquipments.length === 0) {
        cachedEquipments = await api.getEquipment();
      }

      tabContent.innerHTML = `
        <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; padding:20px; box-shadow:0 1px 3px rgba(0,0,0,0.05); margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div>
              <h3 style="margin:0 0 4px 0; color:#0f172a; font-size:1.1rem;">Consulta de Ativos Médicos</h3>
              <p style="margin:0; font-size:0.825rem; color:#64748b;">
                Localize equipamentos cadastrados na sua unidade para consultar ou abrir chamado de manutenção.
              </p>
            </div>
            <div style="display:flex; gap:8px; min-width:280px; flex:1; max-width:400px;">
              <input type="text" id="input-search-assets" placeholder="Buscar por nome, tag, modelo ou setor..." style="width:100%; padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.875rem;">
            </div>
          </div>
        </div>

        <div id="assets-grid-container" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:16px;">
          <!-- Cards renderizados dinamicamente -->
        </div>
      `;

      const gridContainer = tabContent.querySelector('#assets-grid-container');
      const searchInput = tabContent.querySelector('#input-search-assets');

      function renderAssetCards(items) {
        if (!items || items.length === 0) {
          gridContainer.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: #64748b; background: white; border-radius: 10px; border: 1px dashed #cbd5e1;">
              Nenhum equipamento encontrado com os termos pesquisados.
            </div>
          `;
          return;
        }

        gridContainer.innerHTML = items.map(eq => `
          <div style="background:white; border:1px solid #e2e8f0; border-radius:10px; padding:18px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 1px 3px rgba(0,0,0,0.04); transition:all 0.2s;">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                <span style="font-size:1.5rem;">🩺</span>
                <span class="badge ${eq.status === 'active' ? 'badge-success' : 'badge-warning'}" style="font-size:0.75rem;">
                  ${eq.status === 'active' ? 'Operacional' : (eq.status || 'Em Manutenção')}
                </span>
              </div>
              <h4 style="margin:0 0 6px 0; color:#0f172a; font-size:1rem;">${eq.name}</h4>
              <div style="font-size:0.8rem; color:#64748b; line-height:1.5; margin-bottom:14px;">
                <div><strong>Patrimônio/Série:</strong> ${eq.serial_number || 'Não informado'}</div>
                <div><strong>Modelo/Marca:</strong> ${eq.model || '-'} / ${eq.manufacturer || '-'}</div>
                <div><strong>Setor/Local:</strong> ${eq.location || 'Não informado'}</div>
              </div>
            </div>
            <button class="btn-open-ticket-for-asset" data-id="${eq.id}" style="width:100%; background:#f0f9ff; color:#0284c7; border:1px solid #bae6fd; padding:9px 12px; border-radius:6px; font-weight:600; font-size:0.85rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:all 0.2s;">
              ⚡ Abrir Chamado Deste Ativo
            </button>
          </div>
        `).join('');

        gridContainer.querySelectorAll('.btn-open-ticket-for-asset').forEach(btn => {
          btn.onclick = () => {
            const eqId = btn.getAttribute('data-id');
            setActiveTab('create');
            renderCreateOrderTab(eqId);
          };
        });
      }

      renderAssetCards(cachedEquipments);

      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
          renderAssetCards(cachedEquipments);
          return;
        }
        const filtered = cachedEquipments.filter(eq => 
          (eq.name && eq.name.toLowerCase().includes(query)) ||
          (eq.serial_number && eq.serial_number.toLowerCase().includes(query)) ||
          (eq.model && eq.model.toLowerCase().includes(query)) ||
          (eq.manufacturer && eq.manufacturer.toLowerCase().includes(query)) ||
          (eq.location && eq.location.toLowerCase().includes(query))
        );
        renderAssetCards(filtered);
      });

    } catch (err) {
      tabContent.innerHTML = `<div style="color:#ef4444; padding:20px;">Erro ao carregar catálogo: ${err.message}</div>`;
    }
  }

  // -------------------------------------------------------------
  // MODAL: Detalhes da Ordem e Apontamentos Técnicos
  // -------------------------------------------------------------
  async function openOrderDetailsModal(orderId) {
    const modalWrap = document.createElement('div');
    modalWrap.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;';
    modalWrap.innerHTML = `
      <div style="background:#fff; border-radius:12px; width:90%; max-width:620px; padding:24px; max-height:85vh; overflow-y:auto; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
        <div style="text-align:center; padding:20px; color:#64748b;">Carregando detalhes do chamado #${orderId}...</div>
      </div>
    `;
    document.body.appendChild(modalWrap);

    try {
      const order = await api.getMaintenanceById(orderId);
      const entries = await api.getMaintenanceEntries(orderId);

      const statusMap = {
        pending: '⏳ Pendente / Em Fila',
        in_progress: '🔧 Em Atendimento Técnico',
        completed: '✅ Concluído com Sucesso',
        cancelled: '❌ Cancelado'
      };

      modalWrap.innerHTML = `
        <div style="background:#fff; border-radius:12px; width:90%; max-width:620px; padding:24px; max-height:85vh; overflow-y:auto; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:14px; margin-bottom:18px;">
            <h3 style="margin:0; color:#0f172a; font-size:1.2rem;">Chamado #${order.id}</h3>
            <button id="btn-close-modal" style="background:none; border:none; font-size:1.2rem; cursor:pointer; color:#64748b;">✕</button>
          </div>

          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px; margin-bottom:18px; font-size:0.875rem;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <div><strong>Status:</strong> ${statusMap[order.status] || order.status}</div>
              <div><strong>Urgência:</strong> ${order.urgency || 'Média'}</div>
              <div><strong>Técnico Responsável:</strong> ${order.technician || 'Aguardando atribuição'}</div>
              <div><strong>Setor Informado:</strong> ${order.requester_sector || 'Não informado'}</div>
            </div>
            <div style="margin-top:10px; padding-top:10px; border-top:1px dashed #cbd5e1;">
              <strong>Descrição do Problema:</strong>
              <p style="margin:4px 0 0 0; color:#334155; white-space:pre-wrap;">${order.description || 'Sem descrição.'}</p>
            </div>
          </div>

          <h4 style="margin:0 0 12px 0; color:#0f172a; font-size:1rem;">Histórico de Atendimento e Parecer Técnico</h4>

          ${entries && entries.length > 0 ? `
            <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:18px;">
              ${entries.map(e => `
                <div style="border-left:3px solid #2563eb; background:#f8fafc; padding:10px 14px; border-radius:4px; font-size:0.85rem;">
                  <div style="display:flex; justify-content:space-between; color:#64748b; font-size:0.75rem; margin-bottom:4px;">
                    <span>👤 <strong>${e.registered_by || 'Técnico'}</strong></span>
                    <span>${new Date(e.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  <div style="color:#1e293b; white-space:pre-wrap;">${e.notes}</div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div style="background:#f8fafc; padding:16px; border-radius:8px; text-align:center; color:#64748b; font-size:0.85rem; margin-bottom:18px;">
              Nenhum parecer técnico registrado ainda. A equipe técnica entrará em contato ou iniciará o atendimento em breve.
            </div>
          `}

          <div style="display:flex; justify-content:flex-end;">
            <button id="btn-modal-ok" style="background:#2563eb; color:white; border:none; padding:8px 18px; border-radius:6px; font-weight:600; cursor:pointer;">
              Fechar
            </button>
          </div>
        </div>
      `;

      modalWrap.querySelector('#btn-close-modal').onclick = () => modalWrap.remove();
      modalWrap.querySelector('#btn-modal-ok').onclick = () => modalWrap.remove();
    } catch (err) {
      modalWrap.innerHTML = `
        <div style="background:#fff; border-radius:12px; width:90%; max-width:440px; padding:24px; text-align:center;">
          <div style="color:#ef4444; margin-bottom:14px;">Erro ao carregar chamado: ${err.message}</div>
          <button id="btn-err-ok" style="background:#64748b; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">Fechar</button>
        </div>
      `;
      modalWrap.querySelector('#btn-err-ok').onclick = () => modalWrap.remove();
    }
  }

  // Iniciar renderizando a aba inicial
  setActiveTab(initialSubTab);
}
