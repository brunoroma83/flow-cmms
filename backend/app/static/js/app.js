import api, { getToken, getUser } from './api.js';
import { renderLoginView } from './views/loginView.js';
import { renderDashboardView } from './views/dashboardView.js';
import { renderAssetsView } from './views/assetsView.js';
import { renderMaintenanceView } from './views/maintenanceView.js';
import { renderInventoryView } from './views/inventoryView.js';
import { renderReportsView } from './views/reportsView.js';

// DOM Containers
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const appContent = document.getElementById('app-content');
const pageTitle = document.getElementById('page-title');
const btnLogout = document.getElementById('btn-logout');
const headerDatetime = document.getElementById('header-datetime');
const userAvatar = document.getElementById('sidebar-user-avatar');
const userName = document.getElementById('sidebar-user-name');
const userRole = document.getElementById('sidebar-user-role');

// Update Clock
function updateClock() {
  const now = new Date();
  headerDatetime.textContent = now.toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}
setInterval(updateClock, 30000);
updateClock();

// SPA Router
async function router() {
  const token = getToken();
  const user = getUser();
  const hash = window.location.hash || '#dashboard';

  if (!token) {
    authContainer.style.display = 'flex';
    appContainer.style.display = 'none';
    renderLoginView(authContainer, () => {
      window.location.hash = '#dashboard';
      router();
    });
    return;
  }

  // Authenticated State
  authContainer.style.display = 'none';
  appContainer.style.display = 'flex';

  // Update User Profile in Sidebar
  const uname = user ? user.username : 'admin';
  userAvatar.textContent = uname.charAt(0).toUpperCase();
  userName.textContent = uname.charAt(0).toUpperCase() + uname.slice(1);
  userRole.textContent = user && user.role ? `Nível: ${user.role}` : 'Engenharia Clínica';

  // Highlight Sidebar Link
  document.querySelectorAll('.nav-item').forEach(item => {
    const route = item.getAttribute('href');
    if (route === hash) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Render Target View
  switch (hash) {
    case '#assets':
      pageTitle.textContent = 'Ativos Médicos';
      await renderAssetsView(appContent);
      break;
    case '#maintenance':
      pageTitle.textContent = 'Ordens de Serviço';
      await renderMaintenanceView(appContent);
      break;
    case '#inventory':
      pageTitle.textContent = 'Estoque de Peças';
      await renderInventoryView(appContent);
      break;
    case '#reports':
      pageTitle.textContent = 'Relatórios Operacionais';
      await renderReportsView(appContent);
      break;
    case '#dashboard':
    default:
      pageTitle.textContent = 'Dashboard Operacional';
      await renderDashboardView(appContent);
      break;
  }
}

// Logout Listener
btnLogout.addEventListener('click', () => {
  api.logout();
});

// Hashchange Router Listener
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);
