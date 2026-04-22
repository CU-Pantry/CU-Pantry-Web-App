import { useState } from 'react';
import { Link } from 'react-router-dom';
import { loadCollection, saveCollection, STORAGE_KEYS } from '../../data/localStore';
import { usersSeed, type PantryUser, type StaffPermissionKey } from '../../data/fakeData';
import styles from './StaffSettingsPage.module.css';

const permissionOrder: StaffPermissionKey[] = ['orders', 'inventory', 'lockers', 'users'];

export default function StaffSettingsPage() {
  const [users, setUsers] = useState<PantryUser[]>(() => loadCollection(STORAGE_KEYS.users, usersSeed));
  const staffUsers = users.filter((user) => user.role === 'staff');

  const changeStatus = (id: string, newStatus: PantryUser['status']) => {
    const nextUsers = users.map((user) => (user.id === id ? { ...user, status: newStatus } : user));
    setUsers(nextUsers);
    saveCollection(STORAGE_KEYS.users, nextUsers);
  };

  const togglePermission = (id: string, permission: StaffPermissionKey) => {
    const nextUsers = users.map((user) => {
      if (user.id !== id) return user;
      return {
        ...user,
        permissions: {
          ...user.permissions,
          [permission]: !user.permissions[permission],
        },
      };
    });

    setUsers(nextUsers);
    saveCollection(STORAGE_KEYS.users, nextUsers);
  };

  const deleteStaff = (id: string) => {
    const nextUsers = users.filter((user) => user.id !== id);
    setUsers(nextUsers);
    saveCollection(STORAGE_KEYS.users, nextUsers);
  };

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <div>
          <Link to="/dashboard" className={styles.backLink}>
            &larr; Back to Dashboard
          </Link>
          <h1 className={styles.title}>Manager: Staff Permissions</h1>
          <p className={styles.subtitle}>Control what each staff member can access in the platform.</p>
        </div>

        <Link to="/settings/staff/new" className={styles.addButton}>
          + Add Staff
        </Link>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.tableHeadRow}>
              <th>Name</th>
              <th>Email</th>
              <th>Permissions</th>
              <th>Access (Status)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staffUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <div className={styles.permissionsRow}>
                    {permissionOrder.map((permission) => {
                      const enabled = Boolean(user.permissions?.[permission]);
                      return (
                        <button
                          key={permission}
                          type="button"
                          onClick={() => togglePermission(user.id, permission)}
                          className={`${styles.permissionPill} ${enabled ? styles.permissionPillActive : ''}`}
                          aria-pressed={enabled}
                        >
                          {permission}
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td>
                  <select
                    value={user.status}
                    onChange={(event) => changeStatus(user.id, event.target.value as PantryUser['status'])}
                    className={`${styles.statusSelect} ${user.status === 'blocked' ? styles.statusBlocked : styles.statusActive}`}
                  >
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </td>
                <td>
                  <div className={styles.rowActions}>
                    <Link to={`/settings/staff/${user.id}/edit`} className={styles.editButton}>
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => deleteStaff(user.id)}
                      className={styles.deleteButton}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!staffUsers.length ? <p className={styles.empty}>No staff users yet. Use Add Staff to create one.</p> : null}
    </section>
  );
}
