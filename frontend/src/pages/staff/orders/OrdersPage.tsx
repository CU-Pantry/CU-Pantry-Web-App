import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { ordersApi, type Order, type OrderStatus } from '../../../services/api';
import SuccessToast from '../../../components/ui/SuccessToast';
import styles from '../StaffPages.module.css';

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  approved: 'Approved',
  locker_assigned: 'Locker Assigned',
  ready: 'Ready',
  picked_up: 'Picked Up',
  expired: 'Expired',
  compromised: 'Compromised',
};

const STATUS_ICONS: Record<string, string> = {
  submitted: '⏳',
  approved: '✓',
  locker_assigned: '🔒',
  ready: '📦',
  picked_up: '✓✓',
  expired: '⌛',
  compromised: '⚠️',
};

const STATUS_COLORS: Record<string, string> = {
  submitted: '#FF9800',
  approved: '#4CAF50',
  locker_assigned: '#9C27B0',
  ready: '#2196F3',
  picked_up: '#1B5E20',
  expired: '#757575',
  compromised: '#F44336',
};

const VALID_TRANSITIONS: Record<string, OrderStatus[]> = {
  submitted: ['approved'],
  approved: ['locker_assigned'],
  locker_assigned: ['ready'],
  ready: ['picked_up', 'expired', 'compromised'],
  picked_up: [],
  expired: [],
  compromised: [],
};

export default function OrdersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    ordersApi.getAll()
      .then(setOrders)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const state = location.state as { toast?: string } | null;
    if (state?.toast) {
      setTimeout(() => {
        setToastMessage(state.toast!);
        navigate(location.pathname, { replace: true, state: null });
      }, 0);
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const groupedOrders = useMemo(() => {
    const groups: Record<string, Order[]> = {};
    orders.forEach((order) => {
      if (!groups[order.student_username]) {
        groups[order.student_username] = [];
      }
      groups[order.student_username].push(order);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [orders]);

  const stats = useMemo(() => ({
    total: orders.length,
    submitted: orders.filter((o) => o.status === 'submitted').length,
    approved: orders.filter((o) => o.status === 'approved').length,
    ready: orders.filter((o) => o.status === 'ready').length,
    picked_up: orders.filter((o) => o.status === 'picked_up').length,
  }), [orders]);

  const toggleExpanded = (username: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(username)) {
      newExpanded.delete(username);
    } else {
      newExpanded.add(username);
    }
    setExpandedUsers(newExpanded);
  };

  const handleStatusChange = async (order: Order, newStatus: OrderStatus) => {
    try {
      const updated = await ordersApi.updateStatus(order.id, newStatus);
      setOrders((current) =>
        current.map((o) => (o.id === updated.id ? updated : o))
      );
      setToastMessage(`Order #${order.id} updated to ${STATUS_LABELS[newStatus]}`);
    } catch (err: any) {
      setToastMessage(`Error: ${err.message}`);
    }
  };

  if (loading) return <section className={styles.page}><p>Loading orders...</p></section>;
  if (error) return <section className={styles.page}><p style={{ color: 'red' }}>Error: {error}</p></section>;

  return (
    <section className={styles.page}>
      <header className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Orders Management</h1>
          <p className={styles.subtitle}>All orders grouped by student.</p>
        </div>
      </header>

      <article className={styles.card}>
        <div className={styles.grid}>
          <div className={styles.metric}>
            <p className={styles.metricLabel}>Total Orders</p>
            <p className={styles.metricValue}>{stats.total}</p>
          </div>
          <div className={styles.metric}>
            <p className={styles.metricLabel}>Submitted</p>
            <p className={styles.metricValue}>{stats.submitted}</p>
          </div>
          <div className={styles.metric}>
            <p className={styles.metricLabel}>Ready</p>
            <p className={styles.metricValue}>{stats.ready}</p>
          </div>
          <div className={styles.metric}>
            <p className={styles.metricLabel}>Picked Up</p>
            <p className={styles.metricValue}>{stats.picked_up}</p>
          </div>
        </div>
      </article>

      <article className={styles.card}>
        {groupedOrders.length === 0 ? (
          <p className={styles.empty}>No orders yet.</p>
        ) : (
          <div className={styles.groupedOrdersContainer}>
            {groupedOrders.map(([username, userOrders]) => {
              const isExpanded = expandedUsers.has(username);
              return (
                <div key={username} className={styles.requesterGroup}>
                  <button
                    onClick={() => toggleExpanded(username)}
                    className={styles.requesterHeader}
                  >
                    <div className={styles.requesterInfo}>
                      <h3 className={styles.requesterName}>{username}</h3>
                      <span className={styles.badge}>student</span>
                      <p className={styles.requesterOrderCount}>
                        {userOrders.length} order{userOrders.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <ChevronDown
                      size={20}
                      className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ''}`}
                    />
                  </button>

                  {isExpanded && (
                    <div className={styles.requesterOrders}>
                      {userOrders.map((order) => (
                        <div key={order.id} className={styles.orderRow}>
                          <div className={styles.orderLeft}>
                            <div
                              className={styles.statusIconSmall}
                              style={{
                                background: `${STATUS_COLORS[order.status]}20`,
                                borderColor: STATUS_COLORS[order.status],
                              }}
                            >
                              {STATUS_ICONS[order.status]}
                            </div>
                            <div className={styles.orderDetails}>
                              <p className={styles.orderMeta}>
                                Order #{order.id} • Week {order.week_number}/{order.year}
                                {order.requires_lower_locker && ' • ♿ Lower locker'}
                              </p>
                              <p className={styles.orderMeta}>
                                {new Date(order.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className={styles.orderCenter}>
                            <select
                              className={styles.select}
                              value={order.status}
                              onChange={(e) =>
                                handleStatusChange(order, e.target.value as OrderStatus)
                              }
                            >
                              <option value={order.status}>
                                {STATUS_LABELS[order.status]}
                              </option>
                              {VALID_TRANSITIONS[order.status]?.map((s) => (
                                <option key={s} value={s}>
                                  → {STATUS_LABELS[s]}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className={styles.orderRight}>
                            {order.pin_code && (
                              <span className={styles.lockerBadge}>
                                PIN: {order.pin_code}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </article>

      <SuccessToast message={toastMessage} />
    </section>
  );
}