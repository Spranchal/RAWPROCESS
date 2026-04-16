import React from 'react';
import './Sidebar.css';

export default function Sidebar({ onNewLogClick, onLogout, currentView, setCurrentView }) {
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
          href="#projects" 
          onClick={(e) => { e.preventDefault(); setCurrentView('projects'); }}
          className={`nav-link ${currentView === 'projects' ? 'active' : ''}`}
        >
          <span className="icon">[*]</span>
          <span className="mono-text uppercase">My Projects</span>
        </a>
        <a 
          href="#project-details" 
          onClick={(e) => { e.preventDefault(); setCurrentView('project_details'); }}
          className={`nav-link ${currentView === 'project_details' ? 'active' : ''}`}
        >
          <span className="icon">[-]</span>
          <span className="mono-text uppercase">Project Details</span>
        </a>
        <a 
          href="#active-sessions" 
          onClick={(e) => { e.preventDefault(); setCurrentView('active_sessions'); }}
          className={`nav-link ${currentView === 'active_sessions' ? 'active' : ''}`}
        >
          <span className="icon">[&gt;]</span>
          <span className="mono-text uppercase">Active Sessions</span>
        </a>
      </nav>

      <div className="sidebar-footer">
        <button className="new-post-btn" onClick={onNewLogClick} style={{marginBottom: '16px'}}>New Log</button>
        <button className="secondary" onClick={onLogout}>Terminate_Session</button>
      </div>
    </aside>
  );
}
