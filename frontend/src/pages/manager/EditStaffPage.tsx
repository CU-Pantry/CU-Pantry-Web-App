import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usersSeed, type PantryUser, type StaffPermissionKey } from '../../data/fakeData';
import { loadCollection, saveCollection, STORAGE_KEYS } from '../../data/localStore';
import styles from './StaffSettingsPage.module.css';

type Draft = {
  name: string;
  email: string;
  status: PantryUser['status'];
  permissions: Record<StaffPermissionKey, boolean>;
};

const permissionOrder: StaffPermissionKey[] = ['orders', 'inventory', 'lockers', 'users'];

export default function EditStaffPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [users] = useState<PantryUser[]>(() => loadCollection(STORAGE_KEYS.users, usersSeed));
  const staffUser = users.find((u) => u.id === id);

  const [draft, setDraft] = useState<Draft>(() => {
    if (!staffUser) {
      return { name: '', email: '', status: 'active', permissions: {} as Record<StaffPermissionKey, boolean> };
    }
    return {
      name: staffUser.name,
      email: staffUser.email,
      status: staffUser.status,
      permissions: staffUser.permissions,
    };
  });

  if (!staffUser) {
    return (
      <section className={styles.page}>
        <p className={styles.empty}>Staff member not found. <Link to="/settings/staff">Back to Staff Settings</Link></p>
      </section>
    );
  }

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

    const updated = current.map((user) =>
      user.id === id
        ? {
            ...user,
            name: draft.name.trim(),
            email: draft.email.trim(),
            status: draft.status,
            permissions: draft.permissions,
          }
        : user
    );

    saveCollection(STORAGE_KEYS.users, updated);
    navigate('/settings/staff', { state: { toast: 'Staff member updated successfully.' } });
  };

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <div>
          <Link to="/settings/staff" className={styles.backLink}>
            &larr; Back to Staff Settings
          </Link>
          <h1 className={styles.title}>Edit Staff Member</h1>
          <p className={styles.subtitle}>Update this staff member's details and module permissions.</p>
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
          <button type="submit" className={styles.addButton}>Save Changes</button>
          <Link to="/settings/staff" className={styles.cancelButton}>Cancel</Link>
        </div>
      </form>
    </section>
  );
}
