import React from 'react';
import './Dashboard.css';

const Dashboard = () => {
  // Dados de exemplo para indicadores
  const indicators = [
    { title: 'Uptime Médio', value: '98.5%', icon: '⏱️' },
    { title: 'MTTR', value: '2.3 horas', icon: '⏰' },
    { title: 'MTBF', value: '156 dias', icon: '📈' },
    { title: 'Equipamentos Ativos', value: '42', icon: '🖥️' },
  ];

  const recentActivities = [
    { id: 1, action: 'Nova ordem de serviço criada', time: '2 minutos atrás', type: 'success' },
    { id: 2, action: 'Manutenção preventiva agendada', time: '1 hora atrás', type: 'info' },
    { id: 3, action: 'Peça estocada atualizada', time: '3 horas atrás', type: 'warning' },
    { id: 4, action: 'Equipamento em manutenção corretiva', time: '5 horas atrás', type: 'danger' },
  ];

  return (
    <div className="dashboard">
      <h2>Dashboard Principal</h2>
      
      <div className="indicators-grid">
        {indicators.map((indicator, index) => (
          <div key={index} className="indicator-card">
            <div className="indicator-icon">{indicator.icon}</div>
            <div className="indicator-content">
              <h3>{indicator.value}</h3>
              <p>{indicator.title}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="recent-activities">
        <h3>Atividades Recentes</h3>
        <ul>
          {recentActivities.map((activity) => (
            <li key={activity.id} className={`activity-item ${activity.type}`}>
              <span>{activity.action}</span>
              <small>{activity.time}</small>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;