import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { inventoryApi, ordersApi, type InventoryItem } from '../../services/api';
import { useAuth } from '../../auth/useAuth';
import styles from './PantryOrderPage.module.css';

export default function PantryOrderPage() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [requiresLowerLocker, setRequiresLowerLocker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    inventoryApi.getAll({ available: true })
      .then(setInventory)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleItem = (id: number) => {
    const updated = new Set(selectedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      if (updated.size >= 10) {
        setOrderError('You can only select up to 10 items.');
        return;
      }
      updated.add(id);
    }
    setOrderError(null);
    setSelectedIds(updated);
  };

  const handleSubmit = async () => {
  if (selectedIds.size < 5) {
    setOrderError('Please select at least 5 items.');
    return;
  }
  if (selectedIds.size > 10) {
    setOrderError('Please select no more than 10 items.');
    return;
  }

  setSubmitting(true);
  setOrderError(null);

  try {
    await ordersApi.create({
      requires_lower_locker: requiresLowerLocker,
      items: Array.from(selectedIds),
    });
    setSuccessMessage(
      'Your order has been submitted! Staff will prepare your items and assign a locker. You will receive an email with pickup details.'
    );
    setSelectedIds(new Set());
  } catch (err: any) {
    if (
      err.message?.includes('already placed') ||
      err.message?.includes('weekly') ||
      err.message?.includes('Monday')
    ) {
      setOrderError(
        'You have already placed your locker order for this week. You may place a new order starting Monday.'
      );
    } else {
      setOrderError(err.message || 'Something went wrong. Please try again.');
    }
  }
  setSubmitting(false);
};

  if (loading) return <section className={styles.page}><p>Loading inventory...</p></section>;
  if (error) return <section className={styles.page}><p style={{ color: 'red' }}>Error: {error}</p></section>;

  const foodItems = inventory.filter((i) => i.category === 'food');
  const hygieneItems = inventory.filter((i) => i.category === 'hygiene');
  const otherItems = inventory.filter((i) => i.category === 'other');

  return (
    <section className={styles.page}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>Weekly basket</span>
          <h1 className={styles.title}>Order from Pantry</h1>
          <p className={styles.subtitle}>
            Select between 5 and 10 items for your weekly order. Staff will prepare your items and assign a locker.
            You will receive an email and SMS with your pickup details.
          </p>
          <div className={styles.heroPills}>
            <span className={styles.heroPill}>
              <strong>{selectedIds.size}</strong>/10 items selected
            </span>
            <span className={styles.heroPill}>
              <strong>{10 - selectedIds.size}</strong> slots remaining
            </span>
            <span className={styles.heroPill}>
              <strong>{inventory.length}</strong> items available
            </span>
          </div>
        </div>

        <div className={styles.heroPanel}>
          <div className={styles.quota}>
            <div className={styles.quotaInfo}>
              <p className={styles.quotaLabel}>Items Selected</p>
              <p className={styles.quotaValue}>{selectedIds.size}/10</p>
            </div>
            <div className={styles.quotaBar}>
              <div
                className={styles.quotaFill}
                style={{ width: `${(selectedIds.size / 10) * 100}%` }}
              />
            </div>
          </div>
          <div className={styles.heroNote}>
            <p className={styles.heroNoteLabel}>One order per week</p>
            <p className={styles.heroNoteValue}>
              Select 5–10 items. Your order resets every Monday.
            </p>
          </div>
        </div>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className={styles.alert} style={{ borderColor: 'green', background: '#f0fff0' }}>
          <span className={styles.alertIcon}>✅</span>
          <div>
            <p className={styles.alertTitle}>Order Submitted!</p>
            <p className={styles.alertText}>{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error message */}
      {orderError && (
        <div className={styles.alert}>
          <span className={styles.alertIcon}>⚠️</span>
          <div>
            <p className={styles.alertTitle}>Error</p>
            <p className={styles.alertText}>{orderError}</p>
          </div>
        </div>
      )}

      {/* Food Items */}
      {foodItems.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ marginBottom: 16 }}>🥫 Food Items</h2>
          <div className={styles.categoriesGrid}>
            {foodItems.map((item) => (
              <div
                key={item.id}
                className={`${styles.categoryCard} ${selectedIds.has(item.id) ? styles.categoryCardSelected : ''} ${!item.is_available ? styles.categoryCardDisabled : ''}`}
                onClick={() => item.is_available && toggleItem(item.id)}
                style={{ cursor: item.is_available ? 'pointer' : 'not-allowed' }}
              >
                <div className={styles.categoryTop}>
                  <div className={styles.categoryHeader}>
                    <span className={styles.categoryIcon}>🥫</span>
                    <div className={styles.categoryMeta}>
                      <h2 className={styles.categoryName}>{item.name}</h2>
                      <p className={styles.categoryHint}>{item.quantity} {item.unit} available</p>
                    </div>
                  </div>
                </div>
                <div className={styles.statusBadge}>
                  {selectedIds.has(item.id) ? (
                    <><span className={styles.statusIcon}>✓</span><span className={styles.statusText}>Selected</span></>
                  ) : (
                    <><span className={styles.statusIcon}>●</span><span className={styles.statusText}>Available</span></>
                  )}
                </div>
                <button
                  className={`${styles.orderButton} ${selectedIds.has(item.id) ? styles.orderButtonSelected : ''} ${!item.is_available ? styles.orderButtonDisabled : ''}`}
                  disabled={!item.is_available}
                  onClick={(e) => { e.stopPropagation(); item.is_available && toggleItem(item.id); }}
                >
                  {selectedIds.has(item.id) ? 'Remove' : 'Select'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hygiene Items */}
      {hygieneItems.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ marginBottom: 16 }}>🧴 Hygiene Items</h2>
          <div className={styles.categoriesGrid}>
            {hygieneItems.map((item) => (
              <div
                key={item.id}
                className={`${styles.categoryCard} ${selectedIds.has(item.id) ? styles.categoryCardSelected : ''} ${!item.is_available ? styles.categoryCardDisabled : ''}`}
                onClick={() => item.is_available && toggleItem(item.id)}
                style={{ cursor: item.is_available ? 'pointer' : 'not-allowed' }}
              >
                <div className={styles.categoryTop}>
                  <div className={styles.categoryHeader}>
                    <span className={styles.categoryIcon}>🧴</span>
                    <div className={styles.categoryMeta}>
                      <h2 className={styles.categoryName}>{item.name}</h2>
                      <p className={styles.categoryHint}>{item.quantity} {item.unit} available</p>
                    </div>
                  </div>
                </div>
                <div className={styles.statusBadge}>
                  {selectedIds.has(item.id) ? (
                    <><span className={styles.statusIcon}>✓</span><span className={styles.statusText}>Selected</span></>
                  ) : (
                    <><span className={styles.statusIcon}>●</span><span className={styles.statusText}>Available</span></>
                  )}
                </div>
                <button
                  className={`${styles.orderButton} ${selectedIds.has(item.id) ? styles.orderButtonSelected : ''} ${!item.is_available ? styles.orderButtonDisabled : ''}`}
                  disabled={!item.is_available}
                  onClick={(e) => { e.stopPropagation(); item.is_available && toggleItem(item.id); }}
                >
                  {selectedIds.has(item.id) ? 'Remove' : 'Select'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADA Lower Locker */}
      <div style={{ marginBottom: 24, padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={requiresLowerLocker}
            onChange={(e) => setRequiresLowerLocker(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          <div>
            <p style={{ fontWeight: 600, margin: 0 }}>♿ I require a lower locker</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Only check this if you are physically unable to reach a high locker.
            </p>
          </div>
        </label>
      </div>

      {/* Submit Button */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 32 }}>
        <button
          className={styles.orderButton}
          style={{
            padding: '12px 32px',
            fontSize: 16,
            fontWeight: 700,
            background: selectedIds.size >= 5 ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
            color: selectedIds.size >= 5 ? '#fff' : 'var(--text-muted)',
            border: 'none',
            borderRadius: 8,
            cursor: selectedIds.size >= 5 ? 'pointer' : 'not-allowed',
          }}
          disabled={selectedIds.size < 5 || submitting}
          onClick={handleSubmit}
        >
          {submitting ? 'Submitting...' : `Submit Order (${selectedIds.size} items)`}
        </button>
        {selectedIds.size < 5 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Select at least {5 - selectedIds.size} more item{5 - selectedIds.size !== 1 ? 's' : ''} to submit
          </p>
        )}
      </div>

      <div className={styles.footer}>
        <Link to="/dashboard" className={styles.backLink}>← Back to Dashboard</Link>
      </div>
    </section>
  );
}