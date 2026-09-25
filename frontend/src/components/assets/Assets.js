import React, { useState } from 'react';
import './Assets.css';

const Assets = () => {
  const [assets, setAssets] = useState([
    { id: 1, name: 'Scanner Cardiovascular', category: 'Equipamentos Médicos', status: 'Ativo', location: 'Sala 101', lastMaintenance: '2023-10-15' },
    { id: 2, name: 'Monitor de Pressão Arterial', category: 'Equipamentos Médicos', status: 'Em Manutenção', location: 'Sala 202', lastMaintenance: '2023-09-20' },
    { id: 3, name: 'Eletrocardiograma', category: 'Equipamentos Médicos', status: 'Ativo', location: 'Sala 301', lastMaintenance: '2023-11-05' },
    { id: 4, name: 'Respirador Mecânico', category: 'Equipamentos Médicos', status: 'Inativo', location: 'UTI', lastMaintenance: '2023-08-10' },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '',
    category: '',
    status: 'Ativo',
    location: ''
  });

  const handleAddAsset = (e) => {
    e.preventDefault();
    if (newAsset.name && newAsset.category) {
      const asset = {
        id: assets.length + 1,
        ...newAsset,
        lastMaintenance: new Date().toISOString().split('T')[0]
      };
      setAssets([...assets, asset]);
      setNewAsset({ name: '', category: '', status: 'Ativo', location: '' });
      setShowForm(false);
    }
  };

  return (
    <div className="assets">
      <div className="assets-header">
        <h2>Gestão de Ativos</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Novo Equipamento'}
        </button>
      </div>

      {showForm && (
        <div className="asset-form">
          <form onSubmit={handleAddAsset}>
            <input
              type="text"
              placeholder="Nome do Equipamento"
              value={newAsset.name}
              onChange={(e) => setNewAsset({...newAsset, name: e.target.value})}
              required
            />
            <input
              type="text"
              placeholder="Categoria"
              value={newAsset.category}
              onChange={(e) => setNewAsset({...newAsset, category: e.target.value})}
              required
            />
            <select
              value={newAsset.status}
              onChange={(e) => setNewAsset({...newAsset, status: e.target.value})}
            >
              <option value="Ativo">Ativo</option>
              <option value="Em Manutenção">Em Manutenção</option>
              <option value="Inativo">Inativo</option>
            </select>
            <input
              type="text"
              placeholder="Localização"
              value={newAsset.location}
              onChange={(e) => setNewAsset({...newAsset, location: e.target.value})}
            />
            <button type="submit" className="btn btn-success">Adicionar</button>
          </form>
        </div>
      )}

      <div className="assets-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Status</th>
              <th>Localização</th>
              <th>Última Manutenção</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id}>
                <td>{asset.id}</td>
                <td>{asset.name}</td>
                <td>{asset.category}</td>
                <td><span className={`status ${asset.status.toLowerCase().replace(' ', '-')}`}>{asset.status}</span></td>
                <td>{asset.location}</td>
                <td>{asset.lastMaintenance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Assets;