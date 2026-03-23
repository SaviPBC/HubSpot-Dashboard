import { Outlet, NavLink } from 'react-router-dom';
import UserMenu from '../auth/UserMenu';
import { useNavCounts } from '../../hooks/useNavCounts';

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
    padding: '0 24px 28px',
    fontWeight: 700,
    fontSize: 18,
    color: '#fff',
    letterSpacing: '-0.3px',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 24px',
    color: 'rgba(255,255,255,0.85)',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    borderRadius: '0 6px 6px 0',
    marginRight: 12,
    transition: 'background 0.15s',
  },
  subLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 24px 8px 36px',
    color: 'rgba(255,255,255,0.75)',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 400,
    borderRadius: '0 6px 6px 0',
    marginRight: 12,
    transition: 'background 0.15s',
  },
  activeLink: {
    background: 'rgba(255,255,255,0.2)',
    color: '#fff',
    fontWeight: 600,
  },
  divider: {
    borderTop: '1px solid rgba(255,255,255,0.2)',
    margin: '12px 24px 12px 24px',
  },
  sectionLabel: {
    padding: '4px 24px 6px',
    fontSize: 11,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
  },
  badge: {
    background: 'rgba(255,255,255,0.25)',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 10,
    padding: '1px 7px',
    minWidth: 20,
    textAlign: 'center',
    flexShrink: 0,
  },
  main: { flex: 1, padding: 32, overflowY: 'auto' },
};

function navStyle(isActive, sub = false) {
  return { ...(sub ? styles.subLink : styles.link), ...(isActive ? styles.activeLink : {}) };
}

function Badge({ count }) {
  if (count === null || count === undefined) return null;
  return <span style={styles.badge}>{count}</span>;
}

export default function AppShell() {
  const counts = useNavCounts();

  return (
    <div style={styles.shell}>
      <nav style={styles.nav}>
        <div style={styles.brand}>HubSpot Dashboard</div>

        <NavLink to="/dashboard" end style={({ isActive }) => navStyle(isActive)}>
          Overview
        </NavLink>

        <div style={styles.sectionLabel}>Sections</div>

        <NavLink to="/about-to-implement" style={({ isActive }) => navStyle(isActive, true)}>
          About to Implement
          <Badge count={counts.aboutToImplement} />
        </NavLink>
        <NavLink to="/implementing" style={({ isActive }) => navStyle(isActive, true)}>
          Currently Implementing
          <Badge count={counts.implementing} />
        </NavLink>
        <NavLink to="/launched" style={({ isActive }) => navStyle(isActive, true)}>
          Launched in Period
          <Badge count={counts.launched} />
        </NavLink>
        <NavLink to="/renewals" style={({ isActive }) => navStyle(isActive, true)}>
          Contracts for Renewal
          <Badge count={counts.renewals} />
        </NavLink>
        <NavLink to="/tam-comparison" style={({ isActive }) => navStyle(isActive, true)}>
          TAM Comparison
        </NavLink>
        <NavLink to="/webinar-comparison" style={({ isActive }) => navStyle(isActive, true)}>
          Webinar Comparison
        </NavLink>

        <div style={styles.divider} />

        <NavLink to="/settings" style={({ isActive }) => navStyle(isActive)}>
          Settings
        </NavLink>

        <UserMenu />
      </nav>
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
