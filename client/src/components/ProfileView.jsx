import React, { useState } from 'react';
import PostCard from './PostCard';
import ContributionGraph from './ContributionGraph';
import LogSkeleton from './LogSkeleton';
import EditProfileModal from './EditProfileModal';
import { 
  useProfile, 
  useFollowUser, 
  useUpdateProfile, 
  usePinProject, 
  useUnpinProject, 
  usePinLog, 
  useUnpinLog 
} from '../hooks/useUser';
import { useProjects } from '../hooks/useProjects';
import './ProfileView.css';

export default function ProfileView({ username, onAcknowledge, onAcceptSolution, socket }) {
  const { data: profile, isLoading, isError } = useProfile(username);
  const followMutation = useFollowUser(username);
  const updateProfileMutation = useUpdateProfile(username);
  const pinProjectMutation = usePinProject(username);
  const unpinProjectMutation = useUnpinProject(username);
  const pinLogMutation = usePinLog(username);
  const unpinLogMutation = useUnpinLog(username);
  const { data: projectsList = [] } = useProjects();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview | transmissions | manage_pins
  
  const loggedInUser = localStorage.getItem('rawprocess_user');
  const isOwnProfile = loggedInUser?.toLowerCase() === username.toLowerCase();

  const handleFollow = () => {
    if (!profile) return;
    followMutation.mutate({ isFollowing: profile.isFollowing });
  };

  const handleEditSubmit = (formData) => {
    updateProfileMutation.mutate(formData, {
      onSuccess: () => {
        setIsEditModalOpen(false);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="profile-view-container">
        <div className="profile-cover skeleton"></div>
        <div className="profile-split-layout">
          <div className="profile-sidebar-col skeleton component-border" style={{height: '400px'}}></div>
          <div className="profile-main-col">
            <div className="skeleton component-border" style={{height: '200px', marginBottom: '20px'}}></div>
            <LogSkeleton />
            <LogSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !profile) return <div className="profile-view-container mono-text">ERROR: USER_NOT_FOUND</div>;

  const contributions = profile.contributions || [];
  const userLogs = profile.logs || [];
  const achievements = profile.achievements || [];
  const languages = profile.languages || [];
  const pinnedProjects = profile.pinnedProjects || [];
  const pinnedLogs = profile.pinnedLogs || [];
  
  // Format Joined Date
  const joinedDate = profile.created_at 
    ? new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Initializing...';

  // Get color for language dot
  const getLanguageColor = (lang) => {
    const colors = {
      JavaScript: '#f1e05a',
      TypeScript: '#3178c6',
      Python: '#3572A5',
      'C++': '#f34b7d',
      Rust: '#dea584',
      Go: '#00ADD8',
      Java: '#b07219',
      CSS: '#563d7c',
      HTML: '#e34c26',
      SQL: '#e38c00',
      Shell: '#89e051'
    };
    return colors[lang] || '#8b949e';
  };

  return (
    <div className="profile-view-container">
      {/* 1. COVER BACKDROP */}
      <div 
        className="profile-cover component-border"
        style={{ 
          backgroundImage: profile.cover_url ? `url(http://localhost:3001${profile.cover_url})` : 'linear-gradient(135deg, #09090e 0%, #1a1a2e 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {isOwnProfile && (
          <button className="edit-cover-btn mono-text" onClick={() => setIsEditModalOpen(true)}>
            [ CONFIGURE_BACKDROP ]
          </button>
        )}
      </div>

      <div className="profile-split-layout">
        {/* 2. SIDEBAR COLUMN */}
        <aside className="profile-sidebar-col">
          <div className="avatar-wrapper">
            <img 
              className="profile-avatar component-border" 
              src={profile.avatar_url ? (profile.avatar_url.startsWith('http') ? profile.avatar_url : `http://localhost:3001${profile.avatar_url}`) : '/favicon.png'} 
              alt={username} 
            />
          </div>

          <div className="profile-identity">
            <h1 className="profile-fullname">{profile.full_name || username}</h1>
            <p className="profile-username mono-text">@{username}</p>
          </div>

          {isOwnProfile ? (
            <button className="edit-profile-btn mono-text component-border" onClick={() => setIsEditModalOpen(true)}>
              EDIT_IDENTITY
            </button>
          ) : (
            <button 
              className={`follow-btn mono-text component-border ${profile.isFollowing ? 'following' : ''}`} 
              onClick={handleFollow}
              disabled={followMutation.isPending}
            >
              {profile.isFollowing ? 'DISCONNECT_OBSERVATION' : 'ESTABLISH_OBSERVATION'}
            </button>
          )}

          <div className="profile-bio-text mono-text">
            {profile.bio || 'No status bio provided by this Observer.'}
          </div>

          {/* FOLLOWERS / FOLLOWING */}
          <div className="profile-relations mono-text">
            <span className="relation-item">
              <strong className="glowing-number">{profile.stats.followers}</strong> followers
            </span>
            <span className="relation-divider">•</span>
            <span className="relation-item">
              <strong className="glowing-number">{profile.stats.following}</strong> following
            </span>
          </div>

          {/* SOCIAL & DETAILS */}
          <ul className="profile-details-list mono-text">
            {profile.company && (
              <li className="detail-item">
                <span className="detail-icon">🏢</span>
                <span className="detail-text">{profile.company}</span>
              </li>
            )}
            {profile.college && (
              <li className="detail-item">
                <span className="detail-icon">🎓</span>
                <span className="detail-text">{profile.college}</span>
              </li>
            )}
            {profile.location && (
              <li className="detail-item">
                <span className="detail-icon">📍</span>
                <span className="detail-text">{profile.location}</span>
              </li>
            )}
            <li className="detail-item">
              <span className="detail-icon">📅</span>
              <span className="detail-text">Joined {joinedDate}</span>
            </li>
            {profile.github_link && (
              <li className="detail-item">
                <span className="detail-icon">💻</span>
                <a href={profile.github_link} target="_blank" rel="noopener noreferrer" className="detail-link">
                  GitHub Profile
                </a>
              </li>
            )}
            {profile.linkedin_link && (
              <li className="detail-item">
                <span className="detail-icon">🔗</span>
                <a href={profile.linkedin_link} target="_blank" rel="noopener noreferrer" className="detail-link">
                  LinkedIn Profile
                </a>
              </li>
            )}
            {profile.portfolio_link && (
              <li className="detail-item">
                <span className="detail-icon">🌐</span>
                <a href={profile.portfolio_link} target="_blank" rel="noopener noreferrer" className="detail-link">
                  Portfolio Hub
                </a>
              </li>
            )}
          </ul>

          {/* SKILLS */}
          {profile.skills && (
            <div className="profile-skills-section component-border">
              <h4 className="section-title-sm mono-text">// OPERATIONAL_SKILLS</h4>
              <div className="skills-container">
                {profile.skills.split(',').map(skill => (
                  <span key={skill} className="skill-tag mono-text">{skill.trim()}</span>
                ))}
              </div>
            </div>
          )}

          {/* TECH STACK */}
          {profile.tech_stack && (
            <div className="profile-skills-section component-border">
              <h4 className="section-title-sm mono-text">// CORE_TECH_STACK</h4>
              <div className="tech-badge-container">
                {profile.tech_stack.split(',').map(tech => (
                  <span key={tech} className="tech-badge-pill mono-text">{tech.trim()}</span>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* 3. MAIN CONTENT COLUMN */}
        <main className="profile-main-col">
          {/* TABS HEADER */}
          <div className="profile-tabs-header mono-text component-border">
            <button 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              [#] OVERVIEW
            </button>
            <button 
              className={`tab-btn ${activeTab === 'transmissions' ? 'active' : ''}`}
              onClick={() => setActiveTab('transmissions')}
            >
              [ ] TRANSMISSIONS ({userLogs.length})
            </button>
            {isOwnProfile && (
              <button 
                className={`tab-btn ${activeTab === 'manage_pins' ? 'active' : ''}`}
                onClick={() => setActiveTab('manage_pins')}
              >
                [*] PIN_CONFIG
              </button>
            )}
          </div>

          {activeTab === 'overview' && (
            <>
              {/* PINNED MODULES SECTION */}
              <section className="profile-section">
                <div className="section-header-flex">
                  <h2 className="mono-text uppercase section-heading">&gt;_ Pinned_Modules</h2>
                  {isOwnProfile && (
                    <button className="configure-pins-link mono-text" onClick={() => setActiveTab('manage_pins')}>
                      [ CONFIGURE_PINS ]
                    </button>
                  )}
                </div>

                <div className="pinned-grid">
                  {/* Render Pinned Projects */}
                  {pinnedProjects.map(proj => (
                    <div key={proj.name} className="pinned-card component-border">
                      <div className="pinned-card-header">
                        <span className="card-type mono-text">WORKSPACE</span>
                        {isOwnProfile && (
                          <button 
                            className="unpin-btn mono-text" 
                            title="Unpin workspace"
                            onClick={() => unpinProjectMutation.mutate(proj.name)}
                          >
                            [X]
                          </button>
                        )}
                      </div>
                      <h3 className="pinned-card-title mono-text uppercase">{proj.name}</h3>
                      <p className="pinned-card-desc mono-text">Active workspace running secure node operations.</p>
                      <div className="pinned-card-footer mono-text">
                        <span className="status-indicator-dot"></span> RUNNING
                      </div>
                    </div>
                  ))}

                  {/* Render Pinned Logs */}
                  {pinnedLogs.map(log => (
                    <div key={log.id} className="pinned-card component-border">
                      <div className="pinned-card-header">
                        <span className="card-type mono-text">TRANSMISSION</span>
                        {isOwnProfile && (
                          <button 
                            className="unpin-btn mono-text" 
                            title="Unpin log"
                            onClick={() => unpinLogMutation.mutate(log.id)}
                          >
                            [X]
                          </button>
                        )}
                      </div>
                      <h3 className="pinned-card-title mono-text uppercase">{log.title}</h3>
                      <p className="pinned-card-desc truncate">{log.content}</p>
                      <div className="pinned-card-footer mono-text">
                        {log.language && (
                          <span className="lang-indicator">
                            <span className="lang-dot" style={{ backgroundColor: getLanguageColor(log.language) }}></span>
                            {log.language}
                          </span>
                        )}
                        <span className="status-label uppercase">{log.status}</span>
                      </div>
                    </div>
                  ))}

                  {pinnedProjects.length === 0 && pinnedLogs.length === 0 && (
                    <div className="empty-pinned-message mono-text component-border">
                      NO PINNED MODULES DISPLAYED ON THIS GRID.
                    </div>
                  )}
                </div>
              </section>

              {/* STATS AND LANGUAGES */}
              <section className="profile-section form-grid-2">
                {/* Languages Used Card */}
                <div className="info-card component-border">
                  <h3 className="mono-text uppercase card-title-sm">// Languages_Used</h3>
                  {languages.length === 0 ? (
                    <p className="mono-text info-empty">No programming language data available.</p>
                  ) : (
                    <>
                      <div className="language-bar-composite">
                        {languages.map((lang, idx) => (
                          <div 
                            key={lang.name} 
                            className="lang-segment" 
                            style={{ 
                              width: `${lang.percentage}%`,
                              backgroundColor: getLanguageColor(lang.name),
                              borderTopLeftRadius: idx === 0 ? '4px' : '0',
                              borderBottomLeftRadius: idx === 0 ? '4px' : '0',
                              borderTopRightRadius: idx === languages.length - 1 ? '4px' : '0',
                              borderBottomRightRadius: idx === languages.length - 1 ? '4px' : '0',
                            }}
                            title={`${lang.name}: ${lang.percentage}%`}
                          ></div>
                        ))}
                      </div>
                      <div className="languages-legend-grid">
                        {languages.map(lang => (
                          <div key={lang.name} className="legend-item mono-text">
                            <span className="legend-dot" style={{ backgroundColor: getLanguageColor(lang.name) }}></span>
                            <span className="legend-name">{lang.name}</span>
                            <span className="legend-percent">{lang.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Grid performance card */}
                <div className="info-card component-border">
                  <h3 className="mono-text uppercase card-title-sm">// Grid_Performance</h3>
                  <div className="performance-stats-grid">
                    <div className="perf-box component-border">
                      <span className="perf-label mono-text">CURRENT_STREAK</span>
                      <span className="perf-value glow-text-yellow">{profile.stats.currentStreak} Days</span>
                    </div>
                    <div className="perf-box component-border">
                      <span className="perf-label mono-text">LONGEST_STREAK</span>
                      <span className="perf-value">{profile.stats.longestStreak} Days</span>
                    </div>
                    <div className="perf-box component-border" style={{ gridColumn: 'span 2' }}>
                      <span className="perf-label mono-text">MOST_USED_TECHNOLOGY</span>
                      <span className="perf-value glow-text-green">{profile.mostUsedTechnology}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* DYNAMIC ACHIEVEMENTS */}
              {achievements.length > 0 && (
                <section className="profile-section">
                  <h2 className="mono-text uppercase section-heading">&gt;_ Identity_Achievements</h2>
                  <div className="achievements-list">
                    {achievements.map(ach => (
                      <div key={ach.id} className="achievement-badge-card component-border" title={ach.description}>
                        <div className="badge-icon-wrap">{ach.icon}</div>
                        <div className="badge-text-wrap">
                          <h4 className="badge-title mono-text uppercase">{ach.title}</h4>
                          <p className="badge-desc mono-text">{ach.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* CONTRIBUTION GRID */}
              <ContributionGraph contributions={contributions} />
            </>
          )}

          {activeTab === 'transmissions' && (
            <div className="profile-logs">
              {userLogs.length === 0 ? (
                <div className="no-logs mono-text component-border">NO_LOGS_ON_GRID</div>
              ) : (
                userLogs.map(log => (
                  <PostCard 
                    key={log.id} 
                    post={log} 
                    onAcknowledge={onAcknowledge} 
                    onAcceptSolution={onAcceptSolution} 
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'manage_pins' && isOwnProfile && (
            <section className="profile-section component-border manage-pins-panel">
              <h2 className="mono-text uppercase section-heading">&gt;_ Manage_Identity_Pins</h2>
              <p className="mono-text panel-helper">Configure up to 6 workspaces or transmissions to pin on your overview dashboard.</p>
              
              <div className="form-grid-2">
                {/* Workspaces Pinning Column */}
                <div className="pin-config-col component-border">
                  <h3 className="mono-text uppercase list-title">// Workspaces</h3>
                  <div className="pin-list scrollable-pin-list">
                    {projectsList.map(proj => {
                      const name = typeof proj === 'string' ? proj : proj.name;
                      const isPinned = pinnedProjects.some(p => p.name === name);
                      return (
                        <div key={name} className="pin-item component-border">
                          <span className="mono-text truncate uppercase">{name}</span>
                          <button
                            className={`pin-action-btn mono-text ${isPinned ? 'pinned-active' : ''}`}
                            onClick={() => isPinned ? unpinProjectMutation.mutate(name) : pinProjectMutation.mutate(name)}
                          >
                            {isPinned ? '[ UNPIN ]' : '[ PIN ]'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Logs Pinning Column */}
                <div className="pin-config-col component-border">
                  <h3 className="mono-text uppercase list-title">// Transmissions</h3>
                  <div className="pin-list scrollable-pin-list">
                    {userLogs.map(log => {
                      const isPinned = pinnedLogs.some(l => l.id === log.id);
                      return (
                        <div key={log.id} className="pin-item component-border">
                          <span className="mono-text truncate uppercase">{log.title}</span>
                          <button
                            className={`pin-action-btn mono-text ${isPinned ? 'pinned-active' : ''}`}
                            onClick={() => isPinned ? unpinLogMutation.mutate(log.id) : pinLogMutation.mutate(log.id)}
                          >
                            {isPinned ? '[ UNPIN ]' : '[ PIN ]'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button className="back-overview-btn mono-text" onClick={() => setActiveTab('overview')}>
                &lt;&lt; RETURN TO PROFILE OVERVIEW
              </button>
            </section>
          )}
        </main>
      </div>

      {/* 4. EDIT PROFILE MODAL */}
      {isEditModalOpen && (
        <EditProfileModal 
          profile={profile} 
          onClose={() => setIsEditModalOpen(false)} 
          onSubmit={handleEditSubmit} 
        />
      )}
    </div>
  );
}
