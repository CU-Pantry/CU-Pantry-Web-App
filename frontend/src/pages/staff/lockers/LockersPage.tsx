import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { lockersApi, ordersApi, type Locker, type Order } from '../../../services/api';
import SuccessToast from '../../../components/ui/SuccessToast';
import styles from './LockersPage.module.css';

const statusLabels: Record<string, string> = {
  available: 'Available',
  occupied: 'Occupied',
  maintenance: 'Maintenance',
};

const statusClasses: Record<string, string> = {
  available: styles.statusAvailable,
  occupied: styles.statusOccupied,
  maintenance: styles.statusMaintenance,
};

export default function LockersPage() {
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLockerId, setSelectedLockerId] = useState<number | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | ''>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    Promise.all([lockersApi.getAll(), ordersApi.getAll()])
      .then(([lockersData, ordersData]) => {
        setLockers(lockersData);
        setOrders(ordersData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const selectedLocker = useMemo(
    () => lockers.find((l) => l.id === selectedLockerId) ?? null,
    [lockers, selectedLockerId]
  );

  const lockerStats = useMemo(() => ({
    available: lockers.filter((l) => l.status === 'available').length,
    occupied: lockers.filter((l) => l.status === 'occupied').length,
    maintenance: lockers.filter((l) => l.status === 'maintenance').length,
  }), [lockers]);

  // Only show approved orders for assignment
  const approvedOrders = useMemo(
    () => orders.filter((o) => o.status === 'approved'),
    [orders]
  );

  const handleAssign = async () => {
    if (!selectedLockerId || !selectedOrderId) return;
    setAssigning(true);
    try {
      await lockersApi.assign(Number(selectedOrderId), selectedLockerId);
      // Refresh data
      const [lockersData, ordersData] = await Promise.all([
        lockersApi.getAll(),
        ordersApi.getAll(),
      ]);
      setLockers(lockersData);
      setOrders(ordersData);
      setSelectedOrderId('');
      setToastMessage('Locker assigned successfully!');
    } catch (err: any) {
      setToastMessage(`Error: ${err.message}`);
    }
    setAssigning(false);
  };

  if (loading) return <section className={styles.page}><p>Loading lockers...</p></section>;
  if (error) return <section className={styles.page}><p style={{ color: 'red' }}>Error: {error}</p></section>;

  return (
    <section className={styles.page}>
      <header className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Locker Operations</h1>
          <p className={styles.subtitle}>Select a locker to assign an approved order.</p>
        </div>
        <div className={styles.chips}>
          <span className={`${styles.chip} ${styles.statusAvailable}`}>
            Available: {lockerStats.available}
          </span>
          <span className={`${styles.chip} ${styles.statusOccupied}`}>
            Occupied: {lockerStats.occupied}
          </span>
          <span className={`${styles.chip} ${styles.statusMaintenance}`}>
            Maintenance: {lockerStats.maintenance}
          </span>
        </div>
      </header>

      <div className={styles.gridLayout}>
        {/* Locker Wall */}
        <article className={styles.card}>
          <div className={styles.cardBody}>
            <h2 className={styles.panelTitle}>Locker Wall</h2>
            <p className={styles.subtitle}>Tap a locker to select it.</p>
            <div className={styles.lockersWall}>
              {lockers.map((locker, index) => (
                <motion.button
                  key={locker.id}
                  type="button"
                  className={[
                    styles.lockerTile,
                    statusClasses[locker.status],
                    locker.id === selectedLockerId ? styles.lockerSelected : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setSelectedLockerId(locker.id)}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <div className={styles.lockerTop}>
                    <span className={styles.lockerCode}>{locker.locker_number}</span>
                    <span className={styles.lockerStorageBadge}>{locker.temperature_type}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </article>

        {/* Side Panel */}
        <aside className={styles.sidePanel}>
          <article className={styles.card}>
            <div className={styles.cardBody}>
              <h2 className={styles.panelTitle}>
                {selectedLocker ? `Locker ${selectedLocker.locker_number}` : 'Select a Locker'}
              </h2>

              {selectedLocker ? (
                <>
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailKey}>Status</span>
                      <span className={styles.detailValue}>
                        {statusLabels[selectedLocker.status]}
                      </span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailKey}>Temperature</span>
                      <span className={styles.detailValue}>
                        {selectedLocker.temperature_type}
                      </span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailKey}>Current Order</span>
                      <span className={styles.detailValue}>
                        {selectedLocker.current_order
                          ? `Order #${selectedLocker.current_order}`
                          : 'Empty'}
                      </span>
                    </div>
                  </div>

                  {selectedLocker.status === 'available' && (
                    <div style={{ marginTop: 16 }}>
                      <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
                        Assign Approved Order:
                      </label>
                      <select
                        className={styles.select}
                        value={selectedOrderId}
                        onChange={(e) => setSelectedOrderId(Number(e.target.value) || '')}
                      >
                        <option value="">Select an order...</option>
                        {approvedOrders.map((order) => (
                          <option key={order.id} value={order.id}>
                            Order #{order.id} - {order.student_username}
                          </option>
                        ))}
                      </select>
                      {approvedOrders.length === 0 && (
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                          No approved orders available.
                        </p>
                      )}
                      <button
                        className={`${styles.button} ${styles.buttonPrimary}`}
                        style={{ marginTop: 12, width: '100%' }}
                        onClick={handleAssign}
                        disabled={!selectedOrderId || assigning}
                      >
                        {assigning ? 'Assigning...' : 'Assign Locker'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>
                  Click a locker on the wall to see its details and assign orders.
                </p>
              )}
            </div>
          </article>
        </aside>
      </div>

      <SuccessToast message={toastMessage} />
    </section>
  );
}