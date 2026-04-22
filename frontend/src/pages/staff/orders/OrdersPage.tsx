import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Trash2, ChevronDown } from 'lucide-react';
import { ordersSeed, getOrderItems, getOrderTotalQuantity, migratePantryOrder, type PantryOrder } from '../../../data/fakeData';
import { loadCollection, saveCollection, STORAGE_KEYS } from '../../../data/localStore';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import SuccessToast from '../../../components/ui/SuccessToast';
import styles from '../StaffPages.module.css';

type GroupedOrder = {
  requester: string;
  requesterType: 'student' | 'teacher';
  orders: PantryOrder[];
};

export default function OrdersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PantryOrder[]>(() =>
    loadCollection<PantryOrder[]>(STORAGE_KEYS.orders, ordersSeed).map(migratePantryOrder)
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<PantryOrder | null>(null);
  const [expandedRequesters, setExpandedRequesters] = useState<Set<string>>(new Set());

  useEffect(() => {
    saveCollection(STORAGE_KEYS.orders, orders);
  }, [orders]);

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

  // Group orders by requester name
  const groupedOrders = useMemo(() => {
    const groups: Record<string, PantryOrder[]> = {};
    
    orders.forEach((order) => {
      if (!groups[order.requesterName]) {
        groups[order.requesterName] = [];
      }
      groups[order.requesterName].push(order);
    });

    // Convert to array and sort by name
    return Object.entries(groups)
      .map(([requester, orderList]) => {
        const firstOrder = orderList[0];
        return {
          requester,
          requesterType: firstOrder.requesterType,
          orders: orderList.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()),
        };
      })
      .sort((a, b) => a.requester.localeCompare(b.requester));
  }, [orders]);

  const stats = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      approved: orders.filter((o) => o.status === 'approved').length,
      ready: orders.filter((o) => o.status === 'ready').length,
      delivered: orders.filter((o) => o.status === 'delivered').length,
    };
  }, [orders]);

  const toggleExpanded = (requester: string) => {
    const newExpanded = new Set(expandedRequesters);
    if (newExpanded.has(requester)) {
      newExpanded.delete(requester);
    } else {
      newExpanded.add(requester);
    }
    setExpandedRequesters(newExpanded);
  };

  const getGroupStats = (group: GroupedOrder) => ({
    total: group.orders.length,
    pending: group.orders.filter((o) => o.status === 'pending').length,
    approved: group.orders.filter((o) => o.status === 'approved').length,
    ready: group.orders.filter((o) => o.status === 'ready').length,
    delivered: group.orders.filter((o) => o.status === 'delivered').length,
  });

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



  const confirmDelete = () => {
    if (!orderToDelete) return;
    setOrders((current) => current.filter((row) => row.id !== orderToDelete.id));
    setOrderToDelete(null);
    setToastMessage('Order deleted successfully.');
  };

  return (
    <section className={styles.page}>
      <header className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Orders Management</h1>
          <p className={styles.subtitle}>All orders grouped by requester for easy tracking.</p>
        </div>
        <Link to="/orders/new" className={`${styles.button} ${styles.buttonPrimary}`}>
          + Create Order
        </Link>
      </header>

      {/* Stats */}
      <article className={styles.card}>
        <div className={styles.grid}>
          <div className={styles.metric}>
            <p className={styles.metricLabel}>Total Orders</p>
            <p className={styles.metricValue}>{stats.total}</p>
          </div>
          <div className={styles.metric}>
            <p className={styles.metricLabel}>Pending</p>
            <p className={styles.metricValue}>{stats.pending}</p>
          </div>
          <div className={styles.metric}>
            <p className={styles.metricLabel}>Ready</p>
            <p className={styles.metricValue}>{stats.ready}</p>
          </div>
          <div className={styles.metric}>
            <p className={styles.metricLabel}>Delivered</p>
            <p className={styles.metricValue}>{stats.delivered}</p>
          </div>
        </div>
      </article>

      {/* Grouped Orders */}
      <article className={styles.card}>
        {groupedOrders.length === 0 ? (
          <p className={styles.empty}>No orders available.</p>
        ) : (
          <div className={styles.groupedOrdersContainer}>
            {groupedOrders.map((group) => {
              const isExpanded = expandedRequesters.has(group.requester);
              const groupStats = getGroupStats(group);
              return (
                <div key={group.requester} className={styles.requesterGroup}>
                  <button
                    onClick={() => toggleExpanded(group.requester)}
                    className={styles.requesterHeader}
                  >
                    <div className={styles.requesterInfo}>
                      <h3 className={styles.requesterName}>{group.requester}</h3>
                      <span className={`${styles.badge} ${styles[`badge${group.requesterType}`]}`}>
                        {group.requesterType}
                      </span>
                      <p className={styles.requesterOrderCount}>
                        {groupStats.total} order{groupStats.total !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className={styles.requesterStats}>
                      {groupStats.pending > 0 && (
                        <div className={styles.statBadge} style={{ background: 'rgba(255, 152, 0, 0.15)' }}>
                          <span>⏳</span> {groupStats.pending}
                        </div>
                      )}
                      {groupStats.approved > 0 && (
                        <div className={styles.statBadge} style={{ background: 'rgba(76, 175, 80, 0.15)' }}>
                          <span>✓</span> {groupStats.approved}
                        </div>
                      )}
                      {groupStats.ready > 0 && (
                        <div className={styles.statBadge} style={{ background: 'rgba(33, 150, 243, 0.15)' }}>
                          <span>📦</span> {groupStats.ready}
                        </div>
                      )}
                      {groupStats.delivered > 0 && (
                        <div className={styles.statBadge} style={{ background: 'rgba(27, 94, 32, 0.15)' }}>
                          <span>✓✓</span> {groupStats.delivered}
                        </div>
                      )}
                    </div>
                    <ChevronDown
                      size={20}
                      className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ''}`}
                    />
                  </button>

                  {isExpanded && (
                    <div className={styles.requesterOrders}>
                      {group.orders.map((order) => (
                        <div key={order.id} className={styles.orderRow}>
                          <div className={styles.orderLeft}>
                            <div
                              className={styles.statusIconSmall}
                              style={{
                                background: `${getStatusColor(order.status)}20`,
                                borderColor: getStatusColor(order.status),
                              }}
                            >
                              {getStatusIcon(order.status)}
                            </div>
                            <div className={styles.orderDetails}>
                              <div className={styles.itemChips}>
                                {getOrderItems(order).map((item) => (
                                  <span key={`${order.id}-${item.itemName}`} className={styles.itemChip}>
                                    {item.itemName} <span className={styles.itemQuantity}>x{item.quantity}</span>
                                  </span>
                                ))}
                              </div>
                              <p className={styles.orderMeta}>
                                Qty: {getOrderTotalQuantity(order)} • {order.requestedAt}
                              </p>
                            </div>
                          </div>
                          <div className={styles.orderCenter}>
                            <select
                              className={styles.select}
                              value={order.status}
                              onChange={(event) =>
                                setOrders((current) =>
                                  current.map((row) =>
                                    row.id === order.id
                                      ? { ...row, status: event.target.value as PantryOrder['status'] }
                                      : row,
                                  ),
                                )
                              }
                            >
                              <option value="pending">Pending</option>
                              <option value="approved">Approved</option>
                              <option value="ready">Ready</option>
                              <option value="delivered">Delivered</option>
                            </select>
                          </div>
                          <div className={styles.orderRight}>
                            {order.lockerId && (
                              <span className={styles.lockerBadge}>{order.lockerId}</span>
                            )}
                            <button
                              className={`${styles.iconAction} ${styles.iconDanger}`}
                              type="button"
                              onClick={() => setOrderToDelete(order)}
                              title="Delete order"
                            >
                              <Trash2 size={16} />
                            </button>
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

      <ConfirmDialog
        open={Boolean(orderToDelete)}
        title="Delete order"
        message={`Are you sure you want to delete order ${orderToDelete?.id ?? ''}?`}
        onCancel={() => setOrderToDelete(null)}
        onConfirm={confirmDelete}
      />
      <SuccessToast message={toastMessage} />
    </section>
  );
}
