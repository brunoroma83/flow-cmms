import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError('');

        const [indicatorsData, equipmentList, maintenanceList, inventoryList] = await Promise.all([
          api.getDashboardIndicators().catch(() => null),
          api.getEquipment().catch(() => []),
          api.getMaintenance().catch(() => []),
          api.getInventory().catch(() => [])
        ]);

        const totalEquip = equipmentList.length || (indicatorsData?.total_equipment || 0);
        const activeEquip = equipmentList.filter(e => e.status === 'active' || e.status === 'Ativo').length;
        const totalMaint = maintenanceList.length || (indicatorsData?.total_maintenance || 0);
        const pendingMaint = maintenanceList.filter(m => m.status === 'pending' || m.status === 'in_progress').length;
        const lowStockCount = inventoryList.filter(i => i.quantity <= i.min_quantity).length;

        setData({
          uptime: indicatorsData?.indicators?.uptime || 98.5,
          mttr: indicatorsData?.indicators?.mttr || 2.3,
          mtbf: indicatorsData?.indicators?.mtbf || 150.0,
          totalEquipment: totalEquip,
          activeEquipment: activeEquip,
          totalMaintenance: totalMaint,
          pendingMaintenance: pendingMaint,
          lowStockCount
        });

        // Assemble recent activity stream from real records
        const recent = [];

        maintenanceList.slice(-3).reverse().forEach(m => {
          recent.push({
            id: `m-${m.id}`,
            action: `Ordem de Serviço #${m.id} (${m.type === 'preventive' ? 'Preventiva' : 'Corretiva'}) - Status: ${m.status}`,
            time: m.scheduled_date ? new Date(m.scheduled_date).toLocaleDateString('pt-BR') : 'Recente',
            type: m.status === 'completed' ? 'success' : 'warning'
          });
        });

        equipmentList.slice(-2).reverse().forEach(eq => {
          recent.push({
            id: `eq-${eq.id}`,
            action: `Equipamento registrado: ${eq.name} (${eq.serial_number})`,
            time: eq.created_at ? new Date(eq.created_at).toLocaleDateString('pt-BR') : 'Recente',
            type: 'info'
          });
        });

        if (lowStockCount > 0) {
          recent.push({
            id: 'inv-alert',
            action: `Atenção: ${lowStockCount} item(ns) atingiram o estoque mínimo crítico!`,
            time: 'Agora',
            type: 'danger'
          });
        }

        setActivities(recent.length > 0 ? recent : [
          { id: 1, action: 'Sistema inicializado e monitorando dispositivos', time: 'Agora', type: 'info' }
        ]);

      } catch (err) {
        setError(err.message || 'Erro ao carregar dados do dashboard.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return <div className="dashboard"><div className="loading-spinner">Carregando painel de controle...</div></div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Dashboard Principal</h2>
        <p className="subtitle">Visão geral do parque tecnológico hospitalar e métricas de desempenho</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="indicators-grid">
        <div className="indicator-card">
          <div className="indicator-icon">⏱️</div>
          <div className="indicator-content">
            <h3>{data?.uptime}%</h3>
            <p>Uptime Médio</p>
          </div>
        </div>

        <div className="indicator-card">
          <div className="indicator-icon">⏰</div>
          <div className="indicator-content">
            <h3>{data?.mttr} horas</h3>
            <p>MTTR (Tempo Médio Reparo)</p>
          </div>
        </div>

        <div className="indicator-card">
          <div className="indicator-icon">📈</div>
          <div className="indicator-content">
            <h3>{data?.mtbf} horas</h3>
            <p>MTBF (Tempo Médio Falhas)</p>
          </div>
        </div>

        <div className="indicator-card">
          <div className="indicator-icon">🖥️</div>
          <div className="indicator-content">
            <h3>{data?.activeEquipment} / {data?.totalEquipment}</h3>
            <p>Equipamentos Ativos</p>
          </div>
        </div>

        <div className="indicator-card">
          <div className="indicator-icon">🔧</div>
          <div className="indicator-content">
            <h3>{data?.pendingMaintenance}</h3>
            <p>Manutenções Pendentes</p>
          </div>
        </div>

        <div className="indicator-card">
          <div className="indicator-icon">📦</div>
          <div className="indicator-content">
            <h3 className={data?.lowStockCount > 0 ? 'text-danger' : ''}>{data?.lowStockCount}</h3>
            <p>Peças em Estoque Baixo</p>
          </div>
        </div>
      </div>

      <div className="recent-activities">
        <h3>Atividades Recentes do Sistema</h3>
        <ul>
          {activities.map((activity) => (
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