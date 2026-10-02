import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <div className="header-left">
        <div className="header-brand">
          <span className="brand-icon">🏥</span>
          <span className="brand-title">Flow CMMS</span>
        </div>
        <div className="system-status">
          <span className="status-dot"></span>
          <span className="status-text">Sistema Operacional</span>
        </div>
      </div>

      <div className="header-right">
        <div className="user-profile">
          <div className="avatar-circle">
            {user?.username ? user.username.substring(0, 2).toUpperCase() : 'AD'}
          </div>
          <div className="user-details">
            <span className="user-name">{user ? user.username : 'Administrador'}</span>
            <span className="user-role-badge">{user?.role || 'admin'}</span>
          </div>
        </div>

        <button onClick={logout} className="logout-button" title="Encerrar sessão no sistema">
          <span>Sair</span>
          <span className="logout-icon">➔</span>
        </button>
      </div>
    </header>
  );
};

export default Header;