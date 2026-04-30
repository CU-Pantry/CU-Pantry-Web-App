import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { ordersApi, type Order } from '../../services/api';
import styles from './StudentOrderHistory.module.css';

const STATUS_COLORS: Record<string, string> = {
  submitted: '#FF9800',
  approved: '#4CAF50',
  locker_assigned: '#9C27B0',
  ready: '#2196F3',
  picked_up: '#1B5E20',
  expired: '#757575',
  compromised: '#F44336',
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

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  approved: 'Approved',
  locker_assigned: 'Locker Assigned',
  ready: 'Ready for Pickup',
  picked_up: 'Picked Up',
  expired: 'Expired',
  compromised: 'Compromised',
};

export default function StudentOrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    ordersApi.getAll()
      .then(setOrders)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => ({
    total: orders.length,
    submitted: orders.filter((o) => o.status === 'submitted').length,
    ready: orders.filter((o) => o.status === 'ready').length,
    picked_up: orders.filter((o) => o.status === 'picked_up').length,
  }), [orders]);

  const toggleExpanded = (id: number) => {
    const updated = new Set(expandedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setExpandedIds(updated);
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  if (loading) return <section className={styles.page}><p>Loading orders...</p></section>;
  if (error) return <section className={styles.page}><p style={{ color: 'red' }}>Error: {error}</p></section>;

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.header}>
          <div className={styles.heroCopy}>
            <div className={styles.kicker}>Pantry timeline</div>
            <h1 className={styles.title}>My Order History</h1>
            <p className={styles.subtitle}>Track every pantry request and its current status.</p>
          </div>
          <Link to="/pantry" className={styles.newOrderButton}>+ New Order</Link>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statCardTop}>
              <p className={styles.statLabel}>Total Orders</p>
            </div>
            <p className={styles.statValue}>{stats.total}</p>
            <p className={styles.statDetail}>all time</p>
          </div>
          <div className={`${styles.statCard} ${styles.statCardPending}`}>
            <div className={styles.statCardTop}>
              <p className={styles.statLabel}>Submitted</p>
            </div>
            <p className={styles.statValue}>{stats.submitted}</p>
            <p className={styles.statDetail}>Awaiting approval</p>
          </div>
          <div className={`${styles.statCard} ${styles.statCardReady}`}>
            <div className={styles.statCardTop}>
              <p className={styles.statLabel}>Ready</p>
            </div>
            <p className={styles.statValue}>{stats.ready}</p>
            <p className={styles.statDetail}>Ready to pick up</p>
          </div>
          <div className={`${styles.statCard} ${styles.statCardDelivered}`}>
            <div className={styles.statCardTop}>
              <p className={styles.statLabel}>Picked Up</p>
            </div>
            <p className={styles.statValue}>{stats.picked_up}</p>
            <p className={styles.statDetail}>Completed</p>
          </div>
        </div>
      </div>

      <div className={styles.groupedContainer}>
        {orders.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📦</div>
            <h2 className={styles.emptyTitle}>No Orders Yet</h2>
            <p className={styles.emptyText}>You haven't placed any pantry orders yet.</p>
            <Link to="/pantry" className={styles.emptyButton}>Browse Pantry Items</Link>
          </div>
        ) : (
          <div className={styles.timeline}>
            {orders.map((order) => {
              const isExpanded = expandedIds.has(order.id);
              return (
                <div key={order.id} className={styles.timelineGroup}>
                  <button
                    onClick={() => toggleExpanded(order.id)}
                    className={styles.groupHeader}
                  >
                    <div className={styles.groupDateSection}>
                      <h3 className={styles.groupDate}>
                        Order #{order.id} — {formatDate(order.created_at)}
                      </h3>
                      <p className={styles.groupSubtitle}>
                        Week {order.week_number}/{order.year}
                      </p>
                    </div>
                    <div className={styles.groupStatsBar}>
                      <div
                        className={styles.groupStatBadge}
                        style={{ background: `${STATUS_COLORS[order.status]}20` }}
                      >
                        <span className={styles.badgeIcon}>{STATUS_ICONS[order.status]}</span>
                        <span className={styles.badgeCount}>{STATUS_LABELS[order.status]}</span>
                      </div>
                    </div>
                    <ChevronDown
                      size={20}
                      className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ''}`}
                    />
                  </button>

                  {isExpanded && (
                    <div className={styles.groupContent}>
                      <div className={styles.itemsList}>
                        <div className={styles.orderItem}>
                          <div className={styles.orderItemLeft}>
                            <div
                              className={styles.statusIconCircle}
                              style={{
                                background: `${STATUS_COLORS[order.status]}20`,
                                borderColor: STATUS_COLORS[order.status],
                              }}
                            >
                              <span>{STATUS_ICONS[order.status]}</span>
                            </div>
                            <div className={styles.itemDetails}>
                              <p style={{ fontWeight: 600 }}>
                                Status: {STATUS_LABELS[order.status]}
                              </p>
                              {order.requires_lower_locker && (
                                <p className={styles.itemMeta}>♿ Lower locker requested</p>
                              )}
                              {order.pickup_deadline && (
                                <p className={styles.itemMeta}>
                                  Pickup by: {new Date(order.pickup_deadline).toLocaleString()}
                                </p>
                              )}
                              {order.pin_code && (
                                <p className={styles.itemMeta}>
                                  PIN: <strong>{order.pin_code}</strong>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <Link to="/dashboard" className={styles.backLink}>← Back to Dashboard</Link>
        <p className={styles.footerText}>{orders.length} order{orders.length !== 1 ? 's' : ''} total</p>
      </div>
    </section>
  );
}