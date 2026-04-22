import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ChevronDown } from 'lucide-react';
import { loadCollection, saveCollection, STORAGE_KEYS } from '../../data/localStore';
import {
  ordersSeed,
  getOrderItems,
  getOrderTotalQuantity,
  migratePantryOrder,
  type PantryOrder,
} from '../../data/fakeData';
import { useAuth } from '../../auth/useAuth';
import styles from './StudentOrderHistory.module.css';

type StatusType = 'pending' | 'ready' | 'approved' | 'delivered';

type GroupedOrder = {
  date: string;
  orders: PantryOrder[];
};

export default function StudentOrderHistoryPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<PantryOrder[]>(() =>
    loadCollection<PantryOrder[]>(STORAGE_KEYS.orders, ordersSeed).map(migratePantryOrder)
  );
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Filter orders for current user
  const userOrders = useMemo(
    () => orders.filter((order) => order.requesterName === user?.name),
    [orders, user?.name]
  );

  // Group orders by date
  const groupedOrders = useMemo(() => {
    const groups: Record<string, PantryOrder[]> = {};
    
    userOrders.forEach((order) => {
      if (!groups[order.requestedAt]) {
        groups[order.requestedAt] = [];
      }
      groups[order.requestedAt].push(order);
    });

    // Convert to array and sort by date (newest first)
    return Object.entries(groups)
      .map(([date, orderList]) => ({
        date,
        orders: orderList.sort((a, b) => {
          const aName = getOrderItems(a)[0]?.itemName ?? '';
          const bName = getOrderItems(b)[0]?.itemName ?? '';
          return aName.localeCompare(bName);
        }),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [userOrders]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: userOrders.length,
      totalItems: userOrders.reduce((sum, order) => sum + getOrderTotalQuantity(order), 0),
      pending: userOrders.filter((o) => o.status === 'pending').length,
      ready: userOrders.filter((o) => o.status === 'ready').length,
      approved: userOrders.filter((o) => o.status === 'approved').length,
      delivered: userOrders.filter((o) => o.status === 'delivered').length,
    };
  }, [userOrders]);



  const toggleExpanded = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  const deleteOrder = (orderId: string) => {
    const updatedOrders = orders.filter((order) => order.id !== orderId);
    setOrders(updatedOrders);
    saveCollection(STORAGE_KEYS.orders, updatedOrders);
  };

  const updateOrderStatus = (orderId: string, newStatus: StatusType) => {
    const updatedOrders = orders.map((order) =>
      order.id === orderId ? { ...order, status: newStatus } : order
    );
    setOrders(updatedOrders);
    saveCollection(STORAGE_KEYS.orders, updatedOrders);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return '#FF9800';
      case 'approved':
        return '#4CAF50';
      case 'ready':
        return '#2196F3';
      case 'delivered':
        return '#1B5E20';
      default:
        return 'var(--text-secondary)';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'approved':
        return '✓';
      case 'ready':
        return '📦';
      case 'delivered':
        return '✓✓';
      default:
        return '●';
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getGroupStats = (group: GroupedOrder) => ({
    total: group.orders.reduce((sum, order) => sum + getOrderTotalQuantity(order), 0),
    pending: group.orders.filter((o) => o.status === 'pending').length,
    ready: group.orders.filter((o) => o.status === 'ready').length,
    delivered: group.orders.filter((o) => o.status === 'delivered').length,
  });

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.header}>
          <div className={styles.heroCopy}>
            <div className={styles.kicker}>Pantry timeline</div>
            <h1 className={styles.title}>My Order History</h1>
            <p className={styles.subtitle}>Track every pantry request, each item, and the locker it belongs to.</p>
          </div>
          <Link to="/pantry" className={styles.newOrderButton}>
            + New Order
          </Link>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statCardTop}>
              <p className={styles.statLabel}>Total Orders</p>
              <span className={styles.statPulse} />
            </div>
            <p className={styles.statValue}>{stats.total}</p>
            <p className={styles.statDetail}>{stats.totalItems} item{stats.totalItems !== 1 ? 's' : ''} total</p>
          </div>
          <div className={`${styles.statCard} ${styles.statCardPending}`}>
            <div className={styles.statCardTop}>
              <p className={styles.statLabel}>Pending</p>
              <span className={styles.statPulse} />
            </div>
            <p className={styles.statValue}>{stats.pending}</p>
            <p className={styles.statDetail}>Awaiting approval</p>
          </div>
          <div className={`${styles.statCard} ${styles.statCardReady}`}>
            <div className={styles.statCardTop}>
              <p className={styles.statLabel}>Ready</p>
              <span className={styles.statPulse} />
            </div>
            <p className={styles.statValue}>{stats.ready}</p>
            <p className={styles.statDetail}>Ready to pick up</p>
          </div>
          <div className={`${styles.statCard} ${styles.statCardDelivered}`}>
            <div className={styles.statCardTop}>
              <p className={styles.statLabel}>Delivered</p>
              <span className={styles.statPulse} />
            </div>
            <p className={styles.statValue}>{stats.delivered}</p>
            <p className={styles.statDetail}>Completed</p>
          </div>
        </div>
      </div>

      {/* Grouped Timeline View */}
      <div className={styles.groupedContainer}>
        {userOrders.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📦</div>
            <h2 className={styles.emptyTitle}>No Orders Yet</h2>
            <p className={styles.emptyText}>
              You haven't placed any pantry orders yet. Start ordering from the pantry!
            </p>
            <Link to="/pantry" className={styles.emptyButton}>
              Browse Pantry Items
            </Link>
          </div>
        ) : (
          <div className={styles.timeline}>
            {groupedOrders.map((group) => {
              const isExpanded = expandedDates.has(group.date);
              const groupStats = getGroupStats(group);
              return (
                <div key={group.date} className={styles.timelineGroup}>
                  <button
                    onClick={() => toggleExpanded(group.date)}
                    className={styles.groupHeader}
                  >
                    <div className={styles.groupDateSection}>
                      <h3 className={styles.groupDate}>{formatDate(group.date)}</h3>
                      <p className={styles.groupSubtitle}>
                        {groupStats.total} item{groupStats.total !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className={styles.groupStatsBar}>
                      {groupStats.pending > 0 && (
                        <div className={styles.groupStatBadge} style={{ background: 'rgba(255, 152, 0, 0.15)' }}>
                          <span className={styles.badgeIcon}>⏳</span>
                          <span className={styles.badgeCount}>{groupStats.pending}</span>
                        </div>
                      )}
                      {groupStats.ready > 0 && (
                        <div className={styles.groupStatBadge} style={{ background: 'rgba(33, 150, 243, 0.15)' }}>
                          <span className={styles.badgeIcon}>📦</span>
                          <span className={styles.badgeCount}>{groupStats.ready}</span>
                        </div>
                      )}
                      {groupStats.delivered > 0 && (
                        <div className={styles.groupStatBadge} style={{ background: 'rgba(27, 94, 32, 0.15)' }}>
                          <span className={styles.badgeIcon}>✓</span>
                          <span className={styles.badgeCount}>{groupStats.delivered}</span>
                        </div>
                      )}
                    </div>
                    <ChevronDown 
                      size={20} 
                      className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ''}`}
                    />
                  </button>

                  {isExpanded && (
                    <div className={styles.groupContent}>
                      <div className={styles.itemsList}>
                        {group.orders.map((order) => (
                          <div key={order.id} className={styles.orderItem}>
                            <div className={styles.orderItemLeft}>
                              <div className={styles.statusIconCircle} style={{ 
                                background: `${getStatusColor(order.status)}20`,
                                borderColor: getStatusColor(order.status)
                              }}>
                                <span>{getStatusIcon(order.status)}</span>
                              </div>
                              <div className={styles.itemDetails}>
                                <div className={styles.itemChips}>
                                  {getOrderItems(order).map((item) => (
                                    <span key={`${order.id}-${item.itemName}`} className={styles.itemChip}>
                                      {item.itemName} <span className={styles.itemQuantity}>x{item.quantity}</span>
                                    </span>
                                  ))}
                                </div>
                                <p className={styles.itemMeta}>Qty: {getOrderTotalQuantity(order)}</p>
                              </div>
                            </div>
                            <div className={styles.orderItemCenter}>
                              <select
                                value={order.status}
                                onChange={(e) => updateOrderStatus(order.id, e.target.value as StatusType)}
                                className={`${styles.statusSelectCompact} ${styles[`status${order.status.charAt(0).toUpperCase() + order.status.slice(1)}`]}`}
                              >
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="ready">Ready</option>
                                <option value="delivered">Delivered</option>
                              </select>
                            </div>
                            <div className={styles.orderItemRight}>
                              {getOrderItems(order).map((item) => (
                                <div key={`${order.id}-${item.itemName}-${item.quantity}`} className={styles.orderItemLockers}>
                                  <span className={styles.itemLockerName}>{item.itemName}</span>
                                  <span className={styles.lockerBadge}>{item.lockerId ?? order.lockerId ?? 'Unassigned'}</span>
                                </div>
                              ))}
                              <button
                                onClick={() => deleteOrder(order.id)}
                                className={styles.deleteBtn}
                                title="Delete order"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
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
        <Link to="/dashboard" className={styles.backLink}>
          ← Back to Dashboard
        </Link>
        <p className={styles.footerText}>
          {userOrders.length} order{userOrders.length !== 1 ? 's' : ''} across {groupedOrders.length} day{groupedOrders.length !== 1 ? 's' : ''}
        </p>
      </div>
    </section>
  );
}
