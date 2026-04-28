import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { inventoryApi, type InventoryItem } from '../../../services/api';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import SuccessToast from '../../../components/ui/SuccessToast';
import styles from '../StaffPages.module.css';

const categoryLabels: Record<string, string> = {
  food: 'Food',
  hygiene: 'Hygiene',
  other: 'Other',
};

export default function InventoryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  // Load inventory from real API
  useEffect(() => {
    inventoryApi.getAll()
      .then(setItems)
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

  const totalUnits = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items]
  );

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await inventoryApi.delete(itemToDelete.id);
      setItems((current) => current.filter((row) => row.id !== itemToDelete.id));
      setToastMessage('Item deleted successfully.');
    } catch (err: any) {
      setToastMessage(`Error: ${err.message}`);
    }
    setItemToDelete(null);
  };

  if (loading) {
    return (
      <section className={styles.page}>
        <p>Loading inventory...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.page}>
        <p style={{ color: 'red' }}>Error: {error}</p>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Inventory Management</h1>
          <p className={styles.subtitle}>Manage pantry stock connected to live database.</p>
        </div>
        <Link to="/inventory/new" className={`${styles.button} ${styles.buttonPrimary}`}>
          Add Item
        </Link>
      </header>

      <article className={styles.card}>
        <div className={styles.grid}>
          <div className={styles.metric}>
            <p className={styles.metricLabel}>Total Inventory Items</p>
            <p className={styles.metricValue}>{items.length}</p>
          </div>
          <div className={styles.metric}>
            <p className={styles.metricLabel}>Total Units in Stock</p>
            <p className={styles.metricValue}>{totalUnits}</p>
          </div>
        </div>
      </article>

      <article className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Barcode</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Available</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.barcode ?? '—'}</td>
                  <td>{categoryLabels[item.category] ?? item.category}</td>
                  <td>{item.quantity} {item.unit}</td>
                  <td>
                    <span className={styles.badge}>
                      {item.is_available ? '✅ Yes' : '❌ No'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Link
                        className={styles.iconAction}
                        to={`/inventory/${item.id}/edit`}
                        title="Edit item"
                        aria-label="Edit item"
                      >
                        <Pencil size={16} />
                      </Link>
                      <button
                        className={`${styles.iconAction} ${styles.iconDanger}`}
                        type="button"
                        onClick={() => setItemToDelete(item)}
                        title="Delete item"
                        aria-label="Delete item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!items.length && <p className={styles.empty}>No inventory data yet.</p>}
      </article>

      <ConfirmDialog
        open={Boolean(itemToDelete)}
        title="Delete item"
        message={`Are you sure you want to delete ${itemToDelete?.name ?? 'this item'}?`}
        onCancel={() => setItemToDelete(null)}
        onConfirm={confirmDelete}
      />
      <SuccessToast message={toastMessage} />
    </section>
  );
}