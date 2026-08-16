import { NavLink } from 'react-router-dom'
import { Home, GitBranch, Database, Settings } from 'lucide-react'

const tabs = [
  { to: '/', label: '首页', icon: Home, exact: true },
  { to: '/trees', label: '图谱', icon: GitBranch },
  { to: '/database', label: '数据库', icon: Database },
  { to: '/settings', label: '设置', icon: Settings },
]

export default function TabBar() {
  return (
    <nav className="tabbar">
      {tabs.map(({ to, label, icon: Icon, exact }) => (
        <NavLink
          key={to}
          to={to}
          end={exact}
          className={({ isActive }) => `tabbar__item${isActive ? ' active' : ''}`}
        >
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
