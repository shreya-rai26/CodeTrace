import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Loading, ErrorState } from '../components/UI.jsx';
export default function ReviewQueue() {
  const [data,setData]=useState(null), [error,setError]=useState('');
  useEffect(() => { api('/dashboard').then(setData).catch(e => setError(e.message)); }, []);
  if (error) return <ErrorState message={error} />;
  if (!data) return <Loading />;
  return <><h1>Review queue</h1><p className="text-soft">Flagged pairs awaiting a teacher's decision.</p><div className="sheet table-responsive"><table className="table mb-0"><thead><tr><th>Course</th><th>Assignment</th><th>Students</th><th>Similarity</th><th></th></tr></thead><tbody>{data.queue.map(m => <tr key={m.match_id}><td>{m.course_code}</td><td>{m.title}</td><td>{m.student_a} / {m.student_b}</td><td>{Math.round(m.score*100)}%</td><td><Link to={`/assignments/${m.assignment_id}/compare/${m.match_id}`}>Review</Link></td></tr>)}</tbody></table>{!data.queue.length && <p className="p-3">Queue is clear.</p>}</div></>;
}
