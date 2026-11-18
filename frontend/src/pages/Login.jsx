import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/UI.jsx';
import { api, setToken } from '../api.js';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const creating = mode === 'register';

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const data = await api(`/auth/${mode}`, { method: 'POST', body: form });
      setToken(data.token);
      navigate('/');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <main className="auth-layout"><section className="auth-story"><div className="brand"><span className="brand-symbol"><Icon name="code" /></span>CodeTrace</div><div><span className="eyebrow">BUILT FOR ACADEMIC REVIEW</span><h2>Look beyond<br />the surface.</h2><p>Understand how code connects.<br />Make every review an informed one.</p><div className="auth-feature"><Icon name="files" /> One class. One organised workspace.</div><div className="auth-feature"><Icon name="graph" /> See connections between submissions.</div><div className="auth-feature"><Icon name="code" /> Review matching code, line by line.</div></div><small>Academic integrity starts with understanding.</small></section><section className="auth-form-wrap"><div className="auth-form">
      <span className="eyebrow">YOUR ACADEMIC WORKSPACE</span><p className="auth-title">{creating ? 'Start with clarity.' : 'Welcome back.'}</p>
      <p className="text-soft mb-4">Sign in to manage assignments and review code similarity.</p>
      <form onSubmit={submit} className="sheet p-4" noValidate>
        <h1 className="h5 mb-3">{creating ? 'Create an account' : 'Sign in'}</h1>
        {creating && (
          <div className="mb-3">
            <label htmlFor="name" className="form-label">Name</label>
            <input id="name" className="form-control" value={form.name} onChange={set('name')} autoComplete="name" />
          </div>
        )}
        <div className="mb-3">
          <label htmlFor="email" className="form-label">Email</label>
          <input id="email" type="email" className="form-control" value={form.email} onChange={set('email')} autoComplete="email" />
        </div>
        <div className="mb-3">
          <label htmlFor="password" className="form-label">Password</label>
          <input id="password" type="password" className="form-control" value={form.password} onChange={set('password')}
                 autoComplete={creating ? 'new-password' : 'current-password'} aria-describedby={creating ? 'pw-help' : undefined} />
          {creating && <div id="pw-help" className="form-text">At least 8 characters.</div>}
        </div>
        {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
        <button className="btn btn-ink w-100" disabled={busy}>{busy ? 'Please wait…' : creating ? 'Create account' : 'Sign in'}{!busy && <Icon name="arrow" size={17} />}</button>
      </form>
      <button className="btn btn-link px-0 mt-3" disabled={busy} onClick={() => { setMode(creating ? 'login' : 'register'); setError(''); }}>
        {creating ? 'I already have an account' : 'Create an account'}
      </button>
    </div></section></main>
  );
}
