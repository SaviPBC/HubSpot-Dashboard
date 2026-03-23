import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/auth/local/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      navigate('/');
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <span className={styles.icon}>📊</span>
        <h1 className={styles.title}>HubSpot Dashboard</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className={styles.input}
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className={styles.input}
            autoComplete="current-password"
          />
          {error && <div className={styles.error}>{error}</div>}
          <button type="submit" disabled={loading} className={styles.submitButton}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className={styles.divider}><span>or</span></div>

        <a href="/auth/login" className={styles.button}>
          Sign in with Google
        </a>
      </div>
    </div>
  );
}
