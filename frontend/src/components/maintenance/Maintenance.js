import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import './Maintenance.css';

const Maintenance = () => {
  const [maintenances, setMaintenances] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal / Selected Maintenance State
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [newEntry, setNewEntry] = useState({
    entry_type: 'technical_assessment',
    notes: '',
    registered_by: ''
  });
  const [submittingEntry, setSubmittingEntry] = useState(false);

  // Filters State
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    status: '',
    equipment_id: '',
    start_date: '',
    end_date: ''
  });

  // New Maintenance Form State
  const [newMaintenance, setNewMaintenance] = useState({
    equipment_id: '',
    type: 'corrective',
    description: '',
    opening_report: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    start_time: '',
    downtime_start: '',
    status: 'pending',
    technician: '',
    cost: 0
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [records, equipData] = await Promise.all([
        api.getMaintenance(),
        api.getEquipment()
      ]);
      setMaintenances(records);
      setEquipmentList(equipData);
      if (equipData.length > 0 && !newMaintenance.equipment_id) {
        setNewMaintenance(prev => ({ ...prev, equipment_id: equipData[0].id }));
      }
    } catch (err) {
      setError(err.message || 'Falha ao carregar ordens de serviço de manutenção.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helper date functions
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  };

  const toInputDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  const toInputDateTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const parseISOorNull = (val) => {
    if (!val || val.trim() === '') return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  // Filtered maintenance list
  const filteredMaintenances = useMemo(() => {
    return maintenances.filter(item => {
      // Search term
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const eq = equipmentList.find(e => e.id === item.equipment_id);
        const eqName = eq ? eq.name.toLowerCase() : '';
        const eqSerial = eq ? eq.serial_number.toLowerCase() : '';
        const osId = `os-${item.id}`.toLowerCase();
        const desc = (item.description || '').toLowerCase();
        const tech = (item.technician || '').toLowerCase();
        const report = (item.opening_report || '').toLowerCase();

        const matchesSearch =
          osId.includes(searchLower) ||
          eqName.includes(searchLower) ||
          eqSerial.includes(searchLower) ||
          desc.includes(searchLower) ||
          tech.includes(searchLower) ||
          report.includes(searchLower);

        if (!matchesSearch) return false;
      }

      // Type filter
      if (filters.type && item.type !== filters.type) {
        return false;
      }

      // Status filter
      if (filters.status && item.status !== filters.status) {
        return false;
      }

      // Equipment filter
      if (filters.equipment_id && String(item.equipment_id) !== String(filters.equipment_id)) {
        return false;
      }

      // Date range filter (scheduled_date or created_at)
      const targetDate = item.scheduled_date ? new Date(item.scheduled_date) : new Date(item.created_at);
      if (filters.start_date) {
        const start = new Date(filters.start_date);
        start.setHours(0, 0, 0, 0);
        if (targetDate < start) return false;
      }
      if (filters.end_date) {
        const end = new Date(filters.end_date);
        end.setHours(23, 59, 59, 999);
        if (targetDate > end) return false;
      }

      return true;
    });
  }, [maintenances, equipmentList, filters]);

  const handleAddMaintenance = async (e) => {
    e.preventDefault();
    if (!newMaintenance.equipment_id || !newMaintenance.description) {
      alert('Por favor selecione o equipamento e forneça uma descrição do problema.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...newMaintenance,
        equipment_id: parseInt(newMaintenance.equipment_id, 10),
        cost: parseFloat(newMaintenance.cost || 0),
        scheduled_date: parseISOorNull(newMaintenance.scheduled_date),
        start_time: parseISOorNull(newMaintenance.start_time),
        downtime_start: parseISOorNull(newMaintenance.downtime_start)
      };

      await api.createMaintenance(payload);
      setShowForm(false);
      setNewMaintenance({
        equipment_id: equipmentList.length > 0 ? equipmentList[0].id : '',
        type: 'corrective',
        description: '',
        opening_report: '',
        scheduled_date: new Date().toISOString().split('T')[0],
        start_time: '',
        downtime_start: '',
        status: 'pending',
        technician: '',
        cost: 0
      });
      await loadData();
    } catch (err) {
      alert('Erro ao criar Ordem de Serviço: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Details Modal & Load Entries
  const handleOpenDetailModal = async (item) => {
    setSelectedMaintenance(item);
    setEditForm({
      equipment_id: item.equipment_id,
      type: item.type || 'corrective',
      status: item.status || 'pending',
      technician: item.technician || '',
      cost: item.cost !== undefined ? item.cost : 0,
      description: item.description || '',
      opening_report: item.opening_report || '',
      scheduled_date: toInputDate(item.scheduled_date),
      start_time: toInputDateTime(item.start_time),
      completion_time: toInputDateTime(item.completion_time),
      downtime_start: toInputDateTime(item.downtime_start),
      downtime_end: toInputDateTime(item.downtime_end)
    });

    try {
      setLoadingEntries(true);
      const data = await api.getMaintenanceEntries(item.id);
      setEntries(data);
    } catch (err) {
      console.error('Erro ao carregar pareceres da OS:', err);
      setEntries([]);
    } finally {
      setLoadingEntries(false);
    }
  };

  // Save changes to selected maintenance OS
  const handleSaveOSChanges = async (e) => {
    e.preventDefault();
    if (!selectedMaintenance) return;

    try {
      setSavingEdit(true);
      const payload = {
        equipment_id: parseInt(editForm.equipment_id, 10),
        type: editForm.type,
        status: editForm.status,
        technician: editForm.technician,
        cost: parseFloat(editForm.cost || 0),
        description: editForm.description,
        opening_report: editForm.opening_report,
        scheduled_date: parseISOorNull(editForm.scheduled_date),
        start_time: parseISOorNull(editForm.start_time),
        completion_time: parseISOorNull(editForm.completion_time),
        downtime_start: parseISOorNull(editForm.downtime_start),
        downtime_end: parseISOorNull(editForm.downtime_end)
      };

      const updated = await api.updateMaintenance(selectedMaintenance.id, payload);
      setSelectedMaintenance(updated);
      alert('Ordem de Serviço atualizada com sucesso!');
      await loadData();
    } catch (err) {
      alert('Erro ao atualizar Ordem de Serviço: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Add 1:N entry/technical note to selected maintenance
  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!selectedMaintenance || !newEntry.notes.trim()) {
      alert('Por favor insira a descrição da observação ou avaliação técnica.');
      return;
    }

    try {
      setSubmittingEntry(true);
      const entryPayload = {
        entry_type: newEntry.entry_type,
        notes: newEntry.notes.trim(),
        registered_by: newEntry.registered_by.trim() || undefined
      };

      const created = await api.addMaintenanceEntry(selectedMaintenance.id, entryPayload);
      setEntries(prev => [created, ...prev]);
      setNewEntry(prev => ({ ...prev, notes: '' }));
    } catch (err) {
      alert('Erro ao incluir parecer técnico: ' + err.message);
    } finally {
      setSubmittingEntry(false);
    }
  };

  // Export filtered items to CSV
  const exportToCSV = () => {
    if (filteredMaintenances.length === 0) {
      alert('Nenhuma ordem de serviço para exportar.');
      return;
    }

    const headers = [
      'OS ID',
      'Equipamento',
      'Número de Série',
      'Localização',
      'Tipo Manutenção',
      'Status',
      'Técnico Responsável',
      'Custo (R$)',
      'Data Agendada',
      'Início OS',
      'Fechamento OS',
      'Início Parada Equipamento',
      'Término Parada Equipamento',
      'Descrição do Problema',
      'Relato de Abertura'
    ];

    const rows = filteredMaintenances.map(m => {
      const eq = equipmentList.find(e => e.id === m.equipment_id);
      return [
        `OS-${m.id}`,
        eq ? eq.name : `Equipamento #${m.equipment_id}`,
        eq ? eq.serial_number : '',
        eq ? eq.location || '' : '',
        getTypeLabel(m.type).label,
        getStatusLabel(m.status).label,
        m.technician || '',
        m.cost ? m.cost.toFixed(2) : '0.00',
        formatDate(m.scheduled_date),
        formatDateTime(m.start_time),
        formatDateTime(m.completion_time),
        formatDateTime(m.downtime_start),
        formatDateTime(m.downtime_end),
        m.description || '',
        m.opening_report || ''
      ].map(val => `"${String(val).replace(/"/g, '""')}"`);
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ordens_servico_cmms_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'preventive':
      case 'Preventiva':
        return { label: 'Preventiva', class: 'preventiva' };
      case 'corrective':
      case 'Corretiva':
        return { label: 'Corretiva', class: 'corretiva' };
      default:
        return { label: type, class: 'preventiva' };
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
      case 'Pendente':
        return { label: 'Pendente', class: 'pendente' };
      case 'in_progress':
      case 'Em Andamento':
        return { label: 'Em Andamento', class: 'em-andamento' };
      case 'completed':
      case 'Concluída':
        return { label: 'Concluída', class: 'concluida' };
      default:
        return { label: status, class: 'pendente' };
    }
  };

  const getEntryTypeInfo = (entryType) => {
    switch (entryType) {
      case 'technical_assessment':
        return { label: 'Avaliação Técnica', class: 'badge-assessment' };
      case 'technical_solution':
        return { label: 'Solução Técnica', class: 'badge-solution' };
      case 'parts_used':
        return { label: 'Peças Utilizadas', class: 'badge-parts' };
      case 'general_observation':
      default:
        return { label: 'Observação Geral', class: 'badge-obs' };
    }
  };

  const getEquipmentName = (equipmentId) => {
    const eq = equipmentList.find(item => item.id === equipmentId);
    return eq ? `${eq.name} (${eq.serial_number})` : `Equipamento #${equipmentId}`;
  };

  const isFiltered = filters.search || filters.type || filters.status || filters.equipment_id || filters.start_date || filters.end_date;

  return (
    <div className="maintenance">
      {/* Header */}
      <div className="maintenance-header">
        <div>
          <h2>Gestão de Manutenção Preventiva e Corretiva</h2>
          <p className="subtitle">Acompanhamento, histórico técnico e controle de Ordens de Serviço (OS)</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={exportToCSV} title="Exportar tabela filtrada para CSV">
            📥 Exportar CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Fechar Formulário' : '+ Abrir Nova Ordem de Serviço'}
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Filter Panel */}
      <div className="filter-panel">
        <div className="filter-header">
          <span>🔍 Filtros de Busca</span>
          {isFiltered && (
            <button
              className="btn-clear-filters"
              onClick={() => setFilters({ search: '', type: '', status: '', equipment_id: '', start_date: '', end_date: '' })}
            >
              Limpar Filtros
            </button>
          )}
        </div>
        <div className="filter-grid">
          <div className="filter-item search-item">
            <label>Buscar por Texto</label>
            <input
              type="text"
              placeholder="Nº OS, equipamento, técnico, relato, problema..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>

          <div className="filter-item">
            <label>Tipo de Manutenção</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            >
              <option value="">Todos os Tipos</option>
              <option value="corrective">Corretiva</option>
              <option value="preventive">Preventiva</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Status da OS</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">Todos os Status</option>
              <option value="pending">Pendente</option>
              <option value="in_progress">Em Andamento</option>
              <option value="completed">Concluída</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Equipamento Médico</label>
            <select
              value={filters.equipment_id}
              onChange={(e) => setFilters(prev => ({ ...prev, equipment_id: e.target.value }))}
            >
              <option value="">Todos os Equipamentos</option>
              {equipmentList.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.name} - {eq.serial_number}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label>Data Inicial</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
            />
          </div>

          <div className="filter-item">
            <label>Data Final</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
            />
          </div>
        </div>
        <div className="filter-footer">
          Exibindo <strong>{filteredMaintenances.length}</strong> de <strong>{maintenances.length}</strong> ordens de serviço.
        </div>
      </div>

      {/* New OS Creation Form */}
      {showForm && (
        <div className="maintenance-form-container">
          <h3>Abertura de Ordem de Serviço (OS)</h3>
          <form onSubmit={handleAddMaintenance} className="maintenance-form-grid">
            <div className="form-field">
              <label>Equipamento Médico *</label>
              <select
                value={newMaintenance.equipment_id}
                onChange={(e) => setNewMaintenance({...newMaintenance, equipment_id: e.target.value})}
                required
              >
                {equipmentList.map(eq => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name} - {eq.serial_number} ({eq.location || 'Sem local'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Tipo de Manutenção *</label>
              <select
                value={newMaintenance.type}
                onChange={(e) => setNewMaintenance({...newMaintenance, type: e.target.value})}
              >
                <option value="corrective">Corretiva (Reparo/Falha)</option>
                <option value="preventive">Preventiva (Calibração/Inspeção)</option>
              </select>
            </div>

            <div className="form-field">
              <label>Status Inicial</label>
              <select
                value={newMaintenance.status}
                onChange={(e) => setNewMaintenance({...newMaintenance, status: e.target.value})}
              >
                <option value="pending">Pendente</option>
                <option value="in_progress">Em Andamento</option>
                <option value="completed">Concluída</option>
              </select>
            </div>

            <div className="form-field">
              <label>Técnico Responsável</label>
              <input
                type="text"
                placeholder="Ex: Eng. Carlos Silva"
                value={newMaintenance.technician}
                onChange={(e) => setNewMaintenance({...newMaintenance, technician: e.target.value})}
              />
            </div>

            <div className="form-field">
              <label>Custo Estimado / Real (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newMaintenance.cost}
                onChange={(e) => setNewMaintenance({...newMaintenance, cost: e.target.value})}
              />
            </div>

            <div className="form-field">
              <label>Data Agendada *</label>
              <input
                type="date"
                value={newMaintenance.scheduled_date}
                onChange={(e) => setNewMaintenance({...newMaintenance, scheduled_date: e.target.value})}
                required
              />
            </div>

            <div className="form-field">
              <label>Data/Hora de Início da OS</label>
              <input
                type="datetime-local"
                value={newMaintenance.start_time}
                onChange={(e) => setNewMaintenance({...newMaintenance, start_time: e.target.value})}
              />
            </div>

            <div className="form-field">
              <label>Início da Parada do Equipamento</label>
              <input
                type="datetime-local"
                value={newMaintenance.downtime_start}
                onChange={(e) => setNewMaintenance({...newMaintenance, downtime_start: e.target.value})}
              />
            </div>

            <div className="form-field full-width">
              <label>Descrição do Problema / Serviço Solicitado *</label>
              <textarea
                placeholder="Descreva detalhadamente o serviço ou a falha apresentada pelo equipamento..."
                value={newMaintenance.description}
                onChange={(e) => setNewMaintenance({...newMaintenance, description: e.target.value})}
                rows={3}
                required
              />
            </div>

            <div className="form-field full-width">
              <label>Relato de Abertura do Chamado</label>
              <textarea
                placeholder="Relato inicial do operador ou solicitante do serviço..."
                value={newMaintenance.opening_report}
                onChange={(e) => setNewMaintenance({...newMaintenance, opening_report: e.target.value})}
                rows={2}
              />
            </div>

            <div className="form-actions full-width">
              <button type="submit" className="btn btn-success" disabled={submitting}>
                {submitting ? 'Gerando OS...' : 'Gerar Ordem de Serviço'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main OS Table */}
      <div className="maintenances-table-container">
        {loading ? (
          <div className="loading-spinner">Carregando ordens de serviço do banco de dados...</div>
        ) : filteredMaintenances.length === 0 ? (
          <div className="empty-state">
            {isFiltered ? 'Nenhuma ordem de serviço corresponde aos filtros selecionados.' : 'Nenhuma ordem de serviço cadastrada ainda.'}
          </div>
        ) : (
          <table className="maintenances-table">
            <thead>
              <tr>
                <th>OS #</th>
                <th>Equipamento</th>
                <th>Tipo</th>
                <th>Descrição do Serviço</th>
                <th>Datas & Parada</th>
                <th>Status</th>
                <th>Técnico</th>
                <th>Custo</th>
                <th style={{ textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaintenances.map((item) => {
                const typeInfo = getTypeLabel(item.type);
                const statusInfo = getStatusLabel(item.status);
                return (
                  <tr key={item.id}>
                    <td><strong>OS-{item.id}</strong></td>
                    <td>{getEquipmentName(item.equipment_id)}</td>
                    <td>
                      <span className={`type-badge ${typeInfo.class}`}>
                        {typeInfo.label}
                      </span>
                    </td>
                    <td>
                      <div className="maint-desc">{item.description}</div>
                      {item.opening_report && (
                        <div className="maint-subtext" title={item.opening_report}>
                          <em>Relato: {item.opening_report.length > 50 ? item.opening_report.substring(0, 50) + '...' : item.opening_report}</em>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="maint-subtext">Agendado: {formatDate(item.scheduled_date)}</div>
                      {item.start_time && (
                        <div className="maint-subtext">Início OS: {formatDateTime(item.start_time)}</div>
                      )}
                      {item.downtime_start && (
                        <div className="maint-subtext highlight-downtime">Parada: {formatDateTime(item.downtime_start)}</div>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${statusInfo.class}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td>{item.technician || 'Não atribuído'}</td>
                    <td>{item.cost ? `R$ ${item.cost.toFixed(2)}` : 'R$ 0,00'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn-detail-action"
                        onClick={() => handleOpenDetailModal(item)}
                        title="Ver detalhes, editar e adicionar pareceres"
                      >
                        🔍 Detalhes
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Details & Edit Modal */}
      {selectedMaintenance && (
        <div className="modal-overlay" onClick={() => setSelectedMaintenance(null)}>
          <div className="modal-container modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Ordem de Serviço #OS-{selectedMaintenance.id}</h3>
                <p className="modal-subtitle">
                  Equipamento: <strong>{getEquipmentName(selectedMaintenance.equipment_id)}</strong>
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedMaintenance(null)}>✕</button>
            </div>

            <div className="modal-body modal-scrollable">
              {/* Section 1: OS Form Data & Edit */}
              <div className="modal-section">
                <h4 className="section-title">📋 Informações da Ordem de Serviço</h4>
                <form onSubmit={handleSaveOSChanges} className="maintenance-form-grid">
                  <div className="form-field">
                    <label>Equipamento Médico</label>
                    <select
                      value={editForm.equipment_id}
                      onChange={(e) => setEditForm({ ...editForm, equipment_id: e.target.value })}
                    >
                      {equipmentList.map(eq => (
                        <option key={eq.id} value={eq.id}>
                          {eq.name} - {eq.serial_number}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Tipo de Manutenção</label>
                    <select
                      value={editForm.type}
                      onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    >
                      <option value="corrective">Corretiva</option>
                      <option value="preventive">Preventiva</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Status da OS</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    >
                      <option value="pending">Pendente</option>
                      <option value="in_progress">Em Andamento</option>
                      <option value="completed">Concluída</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Técnico Responsável</label>
                    <input
                      type="text"
                      value={editForm.technician}
                      onChange={(e) => setEditForm({ ...editForm, technician: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Custo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.cost}
                      onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Data Agendada</label>
                    <input
                      type="date"
                      value={editForm.scheduled_date}
                      onChange={(e) => setEditForm({ ...editForm, scheduled_date: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Início da OS</label>
                    <input
                      type="datetime-local"
                      value={editForm.start_time}
                      onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Fechamento da OS</label>
                    <input
                      type="datetime-local"
                      value={editForm.completion_time}
                      onChange={(e) => setEditForm({ ...editForm, completion_time: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Início da Parada do Equipamento</label>
                    <input
                      type="datetime-local"
                      value={editForm.downtime_start}
                      onChange={(e) => setEditForm({ ...editForm, downtime_start: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Término da Parada do Equipamento</label>
                    <input
                      type="datetime-local"
                      value={editForm.downtime_end}
                      onChange={(e) => setEditForm({ ...editForm, downtime_end: e.target.value })}
                    />
                  </div>

                  <div className="form-field full-width">
                    <label>Descrição do Problema / Serviço</label>
                    <textarea
                      rows={3}
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    />
                  </div>

                  <div className="form-field full-width">
                    <label>Relato de Abertura do Chamado</label>
                    <textarea
                      rows={2}
                      value={editForm.opening_report}
                      onChange={(e) => setEditForm({ ...editForm, opening_report: e.target.value })}
                    />
                  </div>

                  <div className="form-actions full-width">
                    <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                      {savingEdit ? 'Salvando...' : '💾 Salvar Alterações na OS'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Section 2: 1:N Technical Notes & Assessment Entries */}
              <div className="modal-section entries-section">
                <h4 className="section-title">💬 Histórico de Avaliações Técnicas, Peças e Soluções (1:N)</h4>

                {/* Sub-form to add new entry */}
                <form onSubmit={handleAddEntry} className="add-entry-card">
                  <h5>+ Incluir Informação Complementar / Parecer Técnico</h5>
                  <div className="add-entry-grid">
                    <div className="form-field">
                      <label>Tipo de Informação *</label>
                      <select
                        value={newEntry.entry_type}
                        onChange={(e) => setNewEntry({ ...newEntry, entry_type: e.target.value })}
                      >
                        <option value="technical_assessment">Avaliação Técnica</option>
                        <option value="technical_solution">Solução Técnica</option>
                        <option value="parts_used">Peças Utilizadas</option>
                        <option value="general_observation">Observação Geral</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label>Registrado Por (Nome/Técnico)</label>
                      <input
                        type="text"
                        placeholder="Ex: Eng. Carlos / Resp. Técnico"
                        value={newEntry.registered_by}
                        onChange={(e) => setNewEntry({ ...newEntry, registered_by: e.target.value })}
                      />
                    </div>

                    <div className="form-field full-width">
                      <label>Descrição / Observações Técnicas *</label>
                      <textarea
                        rows={3}
                        placeholder="Descreva a avaliação realizada, peças substituídas, testes efetuados ou parecer do técnico..."
                        value={newEntry.notes}
                        onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="entry-action">
                    <button type="submit" className="btn btn-success" disabled={submittingEntry}>
                      {submittingEntry ? 'Registrando...' : '+ Salvar Registro Técnico'}
                    </button>
                  </div>
                </form>

                {/* Entries List / Timeline */}
                <div className="entries-list">
                  {loadingEntries ? (
                    <div className="loading-spinner">Carregando histórico de pareceres...</div>
                  ) : entries.length === 0 ? (
                    <div className="empty-entries">Nenhuma informação técnica ou parecer registrado para esta OS ainda.</div>
                  ) : (
                    entries.map(entry => {
                      const typeInfo = getEntryTypeInfo(entry.entry_type);
                      return (
                        <div key={entry.id} className="entry-card">
                          <div className="entry-header">
                            <span className={`entry-type-badge ${typeInfo.class}`}>
                              {typeInfo.label}
                            </span>
                            <span className="entry-meta">
                              {formatDateTime(entry.created_at)}
                              {entry.registered_by && ` • por ${entry.registered_by}`}
                            </span>
                          </div>
                          <div className="entry-content">
                            {entry.notes}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedMaintenance(null)}>
                Fechar Janela
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;