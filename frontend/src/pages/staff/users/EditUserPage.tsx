import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { PantryUser } from '../../../data/fakeData';
import { createPermissions, usersSeed } from '../../../data/fakeData';
import { loadCollection, saveCollection, STORAGE_KEYS } from '../../../data/localStore';
import styles from '../StaffPages.module.css';

type Draft = {
  name: string;
  email: string;
  role: PantryUser['role'];
  status: PantryUser['status'];
};

export default function EditUserPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [users, setUsers] = useState<PantryUser[]>(() => loadCollection(STORAGE_KEYS.users, usersSeed));

  const user = useMemo(() => users.find((entry) => entry.id === id), [users, id]);
  const isStudentOrTeacher = user?.role === 'student' || user?.role === 'teacher';

  const [draft, setDraft] = useState<Draft>(() => ({
    name: user?.name ?? '',
    email: user?.email ?? '',
    role: user?.role ?? 'student',
    status: user?.status ?? 'active',
  }));

  if (!user || !isStudentOrTeacher) {
    return (
      <section className={styles.page}>
        <article className={styles.card}>
          <h1 className={styles.title}>User Not Found</h1>
          <p className={styles.subtitle}>Only student and teacher accounts can be edited from this page.</p>
          <div className={styles.actions}>
            <Link to="/users" className={`${styles.button} ${styles.buttonGhost}`}>
              Back to Users
            </Link>
          </div>
        </article>
      </section>
    );
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.name.trim() || !draft.email.trim()) return;

    const next = users.map((entry) =>
      entry.id === user.id
        ? {
            ...entry,
            name: draft.name.trim(),
            email: draft.email.trim(),
            role: draft.role,
            status: draft.status,
            permissions: createPermissions(draft.role),
          }
        : entry,
    );

    setUsers(next);
    saveCollection(STORAGE_KEYS.users, next);
    navigate('/users', { state: { toast: 'User updated successfully.' } });
  };

  return (
    <section className={styles.page}>
      <header className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Edit User</h1>
          <p className={styles.subtitle}>Update user profile information and role.</p>
        </div>
      </header>

      <article className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input className={styles.input} value={draft.name} onChange={(e) => setDraft((v) => ({ ...v, name: e.target.value }))} required />
          <input
            className={styles.input}
            type="email"
            value={draft.email}
            onChange={(e) => setDraft((v) => ({ ...v, email: e.target.value }))}
            required
          />
          <select
            className={styles.select}
            value={draft.role}
            onChange={(e) => setDraft((v) => ({ ...v, role: e.target.value as PantryUser['role'] }))}
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
          <select
            className={styles.select}
            value={draft.status}
            onChange={(e) => setDraft((v) => ({ ...v, status: e.target.value as PantryUser['status'] }))}
          >
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
          <div className={styles.actions}>
            <button className={`${styles.button} ${styles.buttonPrimary}`} type="submit">
              Save Changes
            </button>
            <Link to="/users" className={`${styles.button} ${styles.buttonGhost}`}>
              Cancel
            </Link>
          </div>
        </form>
      </article>
    </section>
  );
}
