import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="header-left">
        <h1>Flow CMMS - Sistema de Gestão de Equipamentos Médicos</h1>
      </div>
      <div className="header-right">
        <div className="user-info">
          <span>Usuário: Administrador</span>
        </div>
      </div>
    </header>
  );
};

export default Header;