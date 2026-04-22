import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { InventoryItem } from '../../../data/fakeData';
import { inventorySeed } from '../../../data/fakeData';
import { loadCollection, saveCollection, STORAGE_KEYS } from '../../../data/localStore';
import styles from '../StaffPages.module.css';

type Draft = {
  name: string;
  category: string;
  quantity: string;
  unit: string;
  barcode: string;
  storageType: 'frozen' | 'refrigerated' | 'ambient';
};

const storageLabels: Record<Draft['storageType'], string> = {
  frozen: 'Frozen',
  refrigerated: 'Refrigerated',
  ambient: 'Ambient / Dry',
};

const storageDescriptions: Record<Draft['storageType'], string> = {
  frozen: 'Deep cold storage for frozen stock',
  refrigerated: 'Chilled storage for fresh items',
  ambient: 'Room temperature storage for dry goods',
};

function migrateInventoryItem(item: InventoryItem): InventoryItem {
  return {
    ...item,
    barcode: item.barcode ?? `INV-${item.id.replace(/\D/g, '').padStart(6, '0')}`,
    storageType: item.storageType ?? 'ambient',
  };
}

export default function EditInventoryItemPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [items, setItems] = useState<InventoryItem[]>(() =>
    loadCollection(STORAGE_KEYS.inventory, inventorySeed).map(migrateInventoryItem),
  );

  const item = useMemo(() => items.find((entry) => entry.id === id), [items, id]);

  const [draft, setDraft] = useState<Draft>(() => ({
    name: item?.name ?? '',
    category: item?.category ?? '',
    quantity: String(item?.quantity ?? 0),
    unit: item?.unit ?? '',
    barcode: item?.barcode ?? '',
    storageType: item?.storageType ?? 'ambient',
  }));

  if (!item) {
    return (
      <section className={styles.page}>
        <article className={styles.card}>
          <h1 className={styles.title}>Item Not Found</h1>
          <p className={styles.subtitle}>This inventory item does not exist anymore.</p>
          <div className={styles.actions}>
            <Link to="/inventory" className={`${styles.button} ${styles.buttonGhost}`}>
              Back to Inventory
            </Link>
          </div>
        </article>
      </section>
    );
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.name.trim() || !draft.category.trim() || !draft.unit.trim() || !draft.barcode.trim()) return;
    const quantity = Number(draft.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) return;

    const next = items.map((entry) =>
      entry.id === item.id
        ? {
            ...entry,
            name: draft.name.trim(),
            category: draft.category.trim(),
            quantity,
            unit: draft.unit.trim(),
            barcode: draft.barcode.trim(),
            storageType: draft.storageType,
            updatedAt: new Date().toISOString().slice(0, 10),
          }
        : entry,
    );

    setItems(next);
    saveCollection(STORAGE_KEYS.inventory, next);
    navigate('/inventory', { state: { toast: 'Item updated successfully.' } });
  };

  return (
    <section className={styles.page}>
      <header className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Edit Inventory Item</h1>
          <p className={styles.subtitle}>Update the item details, barcode, and storage profile.</p>
        </div>
      </header>

      <article className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formShell}>
            <div className={styles.formSection}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Item Details</h2>
                <p className={styles.formSubtitle}>Make fast updates to the core stock fields.</p>
              </div>

              <div className={styles.fieldGrid}>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Item Name</span>
                  <input className={styles.input} value={draft.name} onChange={(e) => setDraft((v) => ({ ...v, name: e.target.value }))} required />
                </label>

                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Category</span>
                  <input
                    className={styles.input}
                    value={draft.category}
                    onChange={(e) => setDraft((v) => ({ ...v, category: e.target.value }))}
                    required
                  />
                </label>

                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Quantity</span>
                  <input
                    className={styles.input}
                    type="number"
                    min={0}
                    value={draft.quantity}
                    onChange={(e) => setDraft((v) => ({ ...v, quantity: e.target.value }))}
                    required
                  />
                </label>

                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Unit</span>
                  <input className={styles.input} value={draft.unit} onChange={(e) => setDraft((v) => ({ ...v, unit: e.target.value }))} required />
                </label>

                <label className={`${styles.fieldGroup} ${styles.wideField}`}>
                  <span className={styles.fieldLabel}>Barcode</span>
                  <input
                    className={styles.input}
                    value={draft.barcode}
                    onChange={(e) => setDraft((v) => ({ ...v, barcode: e.target.value }))}
                    placeholder="Scan or type the barcode"
                    required
                  />
                </label>
              </div>
            </div>

            <aside className={`${styles.formSection} ${styles.formSectionAccent}`}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Storage Profile</h2>
                <p className={styles.formSubtitle}>Choose the storage type that matches the item.</p>
              </div>

              <div className={styles.storagePills}>
                {Object.entries(storageLabels).map(([value, label]) => {
                  const typedValue = value as Draft['storageType'];
                  const isActive = draft.storageType === typedValue;
                  return (
                    <label key={value} className={`${styles.storageCard} ${isActive ? styles.storageCardActive : ''}`}>
                      <span className={styles.storageCardLeft}>
                        <span className={styles.storageCardTitle}>{label}</span>
                        <span className={styles.storageCardText}>{storageDescriptions[typedValue]}</span>
                      </span>
                      <span className={`${styles.storageDot} ${typedValue === 'frozen' ? styles.storageFrozen : typedValue === 'refrigerated' ? styles.storageRefrigerated : styles.storageAmbient}`} />
                      <input
                        type="radio"
                        name="storageType"
                        value={typedValue}
                        checked={isActive}
                        onChange={(e) => setDraft((v) => ({ ...v, storageType: e.target.value as Draft['storageType'] }))}
                        style={{ display: 'none' }}
                      />
                    </label>
                  );
                })}
              </div>

              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Current Item</p>
                <p className={styles.summaryValue}>{draft.barcode || 'INV-000000'}</p>
                <p className={styles.summaryMeta}>
                  {draft.name || 'This item'} is saved as {storageLabels[draft.storageType].toLowerCase()} stock.
                </p>
              </div>
            </aside>
          </div>

          <div className={styles.actions}>
            <button className={`${styles.button} ${styles.buttonPrimary}`} type="submit">
              Save Changes
            </button>
            <Link to="/inventory" className={`${styles.button} ${styles.buttonGhost}`}>
              Cancel
            </Link>
          </div>
        </form>
      </article>
    </section>
  );
}
