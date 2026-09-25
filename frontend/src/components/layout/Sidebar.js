import React from 'react';
import './Sidebar.css';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'assets', label: 'Ativos', icon: '💻' },
    { id: 'maintenance', label: 'Manutenção', icon: '🔧' },
    { id: 'inventory', label: 'Estoque', icon: '📦' },
    { id: 'reports', label: 'Relatórios', icon: '📋' },
  ];

  return (
    <aside className="sidebar">
      <nav className="nav-menu">
        <ul>
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
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
    </aside>
  );
};

export default Sidebar;