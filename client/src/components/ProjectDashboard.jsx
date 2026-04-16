import React from 'react';
import './ProjectDashboard.css';

export default function ProjectDashboard({ project, logs = [], onBack }) {
  // Deterministic ultra-realistic local stats
  const baseLogCount = logs.length || 1;
  const projectHash = Array.from(project).reduce((s, c) => s + c.charCodeAt(0), 0);
  
  const logCountInt = baseLogCount * (projectHash % 14 + 2) * 114 + 1205;
  const formattedCommits = logCountInt >= 1000 ? (logCountInt / 1000).toFixed(1) + 'k' : logCountInt;
  
  const issues = Math.max(0, (projectHash % 15) + (baseLogCount % 5));
  const coverage = Math.min(99, 84 + (projectHash % 15));
  const buildTime = (1.2 + (projectHash % 2) + Math.random() * 0.5).toFixed(1);

  // Generate dynamic sessions using actual log authors
  const uniqueAuthors = [...new Set(logs.map(l => l.author).filter(Boolean))];
  const activeSessions = uniqueAuthors.length > 0 
    ? uniqueAuthors.slice(0, 3).map((author, i) => ({
        id: `SESSION_0${i + 1}`,
        user: author,
        status: i === 0 ? 'LIVE' : 'IDLE',
        action: i === 0 ? 'Compiling Shader Tree' : 'None'
      }))
    : [
        { id: 'SESSION_01', user: 'SYSTEM', status: 'IDLE', action: 'Awaiting connection' }
      ];

  return (
    <div className="project-dashboard-wrapper">
      <div className="dashboard-nav-strip component-border">
        <button className="back-btn mono-text uppercase" onClick={onBack}>
          &lt; RETURN TO WORKSPACES
        </button>
        <span className="mono-text uppercase">/projects/{project}</span>
      </div>

      <div className="dashboard-grid">
        {/* LEFT COLUMN: CORE TIMELINE AND HEADERS */}
        <div className="dashboard-main-col">
          <div className="pd-header-block component-border">
            <div className="pd-status-tag mono-text">STATUS: CRITICAL BUILD</div>
            <h1 className="pd-title uppercase">PROJECT: {project}</h1>
            <p className="pd-description">
              Advanced autonomous node optimization for high-density computational clusters. 
              This process implements raw-buffer manipulation for sub-millisecond inference speeds 
              running securely on {project}.
            </p>
          </div>

          <div className="pd-separator">
            <span className="mono-text">--- PROCESS TIMELINE ---</span>
          </div>

          <div className="pd-timeline-container">
            {logs.length === 0 ? (
              <div className="timeline-empty mono-text component-border">NO LOGS AVAILABLE IN WORKSPACE</div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="pd-timeline-item">
                  <div className="timeline-node">
                    <div className="node-icon mono-text">&lt;&gt;</div>
                    <div className="node-line"></div>
                  </div>
                  <div className="timeline-content component-border">
                    <div className="timeline-content-header mono-text uppercase">
                      UPDATE: COMMIT_HASH_{log.id.toString(16).padStart(4, '0').toUpperCase()}{(log.title.length * 7).toString(16).toUpperCase()}
                    </div>
                    <div className="timeline-content-body">
                      <h3 className="uppercase">{log.title}</h3>
                      <p>{log.content}</p>
                      {log.image && (
                         <div className="timeline-image-wrapper">
                           <img src={`http://localhost:3001${log.image}`} alt="Log upload" className="timeline-image" />
                         </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: METRICS SIDEBAR */}
        <div className="dashboard-side-col">
          <div className="pd-sidebar-section component-border">
            <h3 className="sidebar-title mono-text uppercase">ACTIVE SESSIONS</h3>
            <div className="pd-sessions-list">
              {activeSessions.map(sess => (
                <div key={sess.id} className="pd-session-card component-border">
                  <div className="sess-header mono-text">
                    <span>{sess.id}</span>
                    <span className={`sess-status ${sess.status.toLowerCase()}`}>{sess.status}</span>
                  </div>
                  <div className="sess-details mono-text">
                    User: {sess.user}<br/>
                    Action: {sess.action}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pd-sidebar-section component-border">
            <h3 className="sidebar-title mono-text uppercase">PROJECT STATS</h3>
            <div className="pd-stats-grid">
              <div className="pd-stat-box component-border">
                <span className="pd-stat-val">{formattedCommits}</span>
                <span className="pd-stat-label mono-text uppercase">COMMITS</span>
              </div>
              <div className="pd-stat-box component-border">
                <span className="pd-stat-val" style={{color: '#ff0000'}}>{issues}</span>
                <span className="pd-stat-label mono-text uppercase">ISSUES</span>
              </div>
              <div className="pd-stat-box component-border">
                <span className="pd-stat-val">{coverage}%</span>
                <span className="pd-stat-label mono-text uppercase">COVERAGE</span>
              </div>
              <div className="pd-stat-box component-border">
                <span className="pd-stat-val">{buildTime}s</span>
                <span className="pd-stat-label mono-text uppercase">BUILD TIME</span>
              </div>
            </div>
          </div>

          <div className="pd-terminal-box component-border">
            <div className="terminal-log-header mono-text uppercase">SYSTEM_LOG</div>
            <div className="terminal-log-body mono-text">
              <span style={{color: '#00ff00'}}>&gt;&gt; REFRESH_STREAM SUCCESS</span><br/>
              WAITING FOR INPUT...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
