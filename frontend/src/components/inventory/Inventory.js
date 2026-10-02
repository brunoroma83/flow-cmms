import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './Inventory.css';

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newItem, setNewItem] = useState({
    name: '',
    part_number: '',
    category: 'Peças de Reposição',
    quantity: 0,
    min_quantity: 5,
    max_quantity: 50,
    unit_price: 0,
    supplier: '',
    location: ''
  });

  const loadInventory = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getInventory();
      setInventory(data);
    } catch (err) {
      setError(err.message || 'Falha ao carregar itens de estoque.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.part_number) {
      alert('Nome do item e Código de Peça (Part Number) são obrigatórios.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...newItem,
        quantity: parseInt(newItem.quantity, 10) || 0,
        min_quantity: parseInt(newItem.min_quantity, 10) || 0,
        max_quantity: parseInt(newItem.max_quantity, 10) || 0,
        unit_price: parseFloat(newItem.unit_price) || 0,
        total_value: (parseInt(newItem.quantity, 10) || 0) * (parseFloat(newItem.unit_price) || 0)
      };

      await api.createInventoryItem(payload);
      setShowForm(false);
      setNewItem({
        name: '',
        part_number: '',
        category: 'Peças de Reposição',
        quantity: 0,
        min_quantity: 5,
        max_quantity: 50,
        unit_price: 0,
        supplier: '',
        location: ''
      });
      await loadInventory();
    } catch (err) {
      alert('Erro ao cadastrar item de estoque: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustStock = async (id, delta) => {
    try {
      await api.adjustStock(id, delta);
      await loadInventory();
    } catch (err) {
      alert('Erro ao ajustar estoque: ' + err.message);
    }
  };

  return (
    <div className="inventory">
      <div className="inventory-header">
        <div>
          <h2>Gestão de Estoque de Peças e Consumíveis</h2>
          <p className="subtitle">Controle de insumos para manutenção de equipamentos médicos</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Fechar Formulário' : '+ Novo Item no Estoque'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <div className="inventory-form-container">
          <h3>Cadastro de Novo Insumo / Peça</h3>
          <form onSubmit={handleAddItem} className="inventory-form-grid">
            <div className="form-field">
              <label>Nome do Item / Peça *</label>
              <input
                type="text"
                placeholder="Ex: Sensor de SpO2 Adulto"
                value={newItem.name}
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                required
              />
            </div>

            <div className="form-field">
              <label>Código da Peça (Part Number) *</label>
              <input
                type="text"
                placeholder="Ex: SENS-SPO2-01"
                value={newItem.part_number}
                onChange={(e) => setNewItem({...newItem, part_number: e.target.value})}
                required
              />
            </div>

            <div className="form-field">
              <label>Categoria</label>
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({...newItem, category: e.target.value})}
              >
                <option value="Acessórios de Monitorização">Acessórios de Monitorização</option>
                <option value="Consumíveis de Ventilação">Consumíveis de Ventilação</option>
                <option value="Cabos e Sensores">Cabos e Sensores</option>
                <option value="Peças de Reposição">Peças de Reposição</option>
              </select>
            </div>

            <div className="form-field">
              <label>Quantidade Inicial</label>
              <input
                type="number"
                value={newItem.quantity}
                onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                required
              />
            </div>

            <div className="form-field">
              <label>Estoque Mínimo (Alerta)</label>
              <input
                type="number"
                value={newItem.min_quantity}
                onChange={(e) => setNewItem({...newItem, min_quantity: e.target.value})}
                required
              />
            </div>

            <div className="form-field">
              <label>Preço Unitário (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newItem.unit_price}
                onChange={(e) => setNewItem({...newItem, unit_price: e.target.value})}
              />
            </div>

            <div className="form-field">
              <label>Fornecedor</label>
              <input
                type="text"
                placeholder="Ex: MedParts Distribuidora"
                value={newItem.supplier}
                onChange={(e) => setNewItem({...newItem, supplier: e.target.value})}
              />
            </div>

            <div className="form-field">
              <label>Localização no Almoxarifado</label>
              <input
                type="text"
                placeholder="Ex: Prateleira A2"
                value={newItem.location}
                onChange={(e) => setNewItem({...newItem, location: e.target.value})}
              />
            </div>

            <div className="form-actions full-width">
              <button type="submit" className="btn btn-success" disabled={submitting}>
                {submitting ? 'Cadastrando...' : 'Cadastrar Item'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="inventory-table-container">
        {loading ? (
          <div className="loading-spinner">Carregando itens de estoque do banco de dados...</div>
        ) : inventory.length === 0 ? (
          <div className="empty-state">Nenhum item cadastrado no estoque.</div>
        ) : (
          <table className="inventory-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Item / Descrição</th>
                <th>Código (Part #)</th>
                <th>Qtd. Atual</th>
                <th>Qtd. Mínima</th>
                <th>Valor Unit. (R$)</th>
                <th>Localização</th>
                <th>Status Estoque</th>
                <th>Ações Rápida</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const isLowStock = item.quantity <= item.min_quantity;
                return (
                  <tr key={item.id} className={isLowStock ? 'row-low-stock' : ''}>
                    <td>#{item.id}</td>
                    <td>
                      <strong>{item.name}</strong>
                      {item.supplier && <div className="inv-subtext">Forn: {item.supplier}</div>}
                    </td>
                    <td><code>{item.part_number}</code></td>
                    <td>
                      <strong className={isLowStock ? 'stock-critical' : 'stock-normal'}>
                        {item.quantity}
                      </strong>
                    </td>
                    <td>{item.min_quantity}</td>
                    <td>{item.unit_price ? `R$ ${item.unit_price.toFixed(2)}` : 'R$ 0,00'}</td>
                    <td>{item.location || 'Não informado'}</td>
                    <td>
                      {isLowStock ? (
                        <span className="status-badge low-stock">⚠️ Alerta Estoque Baixo</span>
                      ) : (
                        <span className="status-badge in-stock">✓ Em Estoque</span>
                      )}
                    </td>
                    <td>
                      <div className="stock-actions">
                        <button
                          className="btn-stock-adjust minus"
                          onClick={() => handleAdjustStock(item.id, -1)}
                          disabled={item.quantity <= 0}
                          title="Remover 1 unidade"
                        >
                          -1
                        </button>
                        <button
                          className="btn-stock-adjust plus"
                          onClick={() => handleAdjustStock(item.id, 1)}
                          title="Adicionar 1 unidade"
                        >
                          +1
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
    </div>
  );
};

export default Inventory;