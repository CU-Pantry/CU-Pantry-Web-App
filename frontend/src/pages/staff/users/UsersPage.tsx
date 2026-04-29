import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usersApi, type AppUser } from '../../../services/api';
import SuccessToast from '../../../components/ui/SuccessToast';
import styles from '../StaffPages.module.css';

const roleLabels: Record<string, string> = {
  student: 'Student',
  volunteer: 'Volunteer',
  manager: 'Manager',
  admin: 'Admin',
};

export default function UsersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    usersApi.getAll()
      .then(setUsers)
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

  const roleSummary = useMemo(() => ({
    students: users.filter((u) => u.role === 'student').length,
    volunteers: users.filter((u) => u.role === 'volunteer').length,
    managers: users.filter((u) => u.role === 'manager').length,
    admins: users.filter((u) => u.role === 'admin').length,
  }), [users]);

  if (loading) return <section className={styles.page}><p>Loading users...</p></section>;
  if (error) return <section className={styles.page}><p style={{ color: 'red' }}>Error: {error}</p></section>;

  return (
    <section className={styles.page}>
      <header className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Users Management</h1>
          <p className={styles.subtitle}>All registered users in the system.</p>
        </div>
      </header>

      <article className={styles.card}>
        <div className={styles.grid}>
          <div className={styles.metric}>
            <p className={styles.metricLabel}>Students</p>
            <p className={styles.metricValue}>{roleSummary.students}</p>
          </div>
          <div className={styles.metric}>
            <p className={styles.metricLabel}>Volunteers</p>
            <p className={styles.metricValue}>{roleSummary.volunteers}</p>
          </div>
          <div className={styles.metric}>
            <p className={styles.metricLabel}>Managers</p>
            <p className={styles.metricValue}>{roleSummary.managers}</p>
          </div>
          <div className={styles.metric}>
            <p className={styles.metricLabel}>Admins</p>
            <p className={styles.metricValue}>{roleSummary.admins}</p>
          </div>
        </div>
      </article>

      <article className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.email || '—'}</td>
                  <td>{[user.first_name, user.last_name].filter(Boolean).join(' ') || '—'}</td>
                  <td>
                    <span className={styles.badge}>{roleLabels[user.role] ?? user.role}</span>
                  </td>
                  <td>
                    <span className={styles.badge}>
                      {user.is_active ? '✅ Active' : '❌ Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!users.length && <p className={styles.empty}>No users found.</p>}
      </article>

      <SuccessToast message={toastMessage} />
    </section>
  );
}