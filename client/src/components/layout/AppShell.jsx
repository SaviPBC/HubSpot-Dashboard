import { Outlet, NavLink } from 'react-router-dom';

const styles = {
  shell: { display: 'flex', minHeight: '100vh' },
  nav: {
    width: 220,
    background: '#ff7a59',
    padding: '24px 0',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  brand: {
    padding: '0 24px 32px',
    fontWeight: 700,
    fontSize: 18,
    color: '#fff',
    letterSpacing: '-0.3px',
  },
  link: {
    display: 'block',
    padding: '10px 24px',
    color: 'rgba(255,255,255,0.85)',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    borderRadius: '0 6px 6px 0',
    marginRight: 12,
    transition: 'background 0.15s',
  },
  activeLink: {
    background: 'rgba(255,255,255,0.2)',
    color: '#fff',
  },
  main: { flex: 1, padding: 32, overflowY: 'auto' },
};

export default function AppShell() {
  return (
    <div style={styles.shell}>
      <nav style={styles.nav}>
        <div style={styles.brand}>HubSpot Dashboard</div>
        <NavLink
          to="/dashboard"
          style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.activeLink : {}) })}
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/settings"
          style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.activeLink : {}) })}
        >
          Settings
        </NavLink>
      </nav>
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
