import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    login({ name: email.split('@')[0] || 'User', email });
    navigate('/dashboard');
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div style={{ background: 'var(--bg-secondary)', padding: '40px', borderRadius: '16px', width: '100%', maxWidth: '400px', border: '1px solid var(--border-color)' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '8px', textAlign: 'center' }}>Welcome back</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', textAlign: 'center' }}>Sign in to your pantry workspace</p>

        {error ? <div style={{ color: 'var(--status-overdue)', marginBottom: '16px', background: 'var(--status-overdue-bg)', padding: '12px', borderRadius: '8px' }}>{error}</div> : null}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="email" style={{ fontSize: '14px', fontWeight: 500 }}>Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '12px', borderRadius: '8px' }} required />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="password" style={{ fontSize: '14px', fontWeight: 500 }}>Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '12px', borderRadius: '8px' }} required />
          </div>
          <button type="submit" style={{ padding: '12px', background: 'var(--accent-primary)', color: 'white', borderRadius: '8px', fontWeight: 600, marginTop: '8px', cursor: 'pointer' }}>Sign In</button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px' }}>
          No account? <Link to="/signup" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Sign Up</Link>
        </div>
      </div>
    </div>
  );
}
