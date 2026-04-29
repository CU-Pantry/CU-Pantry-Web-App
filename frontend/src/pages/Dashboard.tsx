import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, ClipboardList, DoorOpen, Users } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { inventoryApi, ordersApi, lockersApi, usersApi } from '../services/api';
import styles from './Dashboard.module.css';

type Stats = {
  inventory: number;
  orders: number;
  lockers: number;
  users: number;
  submitted: number;
  available: number;
};

export default function Dashboard() {
  const { user, hasPermission } = useAuth();
  const [stats, setStats] = useState<Stats>({
    inventory: 0,
    orders: 0,
    lockers: 0,
    users: 0,
    submitted: 0,
    available: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      inventoryApi.getAll(),
      ordersApi.getAll(),
      lockersApi.getAll(),
      usersApi.getAll(),
    ]).then(([inventoryRes, ordersRes, lockersRes, usersRes]) => {
      const inventory = inventoryRes.status === 'fulfilled' ? inventoryRes.value : [];
      const orders = ordersRes.status === 'fulfilled' ? ordersRes.value : [];
      const lockers = lockersRes.status === 'fulfilled' ? lockersRes.value : [];
      const users = usersRes.status === 'fulfilled' ? usersRes.value : [];

      setStats({
        inventory: inventory.length,
        orders: orders.length,
        lockers: lockers.length,
        users: users.length,
        submitted: orders.filter((o) => o.status === 'submitted').length,
        available: lockers.filter((l) => l.status === 'available').length,
      });
      setLoading(false);
    });
  }, []);

  const modules = [
    {
      key: 'inventory',
      label: 'Inventory',
      icon: <Boxes size={18} />,
      value: loading ? '...' : stats.inventory,
      unit: 'tracked items',
      path: '/inventory',
      allowed: hasPermission('inventory'),
    },
    {
      key: 'orders',
      label: 'Orders',
      icon: <ClipboardList size={18} />,
      value: loading ? '...' : stats.orders,
      unit: `total orders (${stats.submitted} submitted)`,
      path: '/orders',
      allowed: hasPermission('orders'),
    },
    {
      key: 'lockers',
      label: 'Lockers',
      icon: <DoorOpen size={18} />,
      value: loading ? '...' : stats.lockers,
      unit: `locker spaces (${stats.available} available)`,
      path: '/lockers',
      allowed: hasPermission('lockers'),
    },
    {
      key: 'users',
      label: 'Users',
      icon: <Users size={18} />,
      value: loading ? '...' : stats.users,
      unit: 'registered users',
      path: '/users',
      allowed: hasPermission('users'),
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