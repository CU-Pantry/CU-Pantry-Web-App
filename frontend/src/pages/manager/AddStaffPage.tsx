import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPermissions, nextId, usersSeed, type PantryUser, type StaffPermissionKey } from '../../data/fakeData';
import { loadCollection, saveCollection, STORAGE_KEYS } from '../../data/localStore';
import styles from './StaffSettingsPage.module.css';

type Draft = {
  name: string;
  email: string;
  status: PantryUser['status'];
  permissions: Record<StaffPermissionKey, boolean>;
};

const permissionOrder: StaffPermissionKey[] = ['orders', 'inventory', 'lockers', 'users'];

const initialDraft: Draft = {
  name: '',
  email: '',
  status: 'active',
  permissions: createPermissions('staff'),
};

export default function AddStaffPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(initialDraft);

  const togglePermission = (permission: StaffPermissionKey) => {
    setDraft((current) => ({
      ...current,
      permissions: {
        ...current.permissions,
        [permission]: !current.permissions[permission],
      },
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.email.trim()) return;

    const current = loadCollection<PantryUser[]>(STORAGE_KEYS.users, usersSeed);

    const created: PantryUser = {
      id: nextId('usr'),
      name: draft.name.trim(),
      email: draft.email.trim(),
      role: 'staff',
      status: draft.status,
      permissions: draft.permissions,
    };

    saveCollection(STORAGE_KEYS.users, [created, ...current]);
    navigate('/settings/staff', { state: { toast: 'Staff member created successfully.' } });
  };

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <div>
          <Link to="/settings/staff" className={styles.backLink}>
            &larr; Back to Staff Settings
          </Link>
          <h1 className={styles.title}>Add Staff Member</h1>
          <p className={styles.subtitle}>Create a staff account and choose exactly which modules this person can access.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={`${styles.tableWrap} ${styles.addForm}`}>
        <div className={styles.fieldsGrid}>
          <input
            value={draft.name}
            onChange={(e) => setDraft((current) => ({ ...current, name: e.target.value }))}
            placeholder="Staff full name"
            className={styles.input}
            required
          />
          <input
            type="email"
            value={draft.email}
            onChange={(e) => setDraft((current) => ({ ...current, email: e.target.value }))}
            placeholder="staff@pantry.org"
            className={styles.input}
            required
          />
          <select
            value={draft.status}
            onChange={(e) => setDraft((current) => ({ ...current, status: e.target.value as PantryUser['status'] }))}
            className={`${styles.statusSelect} ${draft.status === 'blocked' ? styles.statusBlocked : styles.statusActive}`}
          >
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>

        <div>
          <p className={styles.sectionLabel}>Module Permissions</p>
          <div className={styles.permissionsRow}>
            {permissionOrder.map((permission) => {
              const active = Boolean(draft.permissions[permission]);
              return (
                <button
                  key={permission}
                  type="button"
                  onClick={() => togglePermission(permission)}
                  className={`${styles.permissionPill} ${active ? styles.permissionPillActive : ''}`}
                >
                  {permission}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.addButton}>Create Staff</button>
          <Link to="/settings/staff" className={styles.cancelButton}>Cancel</Link>
        </div>
      </form>
    </section>
  );
}
