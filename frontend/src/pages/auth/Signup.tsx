import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSignup = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!name || !email || !password) {
      setError('All fields are required.');
      return;
    }

    login({ name, email });
    navigate('/dashboard');
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div style={{ background: 'var(--bg-secondary)', padding: '40px', borderRadius: '16px', width: '100%', maxWidth: '500px', border: '1px solid var(--border-color)' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '8px', textAlign: 'center' }}>Create account</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', textAlign: 'center' }}>Build your pantry website workspace</p>

        {error ? <div style={{ color: 'var(--status-overdue)', marginBottom: '16px', background: 'var(--status-overdue-bg)', padding: '12px', borderRadius: '8px' }}>{error}</div> : null}

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500 }}>Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: '10px', borderRadius: '8px' }} required />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500 }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '10px', borderRadius: '8px' }} required />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500 }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '10px', borderRadius: '8px' }} required />
          </div>
          <button type="submit" style={{ padding: '12px', background: 'var(--accent-primary)', color: 'white', borderRadius: '8px', fontWeight: 600, marginTop: '8px', cursor: 'pointer' }}>Create Account</button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px' }}>
          Already have an account? <Link to="/signin" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}
