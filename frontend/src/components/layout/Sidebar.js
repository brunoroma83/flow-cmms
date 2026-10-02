import React from 'react';
import './Sidebar.css';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'assets', label: 'Ativos Médicos', icon: '💻' },
    { id: 'maintenance', label: 'Manutenção (OS)', icon: '🔧' },
    { id: 'inventory', label: 'Estoque de Insumos', icon: '📦' },
    { id: 'reports', label: 'Relatórios', icon: '📋' },
  ];

  return (
    <aside className="sidebar">
      <nav className="nav-menu">
        <ul>
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <span className="icon">{item.icon}</span>
                <span className="label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="system-version">Flow CMMS v1.2</div>
        <div className="system-subtitle">Gestão Hospitalar</div>
      </div>
    </aside>
  );
};

export default Sidebar;