import { useEffect, useMemo, useState, useRef } from 'react';
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
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeResult, setBarcodeResult] = useState<any>(null);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [scanQuantity, setScanQuantity] = useState(1);
  const barcodeRef = useRef<HTMLInputElement>(null);

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
  const handleBarcodeScan = async (barcode: string) => {
  if (!barcode.trim()) return;
  setBarcodeLoading(true);
  setBarcodeError(null);
  setBarcodeResult(null);
  try {
    const result = await inventoryApi.lookupBarcode(barcode.trim());
    setBarcodeResult(result);
  } catch (err: any) {
    setBarcodeError(err.message);
  }
  setBarcodeLoading(false);
};

const handleAddScannedItem = async () => {
  if (!barcodeResult) return;
  try {
    await inventoryApi.scanBarcode(barcodeInput.trim(), scanQuantity);
    const updated = await inventoryApi.getAll();
    setItems(updated);
    setToastMessage(
      barcodeResult.existing_item
        ? `Updated ${barcodeResult.name} quantity by ${scanQuantity}`
        : `Added ${barcodeResult.name} to inventory`
    );
    setBarcodeInput('');
    setBarcodeResult(null);
    setScanQuantity(1);
  } catch (err: any) {
    setBarcodeError(err.message);
  }
};
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
      {/* Barcode Scanner Section */}
<article className={styles.card} style={{ marginBottom: 24 }}>
  <div style={{ padding: '16px 0' }}>
    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
      📷 Barcode Scanner
    </h2>
    <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
      Click the input below and scan a barcode with your Tera 8100 scanner, or type it manually. Press Enter to look up.
    </p>

    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      <input
        ref={barcodeRef}
        type="text"
        value={barcodeInput}
        onChange={(e) => setBarcodeInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleBarcodeScan(barcodeInput);
        }}
        placeholder="Scan or type barcode here..."
        style={{
          flex: 1,
          padding: '10px 14px',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          fontSize: 14,
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
        }}
      />
      <button
        onClick={() => handleBarcodeScan(barcodeInput)}
        disabled={barcodeLoading || !barcodeInput.trim()}
        style={{
          padding: '10px 20px',
          borderRadius: 8,
          border: 'none',
          background: 'var(--accent-primary)',
          color: '#fff',
          fontWeight: 600,
          cursor: barcodeLoading || !barcodeInput.trim() ? 'not-allowed' : 'pointer',
          opacity: barcodeLoading || !barcodeInput.trim() ? 0.6 : 1,
        }}
      >
        {barcodeLoading ? 'Looking up...' : 'Look Up'}
      </button>
    </div>

    {barcodeError && (
      <p style={{ color: 'red', fontSize: 14, marginBottom: 12 }}>⚠️ {barcodeError}</p>
    )}

    {barcodeResult && (
      <div style={{
        padding: 16,
        borderRadius: 8,
        border: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {barcodeResult.image_url && (
            <img
              src={barcodeResult.image_url}
              alt={barcodeResult.name}
              style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 8 }}
            />
          )}
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{barcodeResult.name}</p>
            {barcodeResult.brands && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>Brand: {barcodeResult.brands}</p>
            )}
            {barcodeResult.quantity && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Size: {barcodeResult.quantity}</p>
            )}
            {barcodeResult.existing_item ? (
              <p style={{ fontSize: 13, color: 'green', fontWeight: 600 }}>✅ Already in inventory — will update quantity</p>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--accent-primary)', fontWeight: 600 }}>🆕 New item — will be added to inventory</p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>Quantity to add:</label>
          <input
            type="number"
            min={1}
            max={999}
            value={scanQuantity}
            onChange={(e) => setScanQuantity(Number(e.target.value))}
            style={{
              width: 80,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              fontSize: 14,
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            onClick={handleAddScannedItem}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              background: 'green',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Add to Inventory
          </button>
          <button
            onClick={() => { setBarcodeResult(null); setBarcodeInput(''); setScanQuantity(1); }}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )}
  </div>
</article>

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