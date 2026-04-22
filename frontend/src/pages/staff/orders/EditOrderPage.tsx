import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { PantryOrder } from '../../../data/fakeData';
import { ordersSeed, getOrderItems, migratePantryOrder } from '../../../data/fakeData';
import { loadCollection, saveCollection, STORAGE_KEYS } from '../../../data/localStore';
import styles from '../StaffPages.module.css';

type Draft = {
  requesterName: string;
  requesterType: PantryOrder['requesterType'];
  itemName: string;
  quantity: string;
  status: PantryOrder['status'];
};

export default function EditOrderPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [orders, setOrders] = useState<PantryOrder[]>(() =>
    loadCollection<PantryOrder[]>(STORAGE_KEYS.orders, ordersSeed).map(migratePantryOrder)
  );

  const order = useMemo(() => orders.find((entry) => entry.id === id), [orders, id]);
  const primaryItem = order ? getOrderItems(order)[0] : undefined;

  const [draft, setDraft] = useState<Draft>(() => ({
    // Keep the current single-field editor by exposing the first item row.
    // Additional rows are preserved when saving.
    itemName: primaryItem?.itemName ?? '',
    quantity: String(primaryItem?.quantity ?? 1),
    requesterName: order?.requesterName ?? '',
    requesterType: order?.requesterType ?? 'student',
    status: order?.status ?? 'pending',
  }));

  if (!order) {
    return (
      <section className={styles.page}>
        <article className={styles.card}>
          <h1 className={styles.title}>Order Not Found</h1>
          <p className={styles.subtitle}>This order does not exist anymore.</p>
          <div className={styles.actions}>
            <Link to="/orders" className={`${styles.button} ${styles.buttonGhost}`}>
              Back to Orders
            </Link>
          </div>
        </article>
      </section>
    );
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.requesterName.trim() || !draft.itemName.trim()) return;
    const quantity = Number(draft.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) return;

    const next = orders.map((entry) =>
      entry.id === order.id
        ? {
            ...entry,
            requesterName: draft.requesterName.trim(),
            requesterType: draft.requesterType,
            items: [
              { itemName: draft.itemName.trim(), quantity },
              ...getOrderItems(entry).slice(1),
            ],
            status: draft.status,
          }
        : entry,
    );

    setOrders(next);
    saveCollection(STORAGE_KEYS.orders, next);
    navigate('/orders', { state: { toast: 'Order updated successfully.' } });
  };

  return (
    <section className={styles.page}>
      <header className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Edit Order</h1>
          <p className={styles.subtitle}>Update order details and status.</p>
        </div>
      </header>

      <article className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            value={draft.requesterName}
            onChange={(e) => setDraft((v) => ({ ...v, requesterName: e.target.value }))}
            required
          />
          <select
            className={styles.select}
            value={draft.requesterType}
            onChange={(e) => setDraft((v) => ({ ...v, requesterType: e.target.value as PantryOrder['requesterType'] }))}
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
          <input className={styles.input} value={draft.itemName} onChange={(e) => setDraft((v) => ({ ...v, itemName: e.target.value }))} required />
          <input
            className={styles.input}
            type="number"
            min={1}
            value={draft.quantity}
            onChange={(e) => setDraft((v) => ({ ...v, quantity: e.target.value }))}
            required
          />
          <select
            className={styles.select}
            value={draft.status}
            onChange={(e) => setDraft((v) => ({ ...v, status: e.target.value as PantryOrder['status'] }))}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="ready">Ready</option>
            <option value="delivered">Delivered</option>
          </select>
          <div className={styles.actions}>
            <button className={`${styles.button} ${styles.buttonPrimary}`} type="submit">
              Save Changes
            </button>
            <Link to="/orders" className={`${styles.button} ${styles.buttonGhost}`}>
              Cancel
            </Link>
          </div>
        </form>
      </article>
    </section>
  );
}
