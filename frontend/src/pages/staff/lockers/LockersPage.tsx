import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { InventoryItem, Locker, LockerStatus, PantryOrder, LockerSize } from '../../../data/fakeData';
import { inventorySeed, lockerSeed, ordersSeed, nextId, getOrderItems, migratePantryOrder } from '../../../data/fakeData';
import { areLockerStoragesCompatible, describeLockerStorageGroup } from '../../../data/lockerStorage';
import { loadCollection, saveCollection, STORAGE_KEYS } from '../../../data/localStore';
import { useAuth } from '../../../auth/useAuth';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import SuccessToast from '../../../components/ui/SuccessToast';
import styles from './LockersPage.module.css';

const statusLabels: Record<LockerStatus, string> = {
  available: 'Available',
  reserved: 'Reserved',
  occupied: 'Occupied',
  maintenance: 'Maintenance',
};

const sizeLabels = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  extra_large: 'Extra Large',
} as const;

const storageLabels = {
  frozen: 'Frozen',
  refrigerated: 'Dry / Refrigerated',
  ambient: 'Dry / Refrigerated',
} as const;

const lockerStatusClasses: Record<LockerStatus, string> = {
  available: styles.statusAvailable,
  reserved: styles.statusReserved,
  occupied: styles.statusOccupied,
  maintenance: styles.statusMaintenance,
};

function createAccessCode(lockerId: string, orderId: string) {
  const hash = `${lockerId}-${orderId}`.replace(/[^a-z0-9]/gi, '');
  return hash.slice(-4).padStart(4, '0').toUpperCase();
}

function pickRandomLockerStorageType(seed: string): Locker['storageType'] {
  const types: Locker['storageType'][] = ['ambient', 'frozen'];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return types[Math.abs(hash) % types.length];
}

function migrateLocker(locker: Record<string, unknown>, index: number): Locker {
  const normalizedStorageType =
    (locker.storageType as Locker['storageType']) === 'refrigerated'
      ? 'ambient'
      : ((locker.storageType as Locker['storageType']) ?? pickRandomLockerStorageType(`legacy-${index}`));

  // Handle migration from old schema (currentOrderId) to new schema (currentOrderIds)
  if (!Array.isArray(locker.currentOrderIds)) {
    const oldOrderId = locker.currentOrderId;
    return {
      ...(locker as Locker),
      storageType: normalizedStorageType,
      currentOrderIds: oldOrderId ? [oldOrderId as string] : [],
    };
  }

  return {
    ...(locker as Locker),
    storageType: normalizedStorageType,
  };
}

