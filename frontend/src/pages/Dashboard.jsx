import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Stats, Loading, ErrorState } from '../components/UI.jsx';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = () => api('/dashboard').then(setData).catch(e => setError(e.message));
  useEffect(() => { load(); const timer = setInterval(load, 15000); return () => clearInterval(timer); }, []);
  if (error) return <ErrorState message={error} onRetry={() => { setError(''); load(); }} />;
  if (!data) return <Loading />;
  const { totals, queue, activity, assignments, bins } = data;
  const counts = [0, 0, 0, 0, 0];
  bins.forEach(({ bin, count }) => { counts[bin] = count; });
  const max = Math.max(1, ...counts);
  return <>
    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
      <div><span className="eyebrow">INSTRUCTOR OVERVIEW</span><h1 className="mb-1">Your classes at a glance</h1><p className="text-soft mb-0">Review similarity evidence and follow recent work.</p></div>
      <Link className="btn btn-ink" to="/assignments">Manage assignments</Link>
    </div>
    <Stats items={[
      { label:'Assignments', value:totals.assignments, icon:'folder', note:'In your workspace' },
      { label:'Submissions', value:totals.submissions, icon:'files', note:'Student files' },
      { label:'Flagged pairs', value:totals.flagged, icon:'flag', note:'Similarity flags', tone:'attention' },
      { label:'Awaiting review', value:totals.awaiting_review, icon:'shield', note:'Flagged pairs without a decision', tone:'attention' },
    ]} />
    <div className="dashboard-grid">
      <section className="sheet dashboard-panel"><div className="section-heading"><div><h2>Needs your review</h2><p className="text-soft small">Highest similarity pairs awaiting a decision</p></div><Link to="/review">View queue</Link></div>
        {queue.length ? <div className="table-responsive"><table className="table mb-0"><thead><tr><th>Assignment</th><th>Students</th><th>Similarity</th><th>Action</th></tr></thead><tbody>
          {queue.slice(0, 5).map(m => <tr key={m.match_id}><td>{m.course_code} · {m.title}</td><td className="mono">{m.student_a} / {m.student_b}</td><td>{Math.round(m.score * 100)}%</td><td><Link to={`/assignments/${m.assignment_id}/compare/${m.match_id}`}>Review</Link></td></tr>)}
        </tbody></table></div> : <p className="text-soft">No flagged pairs awaiting review.</p>}
      </section>
      <section className="sheet dashboard-panel"><h2>Notifications & recent activity</h2><p className="text-soft small">Updates automatically while this page is open.</p><ul className="activity-list">{activity.map((e,i) => <li key={i}><Link to={`/assignments/${e.assignment_id}`}>{e.course_code} · {e.title}</Link><small>{e.kind.replaceAll('_',' ')} {e.detail && `· ${e.detail}`} · {new Date(e.created_at).toLocaleString()}</small></li>)}</ul>{!activity.length && <p className="text-soft">No activity yet.</p>}</section>
      <section className="sheet dashboard-panel"><div className="section-heading"><h2>Your assignments</h2><Link to="/assignments">View all</Link></div><ul className="activity-list">{assignments.slice(0, 5).map(a => <li key={a.id}><Link to={`/assignments/${a.id}`}>{a.course_code} · {a.title}</Link><small>{a.submission_count} submissions · {a.flagged_pairs} flagged pairs · {a.status}</small></li>)}</ul></section>
      <section className="sheet dashboard-panel"><h2>Similarity distribution</h2><p className="text-soft small">Current matches across your assignments</p><div className="histogram" role="img" aria-label={counts.map((n,i) => `${i*20} to ${(i+1)*20} percent: ${n} pairs`).join('; ')}>{counts.map((n,i) => <div className="hist-column" key={i}><span className="hist-count">{n}</span><div className="hist-track"><div className={`hist-bar bin-${i}`} style={{height:`${n/max*100}%`}} /></div><span className="hist-label">{i*20}–{(i+1)*20}%</span></div>)}</div><p className="text-soft small mt-3">Similarity is evidence for review, not a verdict.</p></section>
    </div>
  </>;
}
