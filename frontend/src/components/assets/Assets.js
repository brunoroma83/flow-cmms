import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import './Assets.css';

const Assets = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Selected asset for Details Modal
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetMaintenanceHistory, setAssetMaintenanceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Filter States
  const [filters, setFilters] = useState({
    search: '',
    equipment_type: '',
    status: '',
    location: ''
  });

  // Form State
  const [newAsset, setNewAsset] = useState({
    name: '',
    serial_number: '',
    anvisa_register: '',
    equipment_type: 'Diagnóstico por Imagem',
    manufacturer: '',
    model: '',
    status: 'active',
    location: '',
    description: '',
    category_id: 1
  });

  const loadAssets = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getEquipment();
      setAssets(data);
    } catch (err) {
      setError(err.message || 'Falha ao carregar lista de equipamentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!newAsset.name || !newAsset.serial_number) {
      alert('Nome e Número de Série são obrigatórios.');
      return;
    }

    try {
      setSubmitting(true);
      await api.createEquipment(newAsset);
      setNewAsset({
        name: '',
        serial_number: '',
        anvisa_register: '',
        equipment_type: 'Diagnóstico por Imagem',
        manufacturer: '',
        model: '',
        status: 'active',
        location: '',
        description: '',
        category_id: 1
      });
      setShowForm(false);
      await loadAssets();
    } catch (err) {
      alert('Erro ao salvar equipamento: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Soft Delete Handler
  const handleDeleteAsset = async (asset) => {
    const confirmMessage = `Tem certeza que deseja inativar/excluir o equipamento "${asset.name}" (Série: ${asset.serial_number})?\n\nEle será removido da lista ativa através de exclusão lógica (soft delete), preservando o histórico.`;
    if (!window.confirm(confirmMessage)) return;

    try {
      await api.deleteEquipment(asset.id);
      if (selectedAsset?.id === asset.id) {
        setSelectedAsset(null);
      }
      await loadAssets();
    } catch (err) {
      alert('Erro ao excluir equipamento: ' + err.message);
    }
  };

  // Open Details Modal and fetch related OS
  const handleOpenDetails = async (asset) => {
    setSelectedAsset(asset);
    setLoadingHistory(true);
    setAssetMaintenanceHistory([]);
    try {
      const history = await api.getMaintenanceHistory(asset.id);
      setAssetMaintenanceHistory(history);
    } catch (err) {
      // Fallback: try fetching all maintenance and filtering locally
      try {
        const allMaint = await api.getMaintenance();
        setAssetMaintenanceHistory(allMaint.filter(m => m.equipment_id === asset.id));
      } catch (e) {
        console.error('Erro ao carregar histórico de OS:', e);
      }
    } finally {
      setLoadingHistory(false);
    }
  };

  // Filtered Assets Computation
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      // Text search
      const searchText = filters.search.toLowerCase().trim();
      if (searchText) {
        const matchesName = asset.name?.toLowerCase().includes(searchText);
        const matchesSerial = asset.serial_number?.toLowerCase().includes(searchText);
        const matchesAnvisa = asset.anvisa_register?.toLowerCase().includes(searchText);
        const matchesManufacturer = asset.manufacturer?.toLowerCase().includes(searchText);
        const matchesModel = asset.model?.toLowerCase().includes(searchText);
        if (!matchesName && !matchesSerial && !matchesAnvisa && !matchesManufacturer && !matchesModel) {
          return false;
        }
      }

      // Equipment Type filter
      if (filters.equipment_type && asset.equipment_type !== filters.equipment_type) {
        return false;
      }

      // Status filter
      if (filters.status && asset.status !== filters.status) {
        return false;
      }

      // Location filter
      if (filters.location) {
        const locSearch = filters.location.toLowerCase();
        if (!asset.location?.toLowerCase().includes(locSearch)) {
          return false;
        }
      }

      return true;
    });
  }, [assets, filters]);

  // Unique Equipment Types and Locations for Dropdown options
  const equipmentTypesList = useMemo(() => {
    const defaultTypes = ['Diagnóstico por Imagem', 'Monitorização Paciente', 'Suporte à Vida', 'Emergência / Desfibrilação', 'Terapêutico / Cirúrgico', 'Laboratorial / Análise'];
    const customTypes = assets.map(a => a.equipment_type).filter(Boolean);
    return Array.from(new Set([...defaultTypes, ...customTypes]));
  }, [assets]);

  // Export Filtered Assets to CSV
  const handleExportCSV = () => {
    if (filteredAssets.length === 0) {
      alert('Nenhum equipamento para exportar na lista atual.');
      return;
    }

    const headers = ['ID', 'Nome', 'Número de Série', 'Registro ANVISA', 'Tipo do Equipamento', 'Status', 'Fabricante', 'Modelo', 'Localização', 'Descrição'];
    
    const csvRows = [
      headers.join(','),
      ...filteredAssets.map(asset => [
        asset.id,
        `"${(asset.name || '').replace(/"/g, '""')}"`,
        `"${(asset.serial_number || '').replace(/"/g, '""')}"`,
        `"${(asset.anvisa_register || '-').replace(/"/g, '""')}"`,
        `"${(asset.equipment_type || '-').replace(/"/g, '""')}"`,
        `"${asset.status || ''}"`,
        `"${(asset.manufacturer || '-').replace(/"/g, '""')}"`,
        `"${(asset.model || '-').replace(/"/g, '""')}"`,
        `"${(asset.location || '-').replace(/"/g, '""')}"`,
        `"${(asset.description || '').replace(/"/g, '""')}"`
      ].join(','))
    ];

    const csvContent = '\uFEFF' + csvRows.join('\n'); // UTF-8 BOM
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `equipamentos_medicos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active':
      case 'Ativo':
        return { label: 'Ativo', class: 'ativo' };
      case 'maintenance':
      case 'Em Manutenção':
        return { label: 'Em Manutenção', class: 'em-manutenção' };
      case 'inactive':
      case 'Inativo':
        return { label: 'Inativo', class: 'inativo' };
      default:
        return { label: status, class: 'ativo' };
    }
  };

  return (
    <div className="assets">
      <div className="assets-header">
        <div>
          <h2>Gestão de Ativos Médicos</h2>
          <p className="subtitle">Inventário regulatório ANVISA e controle de ciclo de vida hospitalar</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleExportCSV} title="Baixar lista em formato CSV">
            📥 Exportar CSV ({filteredAssets.length})
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Fechar Formulário' : '+ Cadastrar Equipamento'}
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Advanced Filter Panel */}
      <div className="filter-panel-container">
        <div className="filter-panel-header">
          <span className="filter-icon">🔍</span>
          <h3>Filtros por Características do Ativo</h3>
          {(filters.search || filters.equipment_type || filters.status || filters.location) && (
            <button
              className="btn-clear-filters"
              onClick={() => setFilters({ search: '', equipment_type: '', status: '', location: '' })}
            >
              Limpar Filtros
            </button>
          )}
        </div>
        <div className="filter-panel-grid">
          <div className="filter-group">
            <label>Busca Textual (Nome / Série / ANVISA / Modelo)</label>
            <input
              type="text"
              placeholder="Digite para pesquisar..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>

          <div className="filter-group">
            <label>Tipo do Equipamento</label>
            <select
              value={filters.equipment_type}
              onChange={(e) => setFilters({ ...filters, equipment_type: e.target.value })}
            >
              <option value="">Todos os Tipos</option>
              {equipmentTypesList.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Status Operacional</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Todos os Status</option>
              <option value="active">Ativo (Em Operação)</option>
              <option value="maintenance">Em Manutenção</option>
              <option value="inactive">Inativo (Desativado)</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Localização / Setor</label>
            <input
              type="text"
              placeholder="Ex: Radiologia, UTI..."
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* New Asset Form */}
      {showForm && (
        <div className="asset-form-container">
          <h3>Cadastrar Novo Equipamento Médico</h3>
          <form onSubmit={handleAddAsset} className="asset-form-grid">
            <div className="form-field">
              <label>Nome do Equipamento *</label>
              <input
                type="text"
                placeholder="Ex: Tomógrafo Optima 660"
                value={newAsset.name}
                onChange={(e) => setNewAsset({...newAsset, name: e.target.value})}
                required
              />
            </div>

            <div className="form-field">
              <label>Número de Série *</label>
              <input
                type="text"
                placeholder="Ex: TC-GE-2023-001"
                value={newAsset.serial_number}
                onChange={(e) => setNewAsset({...newAsset, serial_number: e.target.value})}
                required
              />
            </div>

            <div className="form-field">
              <label>Número de Registro ANVISA</label>
              <input
                type="text"
                placeholder="Ex: 80023450012"
                value={newAsset.anvisa_register}
                onChange={(e) => setNewAsset({...newAsset, anvisa_register: e.target.value})}
              />
            </div>

            <div className="form-field">
              <label>Tipo do Equipamento</label>
              <select
                value={newAsset.equipment_type}
                onChange={(e) => setNewAsset({...newAsset, equipment_type: e.target.value})}
              >
                {equipmentTypesList.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Fabricante</label>
              <input
                type="text"
                placeholder="Ex: GE Healthcare"
                value={newAsset.manufacturer}
                onChange={(e) => setNewAsset({...newAsset, manufacturer: e.target.value})}
              />
            </div>

            <div className="form-field">
              <label>Modelo</label>
              <input
                type="text"
                placeholder="Ex: Optima 660"
                value={newAsset.model}
                onChange={(e) => setNewAsset({...newAsset, model: e.target.value})}
              />
            </div>

            <div className="form-field">
              <label>Status Operacional</label>
              <select
                value={newAsset.status}
                onChange={(e) => setNewAsset({...newAsset, status: e.target.value})}
              >
                <option value="active">Ativo (Em Operação)</option>
                <option value="maintenance">Em Manutenção</option>
                <option value="inactive">Inativo (Desativado)</option>
              </select>
            </div>

            <div className="form-field">
              <label>Setor / Localização</label>
              <input
                type="text"
                placeholder="Ex: Radiologia - Sala 02"
                value={newAsset.location}
                onChange={(e) => setNewAsset({...newAsset, location: e.target.value})}
              />
            </div>

            <div className="form-field full-width">
              <label>Especificações / Observações Técnicas</label>
              <textarea
                placeholder="Descrição técnica detalhada, parâmetros de calibração..."
                value={newAsset.description}
                onChange={(e) => setNewAsset({...newAsset, description: e.target.value})}
                rows={2}
              />
            </div>

            <div className="form-actions full-width">
              <button type="submit" className="btn btn-success" disabled={submitting}>
                {submitting ? 'Salvando...' : 'Salvar Equipamento'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Assets Table */}
      <div className="assets-table-container">
        {loading ? (
          <div className="loading-spinner">Carregando ativos do banco de dados...</div>
        ) : filteredAssets.length === 0 ? (
          <div className="empty-state">Nenhum equipamento encontrado com os filtros selecionados.</div>
        ) : (
          <table className="assets-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Equipamento</th>
                <th>Reg. ANVISA</th>
                <th>Tipo</th>
                <th>Série</th>
                <th>Fabricante / Modelo</th>
                <th>Status</th>
                <th>Localização</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset) => {
                const statusInfo = getStatusLabel(asset.status);
                return (
                  <tr key={asset.id}>
                    <td>#{asset.id}</td>
                    <td>
                      <strong>{asset.name}</strong>
                    </td>
                    <td>
                      {asset.anvisa_register ? (
                        <span className="anvisa-badge">ANVISA {asset.anvisa_register}</span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <span className="type-tag">{asset.equipment_type || 'Geral'}</span>
                    </td>
                    <td><code>{asset.serial_number}</code></td>
                    <td>{asset.manufacturer || '-'} {asset.model ? `(${asset.model})` : ''}</td>
                    <td>
                      <span className={`status-badge ${statusInfo.class}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td>{asset.location || 'Não informado'}</td>
                    <td>
                      <div className="action-buttons-group">
                        <button
                          className="btn-action btn-details"
                          onClick={() => handleOpenDetails(asset)}
                          title="Ver detalhes completos e Ordens de Serviço relacionadas"
                        >
                          👁️ Detalhes
                        </button>
                        <button
                          className="btn-action btn-delete"
                          onClick={() => handleDeleteAsset(asset)}
                          title="Excluir equipamento (soft delete)"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Asset Details & Related Maintenance OS Modal */}
      {selectedAsset && (
        <div className="modal-backdrop" onClick={() => setSelectedAsset(null)}>
          <div className="modal-dialog asset-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Ficha Técnica & Histórico: {selectedAsset.name}</h3>
                <span className="anvisa-badge">Registro ANVISA: {selectedAsset.anvisa_register || 'Não cadastrado'}</span>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedAsset(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">ID do Ativo</span>
                  <span className="detail-value">#{selectedAsset.id}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Número de Série</span>
                  <span className="detail-value"><code>{selectedAsset.serial_number}</code></span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Tipo do Equipamento</span>
                  <span className="detail-value">{selectedAsset.equipment_type || 'Não informado'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status Operacional</span>
                  <span className={`status-badge ${getStatusLabel(selectedAsset.status).class}`}>
                    {getStatusLabel(selectedAsset.status).label}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Fabricante</span>
                  <span className="detail-value">{selectedAsset.manufacturer || 'Não informado'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Modelo</span>
                  <span className="detail-value">{selectedAsset.model || 'Não informado'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Setor / Localização</span>
                  <span className="detail-value">{selectedAsset.location || 'Não informado'}</span>
                </div>
                <div className="detail-item full-width">
                  <span className="detail-label">Descrição / Parâmetros Técnicos</span>
                  <p className="detail-text">{selectedAsset.description || 'Nenhuma especificação cadastrada.'}</p>
                </div>
              </div>

              {/* Maintenance Work Orders Section for this Asset */}
              <div className="asset-maintenance-section">
                <h4>🛠️ Ordens de Serviço (OS) Vinculadas a este Ativo</h4>

                {loadingHistory ? (
                  <div className="loading-spinner">Buscando histórico de manutenção...</div>
                ) : assetMaintenanceHistory.length === 0 ? (
                  <div className="empty-state-small">Nenhuma ordem de serviço registrada para este equipamento ainda.</div>
                ) : (
                  <table className="modal-table">
                    <thead>
                      <tr>
                        <th>OS #</th>
                        <th>Tipo</th>
                        <th>Descrição do Serviço</th>
                        <th>Status</th>
                        <th>Técnico</th>
                        <th>Custo (R$)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assetMaintenanceHistory.map((maint) => (
                        <tr key={maint.id}>
                          <td><strong>OS-{maint.id}</strong></td>
                          <td>
                            <span className={`type-badge ${maint.type}`}>
                              {maint.type === 'preventive' ? 'Preventiva' : 'Corretiva'}
                            </span>
                          </td>
                          <td>{maint.description}</td>
                          <td>
                            <span className={`status-badge ${maint.status}`}>
                              {maint.status === 'completed' ? 'Concluída' : maint.status === 'in_progress' ? 'Em Andamento' : 'Pendente'}
                            </span>
                          </td>
                          <td>{maint.technician || 'Não atribuído'}</td>
                          <td>{maint.cost ? `R$ ${maint.cost.toFixed(2)}` : 'R$ 0,00'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedAsset(null)}>Fechar Ficha</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assets;