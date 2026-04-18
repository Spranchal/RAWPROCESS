import React, { useState, useEffect } from 'react';
import ProjectDashboard from './ProjectDashboard';
import { useCreateProject } from '../hooks/useProjects';
import './WorkspaceControl.css';

export default function WorkspaceControl({ logs, searchQuery = '', projectsList = [], token, onLogout }) {
  const [selectedProject, setSelectedProject] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sessionData, setSessionData] = useState(null);

  const createProjectMutation = useCreateProject();

  useEffect(() => {
    if (token) {
      fetch('http://localhost:3001/api/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setSessionData(data))
      .catch(console.error);
    }
  }, [token]);

  // Normalize project list
  const normalizedProjects = projectsList.map(p =>
    typeof p === 'string' ? { name: p, is_public: 1 } : p
  );

  const createProject = () => {
    if (!newProjectName.trim()) return;
    createProjectMutation.mutate({ name: newProjectName.trim(), isPublic });
    setNewProjectName('');
  };

  const filteredLogs = logs.filter(log => 
    log.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    log.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If a project is selected, drill down into ProjectDashboard
  if (selectedProject) {
    const projectLogs = filteredLogs.filter(log => (log.project || 'Uncategorized') === selectedProject.name);
    return (
      <ProjectDashboard 
        project={selectedProject.name} 
        logs={projectLogs} 
        onBack={() => setSelectedProject(null)} 
      />
    );
  }

  // --- Metrics Calculation (Carry over from ProjectDetails) ---
  const baseLogCount = logs.length || 1;
  const projectCount = projectsList.length || 1;
  const commitsRaw = projectCount * 144 + baseLogCount * 31 + 4127;
  const commits = commitsRaw >= 1000 ? (commitsRaw / 1000).toFixed(1) + 'k' : commitsRaw;
  const issues = Math.max(2, Math.floor(baseLogCount / 4) + (projectCount * 2));
  const coverage = Math.min(99, 81 + (projectCount));
  const buildTime = (1.2 + (baseLogCount * 0.05)).toFixed(1);

  // --- Projects Filtering ---
  const filteredProjects = normalizedProjects.filter(p => {
    if (activeFilter === 'global') return p.is_public !== 0;
    if (activeFilter === 'private') return p.is_public === 0;
    return true;
  });

  const sessionDate = sessionData ? new Date((sessionData.iat || Math.floor(Date.now()/1000)) * 1000).toLocaleString() : 'PENDING...';

  return (
    <div className="workspace-control-container">
      
      {/* 1. COMMAND CENTER (PROJECT GRID) - TOP ORDER */}
      <section className="command-center-section">
        <h2 className="section-title mono-text uppercase">[ 01_COMMAND_CENTER ]</h2>
        
        <div className="create-project-card component-border">
          <h3 className="mono-text uppercase">&gt; INITIALIZE_NEW_WORKSPACE</h3>
          <div className="create-project-input" style={{ marginBottom: '16px' }}>
            <input 
              type="text" 
              className="terminal-input mono-text" 
              placeholder="PROJECT_NAME..." 
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createProject()}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label className="mono-text" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
              <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} style={{cursor:'pointer'}} />
              PUBLIC_NETWORK
            </label>
            <button 
              className="create-proj-btn mono-text" 
              onClick={createProject}
              disabled={createProjectMutation.isPending}
            >
              {createProjectMutation.isPending ? 'EXECUTING...' : 'EXECUTE'}
            </button>
          </div>
        </div>

        <div className="project-filter-bar mono-text">
          <button className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>
            ALL [{normalizedProjects.length}]
          </button>
          <button className={`filter-tab global-tab ${activeFilter === 'global' ? 'active' : ''}`} onClick={() => setActiveFilter('global')}>
            ◉ GLOBAL
          </button>
          <button className={`filter-tab private-tab ${activeFilter === 'private' ? 'active' : ''}`} onClick={() => setActiveFilter('private')}>
            ◎ PRIVATE
          </button>
        </div>

        <div className="workspaces-grid">
          {filteredProjects.map(project => {
            const logCount = logs.filter(log => (log.project || 'Uncategorized') === project.name).length;
            const isGlobal = project.is_public !== 0;
            return (
              <div key={project.name} className="project-card component-border" onClick={() => setSelectedProject(project)}>
                <div className="project-card-top">
                  <h3 className="mono-text uppercase">&gt;_ {project.name}</h3>
                  <span className={`project-badge mono-text ${isGlobal ? 'badge-global' : 'badge-private'}`}>
                    {isGlobal ? '◉ GLOBAL' : '◎ PRIVATE'}
                  </span>
                </div>
                <p className="mono-text" style={{fontSize: '0.8rem', color: '#666'}}>LOCAL_ENTRIES: {logCount}</p>
                <div className="project-card-footer mono-text" style={{fontSize: '0.7rem'}}>BOOT_SEQUENCE &gt;&gt;</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. PERFORMANCE (METRICS) - MIDDLE ORDER */}
      <section className="performance-section">
        <h2 className="section-title mono-text uppercase">[ 02_GLOBAL_PERFORMANCE ]</h2>
        <div className="performance-grid">
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
      </section>

      {/* 3. SESSION STATUS - BOTTOM ORDER */}
      <section className="session-status-section">
        <h2 className="section-title mono-text uppercase">[ 03_SESSION_STATUS ]</h2>
        <div className="session-panel component-border">
          <div className="session-header mono-text">
            ROOT@RAWPROCESS:~# SESSION_DETAILS
          </div>
          <div className="session-body mono-text">
            <table className="session-info-table">
              <tbody>
                <tr>
                  <td>CONNECTED_AS:</td>
                  <td style={{color: '#00ff00'}}>{sessionData?.user?.username || 'AUTHORIZING...'}</td>
                </tr>
                <tr>
                  <td>NODE_CLEARANCE:</td>
                  <td>LEVEL_01_ADMIN</td>
                </tr>
                <tr>
                  <td>ESTABLISHED:</td>
                  <td>{sessionDate}</td>
                </tr>
                <tr>
                  <td>TOKEN_ID:</td>
                  <td style={{wordBreak: 'break-all', fontSize: '0.7rem', color: '#444'}}>
                    {token.substring(0, 50)}...
                  </td>
                </tr>
              </tbody>
            </table>
            <button className="terminate-btn mono-text" onClick={onLogout} style={{marginTop: '24px'}}>
              [ DISCONNECT_TERMINAL ]
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
