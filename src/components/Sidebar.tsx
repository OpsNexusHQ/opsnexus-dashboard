import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/',        label: 'Overview',  icon: '▦' },
  { to: '/agents',  label: 'Agents',    icon: '⬡' },
  { to: '/alerts',  label: 'Alerts',    icon: '🔔' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">⬡</div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-name">OpsNexus</span>
          <span className="sidebar-logo-sub">Infrastructure</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-version">v0.1.0</div>
      </div>
    </aside>
  )
}
