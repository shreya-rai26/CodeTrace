import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, getToken } from '../api.js';
import { Stats, Distribution, Loading, ErrorState, Icon } from '../components/UI.jsx';
import CopyGraph from '../components/CopyGraph.jsx';
import { STATUS_LABEL } from './Assignments.jsx';

const pct = (x) => `${Math.round(x * 100)}%`;

export default function AssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [threshold, setThreshold] = useState(0.5);
  const [flaggedOnly, setFlaggedOnly] = useState(true);
  const fileInput = useRef(null);
  const refInput = useRef(null);
  const templateInput = useRef(null);
  const [template, setTemplate] = useState(null);
  const [runs, setRuns] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [members, setMembers] = useState([]);
  const [memberEmail, setMemberEmail] = useState('');
  const [preview, setPreview] = useState(null);
  const loadVersion = useRef(0);
  const thresholdLoadedFor = useRef(null);

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    try {
      const d = await api(`/assignments/${id}`);
      if (version !== loadVersion.current) return;
      setData(d); setError('');
      Promise.all([api(`/assignments/${id}/template`), api(`/assignments/${id}/runs`), api(`/assignments/${id}/reviews`), api(`/assignments/${id}/members`)]).then(([t,r,v,m]) => { if (version === loadVersion.current) { setTemplate(t.template); setRuns(r.runs); setReviews(v.reviews); setMembers(m.members); } }).catch(() => {});
      if (thresholdLoadedFor.current !== id) {
        setThreshold(d.assignment.threshold);
        thresholdLoadedFor.current = id;
      }
      return d;
    } catch (e) { if (version === loadVersion.current) setError(e.message); }
  }, [id]);

  useEffect(() => {
    setData(null); setError(''); thresholdLoadedFor.current = null; load();
    return () => { loadVersion.current++; };
  }, [load]);

  // While the analysis runs, ask for the result every 1.5 s.
  const status = data?.assignment.status;
  useEffect(() => {
    if (status !== 'analyzing') return undefined;
    const timer = setInterval(load, 1500);
    return () => clearInterval(timer);
  }, [status, load]);

  async function upload(file, kind = 'submissions') {
    if (!file || busy || status === 'analyzing') return;
    if (!file.name.toLowerCase().endsWith('.zip')) { setError('Choose a .zip file containing the submissions.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const form = new FormData();
      form.append('file', file);
      const r = await api(`/assignments/${id}/${kind}`, { method: 'POST', form });
      const what = kind === 'references' ? 'AI reference solutions. Run the analysis to compare students against them' : 'submissions';
      setNotice(`Uploaded ${r.uploaded} ${what}.` + (r.skipped.length ? ` Skipped: ${r.skipped.join(', ')}.` : ''));
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function previewUpload(file) {
    if (!file) return;
    setError(''); setPreview(null);
    try { const form = new FormData(); form.append('file', file); const result = await api(`/assignments/${id}/preview`, { method:'POST', form }); setPreview({ file, ...result }); }
    catch(e) { setError(e.message); }
  }
  async function uploadTemplate(file) {
    if (!file) return;
    setBusy(true); setError('');
    try { const form = new FormData(); form.append('file', file); await api(`/assignments/${id}/template`, { method:'PUT', form }); setNotice('Starter code saved. Run analysis again to apply it.'); await load(); }
    catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  async function addMember(e) {
    e.preventDefault(); setError('');
    try { await api(`/assignments/${id}/members`, { method:'POST', body:{ email:memberEmail } }); setMemberEmail(''); await load(); }
    catch(err) { setError(err.message); }
  }
  async function removeMember(userId) {
    try { await api(`/assignments/${id}/members/${userId}`, { method:'DELETE' }); await load(); }
    catch(err) { setError(err.message); }
  }

  async function analyse() {
    setBusy(true); setError(''); setNotice('');
    try {
      await api(`/assignments/${id}/analyze`, { method: 'POST', body: { threshold } });
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function removeReferences() {
    setBusy(true); setError(''); setNotice('');
    try { await api(`/assignments/${id}/references`, { method: 'DELETE' }); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm('Delete this assignment with all its submissions and results? This cannot be undone.')) return;
    try { await api(`/assignments/${id}`, { method: 'DELETE' }); navigate('/'); } catch (e) { setError(e.message); }
  }

  if (!data) return error ? <ErrorState message={error} onRetry={load} /> : <Loading label="Loading assignment" />;

  const { assignment: a, submissions, matches } = data;
  const name = Object.fromEntries(submissions.map((s) => [s.id, s.student_ref]));
  const students = submissions.filter((s) => !s.is_reference);
  const references = submissions.filter((s) => s.is_reference);
  const isRef = new Set(references.map((s) => s.id));
  // Who matches another student, and who matches an AI reference solution.
  const copied = new Set();
  const usedAi = new Set();
  matches.filter((m) => m.flagged).forEach((m) => {
    const [x, y] = [m.submission_a, m.submission_b];
    if (isRef.has(x)) usedAi.add(y);
    else if (isRef.has(y)) usedAi.add(x);
    else { copied.add(x); copied.add(y); }
  });
  const shown = flaggedOnly ? matches.filter((m) => m.flagged) : matches;
  const open = (matchId) => navigate(`/assignments/${id}/compare/${matchId}`);

  return (
    <>
      <p className="breadcrumb-line"><Link to="/">Workspace</Link><span>/</span><Link to="/assignments">Assignments</Link><span>/</span> Assignment review</p>
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
        <div>
          <h1 className="mb-1">{a.title}</h1>
          <p className="text-soft mb-0"><span className="mono">{a.course_code}</span>, {students.length} submissions
            {references.length > 0 && <>, {references.length} AI reference{references.length > 1 ? 's' : ''}</>}{' '}
            <span className={`status status-${a.status} ms-1`}>{STATUS_LABEL[a.status]}</span></p>
        </div>
        <button className="btn btn-sm btn-outline-danger" disabled={busy || a.status === 'analyzing'} onClick={remove}>Delete assignment</button>
      </div>

      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {notice && <div className="alert alert-success" role="status">{notice}</div>}
      {a.status === 'failed' && <div className="alert alert-danger" role="alert">{a.error}</div>}

      <ol className="workflow" aria-label="Analysis workflow">
        <li className={students.length ? 'complete' : 'current'}><span>{students.length ? <Icon name="check" size={16} /> : '01'}</span><div><strong>Upload submissions</strong><small>{students.length ? `${students.length} student files ready` : 'Start with a ZIP of source files'}</small></div></li>
        <li className={a.status === 'done' ? 'complete' : students.length ? 'current' : ''}><span>{a.status === 'done' ? <Icon name="check" size={16} /> : '02'}</span><div><strong>Run similarity analysis</strong><small>Set a threshold and compare</small></div></li>
        <li className={a.status === 'done' ? 'current' : ''}><span>03</span><div><strong>Review the evidence</strong><small>Explore matches side by side</small></div></li>
      </ol>
      {a.status === 'empty' && (
        <div className={`dropzone ${over ? 'is-over' : ''}`}
             onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
             onDrop={(e) => { e.preventDefault(); setOver(false); previewUpload(e.dataTransfer.files[0]); }}>
          <span className="upload-symbol"><Icon name="upload" size={28} /></span><p className="fw-semibold mb-1">Upload the class's submissions</p>
          <p className="text-soft">One zip with a file or a folder per student, named by roll number.<br />
            Python, C, C++, Java and JavaScript files are read.</p>
          <button className="btn btn-ink" disabled={busy} onClick={() => fileInput.current.click()}>{busy ? 'Uploading…' : 'Choose ZIP file'}</button><p className="small text-soft mt-3 mb-0">or drag and drop here · ZIP up to 20 MB</p>
        </div>
      )}
      <input ref={fileInput} type="file" accept=".zip" hidden
             onChange={(e) => { previewUpload(e.target.files[0]); e.target.value = ''; }} />
      <input ref={refInput} type="file" accept=".zip" hidden
             onChange={(e) => { upload(e.target.files[0], 'references'); e.target.value = ''; }} />
      <input ref={templateInput} type="file" accept=".py,.c,.h,.cpp,.cc,.hpp,.java,.js,.ts" hidden onChange={e => { uploadTemplate(e.target.files[0]); e.target.value = ''; }} />
      {preview && <section className="sheet p-3 mb-4"><h2>Check upload before replacing submissions</h2><p>{preview.submissions.length} detected students · {preview.skipped.length} skipped files</p><div className="preview-list">{preview.submissions.map(s => <span key={s.student_ref}>{s.student_ref} · {s.filename} ({s.loc} lines)</span>)}</div>{preview.skipped.length > 0 && <p className="text-soft small">Skipped: {preview.skipped.join(', ')}</p>}<div className="d-flex gap-2 mt-3"><button className="btn btn-ink" disabled={busy || preview.submissions.length < 2} onClick={async () => { await upload(preview.file); setPreview(null); }}>Confirm upload</button><button className="btn btn-outline-secondary" onClick={() => setPreview(null)}>Cancel</button></div></section>}

      {a.status !== 'empty' && (
        <div className="sheet analysis-controls p-4 mb-4 d-flex flex-wrap align-items-end gap-3">
          <div style={{ minWidth: '16rem' }}>
            <label htmlFor="threshold" className="form-label mb-1">
              Flag pairs that are at least <strong className="mono">{pct(threshold)}</strong> similar</label>
            <input id="threshold" type="range" className="form-range" min="0.05" max="1" step="0.05" disabled={busy || a.status === 'analyzing'} value={threshold}
                   onChange={(e) => setThreshold(Number(e.target.value))} />
          </div>
          <button className="btn btn-ink" disabled={busy || a.status === 'analyzing'} onClick={analyse}>
            {a.status === 'analyzing' ? 'Analysing...' : a.status === 'done' ? 'Run analysis again' : 'Run analysis'}</button>
          <button className="btn btn-outline-secondary" disabled={busy || a.status === 'analyzing'}
                  onClick={() => fileInput.current.click()}>Replace submissions</button>
          <button className="btn btn-outline-secondary" disabled={busy || a.status === 'analyzing'} onClick={() => templateInput.current.click()}>{template ? `Replace starter code (${template.filename})` : 'Add starter code'}</button>
          <button className="btn btn-outline-secondary" disabled={busy || a.status === 'analyzing'}
                  onClick={() => refInput.current.click()}>
            {references.length ? 'Replace AI references' : 'Add AI reference solutions'}</button>
          {references.length > 0 && (
            <button className="btn btn-link px-0" disabled={busy || a.status === 'analyzing'} onClick={removeReferences}>
              Remove AI references</button>
          )}
          <p className="text-soft small mb-0 w-100">
            AI references: ask an AI tool to solve the assignment a few times, zip the answers and add them here.
            Students whose code matches one are listed separately.</p>
        </div>
      )}

      {a.status === 'analyzing' && <p role="status" className="analysis-progress"><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Comparing every pair of submissions. This page updates by itself.</p>}

      {a.status === 'done' && (
        <>
          <Stats items={[
            {label:'Student submissions', value:students.length, note:`${references.length} AI reference solutions`, icon:'files'},
            {label:'Compared pairs', value:matches.length, note:'All pairs returned by analysis', icon:'code'},
            {label:'Flagged pairs', value:matches.filter(m => m.flagged).length, note:`At the saved ${pct(a.threshold)} threshold`, icon:'flag', tone:'attention'},
            {label:'Similarity groups', value:data.clusters.length, note:'Connected groups from analysis', icon:'graph'},
          ]} />
          <section className="review-summary mb-4">
            <p className="fs-5 mb-1">
              {copied.size === 0
                ? 'No two students crossed the threshold.'
                : <><strong>{copied.size} of {students.length} students</strong> have code matching another student.</>}
              {references.length > 0 && (usedAi.size === 0
                ? ' No student matches an AI reference.'
                : <> <strong>{usedAi.size}</strong> match{usedAi.size === 1 ? 'es' : ''} an AI reference solution.</>)}
            </p>
            <p className="text-soft small mb-0">A match is a reason to look, not proof. Open a pair to read the two files side by side before deciding.
              Analysis took {a.analysis_ms} ms ({a.embedding_backend === 'codebert' ? 'CodeBERT' : 'TF-IDF'} vectors).</p>
          </section>

          <div className="results-visuals">
          <section className="sheet graph-panel">
            <span className="eyebrow">CONNECTIONS</span><h2>Similarity network</h2>
            <p className="text-soft small">Coloured dots share a group. Dark squares are AI reference solutions. Select a line to compare the two files.</p>
            <div className="graph-wrap"><CopyGraph submissions={submissions} matches={matches} onOpen={open} /></div>
          </section>

          <Distribution matches={matches} />
          </div>
          <section className="sheet">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 pb-2">
              <h2 className="mb-0">Match results <span className="subtle-badge ms-2">{shown.length}</span></h2>
              <div className="form-check form-switch mb-0">
                <input id="flagged-only" type="checkbox" className="form-check-input" checked={flaggedOnly}
                       onChange={(e) => setFlaggedOnly(e.target.checked)} />
                <label htmlFor="flagged-only" className="form-check-label">Flagged only</label>
              </div>
            </div>
            {shown.length === 0 ? <p className="text-soft px-3 pb-3 mb-0">No pairs to show. Turn off "Flagged only" to see weaker matches.</p> : (
              <div className="table-responsive">
                <table className="table mb-0">
                  <thead><tr><th>Submission A</th><th>Submission B</th><th>Similarity</th><th><span className="visually-hidden">Similarity bar</span></th>
                    <th className="text-end">Shared fingerprints</th><th className="text-end">Vector similarity</th></tr></thead>
                  <tbody>
                    {shown.map((m) => (
                      <tr key={m.id} className="row-link" onClick={() => open(m.id)}>
                        <td className="mono">{name[m.submission_a]}</td>
                        <td className="mono">{name[m.submission_b]}</td>
                        <td className={`score ${m.flagged ? 'is-flagged' : ''}`}>
                          <Link to={`/assignments/${id}/compare/${m.id}`} aria-label={`Compare ${name[m.submission_a]} and ${name[m.submission_b]}, ${pct(m.score)} similar`} className="text-reset" onClick={(e) => e.stopPropagation()}>{pct(m.score)}</Link></td>
                        <td><div className={`scorebar ${m.flagged ? 'is-flagged' : ''}`}><span style={{ width: pct(m.score) }} /></div></td>
                        <td className="text-end mono">{pct(m.structural)}</td>
                        <td className="text-end mono">{pct(m.semantic)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="sheet p-3 mt-4"><div className="section-heading"><h2>Evidence and run history</h2><a href={`${(import.meta.env.VITE_API_URL || '')}/api/assignments/${id}/export.csv`} onClick={async e => { e.preventDefault(); try { const response = await fetch(`${(import.meta.env.VITE_API_URL || '')}/api/assignments/${id}/export.csv`, { headers:{ Authorization:`Bearer ${getToken()}` } }); if (!response.ok) throw new Error('Export failed'); const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href=url; link.download=`codetrace-assignment-${id}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch(err) { setError(err.message); } }}>Export CSV</a></div><p className="text-soft small">Each re-analysis has a saved summary. Reviews from earlier runs remain below.</p><ul>{runs.map(r => <li key={r.id}>{new Date(r.started_at).toLocaleString()} · {r.status} · threshold {Math.round(Number(r.threshold)*100)}% · {r.flagged_count ?? '—'} flags</li>)}</ul><h3>Review history</h3><ul>{reviews.map((r,i) => <li key={i}>{r.student_a} / {r.student_b} · {r.decision} · {new Date(r.reviewed_at).toLocaleString()}</li>)}</ul></section>
        </>
      )}
      <section className="sheet p-3 mt-4"><h2>Teaching team</h2><form onSubmit={addMember} className="d-flex gap-2 flex-wrap"><label className="visually-hidden" htmlFor="member-email">Teacher or TA email</label><input id="member-email" className="form-control" style={{maxWidth:300}} type="email" required placeholder="Teacher or TA email" value={memberEmail} onChange={e => setMemberEmail(e.target.value)} /><button className="btn btn-outline-secondary">Add reviewer</button></form><ul className="mt-3 mb-0">{members.map(m => <li key={m.id}>{m.name} ({m.email}) <button className="btn btn-sm btn-link" onClick={() => removeMember(m.id)}>Remove</button></li>)}</ul></section>
    </>
  );
}
