import React from 'react';
import './Reports.css';

const Reports = () => {
  const reports = [
    { id: 1, name: 'Relatório Geral de Manutenções', type: 'Manutenção OS', date: new Date().toLocaleDateString('pt-BR'), status: 'Disponível', desc: 'Histórico completo de intervenções preventivas e corretivas' },
    { id: 2, name: 'Inventário de Ativos Médicos', type: 'Ativos / Equipamentos', date: new Date().toLocaleDateString('pt-BR'), status: 'Disponível', desc: 'Mapeamento de localização, fabricante e garantias do parque hospitalar' },
    { id: 3, name: 'Posição Física de Estoque de Insumos', type: 'Almoxarifado', date: new Date().toLocaleDateString('pt-BR'), status: 'Disponível', desc: 'Balanço atual de peças, valoração de estoque e alertas de mínimos' },
    { id: 4, name: 'Relatório Executivo de Indicadores (MTTR/MTBF)', type: 'Gestão / KPIs', date: new Date().toLocaleDateString('pt-BR'), status: 'Disponível', desc: 'Métricas de confiabilidade, uptime médio e desempenho de manutenção' },
  ];

  const handleGenerate = (name) => {
    alert(`Gerando "${name}" em formato PDF... O arquivo será disponibilizado para download.`);
  };

  return (
    <div className="reports">
      <div className="reports-page-header">
        <h2>Relatórios e Auditoria Hospitalar</h2>
        <p className="subtitle">Exportação de dados para acreditação hospitalar e compliance</p>
      </div>
      
      <div className="reports-grid">
        {reports.map((report) => (
          <div key={report.id} className="report-card">
            <div className="report-header">
              <h3>{report.name}</h3>
              <span className="report-type">{report.type}</span>
            </div>
            <p className="report-desc">{report.desc}</p>
            <div className="report-info">
              <span>Data de Emissão: {report.date}</span>
              <span className="status-badge disponivel">✓ {report.status}</span>
            </div>
            <button className="btn btn-primary btn-block" onClick={() => handleGenerate(report.name)}>
              📄 Exportar PDF / Excel
            </button>
          </div>
        ))}
      </div>

      <div className="reports-filters-container">
        <h3>Filtros de Relatório Customizado</h3>
        <div className="filter-controls-grid">
          <div className="filter-field">
            <label>Tipo de Relatório</label>
            <select>
              <option>Todas as Categorias</option>
              <option>Manutenção Preventiva</option>
              <option>Manutenção Corretiva</option>
              <option>Equipamentos Críticos (UTI)</option>
              <option>Peças e Consumíveis</option>
            </select>
          </div>

          <div className="filter-field">
            <label>Data Inicial</label>
            <input type="date" />
          </div>

          <div className="filter-field">
            <label>Data Final</label>
            <input type="date" />
          </div>

          <div className="filter-field filter-action">
            <button className="btn btn-success">Gerar Relatório Filtrado</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;