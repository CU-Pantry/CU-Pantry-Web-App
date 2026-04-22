import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { PantryOrder } from '../../../data/fakeData';
import { nextId, ordersSeed, migratePantryOrder } from '../../../data/fakeData';
import { loadCollection, saveCollection, STORAGE_KEYS } from '../../../data/localStore';
import styles from '../StaffPages.module.css';

type Draft = {
  requesterName: string;
  requesterType: PantryOrder['requesterType'];
  itemName: string;
  quantity: string;
  status: PantryOrder['status'];
};

const initialDraft: Draft = {
  requesterName: '',
  requesterType: 'student',
  itemName: '',
  quantity: '1',
  status: 'pending',
};

export default function CreateOrderPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(initialDraft);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.requesterName.trim() || !draft.itemName.trim()) return;

    const quantity = Number(draft.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) return;

    const newOrder: PantryOrder = {
      id: nextId('ord'),
      requesterName: draft.requesterName.trim(),
      requesterType: draft.requesterType,
      items: [{ itemName: draft.itemName.trim(), quantity }],
      status: draft.status,
      requestedAt: new Date().toISOString().slice(0, 10),
    };

    const current = loadCollection<PantryOrder[]>(STORAGE_KEYS.orders, ordersSeed).map(migratePantryOrder);
    saveCollection(STORAGE_KEYS.orders, [newOrder, ...current]);
    navigate('/orders', { state: { toast: 'Order created successfully.' } });
  };

  return (
    <section className={styles.page}>
      <header className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Create Order</h1>
          <p className={styles.subtitle}>Add a student or user order using a dedicated page.</p>
        </div>
      </header>

      <article className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            placeholder="Requester Name"
            value={draft.requesterName}
            onChange={(event) => setDraft((current) => ({ ...current, requesterName: event.target.value }))}
            required
          />
          <select
            className={styles.select}
            value={draft.requesterType}
            onChange={(event) =>
              setDraft((current) => ({ ...current, requesterType: event.target.value as PantryOrder['requesterType'] }))
            }
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
          <input
            className={styles.input}
            placeholder="Item"
            value={draft.itemName}
            onChange={(event) => setDraft((current) => ({ ...current, itemName: event.target.value }))}
            required
          />
          <input
            className={styles.input}
            type="number"
            min={1}
            value={draft.quantity}
            onChange={(event) => setDraft((current) => ({ ...current, quantity: event.target.value }))}
            required
          />
          <select
            className={styles.select}
            value={draft.status}
            onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as PantryOrder['status'] }))}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="ready">Ready</option>
            <option value="delivered">Delivered</option>
          </select>
          <div className={styles.actions}>
            <button className={`${styles.button} ${styles.buttonPrimary}`} type="submit">
              Save Order
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
