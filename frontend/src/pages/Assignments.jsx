import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stats, Icon, Loading, ErrorState } from '../components/UI.jsx';
import { api } from '../api.js';

export const STATUS_LABEL = { empty: 'No submissions', ready: 'Ready to analyse', analyzing: 'Analysing',
  done: 'Analysed', failed: 'Analysis failed' };

export default function Assignments() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [creating, setCreating] = useState(false);
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', course_code: '' });
  const [formError, setFormError] = useState('');
  const dialog = useRef(null);
  const navigate = useNavigate();

  function load() {
    setError('');
    api('/assignments').then((d) => setList(d.assignments)).catch((e) => setError(e.message));
  }
  useEffect(load, []);
  const filtered = (list || []).filter(a => (filter === 'all' || a.status === filter) && `${a.title} ${a.course_code}`.toLowerCase().includes(search.toLowerCase()));
  const completed = (list || []).filter(a => a.status === 'done');

  async function create(e) {
    e.preventDefault();
    setFormError(''); setCreating(true);
    try {
      const { assignment } = await api('/assignments', { method: 'POST', body: form });
      navigate(`/assignments/${assignment.id}`);
    } catch (err) { setFormError(err.message); } finally { setCreating(false); }
  }

  return (
    <>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
        <div><span className="eyebrow">ACADEMIC INTEGRITY WORKSPACE</span><h1 className="mb-2">A clearer view of every submission.</h1><p className="text-soft mb-0">Manage assignments, uncover similarities, and review the evidence.</p></div>
        <button className="btn btn-ink" onClick={() => dialog.current.showModal()}><Icon name="plus" size={18} /> New assignment</button>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {!list && !error && <Loading />}
      {list && <><Stats items={[
        {label:'Total assignments', value:list.length, note:'Across your workspace', icon:'folder'},
        {label:'Student submissions', value:list.reduce((n,a) => n + Number(a.submission_count), 0), note:'Across all assignments', icon:'files'},
        {label:'Analysed assignments', value:completed.length, note:'With completed results', icon:'check', tone:'positive'},
        {label:'Flagged pairs', value:completed.reduce((n,a) => n + Number(a.flagged_pairs),0), note:'Completed analyses · includes references', icon:'flag', tone:'attention'},
      ]} /><div className="overview-banner"><span className="banner-icon"><Icon name="shield" size={26} /></span><div><strong>From similarity to understanding.</strong><p>Upload a class, run an analysis, and inspect matching code side by side. Every flag deserves a human review.</p></div><span className="subtle-badge">Your review, your judgement</span></div></>}
      <section id="assignments" className="assignment-section">
      <div className="section-heading"><div><h2>Assignments</h2><p className="text-soft small mb-0">All your coursework, in one place.</p></div>{list && <span className="subtle-badge">{list.length} total</span>}</div>
      {list && list.length > 0 && <div className="table-toolbar"><div className="search-field"><Icon name="search" size={18} /><input aria-label="Search assignments" placeholder="Search assignment or course…" value={search} onChange={e => setSearch(e.target.value)} /></div><select className="form-select status-filter" aria-label="Filter assignments by status" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All statuses</option>{Object.entries(STATUS_LABEL).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></div>}
      {list && list.length === 0 && (
        <div className="sheet p-5 text-center">
          <p className="mb-1 fw-semibold">No assignments yet</p>
          <p className="text-soft mb-0">Create one, then upload a zip of the class's code to check it.</p>
        </div>
      )}
      {list && list.length > 0 && (
        <div className="sheet table-responsive">
          <table className="table mb-0">
            <thead><tr><th>Assignment</th><th>Course</th><th className="text-end">Submissions</th>
              <th className="text-end">Flagged pairs</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td><span className="assignment-icon"><Icon name="folder" size={18} /></span><Link to={`/assignments/${a.id}`} className="fw-semibold">{a.title}</Link></td>
                  <td className="mono">{a.course_code}</td>
                  <td className="text-end mono">{a.submission_count}</td>
                  <td className={`text-end score ${a.flagged_pairs ? 'is-flagged' : ''}`}>{a.status === 'done' ? a.flagged_pairs : '--'}</td>
                  <td><span className={`status status-${a.status}`}>{STATUS_LABEL[a.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>{filtered.length === 0 && <div className="empty-inline">No assignments match your search. Try another title or status.</div>}
        </div>
      )}

      </section>
      <dialog ref={dialog} aria-labelledby="new-title">
        <form onSubmit={create}>
          <h2 id="new-title" className="mb-3">New assignment</h2>
          <div className="mb-3">
            <label htmlFor="title" className="form-label">Title</label>
            <input id="title" required maxLength={120} autoFocus className="form-control" placeholder="Lab 3: Grade statistics" value={form.title}
                   onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="mb-3">
            <label htmlFor="course" className="form-label">Course code</label>
            <input id="course" required maxLength={20} className="form-control" placeholder="CSP301" value={form.course_code}
                   onChange={(e) => setForm({ ...form, course_code: e.target.value })} />
          </div>
          {formError && <div className="alert alert-danger py-2" role="alert">{formError}</div>}
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={() => dialog.current.close()}>Cancel</button>
            <button className="btn btn-ink" disabled={creating}>{creating ? 'Creating…' : 'Create assignment'}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
