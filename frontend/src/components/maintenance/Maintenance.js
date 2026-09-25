import React, { useState } from 'react';
import './Maintenance.css';

const Maintenance = () => {
  const [maintenances, setMaintenances] = useState([
    { id: 1, asset: 'Scanner Cardiovascular', type: 'Preventiva', status: 'Agendada', date: '2023-11-20', priority: 'Média' },
    { id: 2, asset: 'Monitor de Pressão Arterial', type: 'Corretiva', status: 'Em Andamento', date: '2023-11-18', priority: 'Alta' },
    { id: 3, asset: 'Eletrocardiograma', type: 'Preventiva', status: 'Concluída', date: '2023-11-10', priority: 'Baixa' },
    { id: 4, asset: 'Respirador Mecânico', type: 'Corretiva', status: 'Pendente', date: '2023-11-25', priority: 'Alta' },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [newMaintenance, setNewMaintenance] = useState({
    asset: '',
    type: 'Corretiva',
    status: 'Pendente',
    date: '',
    priority: 'Média'
  });

  const handleAddMaintenance = (e) => {
    e.preventDefault();
    if (newMaintenance.asset && newMaintenance.date) {
      const maintenance = {
        id: maintenances.length + 1,
        ...newMaintenance
      };
      setMaintenances([...maintenances, maintenance]);
      setNewMaintenance({ asset: '', type: 'Corretiva', status: 'Pendente', date: '', priority: 'Média' });
      setShowForm(false);
    }
  };

  return (
    <div className="maintenance">
      <div className="maintenance-header">
        <h2>Gestão de Manutenção</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nova Ordem'}
        </button>
      </div>

      {showForm && (
        <div className="maintenance-form">
          <form onSubmit={handleAddMaintenance}>
            <input
              type="text"
              placeholder="Equipamento"
              value={newMaintenance.asset}
              onChange={(e) => setNewMaintenance({...newMaintenance, asset: e.target.value})}
              required
            />
            <select
              value={newMaintenance.type}
              onChange={(e) => setNewMaintenance({...newMaintenance, type: e.target.value})}
            >
              <option value="Corretiva">Corretiva</option>
              <option value="Preventiva">Preventiva</option>
            </select>
            <select
              value={newMaintenance.status}
              onChange={(e) => setNewMaintenance({...newMaintenance, status: e.target.value})}
            >
              <option value="Pendente">Pendente</option>
              <option value="Agendada">Agendada</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Concluída">Concluída</option>
            </select>
            <input
              type="date"
              value={newMaintenance.date}
              onChange={(e) => setNewMaintenance({...newMaintenance, date: e.target.value})}
              required
            />
            <select
              value={newMaintenance.priority}
              onChange={(e) => setNewMaintenance({...newMaintenance, priority: e.target.value})}
            >
              <option value="Baixa">Baixa</option>
              <option value="Média">Média</option>
              <option value="Alta">Alta</option>
            </select>
            <button type="submit" className="btn btn-success">Adicionar</button>
          </form>
        </div>
      )}

      <div className="maintenances-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Equipamento</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Data</th>
              <th>Prioridade</th>
            </tr>
          </thead>
          <tbody>
            {maintenances.map((maintenance) => (
              <tr key={maintenance.id}>
                <td>{maintenance.id}</td>
                <td>{maintenance.asset}</td>
                <td>{maintenance.type}</td>
                <td><span className={`status ${maintenance.status.toLowerCase().replace(' ', '-')}`}>{maintenance.status}</span></td>
                <td>{maintenance.date}</td>
                <td><span className={`priority priority-${maintenance.priority.toLowerCase()}`}>{maintenance.priority}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Maintenance;