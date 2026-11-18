import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { Loading, ErrorState } from '../components/UI.jsx';
export default function Students() {
  const { ref } = useParams();
  const [data,setData]=useState(null), [error,setError]=useState('');
  useEffect(() => { setData(null); api(ref ? `/dashboard/students/${encodeURIComponent(ref)}` : '/dashboard/students').then(setData).catch(e => setError(e.message)); }, [ref]);
  if (error) return <ErrorState message={error} />;
  if (!data) return <Loading />;
  return <><h1>{ref ? `Student ${ref}` : 'Students'}</h1><p className="text-soft">Submission and match history across your assignments.</p>
    <div className="sheet table-responsive"><table className="table mb-0"><thead><tr>{(ref ? ['Assignment','Other submission','Similarity','Review'] : ['Student','Submissions','Assignments','Flagged matches']).map(x => <th key={x}>{x}</th>)}</tr></thead><tbody>{ref ? data.history.map((x,i) => <tr key={i}><td><Link to={`/assignments/${x.assignment_id}`}>{x.course_code} · {x.title}</Link></td><td>{x.other_student || '—'}</td><td>{x.score == null ? '—' : `${Math.round(x.score*100)}%`}</td><td>{x.match_id ? <Link to={`/assignments/${x.assignment_id}/compare/${x.match_id}`}>{x.decision || 'Open'}</Link> : '—'}</td></tr>) : data.students.map(s => <tr key={s.student_ref}><td><Link to={`/students/${encodeURIComponent(s.student_ref)}`}>{s.student_ref}</Link></td><td>{s.submissions}</td><td>{s.assignments}</td><td>{s.flagged_matches}</td></tr>)}</tbody></table></div></>;
}
