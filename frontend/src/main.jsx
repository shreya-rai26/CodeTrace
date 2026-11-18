import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { Icon } from './components/UI.jsx';
import { getToken, setToken } from './api.js';
import AssignmentDetail from './pages/AssignmentDetail.jsx';
import Assignments from './pages/Assignments.jsx';
import Compare from './pages/Compare.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ReviewQueue from './pages/ReviewQueue.jsx';
import Students from './pages/Students.jsx';

function Shell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const mobileNav = useRef(null);
  useEffect(() => {
    setMenu(false);
    if (location.hash === '#assignments') document.getElementById('assignments')?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);
  useEffect(() => {
    if (menu) mobileNav.current?.showModal();
    else mobileNav.current?.close();
  }, [menu]);
  if (!getToken()) return <Navigate to="/login" replace />;
  const links = <><div className="nav-label">WORKSPACE</div><Link to="/" onClick={() => setMenu(false)} className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}><Icon name="grid" /> Overview</Link><Link to="/assignments" className={`nav-item ${location.pathname === '/assignments' ? 'active' : ''}`} onClick={() => setMenu(false)}><Icon name="folder" /> Assignments</Link><Link to="/review" className={`nav-item ${location.pathname === '/review' ? 'active' : ''}`} onClick={() => setMenu(false)}><Icon name="flag" /> Review queue</Link><Link to="/students" className={`nav-item ${location.pathname.startsWith('/students') ? 'active' : ''}`} onClick={() => setMenu(false)}><Icon name="files" /> Students</Link><div className="sidebar-note"><Icon name="shield" /><strong>Evidence before conclusions.</strong><p>Similarity is a starting point for a thoughtful academic review.</p></div><div className="sidebar-bottom"><div className="workspace-avatar">CT</div><div><strong>Academic workspace</strong><small>Code similarity review</small></div></div></>;
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="sidebar"><Link to="/" className="brand"><span className="brand-symbol"><Icon name="code" /></span>CodeTrace<span className="brand-dot" /></Link><nav aria-label="Main navigation">{links}</nav></aside>
    <dialog ref={mobileNav} className="mobile-nav" onCancel={() => setMenu(false)} onClose={() => setMenu(false)} aria-label="Navigation"><div className="d-flex justify-content-between align-items-center mb-4"><span className="brand">CodeTrace</span><button className="icon-button" aria-label="Close navigation" onClick={() => setMenu(false)}><Icon name="close" /></button></div><nav aria-label="Mobile navigation">{links}</nav></dialog>
    <div className="app-body"><header className="topbar"><div className="d-flex align-items-center gap-3"><button className="icon-button mobile-menu" aria-label="Open navigation" aria-expanded={menu} onClick={() => setMenu(true)}><Icon name="menu" /></button><span className="topbar-title">Workspace <span>/</span> <strong>{location.pathname.includes('/compare/') ? 'Comparison' : location.pathname.includes('/assignments/') ? 'Assignment review' : 'Overview'}</strong></span></div><button className="btn signout" onClick={() => { setToken(null); navigate('/login'); }}><Icon name="logout" size={17} /> Sign out</button></header><main id="main-content" className="main-content" tabIndex={-1}><Outlet /></main><footer className="app-footer"><span>CodeTrace · Academic integrity, informed by evidence.</span><span>Review responsibly.</span></footer></div>
  </div>;
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Shell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/assignments" element={<Assignments />} />
        <Route path="/review" element={<ReviewQueue />} />
        <Route path="/students" element={<Students />} />
        <Route path="/students/:ref" element={<Students />} />
        <Route path="/assignments/:id" element={<AssignmentDetail />} />
        <Route path="/assignments/:id/compare/:matchId" element={<Compare />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>,
);
