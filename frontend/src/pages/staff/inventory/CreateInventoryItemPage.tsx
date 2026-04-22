import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { InventoryItem } from '../../../data/fakeData';
import { inventorySeed, nextId } from '../../../data/fakeData';
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

const initialDraft: Draft = {
  name: '',
  category: '',
  quantity: '0',
  unit: '',
  barcode: '',
  storageType: 'ambient',
};

export default function CreateInventoryItemPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(initialDraft);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.name.trim() || !draft.category.trim() || !draft.unit.trim() || !draft.barcode.trim()) return;

    const quantity = Number(draft.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) return;

    const nextItem: InventoryItem = {
      id: nextId('inv'),
      name: draft.name.trim(),
      category: draft.category.trim(),
      quantity,
      unit: draft.unit.trim(),
      barcode: draft.barcode.trim(),
      storageType: draft.storageType,
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    const current = loadCollection<InventoryItem[]>(STORAGE_KEYS.inventory, inventorySeed).map(migrateInventoryItem);
    saveCollection(STORAGE_KEYS.inventory, [nextItem, ...current]);
    navigate('/inventory', { state: { toast: 'Item created successfully.' } });
  };

  return (
    <section className={styles.page}>
      <header className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Add Inventory Item</h1>
          <p className={styles.subtitle}>Create a polished stock record with barcode and storage details.</p>
        </div>
      </header>

      <article className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formShell}>
            <div className={styles.formSection}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Item Details</h2>
                <p className={styles.formSubtitle}>Start with the identity and stock data for this item.</p>
              </div>

              <div className={styles.fieldGrid}>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Item Name</span>
                  <input
                    className={styles.input}
                    placeholder="e.g. Olive Oil"
                    value={draft.name}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                    required
                  />
                </label>

                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Category</span>
                  <input
                    className={styles.input}
                    placeholder="e.g. Pantry Essentials"
                    value={draft.category}
                    onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
                    required
                  />
                </label>

                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Quantity</span>
                  <input
                    className={styles.input}
                    type="number"
                    min={0}
                    placeholder="0"
                    value={draft.quantity}
                    onChange={(event) => setDraft((current) => ({ ...current, quantity: event.target.value }))}
                    required
                  />
                </label>

                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Unit</span>
                  <input
                    className={styles.input}
                    placeholder="e.g. bottles"
                    value={draft.unit}
                    onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))}
                    required
                  />
                </label>

                <label className={`${styles.fieldGroup} ${styles.wideField}`}>
                  <span className={styles.fieldLabel}>Barcode</span>
                  <input
                    className={styles.input}
                    placeholder="Scan or type the barcode"
                    value={draft.barcode}
                    onChange={(event) => setDraft((current) => ({ ...current, barcode: event.target.value }))}
                    required
                  />
                </label>
              </div>
            </div>

            <aside className={`${styles.formSection} ${styles.formSectionAccent}`}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Storage Profile</h2>
                <p className={styles.formSubtitle}>Pick the storage type that matches how the item should be kept.</p>
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
                        onChange={(event) => setDraft((current) => ({ ...current, storageType: event.target.value as Draft['storageType'] }))}
                        style={{ display: 'none' }}
                      />
                    </label>
                  );
                })}
              </div>

              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Quick Preview</p>
                <p className={styles.summaryValue}>{draft.barcode || 'INV-000000'}</p>
                <p className={styles.summaryMeta}>
                  {draft.name || 'New item'} will be saved as {storageLabels[draft.storageType].toLowerCase()} stock in {draft.category || 'its category'}.
                </p>
              </div>
            </aside>
          </div>

          <div className={styles.actions}>
            <button className={`${styles.button} ${styles.buttonPrimary}`} type="submit">
              Save Item
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
