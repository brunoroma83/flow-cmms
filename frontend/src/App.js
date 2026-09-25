import React, { useState } from 'react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './components/dashboard/Dashboard';
import Assets from './components/assets/Assets';
import Maintenance from './components/maintenance/Maintenance';
import Inventory from './components/inventory/Inventory';
import Reports from './components/reports/Reports';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'assets':
        return <Assets />;
      case 'maintenance':
        return <Maintenance />;
      case 'inventory':
        return <Inventory />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <Header />
      <div className="app-main">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="app-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
