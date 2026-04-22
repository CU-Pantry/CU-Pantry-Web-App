import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import type { PantryUser } from '../../../data/fakeData';
import { usersSeed } from '../../../data/fakeData';
import { loadCollection, saveCollection, STORAGE_KEYS } from '../../../data/localStore';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import SuccessToast from '../../../components/ui/SuccessToast';
import styles from '../StaffPages.module.css';

export default function UsersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [users, setUsers] = useState<PantryUser[]>(() => loadCollection(STORAGE_KEYS.users, usersSeed));
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<PantryUser | null>(null);

  useEffect(() => {
    saveCollection(STORAGE_KEYS.users, users);
  }, [users]);

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

  const userAccounts = useMemo(
    () => users.filter((item) => item.role === 'student' || item.role === 'teacher'),
    [users],
  );

  const roleSummary = useMemo(() => {
    return {
      students: userAccounts.filter((item) => item.role === 'student').length,
      teachers: userAccounts.filter((item) => item.role === 'teacher').length,
    };
  }, [userAccounts]);

  const confirmDelete = () => {
    if (!userToDelete) return;
    setUsers((current) => current.filter((row) => row.id !== userToDelete.id));
    setUserToDelete(null);
    setToastMessage('User deleted successfully.');
  };

  return (
    <section className={styles.page}>
      <header className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Users Management</h1>
          <p className={styles.subtitle}>Create and manage student and teacher accounts.</p>
        </div>
        <Link to="/users/new" className={`${styles.button} ${styles.buttonPrimary}`}>
          Add User
        </Link>
      </header>

      <article className={styles.card}>
        <div className={styles.grid}>
          <div className={styles.metric}>
            <p className={styles.metricLabel}>Students</p>
            <p className={styles.metricValue}>{roleSummary.students}</p>
          </div>
          <div className={styles.metric}>
            <p className={styles.metricLabel}>Teachers</p>
            <p className={styles.metricValue}>{roleSummary.teachers}</p>
          </div>
        </div>
      </article>

      <article className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {userAccounts.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={styles.badge}>{user.role}</span>
                  </td>
                  <td>
                    <span className={styles.badge}>{user.status}</span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Link className={styles.iconAction} to={`/users/${user.id}/edit`} title="Edit user" aria-label="Edit user">
                        <Pencil size={16} />
                      </Link>
                      <button
                        className={`${styles.iconAction} ${styles.iconDanger}`}
                        type="button"
                        onClick={() => setUserToDelete(user)}
                        title="Delete user"
                        aria-label="Delete user"
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
        {!userAccounts.length ? <p className={styles.empty}>No student or teacher users found.</p> : null}
      </article>

      <ConfirmDialog
        open={Boolean(userToDelete)}
        title="Delete user"
        message={`Are you sure you want to delete ${userToDelete?.name ?? 'this user'}?`}
        onCancel={() => setUserToDelete(null)}
        onConfirm={confirmDelete}
      />
      <SuccessToast message={toastMessage} />
    </section>
  );
}