export default function LockersPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'manager';
  const canMarkOccupied = user?.role === 'manager' || user?.role === 'staff';

  const [lockers, setLockers] = useState<Locker[]>(() => {
    const loaded = loadCollection(STORAGE_KEYS.lockers, lockerSeed);
    const migrated = loaded.map((locker, index) => migrateLocker(locker, index));
    if (migrated.length > 0 && migrated.every((locker) => locker.storageType === 'ambient')) {
      return migrated.map((locker, index) => ({
        ...locker,
        storageType: pickRandomLockerStorageType(`${locker.id}-${index}`),
      }));
    }
    return migrated;
  });
  const [orders, setOrders] = useState<PantryOrder[]>(() =>
    loadCollection<PantryOrder[]>(STORAGE_KEYS.orders, ordersSeed).map(migratePantryOrder)
  );

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editCode, setEditCode] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editSize, setEditSize] = useState<LockerSize>('small');
  const [editStorageType, setEditStorageType] = useState<Locker['storageType']>('ambient');
  
  // Add states
  const [isAdding, setIsAdding] = useState(false);

  const [selectedLockerId, setSelectedLockerId] = useState<string>(lockers[0]?.id ?? lockerSeed[0].id);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [placementMode, setPlacementMode] = useState<'reserved' | 'occupied'>('reserved');
  const [memo, setMemo] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<Locker | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPlacementModalOpen, setIsPlacementModalOpen] = useState(false);

  useEffect(() => {
    saveCollection(STORAGE_KEYS.lockers, lockers);
  }, [lockers]);

  useEffect(() => {
    saveCollection(STORAGE_KEYS.orders, orders);
  }, [orders]);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    if (lockers.length && !lockers.some((locker) => locker.id === selectedLockerId)) {
      setTimeout(() => {
        setSelectedLockerId(lockers[0].id);
      }, 0);
    }
  }, [lockers, selectedLockerId]);

  const selectedLocker = useMemo(
    () => lockers.find((locker) => locker.id === selectedLockerId) ?? lockers[0],
    [lockers, selectedLockerId],
  );

  const lockerStats = useMemo(() => {
    return lockers.reduce(
      (acc, locker) => {
        acc[locker.status] += 1;
        if (Array.isArray(locker.currentOrderIds) && locker.currentOrderIds.length > 0) acc.assigned += 1;
        return acc;
      },
      { available: 0, reserved: 0, occupied: 0, maintenance: 0, assigned: 0 },
    );
  }, [lockers]);

  const lockerById = useMemo(() => Object.fromEntries(lockers.map((locker) => [locker.id, locker])), [lockers]);
  const orderById = useMemo(() => Object.fromEntries(orders.map((order) => [order.id, order])), [orders]);
  const inventoryByName = useMemo(() => {
    const inventory = loadCollection<InventoryItem[]>(STORAGE_KEYS.inventory, inventorySeed);
    return Object.fromEntries(inventory.map((item) => [item.name, item]));
  }, []);

  const getOrderItemStorages = (order: PantryOrder): Locker['storageType'][] => {
    return getOrderItems(order).map((item) => inventoryByName[item.itemName]?.storageType ?? 'ambient');
  };



  const placeOrder = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const targetLocker = lockerById[selectedLockerId];
    const ordersToPlace = Array.from(selectedOrderIds).map(id => orderById[id]).filter(Boolean) as PantryOrder[];

    if (!targetLocker) {
      setFormError('Select a locker.');
      return;
    }

    if (ordersToPlace.length === 0) {
      setFormError('Select at least one order.');
      return;
    }

    const incompatibleOrder = ordersToPlace.find((order) =>
      getOrderItemStorages(order).some((storage) => !areLockerStoragesCompatible(storage, targetLocker.storageType))
    );
    if (incompatibleOrder) {
      const firstIncompatibleItem = getOrderItems(incompatibleOrder).find((item) => {
        const itemStorage = inventoryByName[item.itemName]?.storageType ?? 'ambient';
        return !areLockerStoragesCompatible(itemStorage, targetLocker.storageType);
      });
      const neededStorage = firstIncompatibleItem
        ? inventoryByName[firstIncompatibleItem.itemName]?.storageType ?? 'ambient'
        : 'ambient';
      setFormError(
        `"${firstIncompatibleItem?.itemName ?? 'This item'}" requires a ${describeLockerStorageGroup(neededStorage)} locker.`
      );
      return;
    }

    // Check if any order is already assigned to a different locker
    const conflictingOrder = ordersToPlace.find(order => order.lockerId && order.lockerId !== targetLocker.id);
    if (conflictingOrder) {
      setFormError(`${conflictingOrder.requesterName}'s order is already in a different locker.`);
      return;
    }

    const nextLockers = lockers.map((locker) => {
      if (locker.id === targetLocker.id) {
        const newOrderIds = Array.from(new Set([...locker.currentOrderIds, ...ordersToPlace.map(o => o.id)]));
        return {
          ...locker,
          status: placementMode,
          currentOrderIds: newOrderIds,
          accessCode: createAccessCode(locker.id, ordersToPlace[0].id),
          note: memo.trim() || `${newOrderIds.length} order(s) assigned.`,
        };
      }

      // Remove orders from any other lockers where they might exist
      const orderIdsToRemove = ordersToPlace.map(o => o.id);
      const hasOrderToRemove = locker.currentOrderIds.some(id => orderIdsToRemove.includes(id));
      
      if (hasOrderToRemove) {
        const remaining = locker.currentOrderIds.filter(id => !orderIdsToRemove.includes(id));
        return {
          ...locker,
          currentOrderIds: remaining,
          status: remaining.length === 0 ? 'available' : locker.status,
          accessCode: remaining.length === 0 ? '----' : locker.accessCode,
        };
      }

      return locker;
    });

    const nextOrders = orders.map((order) => {
      if (selectedOrderIds.has(order.id)) {
        return {
          ...order,
          lockerId: targetLocker.id,
          status: (placementMode === 'reserved' ? 'approved' : 'ready') as PantryOrder['status'],
        } as PantryOrder;
      }

      return order;
    });

    setLockers(nextLockers);
    setOrders(nextOrders);
    setToastMessage(`Placed ${ordersToPlace.length} order(s) in ${targetLocker.code}.`);
    setSelectedOrderIds(new Set());
    setMemo('');
    setIsPlacementModalOpen(false);
  };

  const confirmRelease = () => {
    if (!releaseTarget?.currentOrderIds || releaseTarget.currentOrderIds.length === 0) return;

    // Release the first order from the locker
    const releasedOrderId = releaseTarget.currentOrderIds[0];
    
    const nextLockers = lockers.map((locker) =>
      locker.id === releaseTarget.id
        ? {
            ...locker,
            currentOrderIds: locker.currentOrderIds.filter(id => id !== releasedOrderId),
            status: locker.currentOrderIds.length === 1 ? ('available' as LockerStatus) : locker.status,
            accessCode: locker.currentOrderIds.length === 1 ? '----' : locker.accessCode,
            note: locker.currentOrderIds.length === 1 ? 'Released and ready for the next request.' : `${locker.currentOrderIds.length - 1} order(s) remaining.`,
          }
        : locker,
    );

    const nextOrders = orders.map((order) =>
      order.id === releasedOrderId
        ? ({
            ...order,
            lockerId: null,
            status: 'delivered',
          } as PantryOrder)
        : order,
    );

    setLockers(nextLockers);
    setOrders(nextOrders);
    setReleaseTarget(null);
    setToastMessage('Order released from locker.');
  };

  const confirmOccupy = () => {
    if (!selectedLocker || selectedLocker.status !== 'reserved' || selectedLocker.currentOrderIds.length === 0) return;

    const orderIds = [...selectedLocker.currentOrderIds];
    const nextLockers = lockers.map((locker) =>
      locker.id === selectedLocker.id
        ? {
            ...locker,
            status: 'occupied' as LockerStatus,
            note: `${orderIds.length} order(s) placed and ready.`,
          }
        : locker,
    );

    const nextOrders = orders.map((order) =>
      orderIds.includes(order.id)
        ? ({
            ...order,
            status: 'ready',
          } as PantryOrder)
        : order,
    );

    setLockers(nextLockers);
    setOrders(nextOrders);
    setToastMessage('Locker marked as occupied.');
  };

  const startAddLocker = () => {
    setIsAdding(true);
    setIsEditing(false);
    setEditCode('');
    setEditLocation('');
    setEditSize('medium');
    setEditStorageType('ambient');
  };

  const startEditLocker = (locker: Locker) => {
    setIsEditing(true);
    setIsAdding(false);
    setEditCode(locker.code);
    setEditLocation(locker.location);
    setEditSize(locker.size);
    setEditStorageType(locker.storageType);
  };

  const cancelManagerAction = () => {
    setIsEditing(false);
    setIsAdding(false);
  };

  const saveManagerLocker = () => {
    if (isAdding) {
      const fresh: Locker = {
        id: nextId('locker'),
        code: editCode || 'NEW',
        name: 'Locker',
        location: editLocation,
        size: editSize,
        storageType: editStorageType,
        status: 'available',
        currentOrderIds: [],
        accessCode: '----',
        note: 'Newly provisioned.',
      };
      setLockers([...lockers, fresh]);
      setToastMessage('Locker created.');
    } else if (isEditing && selectedLocker) {
      const nextLockers = lockers.map(l => l.id === selectedLocker.id ? {
        ...l,
        code: editCode,
        location: editLocation,
        size: editSize,
        storageType: editStorageType,
      } : l);
      setLockers(nextLockers);
      setToastMessage('Locker updated.');
    }
    cancelManagerAction();
  };

  const deleteLocker = () => {
    if (!selectedLocker) return;
    if (selectedLocker.currentOrderIds.length > 0) {
      alert("Cannot delete a locker with active orders. Release all orders first.");
      return;
    }
    if (confirm(`Are you sure you want to permanently delete locker ${selectedLocker.code}?`)) {
      setLockers(lockers.filter(l => l.id !== selectedLocker.id));
      setToastMessage('Locker deleted.');
      cancelManagerAction();
    }
  };

  return (
    <section className={styles.page}>
      <header className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Locker Operations</h1>
          <p className={styles.subtitle}>Consult the locker wall and place orders into available lockers only.</p>
        </div>
        <div className={styles.chips}>
          <span className={`${styles.chip} ${styles.statusAvailable}`}>Available: {lockerStats.available}</span>
          <span className={`${styles.chip} ${styles.statusReserved}`}>Reserved: {lockerStats.reserved}</span>
          <span className={`${styles.chip} ${styles.statusOccupied}`}>Occupied: {lockerStats.occupied}</span>
          <span className={`${styles.chip} ${styles.statusMaintenance}`}>Maintenance: {lockerStats.maintenance}</span>
        </div>
      </header>

      <div className={styles.gridLayout}>
        <article className={styles.card}>
          <div className={styles.cardBody}>
            <div className={styles.headerRow} style={{ marginBottom: 16 }}>
              <div>
                <h2 className={styles.panelTitle}>Locker Wall</h2>
                <p className={styles.subtitle}>Tap a locker to inspect its order, location, and state.</p>
              </div>
              {isManager && !isAdding && (
                <button
                  className={`${styles.button} ${styles.buttonWarn}`}
                  style={{ background: 'var(--accent-primary)', color: '#fff', borderColor: 'var(--accent-primary)' }}
                  onClick={startAddLocker}
                >
                  + Add Locker
                </button>
              )}
            </div>

            <div className={styles.lockersWall}>
              {lockers.map((locker, index) => {
                const isSelected = locker.id === selectedLocker?.id;
                const className = [
                  styles.lockerTile, 
                  lockerStatusClasses[locker.status],
                  isSelected ? styles.lockerSelected : ''
                ].filter(Boolean).join(' ');
                
                return (
                  <motion.button
                    key={locker.id}
                    type="button"
                    className={className}
                    onClick={() => {
                      setSelectedLockerId(locker.id);
                      if (locker.status === 'available' && !isAdding && !isEditing) {
                        setFormError(null);
                        setIsPlacementModalOpen(true);
                      }
                    }}
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                      delay: (index % 10) * 0.015 // stagger per row to avoid massive lag
                    }}
                  >
                    <div className={styles.lockerTop}>
                      <span className={styles.lockerCode}>{locker.code}</span>
                      <span className={styles.lockerSizeBadge}>{sizeLabels[locker.size]}</span>
                      <span className={styles.lockerStorageBadge}>{storageLabels[locker.storageType]}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </article>

        <aside className={styles.sidePanel}>
          <article className={styles.card}>
            <div className={styles.cardBody}>
              <h2 className={styles.panelTitle}>
                {isAdding ? 'Provision Locker' : isEditing ? 'Edit Locker Admin' : 'Locker Snapshot'}
              </h2>
              
              {isAdding || isEditing ? (
                <div className={styles.form} style={{ marginTop: 16 }}>
                  <input className={styles.input} value={editCode} onChange={e => setEditCode(e.target.value)} placeholder="Code (e.g. L-99)" />
                  <input className={styles.input} value={editLocation} onChange={e => setEditLocation(e.target.value)} placeholder="Physical Location" />
                  <select className={styles.select} value={editSize} onChange={e => setEditSize(e.target.value as LockerSize)}>
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="extra_large">Extra Large</option>
                  </select>
                  <select className={styles.select} value={editStorageType} onChange={e => setEditStorageType(e.target.value as Locker['storageType'])}>
                    <option value="ambient">Dry / Refrigerated</option>
                    <option value="frozen">Frozen</option>
                  </select>
                  <div className={styles.actions} style={{ marginTop: 8 }}>
                    <button className={`${styles.button} ${styles.buttonPrimary}`} type="button" onClick={saveManagerLocker}>Save</button>
                    <button className={`${styles.button} ${styles.buttonGhost}`} type="button" onClick={cancelManagerAction}>Cancel</button>
                  </div>
                </div>
              ) : selectedLocker ? (
                <div className={styles.detailList}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Locker</span>
                    <span className={styles.detailValue}>{selectedLocker.code}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Status</span>
                    <span className={styles.detailValue}>{statusLabels[selectedLocker.status]}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Orders</span>
                    <span className={styles.detailValue}>{selectedLocker.currentOrderIds.length > 0 ? `${selectedLocker.currentOrderIds.length} order${selectedLocker.currentOrderIds.length > 1 ? 's' : ''}` : 'Empty'}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Access code</span>
                    <span className={styles.detailValue}>{selectedLocker.accessCode}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Location</span>
                    <span className={styles.detailValue}>{selectedLocker.location}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Size</span>
                    <span className={styles.detailValue}>{sizeLabels[selectedLocker.size]}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Storage Type</span>
                    <span className={styles.detailValue}>{storageLabels[selectedLocker.storageType]}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Note</span>
                    <span className={styles.detailValue}>{selectedLocker.note}</span>
                  </div>
                </div>
              ) : null}

              {!isAdding && !isEditing && selectedLocker?.currentOrderIds.length > 0 ? (
                <div className={styles.actions} style={{ marginTop: 14 }}>
                  <button className={`${styles.button} ${styles.buttonWarn}`} type="button" onClick={() => setReleaseTarget(selectedLocker)}>
                    Release first order
                  </button>
                </div>
              ) : null}

              {!isAdding && !isEditing && selectedLocker && (
                <div className={styles.actions} style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-color)' }}>
                  {canMarkOccupied && selectedLocker.status === 'reserved' && selectedLocker.currentOrderIds.length > 0 ? (
                    <button className={`${styles.button} ${styles.buttonPrimary}`} type="button" onClick={confirmOccupy}>
                      Mark occupied
                    </button>
                  ) : null}
                  {isManager ? (
                    <>
                      <button className={`${styles.button} ${styles.buttonWarn}`} style={{ borderColor: 'transparent', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} type="button" onClick={() => startEditLocker(selectedLocker)}>
                        Edit Locker
                      </button>
                      <button className={`${styles.button} ${styles.buttonWarn}`} style={{ borderColor: 'transparent', background: 'var(--status-overdue-bg)', color: 'var(--status-overdue)' }} type="button" onClick={deleteLocker}>
                        Delete
                      </button>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </article>
        </aside>
      </div>

      {isPlacementModalOpen && selectedLocker?.status === 'available' ? (
        <div className={styles.modalOverlay} onClick={() => setIsPlacementModalOpen(false)}>
          <article className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.panelTitle}>Place Orders in Locker</h2>
                <p className={styles.subtitle}>Locker {selectedLocker.code} is available. Select orders to assign.</p>
              </div>
              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={() => setIsPlacementModalOpen(false)}
                aria-label="Close placement popup"
              >
                <X size={16} />
              </button>
            </div>

            <form className={styles.form} onSubmit={placeOrder}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 10, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Select Orders (Click to add/remove):
                </label>
                <div style={{ display: 'grid', gap: 8, maxHeight: 280, overflowY: 'auto', paddingRight: 8 }}>
                  {orders
                    .filter((order) => !order.lockerId)
                    .filter((order) => getOrderItemStorages(order).every((storage) => areLockerStoragesCompatible(storage, selectedLocker.storageType)))
                    .map((order) => (
                    <label key={order.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', backgroundColor: selectedOrderIds.has(order.id) ? 'var(--bg-tertiary)' : 'transparent', transition: 'all 0.15s ease' }}>
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.has(order.id)}
                        onChange={(e) => {
                          const updated = new Set(selectedOrderIds);
                          if (e.target.checked) {
                            updated.add(order.id);
                          } else {
                            updated.delete(order.id);
                          }
                          setSelectedOrderIds(updated);
                        }}
                        style={{ cursor: 'pointer', width: 18, height: 18 }}
                      />
                      <span style={{ flex: 1, fontSize: 14 }}>
                        <strong>{order.requesterName}</strong> - {getOrderItems(order).map((item) => `${item.itemName} x${item.quantity}`).join(', ')}
                      </span>
                    </label>
                  ))}
                  {orders
                    .filter((order) => !order.lockerId)
                    .filter((order) => getOrderItemStorages(order).every((storage) => areLockerStoragesCompatible(storage, selectedLocker.storageType))).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px 12px', color: 'var(--text-muted)', fontSize: 14 }}>
                      No open orders match this locker storage type.
                    </div>
                  )}
                </div>
              </div>

              {selectedOrderIds.size > 0 && (
                <div style={{ marginBottom: 16, padding: 12, backgroundColor: 'var(--bg-tertiary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Selected: {selectedOrderIds.size} order{selectedOrderIds.size > 1 ? 's' : ''}
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Array.from(selectedOrderIds).map((orderId) => {
                      const order = orderById[orderId];
                      if (!order) return null;
                      return (
                        <div key={orderId} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', backgroundColor: 'var(--accent-primary)', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                          {order.requesterName}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = new Set(selectedOrderIds);
                              updated.delete(orderId);
                              setSelectedOrderIds(updated);
                            }}
                            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1 }}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 12 }}>
                Placement Mode:
              </label>
              <select className={styles.select} value={placementMode} onChange={(event) => setPlacementMode(event.target.value as 'reserved' | 'occupied')}>
                <option value="reserved">Reserve locker</option>
                <option value="occupied">Mark as occupied</option>
              </select>

              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 12 }}>
                Note (Optional):
              </label>
              <textarea
                className={styles.textarea}
                placeholder="Add a quick note for the handoff, if needed."
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
              />

              {formError ? <p className={styles.formError}>{formError}</p> : <p className={styles.helperText}>Select one or more orders and place them in this locker.</p>}

              <div className={styles.actions}>
                <button className={`${styles.button} ${styles.buttonPrimary}`} type="submit" disabled={selectedOrderIds.size === 0}>
                  Place {selectedOrderIds.size > 0 ? selectedOrderIds.size : ''} order{selectedOrderIds.size !== 1 ? 's' : ''}
                </button>
                <button className={`${styles.button} ${styles.buttonGhost}`} type="button" onClick={() => setIsPlacementModalOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </article>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(releaseTarget)}
        title="Release locker"
        message={`Release ${releaseTarget?.code ?? 'this locker'} and mark its order as delivered?`}
        confirmLabel="Release"
        onCancel={() => setReleaseTarget(null)}
        onConfirm={confirmRelease}
      />
      <SuccessToast message={toastMessage} />
    </section>
  );
}
