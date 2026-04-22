import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { PantryUser } from '../../../data/fakeData';
import { createPermissions, nextId, usersSeed } from '../../../data/fakeData';
import { loadCollection, saveCollection, STORAGE_KEYS } from '../../../data/localStore';
import styles from '../StaffPages.module.css';

type Draft = {
  name: string;
  email: string;
  role: PantryUser['role'];
  status: PantryUser['status'];
};

const initialDraft: Draft = {
  name: '',
  email: '',
  role: 'student',
  status: 'active',
};

export default function CreateUserPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(initialDraft);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.email.trim()) return;

    const newUser: PantryUser = {
      id: nextId('usr'),
      name: draft.name.trim(),
      email: draft.email.trim(),
      role: draft.role,
      status: draft.status,
      permissions: createPermissions(draft.role),
    };

    const current = loadCollection<PantryUser[]>(STORAGE_KEYS.users, usersSeed);
    saveCollection(STORAGE_KEYS.users, [newUser, ...current]);
    navigate('/users', { state: { toast: 'User created successfully.' } });
  };

  return (
    <section className={styles.page}>
      <header className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Add User</h1>
          <p className={styles.subtitle}>Create student and teacher accounts.</p>
        </div>
      </header>

      <article className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            placeholder="Full Name"
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            required
          />
          <input
            className={styles.input}
            type="email"
            placeholder="Email"
            value={draft.email}
            onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
            required
          />
          <select
            className={styles.select}
            value={draft.role}
            onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value as PantryUser['role'] }))}
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
          <select
            className={styles.select}
            value={draft.status}
            onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as PantryUser['status'] }))}
          >
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
          <div className={styles.actions}>
            <button className={`${styles.button} ${styles.buttonPrimary}`} type="submit">
              Save User
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
