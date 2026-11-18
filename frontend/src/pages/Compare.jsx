import { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { Stats, Loading, ErrorState } from '../components/UI.jsx';

const pct = x => `${Math.round(x * 100)}%`;

function CodePane({ student, filename, code, lines, highlight }) {
  const pane = useRef(null);
  const all = code.replace(/\n$/, '').split('\n');
  const marked = new Set(lines.filter(n => all[n - 1]?.trim()));
  return <section className="sheet code-panel" aria-label={`Code by ${student}`}>
    <div className="code-header"><div><strong className="mono">{student}</strong><small className="code-filename">{filename}</small></div><span className="subtle-badge">{marked.size} / {all.length} lines match</span></div>
    <div className="code-toolbar"><span>Source code</span><button className="btn btn-sm btn-outline-secondary" disabled={!marked.size || !highlight} onClick={() => pane.current?.querySelector('.is-match')?.scrollIntoView({block:'center', behavior:'smooth'})}>First matching line ↓</button></div>
    <pre ref={pane} className="code" tabIndex={0} aria-label={`Scrollable source code for ${student}`}>
      {all.map((text, i) => <div key={i} className={`code-line ${highlight && marked.has(i + 1) ? 'is-match' : ''}`}><span className="n" aria-hidden="true">{i + 1}</span><span>{text || ' '}</span></div>)}
    </pre>
  </section>;
}

export default function Compare() {
  const { id, matchId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [highlight, setHighlight] = useState(true);
  const [retry, setRetry] = useState(0);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [members, setMembers] = useState([]);
  useEffect(() => {
    let active = true; setData(null); setError('');
    api(`/assignments/${id}/matches/${matchId}`).then(d => { if (active) { setData(d); setNote(d.match.note || ''); } }).catch(e => { if (active) setError(e.message); });
    api(`/assignments/${id}/members`).then(d => { if (active) setMembers(d.members); }).catch(() => {});
    return () => { active = false; };
  }, [id, matchId, retry]);
  if (error) return <ErrorState message={error} onRetry={() => setRetry(n => n + 1)} />;
  if (!data) return <Loading label="Loading code comparison" />;
  const { match: m, assignment } = data;
  async function saveReview(decision) {
    setSaving(true); setError(''); setNotice('');
    try {
      const { review } = await api(`/assignments/${id}/matches/${matchId}/review`, { method:'PUT', body:{ decision, note } });
      setData(d => ({ ...d, match:{ ...d.match, decision:review.decision, note:review.note } }));
      setNotice('Review saved.');
    } catch(e) { setError(e.message); } finally { setSaving(false); }
  }
  return <>
    <p className="breadcrumb-line"><Link to="/assignments">Assignments</Link><span>/</span><Link to={`/assignments/${id}`}>{assignment.title}</Link><span>/</span> Comparison</p>
    <span className="eyebrow">SIDE-BY-SIDE REVIEW</span><h1 className="mb-2"><span className="mono">{m.student_a}</span> <span className="text-soft">&</span> <span className="mono">{m.student_b}</span></h1>
    <p className="text-soft mb-4">Inspect the shared structure behind this match. Highlighted lines contain shared fingerprints.</p>
    {m.flagged && <section className="sheet p-3 mb-4" aria-label="Review decision"><h2>Review decision</h2><p className="text-soft">Current status: {m.decision || 'Awaiting review'}. Similarity alone is not a verdict.</p>{members.length > 0 && <div className="mb-3"><label htmlFor="assignee" className="form-label">Assign to team member</label><select id="assignee" className="form-select" value={m.assigned_to || ''} onChange={async e => { try { const { assigned_to } = await api(`/assignments/${id}/matches/${matchId}/assignee`, { method:'PUT', body:{ user_id:Number(e.target.value) } }); setData(d => ({ ...d, match:{ ...d.match, assigned_to } })); } catch(err) { setNotice(err.message); } }}><option value="">Choose reviewer</option>{members.map(u => <option value={u.id} key={u.id}>{u.name}</option>)}</select></div>}<label className="form-label" htmlFor="review-note">Review note (optional)</label><textarea id="review-note" className="form-control mb-3" maxLength={2000} rows={3} value={note} onChange={e => setNote(e.target.value)} /><div className="d-flex gap-2 flex-wrap"><button className="btn btn-ink" disabled={saving} onClick={() => saveReview('reviewed')}>Mark reviewed</button><button className="btn btn-outline-secondary" disabled={saving} onClick={() => saveReview('dismissed')}>Dismiss false positive</button></div>{notice && <p role="status" className="mt-2 mb-0">{notice}</p>}</section>}
    <Stats items={[
      {label:'Overall similarity', value:pct(m.score), note:m.flagged ? 'Flagged for review' : 'Not flagged by analysis', icon:'flag', tone:m.flagged ? 'attention' : ''},
      {label:'Shared fingerprints', value:pct(m.structural), note:'Normalised code structure', icon:'code'},
      {label:'Vector similarity', value:pct(m.semantic), note:'Similarity of code vectors', icon:'graph'},
      {label:'Review threshold', value:pct(assignment.threshold), note:'Saved analysis configuration', icon:'shield'},
    ]} />
    <div className="comparison-heading"><p><span className="match-key" /> Matching fingerprint lines <span className="text-soft">· Blank lines are not highlighted</span></p><label className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={highlight} onChange={e => setHighlight(e.target.checked)} /> Show highlights</label></div>
    <div className="compare"><CodePane student={m.student_a} filename={m.filename_a} highlight={highlight} code={m.code_a} lines={m.lines_a} /><CodePane student={m.student_b} filename={m.filename_b} highlight={highlight} code={m.code_b} lines={m.lines_b} /></div>
    <p className="text-soft small mt-3">Fingerprints normalise variable names, comments and formatting. Similarity alone does not establish misconduct; review the assignment context before drawing conclusions.</p>
    <button className="btn btn-outline-secondary mb-4" onClick={() => window.print()}>Print or save evidence as PDF</button>
  </>;
}
