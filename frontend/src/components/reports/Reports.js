import React from 'react';
import './Reports.css';

const Reports = () => {
  const reports = [
    { id: 1, name: 'Relatório de Manutenções', type: 'Manutenção', date: '2023-11-15', status: 'Disponível' },
    { id: 2, name: 'Relatório de Ativos', type: 'Ativos', date: '2023-11-10', status: 'Disponível' },
    { id: 3, name: 'Relatório de Estoque', type: 'Estoque', date: '2023-11-05', status: 'Disponível' },
    { id: 4, name: 'Relatório de Indicadores', type: 'Indicadores', date: '2023-11-01', status: 'Disponível' },
  ];

  return (
    <div className="reports">
      <h2>Relatórios</h2>
      
      <div className="reports-grid">
        {reports.map((report) => (
          <div key={report.id} className="report-card">
            <div className="report-header">
              <h3>{report.name}</h3>
              <span className="report-type">{report.type}</span>
            </div>
            <div className="report-info">
              <p>Data: {report.date}</p>
              <p>Status: <span className="status available">{report.status}</span></p>
            </div>
            <button className="btn btn-secondary">Gerar Relatório</button>
          </div>
        ))}
      </div>

      <div className="reports-filters">
        <h3>Filtros de Relatórios</h3>
        <div className="filter-controls">
          <select>
            <option>Tipo de Relatório</option>
            <option>Manutenção</option>
            <option>Ativos</option>
            <option>Estoque</option>
            <option>Indicadores</option>
          </select>
          
          <input type="date" />
          <input type="date" />
          <button className="btn btn-primary">Aplicar Filtros</button>
        </div>
      </div>
    </div>
  );
};

export default Reports;