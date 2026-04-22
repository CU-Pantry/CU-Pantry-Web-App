import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import type { InventoryItem } from '../../../data/fakeData';
import { inventorySeed } from '../../../data/fakeData';
import { loadCollection, saveCollection, STORAGE_KEYS } from '../../../data/localStore';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import SuccessToast from '../../../components/ui/SuccessToast';
import styles from '../StaffPages.module.css';

const storageLabels: Record<'frozen' | 'refrigerated' | 'ambient', string> = {
  frozen: 'Frozen',
  refrigerated: 'Refrigerated',
  ambient: 'Ambient / Dry',
};

function migrateInventoryItem(item: InventoryItem): InventoryItem {
  return {
    ...item,
    barcode: item.barcode ?? `INV-${item.id.replace(/\D/g, '').padStart(6, '0')}`,
    storageType: item.storageType ?? 'ambient',
  };
}

export default function InventoryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>(() =>
    loadCollection(STORAGE_KEYS.inventory, inventorySeed).map(migrateInventoryItem),
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  useEffect(() => {
    saveCollection(STORAGE_KEYS.inventory, items);
  }, [items]);

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

  const totalUnits = useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items]);

  const confirmDelete = () => {
    if (!itemToDelete) return;
    setItems((current) => current.filter((row) => row.id !== itemToDelete.id));
    setItemToDelete(null);
    setToastMessage('Item deleted successfully.');
  };

  return (
    <section className={styles.page}>
      <header className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Inventory Management</h1>
          <p className={styles.subtitle}>Full CRUD flow for pantry stock with fake local data.</p>
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
                <th>Storage</th>
                <th>Last Update</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.barcode}</td>
                  <td>{item.category}</td>
                  <td>
                    {item.quantity} {item.unit}
                  </td>
                  <td>
                    <span className={styles.badge}>{storageLabels[item.storageType]}</span>
                  </td>
                  <td>{item.updatedAt}</td>
                  <td>
                    <div className={styles.actions}>
                      <Link className={styles.iconAction} to={`/inventory/${item.id}/edit`} title="Edit item" aria-label="Edit item">
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
        {!items.length ? <p className={styles.empty}>No inventory data yet.</p> : null}
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
