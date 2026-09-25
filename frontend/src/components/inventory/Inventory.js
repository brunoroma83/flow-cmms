import React, { useState } from 'react';
import './Inventory.css';

const Inventory = () => {
  const [inventory, setInventory] = useState([
    { id: 1, part: 'Bateria de Respirador', category: 'Peças', stock: 15, minStock: 5, location: 'Armazém Central' },
    { id: 2, part: 'Sensor ECG', category: 'Peças', stock: 3, minStock: 10, location: 'Armazém Central' },
    { id: 3, part: 'Cabo de Energia', category: 'Acessórios', stock: 50, minStock: 20, location: 'Armazém Secundário' },
    { id: 4, part: 'Filtro de Ar', category: 'Peças', stock: 8, minStock: 15, location: 'Armazém Central' },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [newPart, setNewPart] = useState({
    part: '',
    category: 'Peças',
    stock: 0,
    minStock: 0,
    location: ''
  });

  const handleAddPart = (e) => {
    e.preventDefault();
    if (newPart.part) {
      const part = {
        id: inventory.length + 1,
        ...newPart
      };
      setInventory([...inventory, part]);
      setNewPart({ part: '', category: 'Peças', stock: 0, minStock: 0, location: '' });
      setShowForm(false);
    }
  };

  return (
    <div className="inventory">
      <div className="inventory-header">
        <h2>Gestão de Estoque</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nova Peça'}
        </button>
      </div>

      {showForm && (
        <div className="inventory-form">
          <form onSubmit={handleAddPart}>
            <input
              type="text"
              placeholder="Nome da Peça"
              value={newPart.part}
              onChange={(e) => setNewPart({...newPart, part: e.target.value})}
              required
            />
            <select
              value={newPart.category}
              onChange={(e) => setNewPart({...newPart, category: e.target.value})}
            >
              <option value="Peças">Peças</option>
              <option value="Acessórios">Acessórios</option>
              <option value="Consumíveis">Consumíveis</option>
            </select>
            <input
              type="number"
              placeholder="Quantidade em Estoque"
              value={newPart.stock}
              onChange={(e) => setNewPart({...newPart, stock: parseInt(e.target.value) || 0})}
              required
            />
            <input
              type="number"
              placeholder="Estoque Mínimo"
              value={newPart.minStock}
              onChange={(e) => setNewPart({...newPart, minStock: parseInt(e.target.value) || 0})}
              required
            />
            <input
              type="text"
              placeholder="Localização"
              value={newPart.location}
              onChange={(e) => setNewPart({...newPart, location: e.target.value})}
            />
            <button type="submit" className="btn btn-success">Adicionar</button>
          </form>
        </div>
      )}

      <div className="inventory-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Peça</th>
              <th>Categoria</th>
              <th>Estoque</th>
              <th>Mínimo</th>
              <th>Localização</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.part}</td>
                <td>{item.category}</td>
                <td>{item.stock}</td>
                <td>{item.minStock}</td>
                <td>{item.location}</td>
                <td>
                  {item.stock <= item.minStock ? (
                    <span className="status low-stock">Baixo Estoque</span>
                  ) : (
                    <span className="status in-stock">Em Estoque</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Inventory;