export function Icon({ name = 'grid', size = 20, ...props }) {
  const paths = { grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z', folder: 'M3 7V4h6l2 3h10v13H3z', arrow: 'M5 12h14 M13 6l6 6-6 6', plus: 'M12 5v14 M5 12h14', code: 'M8 6l-6 6 6 6 M16 6l6 6-6 6 M14 3l-4 18', check: 'M5 12l4 4L19 6', shield: 'M12 2l9 4v6c0 5-9 10-9 10S3 17 3 12V6z M8 12l3 3 5-6', files: 'M8 3h10l3 3v13H8z M3 7v15h13', flag: 'M5 22V3h14l-3 5 3 5H5', menu: 'M4 6h16 M4 12h16 M4 18h16', close: 'M6 6l12 12 M6 18L18 6', logout: 'M9 3H3v18h6 M8 12h13 M16 7l5 5-5 5', search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6', upload: 'M12 16V3 M7 8l5-5 5 5 M4 15v6h16v-6', graph: 'M5 6l14 2-7 12z M3 4h4v4H3z M17 6h4v4h-4z M10 18h4v4h-4z' };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.grid} /></svg>;
}

export function Stats({ items }) {
  return <div className="stats-grid">{items.map(({ label, value, note, icon, tone }) => <section className={`stat-card ${tone || ''}`} key={label}><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon name={icon} /></span></div><strong className="stat-value">{value}</strong><span className="stat-note">{note}</span></section>)}</div>;
}

export function Loading({ label = 'Loading your workspace' }) {
  return <div role="status" aria-label={label} aria-busy="true"><span className="visually-hidden">{label}</span><div className="skeleton skeleton-title" /><div className="stats-grid">{[1,2,3,4].map(n => <div className="skeleton skeleton-card" key={n} />)}</div><div className="skeleton skeleton-panel" /></div>;
}

export function ErrorState({ message, onRetry }) {
  return <div className="error-state" role="alert"><Icon name="flag" /><div><strong>Something needs your attention</strong><p>{message}</p></div>{onRetry && <button className="btn btn-outline-secondary" onClick={onRetry}>Try again</button>}</div>;
}

export function Distribution({ matches }) {
  const bins = [0, 0, 0, 0, 0];
  matches.forEach(m => bins[Math.min(4, Math.max(0, Math.floor(Number(m.score) * 5)))]++);
  const max = Math.max(1, ...bins);
  return <section className="sheet distribution"><div className="section-heading"><div><span className="eyebrow">RESULT BREAKDOWN</span><h2>Similarity distribution</h2></div><span className="subtle-badge">{matches.length} pairs</span></div><p className="text-soft small">All compared pairs, including AI references when supplied.</p>{matches.length ? <div className="histogram" role="img" aria-label={bins.map((n,i) => `${i*20} to ${(i+1)*20}${i===4 ? ' percent inclusive' : ' percent exclusive'}: ${n} pairs`).join('; ')}>{bins.map((n,i) => <div className="hist-column" key={i}><span className="hist-count">{n}</span><div className="hist-track"><div className={`hist-bar bin-${i}`} style={{height:`${n/max*100}%`}} /></div><span className="hist-label">{i*20}–{(i+1)*20}%</span></div>)}</div> : <p className="empty-inline">No comparison scores are available yet.</p>}<p className="text-soft small mb-0 mt-3">Each interval excludes its upper bound; the final interval includes 100%.</p></section>;
}
