import React from 'react';
import './Sidebar.css';

export default function Sidebar({ onNewLogClick, onLogout, currentView, setCurrentView, onlineCount }) {
  return (
    <aside className="sidebar component-border">
      <h2 className="brand">RawProcess</h2>
      
      <nav className="nav-menu">
        <a 
          href="#global" 
          onClick={(e) => { e.preventDefault(); setCurrentView('feed'); }}
          className={`nav-link ${currentView === 'feed' ? 'active' : ''}`}
        >
          <span className="icon">[ ]</span>
          <span className="mono-text uppercase">Global Feed</span>
        </a>
        <a 
          href="#workspaces" 
          onClick={(e) => { e.preventDefault(); setCurrentView('workspaces'); }}
          className={`nav-link ${currentView === 'workspaces' ? 'active' : ''}`}
        >
          <span className="icon">[*]</span>
          <span className="mono-text uppercase">Workspace Control</span>
        </a>
        <a 
          href="#profile" 
          onClick={(e) => { 
            e.preventDefault(); 
            const me = localStorage.getItem('rawprocess_user');
            const username = me || 'admin';
            window.location.hash = `#/profile/${username}`;
            setCurrentView('profile');
          }}
          className={`nav-link ${currentView === 'profile' ? 'active' : ''}`}
        >
          <span className="icon">[@]</span>
          <span className="mono-text uppercase">My Profile</span>
        </a>
      </nav>

      <div className="sidebar-footer">
        <div className="online-status mono-text">
          <span className="status-dot"></span> GRID_CONN: {onlineCount || 1}
        </div>
        <button className="new-post-btn" onClick={onNewLogClick} style={{marginBottom: '16px'}}>New Log</button>
        <button className="secondary" onClick={onLogout}>Terminate_Session</button>
      </div>
    </aside>
  );
}
