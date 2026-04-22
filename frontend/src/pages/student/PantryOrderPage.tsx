import { useState, useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { loadCollection, saveCollection, STORAGE_KEYS } from '../../data/localStore';
import {
  inventorySeed,
  lockerSeed,
  ordersSeed,
  nextId,
  getOrderItems,
  getOrderTotalQuantity,
  migratePantryOrder,
  type InventoryItem,
  type Locker,
  type PantryOrder,
} from '../../data/fakeData';
import { areLockerStoragesCompatible, describeLockerStorageGroup } from '../../data/lockerStorage';
import { useAuth } from '../../auth/useAuth';
import styles from './PantryOrderPage.module.css';

type Category = {
  name: string;
  items: InventoryItem[];
  icon: string;
  color: string;
  ordered: boolean;
  isDepleted: boolean;
  unavailableReason: 'none' | 'category-ordered' | 'no-matching-locker' | 'out-of-stock';
};

const categoryIcons: Record<string, { icon: string; color: string }> = {
  'Grains': { icon: '🌾', color: '#8B7355' },
  'Dairy': { icon: '🥛', color: '#E8D4B8' },
  'Protein': { icon: '🥚', color: '#D4A574' },
  'Vegetables': { icon: '🥕', color: '#E8A76F' },
  'Fruits': { icon: '🍌', color: '#F5D547' },
  'Bakery': { icon: '🍞', color: '#D2691E' },
  'Beverages': { icon: '🧃', color: '#FF9800' },
  'Pantry Essentials': { icon: '🫙', color: '#90A4AE' },
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

function migrateInventoryItem(item: Record<string, unknown>): InventoryItem {
  return {
    ...(item as InventoryItem),
    barcode: (item.barcode as string) ?? 'N/A',
    storageType: (item.storageType as InventoryItem['storageType']) ?? 'ambient',
  };
}

function findLockerForStorage(
  storageType: Locker['storageType'],
  order: PantryOrder | null,
  lockerById: Record<string, Locker>,
  availableLockers: Locker[],
  inventoryByName: Record<string, InventoryItem>,
) {
  if (order) {
    const existingLockerId = getOrderItems(order)
      .find((item) => {
        const itemStorage = inventoryByName[item.itemName]?.storageType ?? 'ambient';
        return areLockerStoragesCompatible(itemStorage, storageType);
      })?.lockerId;
    if (existingLockerId && lockerById[existingLockerId]) {
      return lockerById[existingLockerId];
    }
  }

  return availableLockers.find((locker) => areLockerStoragesCompatible(storageType, locker.storageType)) ?? null;
}

export default function PantryOrderPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<PantryOrder[]>(() =>
    loadCollection<PantryOrder[]>(STORAGE_KEYS.orders, ordersSeed).map(migratePantryOrder)
  );
  const [inventory] = useState<InventoryItem[]>(() =>
    loadCollection<InventoryItem[]>(STORAGE_KEYS.inventory, inventorySeed).map((item) => migrateInventoryItem(item as Record<string, unknown>))
  );
  const [lockers, setLockers] = useState<Locker[]>(() =>
    (() => {
      const loaded = loadCollection(STORAGE_KEYS.lockers, lockerSeed);
      const migrated = loaded.map((locker, index) => migrateLocker(locker, index));
      if (migrated.length > 0 && migrated.every((locker) => locker.storageType === 'ambient')) {
        return migrated.map((locker, index) => ({
          ...locker,
          storageType: pickRandomLockerStorageType(`${locker.id}-${index}`),
        }));
      }
      return migrated;
    })()
  );
  const [orderError, setOrderError] = useState<string | null>(null);

  const availableLockers = useMemo(
    () => lockers.filter((locker) => locker.status === 'available' && locker.currentOrderIds.length === 0),
    [lockers],
  );

  const hasAvailableLocker = availableLockers.length > 0;

  const storageLabels: Record<InventoryItem['storageType'], string> = {
    frozen: 'Frozen',
    refrigerated: 'Refrigerated',
    ambient: 'Ambient / Dry',
  };

  const inventoryByName = useMemo(() => {
    return Object.fromEntries(inventory.map((item) => [item.name, item]));
  }, [inventory]);

  const lockerById = useMemo(() => {
    return Object.fromEntries(lockers.map((locker) => [locker.id, locker]));
  }, [lockers]);

  // Get current week's orders for this user
  const currentWeekOrders = useMemo(() => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);

    return orders.filter((order) => {
      if (order.requesterName !== user?.name) return false;
      const orderDate = new Date(order.requestedAt);
      return orderDate >= weekStart;
    });
  }, [orders, user?.name]);

  const activeOrder = useMemo(() => {
    const sorted = [...currentWeekOrders].sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
    );
    return sorted.find((order) => order.status !== 'delivered') ?? null;
  }, [currentWeekOrders]);

  // Group categories by name and track which categories already have orders
  const categories = useMemo(() => {
    const grouped: Record<string, InventoryItem[]> = {};
    inventory.forEach((item) => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });

    const orderedItemNames = new Set(
      currentWeekOrders.flatMap((order) => getOrderItems(order).map((item) => item.itemName)),
    );

    return Object.entries(grouped).map(([name, items]) => {
      const hasOrder = items.some((item) => orderedItemNames.has(item.name));
      const isDepleted = items.every((item) => item.quantity === 0);
      const categoryStorage = items[0]?.storageType;

      let unavailableReason: Category['unavailableReason'] = 'none';
      if (hasOrder) {
        unavailableReason = 'category-ordered';
      } else if (isDepleted) {
        unavailableReason = 'out-of-stock';
      } else if (categoryStorage) {
        if (!findLockerForStorage(categoryStorage, activeOrder, lockerById, availableLockers, inventoryByName)) {
          unavailableReason = 'no-matching-locker';
        }
      }

      return {
        name,
        items,
        ordered: hasOrder,
        isDepleted,
        unavailableReason,
        ...categoryIcons[name],
      };
    }) as Category[];
  }, [activeOrder, availableLockers, currentWeekOrders, inventory, inventoryByName, lockerById]);

  const currentWeekItemsCount = useMemo(
    () => currentWeekOrders.reduce((sum, order) => sum + getOrderTotalQuantity(order), 0),
    [currentWeekOrders],
  );
  const canOrderMore = currentWeekItemsCount < 10;
  const remainingSlots = 10 - currentWeekItemsCount;

  const handleOrderCategory = (category: Category) => {
    if (!canOrderMore || !user) return;

    // Select first available item in category
    const selectedItem = category.items[0];
    if (!selectedItem) return;

    const targetLocker = findLockerForStorage(selectedItem.storageType, activeOrder, lockerById, availableLockers, inventoryByName);
    if (!targetLocker) {
      setOrderError(`No ${describeLockerStorageGroup(selectedItem.storageType)} locker is currently available.`);
      return;
    }

    if (activeOrder) {
      const activeOrderItems = getOrderItems(activeOrder);
      const alreadyOrderedCategory = activeOrderItems.some((entry) => {
        const inventoryItem = inventoryByName[entry.itemName];
        return inventoryItem?.category === category.name;
      });
      if (alreadyOrderedCategory) {
        setOrderError(`You already selected an item from ${category.name} in your current weekly order.`);
        return;
      }

      const currentLockers = new Set(activeOrderItems.map((item) => item.lockerId).filter(Boolean) as string[]);
      const needsReservation = !currentLockers.has(targetLocker.id);

      const updatedOrders = orders.map((order) =>
        order.id === activeOrder.id
          ? {
              ...order,
              items: [...activeOrderItems, { itemName: selectedItem.name, quantity: 1, lockerId: targetLocker.id }],
              lockerId: order.lockerId ?? targetLocker.id,
            }
          : order,
      );

      const nextLockers = needsReservation
        ? lockers.map((locker) =>
            locker.id === targetLocker.id
              ? {
                  ...locker,
                  status: 'reserved' as const,
                  currentOrderIds: Array.from(new Set([...locker.currentOrderIds, activeOrder.id])),
                  accessCode: createAccessCode(locker.id, activeOrder.id),
                  note: `Reserved for ${user.name}.`,
                }
              : locker,
          )
        : lockers;

      setOrderError(null);
      if (needsReservation) {
        setLockers(nextLockers);
        saveCollection(STORAGE_KEYS.lockers, nextLockers);
      }
      setOrders(updatedOrders);
      saveCollection(STORAGE_KEYS.orders, updatedOrders);
      return;
    }

    const newOrder: PantryOrder = {
      id: nextId('ord'),
      requesterName: user.name,
      requesterType: user.role as 'student' | 'teacher',
      items: [{ itemName: selectedItem.name, quantity: 1, lockerId: targetLocker.id }],
      status: 'approved',
      requestedAt: new Date().toISOString().split('T')[0],
      lockerId: targetLocker.id,
    };

    const nextLockers = lockers.map((locker) =>
      locker.id === targetLocker.id
        ? {
            ...locker,
            status: 'reserved' as const,
            currentOrderIds: [...locker.currentOrderIds, newOrder.id],
            accessCode: createAccessCode(locker.id, newOrder.id),
            note: `Reserved for ${user.name}.`,
          }
        : locker,
    );

    const updatedOrders = [newOrder, ...orders];
    setOrderError(null);
    setLockers(nextLockers);
    setOrders(updatedOrders);
    saveCollection(STORAGE_KEYS.lockers, nextLockers);
    saveCollection(STORAGE_KEYS.orders, updatedOrders);
  };

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>Weekly basket</span>
          <h1 className={styles.title}>Order from Pantry</h1>
          <p className={styles.subtitle}>
            Build one elegant weekly basket by choosing the items you need. Storage is matched automatically,
            so frozen items go frozen and refrigerated items stay refrigerated.
          </p>

          <div className={styles.heroPills}>
            <span className={styles.heroPill}>
              <strong>{currentWeekItemsCount}</strong>/10 items selected
            </span>
            <span className={styles.heroPill}>
              <strong>{remainingSlots}</strong> item{remainingSlots === 1 ? '' : 's'} left
            </span>
            <span className={styles.heroPill}>
              <strong>{categories.length}</strong> categories available
            </span>
          </div>
        </div>

        <div className={styles.heroPanel}>
          <div className={styles.quota}>
            <div className={styles.quotaInfo}>
              <p className={styles.quotaLabel}>Items This Week</p>
              <p className={styles.quotaValue}>{currentWeekItemsCount}/10</p>
            </div>
            <div className={styles.quotaBar}>
              <div
                className={styles.quotaFill}
                style={{ width: `${(currentWeekItemsCount / 10) * 100}%` }}
              />
            </div>
          </div>

          <div className={styles.heroNote}>
            <p className={styles.heroNoteLabel}>Smart placement</p>
            <p className={styles.heroNoteValue}>
              Items are grouped into the right storage locker type automatically.
            </p>
          </div>
        </div>
      </div>

      {!hasAvailableLocker && (
        <div className={styles.alert}>
          <span className={styles.alertIcon}>⚠️</span>
          <div>
            <p className={styles.alertTitle}>All Lockers Are Taken</p>
            <p className={styles.alertText}>No locker is available right now. Please wait until staff frees one.</p>
          </div>
        </div>
      )}

      {orderError && (
        <div className={styles.alert}>
          <span className={styles.alertIcon}>⚠️</span>
          <div>
            <p className={styles.alertTitle}>Reservation Unavailable</p>
            <p className={styles.alertText}>{orderError}</p>
          </div>
        </div>
      )}

      {!canOrderMore && (
        <div className={styles.alert}>
          <span className={styles.alertIcon}>⚠️</span>
          <div>
            <p className={styles.alertTitle}>Weekly Limit Reached</p>
            <p className={styles.alertText}>You've ordered 10 items this week. Come back next week to order more!</p>
          </div>
        </div>
      )}

      <div className={styles.categoriesGrid}>
        {categories.map((category) => {
          const alreadyOrdered = category.ordered;
          const isDisabled = category.unavailableReason !== 'none' || !canOrderMore;
          const availableCount = category.items.reduce((sum, item) => sum + item.quantity, 0);
          const storageType = category.items[0]?.storageType;

          return (
            <div
              key={category.name}
              className={`${styles.categoryCard} ${isDisabled ? styles.categoryCardDisabled : ''}`}
              style={{ '--category-accent': category.color } as CSSProperties}
            >
              <div className={styles.categoryTop}>
                <div className={styles.categoryHeader}>
                  <span className={styles.categoryIcon}>{category.icon}</span>
                  <div className={styles.categoryMeta}>
                    <h2 className={styles.categoryName}>{category.name}</h2>
                    <p className={styles.categoryHint}>{availableCount} total units available</p>
                  </div>
                </div>
                <div className={styles.categoryBadgeRow}>
                  {storageType && <span className={styles.storageBadge}>{storageLabels[storageType]}</span>}
                </div>
              </div>

              <div className={styles.categoryContent}>
                <div className={styles.itemsList}>
                  {category.items.map((item, idx) => (
                    <div key={item.id} className={styles.itemInfo}>
                      <div className={styles.itemInfoTop}>
                        <p className={styles.itemName}>{category.name} #{idx + 1}</p>
                        <span className={styles.itemCount}>{item.quantity}</span>
                      </div>
                      <p className={styles.itemDetail}>{item.quantity} {item.unit} available</p>
                    </div>
                  ))}
                </div>

                <div className={styles.statusBadge}>
                  {alreadyOrdered ? (
                    <>
                      <span className={styles.statusIcon}>✓</span>
                      <span className={styles.statusText}>Ordered</span>
                    </>
                  ) : category.unavailableReason === 'no-matching-locker' ? (
                    <>
                      <span className={styles.statusIcon}>○</span>
                      <span className={styles.statusText}>No matching locker</span>
                    </>
                  ) : category.isDepleted ? (
                    <>
                      <span className={styles.statusIcon}>○</span>
                      <span className={styles.statusText}>Out of Stock</span>
                    </>
                  ) : (
                    <>
                      <span className={styles.statusIcon}>●</span>
                      <span className={styles.statusText}>Available</span>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleOrderCategory(category)}
                disabled={isDisabled}
                className={`${styles.orderButton} ${isDisabled ? styles.orderButtonDisabled : ''}`}
              >
                {alreadyOrdered
                  ? 'Already Ordered'
                  : category.unavailableReason === 'no-matching-locker'
                    ? 'No Matching Locker'
                    : category.isDepleted
                      ? 'Out of Stock'
                      : 'Order Now'}
              </button>
            </div>
          );
        })}
      </div>

      <div className={styles.footer}>
        <Link to="/dashboard" className={styles.backLink}>
          ← Back to Dashboard
        </Link>
        <p className={styles.footerText}>
          {canOrderMore
            ? `You have ${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} remaining this week.`
            : 'Your weekly item quota is full. Check back next week!'}
        </p>
      </div>
    </section>
  );
}
