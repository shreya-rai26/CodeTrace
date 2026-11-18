import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force';
import { useMemo } from 'react';

const W = 720, H = 420;
const RING_COLORS = ['#6b65b5', '#278b88', '#b47740', '#527cb5', '#a56898', '#718c4f'];

/**
 * Students are dots, a line joins two students whose code is similar.
 * Solid indigo lines are flagged pairs. Selecting a line opens the comparison.
 */
export default function CopyGraph({ submissions, matches, onOpen }) {
  const { nodes, links, ringColor } = useMemo(() => {
    const nodes = submissions.map((s) => ({ ...s }));
    const links = matches.filter((m) => m.flagged || m.score >= 0.3)
      .map((m) => ({ ...m, source: m.submission_a, target: m.submission_b }));
    const rings = [...new Set(submissions.filter((s) => !s.is_reference).map((s) => s.cluster_id).filter(Boolean))];
    const ringColor = Object.fromEntries(rings.map((id, i) => [id, RING_COLORS[i % RING_COLORS.length]]));
    // Layout is computed once and drawn still: nothing moves on screen.
    forceSimulation(nodes)
      .force('link', forceLink(links).id((d) => d.id).distance((l) => 150 - 70 * l.score).strength((l) => 0.5 * l.score))
      .force('charge', forceManyBody().strength(-260))
      .force('collide', forceCollide(42))
      .force('x', forceX(W / 2).strength(0.07))
      .force('y', forceY(H / 2).strength(0.12))
      .stop().tick(300);
    nodes.forEach((n) => { n.x = Math.max(50, Math.min(W - 50, n.x)); n.y = Math.max(16, Math.min(H - 30, n.y)); });
    return { nodes, links, ringColor };
  }, [submissions, matches]);

  return (
    <><div className="graph-legend"><span><i className="legend-dot" /> Similarity group</span><span><i className="legend-square" /> AI reference</span><span><i className="legend-line" /> Flagged pair</span></div><svg viewBox={`0 0 ${W} ${H}`} className="graph" role="group" aria-label="Map of similar submissions">
      {links.map((l) => (
        <line key={l.id} className="edge" x1={l.source.x} y1={l.source.y} x2={l.target.x} y2={l.target.y}
              stroke={l.flagged ? '#8b7fbd' : '#d4dbe8'} strokeWidth={l.flagged ? 2 + 5 * l.score : 1.5}
              strokeDasharray={l.flagged ? undefined : '4 4'} strokeLinecap="round"
              tabIndex={0} role="link"
              aria-label={`${l.source.student_ref} and ${l.target.student_ref}, ${Math.round(l.score * 100)}% similar`}
              onClick={() => onOpen(l.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(l.id); } }}>
          <title>{`${l.source.student_ref} and ${l.target.student_ref}: ${Math.round(l.score * 100)}% similar`}</title>
        </line>
      ))}
      {nodes.map((n) => (
        <g key={n.id} transform={`translate(${n.x},${n.y})`}>
          {n.is_reference
            ? <rect x="-9" y="-9" width="18" height="18" rx="2" fill="#1b2440" />
            : <circle r="9" fill={n.cluster_id ? ringColor[n.cluster_id] : '#fff'}
                      stroke={n.cluster_id ? ringColor[n.cluster_id] : '#5a6480'} strokeWidth="2" />}
          <text y="24" textAnchor="middle">{n.student_ref}</text>
        </g>
      ))}
    </svg>{links.length === 0 && <p className="empty-inline">No pairs meet the graph display cutoff of 30%. All submissions are shown.</p>}<p className="graph-help">Select a connection to compare. Dashed lines show unflagged pairs with at least 30% similarity.</p></>
  );
}
