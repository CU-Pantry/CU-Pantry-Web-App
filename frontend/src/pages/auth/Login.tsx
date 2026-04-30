import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { authApi } from '../../services/auth';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Username and password are required.');
      return;
    }

    setLoading(true);
    try {
      const user = await authApi.login({ username, password });

      // Map Django user to frontend AppUser format
      login({
        name: user.first_name
          ? `${user.first_name} ${user.last_name}`.trim()
          : user.username,
        email: user.email,
        role: mapRole(user.role),
      });

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    }
    setLoading(false);
  };

  // Map Django roles to frontend roles
  function mapRole(djangoRole: string): 'student' | 'staff' | 'manager' | 'teacher' {
  switch (djangoRole) {
    case 'admin':
      return 'manager';
    case 'manager':
      return 'manager';
    case 'volunteer':
      return 'staff';
    case 'student':
      return 'student';
    default:
      return 'staff';
  }
}
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg-primary)'
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        padding: '40px',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '400px',
        border: '1px solid var(--border-color)'
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '8px', textAlign: 'center' }}>
          Welcome back
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', textAlign: 'center' }}>
          Sign in to your pantry workspace
        </p>

        {error && (
          <div style={{
            color: 'var(--status-overdue)',
            marginBottom: '16px',
            background: 'var(--status-overdue-bg)',
            padding: '12px',
            borderRadius: '8px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="username" style={{ fontSize: '14px', fontWeight: 500 }}>
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
              required
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="password" style={{ fontSize: '14px', fontWeight: 500 }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px',
              background: 'var(--accent-primary)',
              color: 'white',
              borderRadius: '8px',
              fontWeight: 600,
              marginTop: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              border: 'none',
              fontSize: '15px',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-tertiary)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)' }}>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Demo credentials:</p>
          <p>Username: <strong>admin</strong></p>
          <p>Password: <strong>your admin password</strong></p>
        </div>
      </div>
    </div>
  );
}