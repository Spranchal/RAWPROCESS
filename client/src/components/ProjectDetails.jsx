import React from 'react';
import './ProjectDetails.css';

export default function ProjectDetails({ logs = [], projectsList = [] }) {
  // Deterministic modifiers for Stitch UI mapping
  const baseLogCount = logs.length || 1;
  const projectCount = projectsList.length || 1;
  
  const commitsRaw = projectCount * 144 + baseLogCount * 31 + 4127;
  const commits = commitsRaw >= 1000 ? (commitsRaw / 1000).toFixed(1) + 'k' : commitsRaw;
  const issues = Math.max(2, Math.floor(baseLogCount / 4) + (projectCount * 2));
  const coverage = Math.min(99, 81 + (projectCount));
  const buildTime = (1.2 + (baseLogCount * 0.05)).toFixed(1);

  return (
    <div className="project-details-container">
      <div className="metrics-grid">
        <div className="metric-box component-border">
          <span className="metric-label mono-text">COMMITS_PUSHED</span>
          <span className="metric-value">{commits}</span>
        </div>
        <div className="metric-box component-border">
          <span className="metric-label mono-text">OPEN_ISSUES</span>
          <span className="metric-value" style={{color: '#ff0000'}}>{issues}</span>
        </div>
        <div className="metric-box component-border">
          <span className="metric-label mono-text">CODE_COVERAGE</span>
          <span className="metric-value" style={{color: coverage > 80 ? '#00ff00' : 'inherit'}}>{coverage}%</span>
        </div>
        <div className="metric-box component-border">
          <span className="metric-label mono-text">BUILD_DURATION</span>
          <span className="metric-value">{buildTime}s</span>
        </div>
      </div>

      <div className="system-logs-section component-border">
        <div className="system-logs-header mono-text">
          <span>&gt; SYSTEM_LOGS</span>
          <span>{logs.length} STRINGS DETECTED</span>
        </div>
        <div className="system-logs-list">
          {logs.length === 0 ? (
            <div className="system-log-item" style={{justifyContent: 'center'}}>NO LOGS FOUND.</div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="system-log-item">
                <span className="log-hash mono-text">{log.id.toString().padStart(6, '0')}</span>
                <span className="log-author mono-text">[{log.author || 'SYSTEM'}]</span>
                <span className="log-title">{log.title}</span>
                <span className={`log-status mono-text status-${log.status || 'pending'}`}>{log.status || 'PENDING'}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
