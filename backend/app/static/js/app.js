import api, { getToken, getUser, getActiveTenant } from './api.js';
import { renderLoginView } from './views/loginView.js';
import { renderDashboardView } from './views/dashboardView.js';
import { renderAssetsView } from './views/assetsView.js';
import { renderMaintenanceView } from './views/maintenanceView.js';
import { renderInventoryView } from './views/inventoryView.js';
import { renderReportsView } from './views/reportsView.js';
import { renderAdminView } from './views/adminView.js';
import { renderClientsManagerView } from './views/clientsManagerView.js';


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

// Sidebar & Responsive Elements
const sidebar = document.getElementById('sidebar');
const mainWrapper = document.getElementById('main-wrapper');
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
const btnMobileMenu = document.getElementById('btn-mobile-menu');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const sidebarUnitBadge = document.getElementById('sidebar-unit-badge');
const sidebarUnitName = document.getElementById('sidebar-unit-name');

// Update Clock
function updateClock() {
  const now = new Date();
  headerDatetime.textContent = now.toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}
setInterval(updateClock, 30000);
updateClock();

// Sidebar Collapse State (Desktop / Tablet)
function initSidebarState() {
  const isCollapsed = localStorage.getItem('flow_cmms_sidebar_collapsed') === 'true';
  applySidebarState(isCollapsed);
}

function applySidebarState(collapsed) {
  if (collapsed) {
    sidebar.classList.add('collapsed');
    mainWrapper.classList.add('sidebar-collapsed');
    if (btnToggleSidebar) btnToggleSidebar.setAttribute('title', 'Expandir menu');
  } else {
    sidebar.classList.remove('collapsed');
    mainWrapper.classList.remove('sidebar-collapsed');
    if (btnToggleSidebar) btnToggleSidebar.setAttribute('title', 'Recolher menu');
  }
}

if (btnToggleSidebar) {
  btnToggleSidebar.addEventListener('click', () => {
    const isCollapsed = sidebar.classList.contains('collapsed');
    const newState = !isCollapsed;
    localStorage.setItem('flow_cmms_sidebar_collapsed', newState);
    applySidebarState(newState);
  });
}

// Mobile Sidebar Drawer Controls
function closeMobileSidebar() {
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (sidebarOverlay) sidebarOverlay.classList.remove('active');
}

if (btnMobileMenu) {
  btnMobileMenu.addEventListener('click', () => {
    const isOpen = sidebar.classList.contains('mobile-open');
    if (isOpen) {
      closeMobileSidebar();
    } else {
      sidebar.classList.add('mobile-open');
      sidebarOverlay.classList.add('active');
    }
  });
}

if (sidebarOverlay) {
  sidebarOverlay.addEventListener('click', closeMobileSidebar);
}

window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    closeMobileSidebar();
  }
});

// Unit Name Loader
async function updateSidebarUnitName() {
  const slug = getActiveTenant();
  if (!slug) {
    if (sidebarUnitName) sidebarUnitName.textContent = 'Unidade Hospitalar';
    return;
  }

  // Quick fallback or cached name
  const cachedName = localStorage.getItem(`flow_cmms_unit_name_${slug}`);
  if (cachedName && sidebarUnitName) {
    sidebarUnitName.textContent = cachedName;
  } else if (sidebarUnitName) {
    sidebarUnitName.textContent = slug.toUpperCase();
  }

  try {
    const info = await api.getTenantInfo(slug);
    if (info && info.name && sidebarUnitName) {
      sidebarUnitName.textContent = info.name;
      if (sidebarUnitBadge) sidebarUnitBadge.setAttribute('title', `${info.name} (${info.slug})`);
      localStorage.setItem(`flow_cmms_unit_name_${slug}`, info.name);
    }
  } catch (e) {
    console.warn('Could not load unit name info:', e);
  }
}

// Initialize sidebar responsive state
initSidebarState();


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

  // Close mobile drawer on route navigation
  closeMobileSidebar();

  // Update Unit Name in Sidebar
  updateSidebarUnitName();

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
    case '#admin':
      pageTitle.textContent = 'Configurações do Usuário';
      await renderAdminView(appContent);
      break;

    case '#clients':
      pageTitle.textContent = 'Gerenciador de Clientes Multi-Tenant';
      await renderClientsManagerView(appContent);
      break;
    case '#dashboard':

    default:
      pageTitle.textContent = 'Dashboard Operacional';
      await renderDashboardView(appContent);
      break;
  }
}

// Close mobile sidebar on nav click
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', closeMobileSidebar);
});

// Logout Listener
btnLogout.addEventListener('click', () => {
  api.logout();
});

// Hashchange Router Listener
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);

