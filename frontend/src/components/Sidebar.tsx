import { NavLink } from 'react-router-dom';
import { Boxes, ClipboardList, DoorOpen, Hexagon, LayoutDashboard, LogOut, Users, ShieldAlert, ShoppingCart, History, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { type ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';
import styles from './Sidebar.module.css';
import type { StaffPermissionKey } from '../data/fakeData';

type NavItem = {
  icon: ReactNode;
  label: string;
  path: string;
  requireManager?: boolean;
  requiredPermission?: StaffPermissionKey;
  studentTeacherOnly?: boolean;
};

const navItems: NavItem[] = [
  { icon: <LayoutDashboard />, label: 'Dashboard', path: '/dashboard' },
  { icon: <ShoppingCart />, label: 'Order from Pantry', path: '/pantry', studentTeacherOnly: true },
  { icon: <History />, label: 'My Orders', path: '/my-orders', studentTeacherOnly: true },
  { icon: <Boxes />, label: 'Inventory', path: '/inventory', requiredPermission: 'inventory' },
  { icon: <DoorOpen />, label: 'Lockers', path: '/lockers', requiredPermission: 'lockers' },
  { icon: <ClipboardList />, label: 'Orders', path: '/orders', requiredPermission: 'orders' },
  { icon: <Users />, label: 'Users', path: '/users', requiredPermission: 'users' },
  { icon: <ShieldAlert />, label: 'Manage Staff', path: '/settings/staff', requireManager: true },
];

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout, hasPermission } = useAuth();
  const isManager = user?.role === 'manager';

  return (
    <motion.aside
      className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <div className={styles.logo}>
        <motion.div
          className={styles.logoIcon}
          whileHover={{ rotate: 180, scale: 1.1 }}
          transition={{ duration: 0.3 }}
        >
          <Hexagon fill="white" size={24} />
        </motion.div>
        <span className={`${styles.logoText} ${collapsed ? styles.hiddenLabel : ''}`}>Pantry Website</span>
        <button
          type="button"
          className={styles.toggleButton}
          onClick={onToggle}
          aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'}
          title={collapsed ? 'Open sidebar' : 'Close sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => {
          if (item.requireManager && !isManager) return null;
          if (item.studentTeacherOnly && (user?.role !== 'student' && user?.role !== 'teacher')) return null;
          if (item.requiredPermission && !hasPermission(item.requiredPermission)) return null;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
              title={item.label}
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <motion.span
                      className={styles.activePill}
                      layoutId="sidebar-active"
                      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    />
                  ) : null}
                  <span className={`${styles.navItemInner} ${collapsed ? styles.navItemInnerCollapsed : ''}`}>
                    {item.icon}
                    <span className={collapsed ? styles.hiddenLabel : ''}>{item.label}</span>
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <div className={styles.avatar}>
          <img src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`} alt="User Avatar" />
        </div>
        <span className={`${styles.userName} ${collapsed ? styles.hiddenLabel : ''}`}>{user?.name || 'User'}</span>
        <button className={styles.logoutButton} onClick={logout} title="Sign Out">
          <LogOut size={16} />
        </button>
      </div>
    </motion.aside>
  );
}
