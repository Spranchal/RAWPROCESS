import React, { useState } from 'react';
import ProjectDashboard from './ProjectDashboard';
import './ProjectsView.css';

export default function ProjectsView({ logs, onAcknowledge, searchQuery = '', projectsList = [], onProjectCreated }) {
  const [selectedProject, setSelectedProject] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'global', 'private'
  const token = localStorage.getItem('rawprocess_token');

  // Normalize project list: support both object {name, is_public} and plain strings
  const normalizedProjects = projectsList.map(p =>
    typeof p === 'string' ? { name: p, is_public: 1 } : p
  );

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    const res = await fetch('http://localhost:3001/api/projects', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ name: newProjectName.trim(), isPublic })
    });
    if (res.ok && onProjectCreated) {
      onProjectCreated({ name: newProjectName.trim(), is_public: isPublic ? 1 : 0 });
    }
    setNewProjectName('');
  };

  const filteredLogs = logs.filter(log => 
    log.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    log.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  // Filter by visibility
  const filteredProjects = normalizedProjects.filter(p => {
    if (activeFilter === 'global') return p.is_public !== 0;
    if (activeFilter === 'private') return p.is_public === 0;
    return true;
  });

  const globalCount = normalizedProjects.filter(p => p.is_public !== 0).length;
  const privateCount = normalizedProjects.filter(p => p.is_public === 0).length;

  return (
    <div className="projects-container">
      <div className="create-project-card component-border">
        <h3 className="mono-text">[ INITIALIZE_NEW_WORKSPACE ]</h3>
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
          <button className="create-proj-btn mono-text" onClick={createProject}>EXECUTE</button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="project-filter-bar mono-text">
        <button
          className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          ALL [{normalizedProjects.length}]
        </button>
        <button
          className={`filter-tab global-tab ${activeFilter === 'global' ? 'active' : ''}`}
          onClick={() => setActiveFilter('global')}
        >
          ◉ GLOBAL [{globalCount}]
        </button>
        <button
          className={`filter-tab private-tab ${activeFilter === 'private' ? 'active' : ''}`}
          onClick={() => setActiveFilter('private')}
        >
          ◎ PRIVATE [{privateCount}]
        </button>
      </div>

      <div className="projects-grid">
        {filteredProjects.length === 0 ? (
          <div className="feed-loading mono-text component-border" style={{ gridColumn: '1 / -1' }}>
            NO WORKSPACES IN THIS CATEGORY.
          </div>
        ) : (
          filteredProjects.map(project => {
            const logCount = logs.filter(log => log.project === project.name).length;
            const isGlobal = project.is_public !== 0;
            return (
              <div key={project.name} className="project-card component-border" onClick={() => setSelectedProject(project)}>
                <div className="project-card-top">
                  <h3 className="mono-text uppercase">&gt;_ {project.name}</h3>
                  <span className={`project-badge mono-text ${isGlobal ? 'badge-global' : 'badge-private'}`}>
                    {isGlobal ? '◉ GLOBAL' : '◎ PRIVATE'}
                  </span>
                </div>
                <p className="mono-text">TOTAL_LOGS: {logCount}</p>
                <div className="project-card-footer mono-text">ENTER_WORKSPACE &gt;&gt;</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
