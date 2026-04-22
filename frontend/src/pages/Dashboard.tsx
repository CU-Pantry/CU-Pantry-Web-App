import { Link } from 'react-router-dom';
import { Boxes, ClipboardList, DoorOpen, History, ShoppingCart, ShieldAlert, Users } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { inventorySeed, lockerSeed, ordersSeed, usersSeed } from '../data/fakeData';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { user, hasPermission } = useAuth();

  const modules = [
    {
      key: 'pantry',
      label: 'Order from Pantry',
      icon: <ShoppingCart size={18} />,
      value: ordersSeed.filter((order) => order.status === 'pending').length,
      unit: 'pending requests',
      path: '/pantry',
      allowed: user?.role === 'student' || user?.role === 'teacher',
    },
    {
      key: 'my-orders',
      label: 'My Orders',
      icon: <History size={18} />,
      value: ordersSeed.filter((order) => order.requesterName === user?.name).length,
      unit: 'orders in history',
      path: '/my-orders',
      allowed: user?.role === 'student' || user?.role === 'teacher',
    },
    {
      key: 'inventory',
      label: 'Inventory',
      icon: <Boxes size={18} />,
      value: inventorySeed.length,
      unit: 'tracked items',
      path: '/inventory',
      allowed: hasPermission('inventory'),
    },
    {
      key: 'orders',
      label: 'Orders',
      icon: <ClipboardList size={18} />,
      value: ordersSeed.length,
      unit: 'total orders',
      path: '/orders',
      allowed: hasPermission('orders'),
    },
    {
      key: 'lockers',
      label: 'Lockers',
      icon: <DoorOpen size={18} />,
      value: lockerSeed.length,
      unit: 'locker spaces',
      path: '/lockers',
      allowed: hasPermission('lockers'),
    },
    {
      key: 'users',
      label: 'Users',
      icon: <Users size={18} />,
      value: usersSeed.length,
      unit: 'registered users',
      path: '/users',
      allowed: hasPermission('users'),
    },
    {
      key: 'manage-staff',
      label: 'Manage Staff',
      icon: <ShieldAlert size={18} />,
      value: usersSeed.filter((u) => u.role === 'staff' || u.role === 'manager').length,
      unit: 'staff accounts',
      path: '/settings/staff',
      allowed: user?.role === 'manager',
    },
  ];

  const visibleModules = modules.filter((module) => module.allowed);

  return (
    <section className={styles.page}>
      <article className={`${styles.card} ${styles.heroCard}`}>
        <span className={styles.roleTag}>{(user?.role ?? 'user').toUpperCase()}</span>
        <h1 className={styles.title}>Pantry Dashboard</h1>
        <p className={styles.text}>
          Welcome back, {user?.name}. Your workspace is personalized and only shows modules you can access.
        </p>
        <p className={styles.subtext}>
          Active modules: {visibleModules.length}
        </p>
      </article>

      <article className={styles.statsGrid}>
        {visibleModules.map((module) => (
          <div key={module.key} className={styles.statCard}>
            <div className={styles.rowTop}>
              <span className={styles.moduleIcon}>{module.icon}</span>
              <p className={styles.statLabel}>{module.label}</p>
            </div>
            <p className={styles.statValue}>{module.value}</p>
            <p className={styles.metricHint}>{module.unit}</p>
            <Link to={module.path} className={styles.statLink}>
              Open {module.label}
            </Link>
          </div>
        ))}
      </article>

    </section>
  );
}
