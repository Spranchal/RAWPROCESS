import React, { useState } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ContributionGraph from './ContributionGraph';
import DashboardAnalytics from './DashboardAnalytics';
import './Dashboard.css';

export default function Dashboard({ setCurrentView, setSearchQuery, setIsModalOpen, token }) {
  const queryClient = useQueryClient();
  const { data: dashboardData, isLoading, isError } = useDashboard();
  const [showInlineProjForm, setShowInlineProjForm] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjPublic, setNewProjPublic] = useState(true);

  // Generic follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: async ({ username, isFollowing }) => {
      const method = isFollowing ? 'DELETE' : 'POST';
      const res = await fetch(`http://localhost:3001/api/users/${username}/follow`, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('rawprocess_token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Failed to follow/unfollow user');
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  // Project creation mutation
  const createProjectMutation = useMutation({
    mutationFn: async ({ name, isPublic }) => {
      const res = await fetch('http://localhost:3001/api/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('rawprocess_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, isPublic })
      });
      if (!res.ok) throw new Error('Failed to create project');
      return res.json();
    },
    onSuccess: () => {
      setNewProjName('');
      setShowInlineProjForm(false);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });

  const handleCreateProjectSubmit = (e) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    createProjectMutation.mutate({ name: newProjName.trim(), isPublic: newProjPublic });
  };

  const handleQuickAction = (action) => {
    if (action === 'new_log') {
      setIsModalOpen(true);
    } else if (action === 'create_project') {
      setShowInlineProjForm(prev => !prev);
    } else if (action === 'browse_logs') {
      setCurrentView('feed');
    } else if (action === 'search_devs') {
      const searchInput = document.querySelector('.search-input');
      if (searchInput) {
        searchInput.focus();
      }
    } else if (action === 'open_notifications') {
      const bell = document.querySelector('.notification-wrapper');
      if (bell) {
        bell.click();
      }
    }
  };

  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const formatDateGroup = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="dashboard-layout loading-state">
        <div className="skeleton-welcome component-border"></div>
        <div className="skeleton-stats-grid">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton-stat-card component-border"></div>)}
        </div>
        <div className="skeleton-main-grid">
          <div className="skeleton-column-left">
            <div className="skeleton-graph component-border" style={{height: '250px'}}></div>
            <div className="skeleton-projects component-border" style={{height: '350px'}}></div>
          </div>
          <div className="skeleton-column-right">
            <div className="skeleton-timeline component-border" style={{height: '600px'}}></div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !dashboardData) {
    return (
      <div className="dashboard-error mono-text component-border">
        FATAL: FAILED_TO_SYNC_WITH_DASHBOARD_GRID_STATE
      </div>
    );
  }

  const {
    user = {},
    stats = {},
    recentNotifications = [],
    recentFollowers = [],
    recentProjects = [],
    trendingLogs = [],
    activityTimeline = [],
    suggestedUsers = [],
    analytics = {}
  } = dashboardData;

  const todayDateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Group activity timeline by date
  const groupedTimeline = activityTimeline.reduce((groups, item) => {
    const groupKey = formatDateGroup(item.timestamp);
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(item);
    return groups;
  }, {});

  return (
    <div className="dashboard-layout">
      {/* 1. Welcome Header */}
      <header className="dashboard-welcome component-border">
        <div className="welcome-left">
          <h1 className="welcome-title uppercase">Welcome back, {user.full_name || user.username}</h1>
          <p className="welcome-date mono-text">{todayDateStr}</p>
        </div>
        <div className="welcome-right mono-text">
          <span className="welcome-stat-badge">🔥 {stats.currentStreak} Day Streak</span>
          <span className="welcome-stat-badge">💻 {stats.totalContributions} Contributions</span>
        </div>
      </header>

      {/* 2. Today's Stats Cards */}
      <section className="stats-section">
        <div className="stats-cards-grid">
          <div className="stat-card component-border">
            <span className="stat-icon">🟢</span>
            <div className="stat-details">
              <span className="stat-value">{stats.logsToday}</span>
              <span className="stat-label mono-text">Logs Posted</span>
            </div>
          </div>

          <div className="stat-card component-border">
            <span className="stat-icon">🔥</span>
            <div className="stat-details">
              <span className="stat-value">{stats.currentStreak} Days</span>
              <span className="stat-label mono-text">Current Streak</span>
            </div>
          </div>

          <div className="stat-card component-border">
            <span className="stat-icon" style={{color: 'var(--tertiary)'}}>❤️</span>
            <div className="stat-details">
              <span className="stat-value">{stats.likesReceived}</span>
              <span className="stat-label mono-text">Likes Received</span>
            </div>
          </div>

          <div className="stat-card component-border">
            <span className="stat-icon">💬</span>
            <div className="stat-details">
              <span className="stat-value">{stats.commentsReceived}</span>
              <span className="stat-label mono-text">Comments Recv</span>
            </div>
          </div>

          <div className="stat-card component-border">
            <span className="stat-icon">🚀</span>
            <div className="stat-details">
              <span className="stat-value">{stats.activeProjects}</span>
              <span className="stat-label mono-text">Active Projects</span>
            </div>
          </div>

          <div className="stat-card component-border">
            <span className="stat-icon">👥</span>
            <div className="stat-details">
              <span className="stat-value">{stats.followers}</span>
              <span className="stat-label mono-text">Followers</span>
            </div>
          </div>
        </div>
      </section>

      {/* COMMAND CENTER QUICK ACTIONS */}
      <div className="dashboard-middle-grid">
        <section className="dashboard-section medium component-border quick-actions-section">
          <h2 className="section-title mono-text uppercase">[ 01_COMMAND_QUICK_ACTIONS ]</h2>
          <div className="quick-actions-panel">
            <button className="action-btn mono-text" onClick={() => handleQuickAction('new_log')}>
              &gt; NEW_LOG
            </button>
            <button className="action-btn mono-text" onClick={() => handleQuickAction('create_project')}>
              &gt; CREATE_PROJECT
            </button>
            <button className="action-btn mono-text" onClick={() => handleQuickAction('browse_logs')}>
              &gt; BROWSE_FEED
            </button>
            <button className="action-btn mono-text" onClick={() => handleQuickAction('search_devs')}>
              &gt; SEARCH_OBSERVERS
            </button>
            <button className="action-btn mono-text" onClick={() => handleQuickAction('open_notifications')}>
              &gt; ALERTS_PANEL
            </button>
          </div>

          {showInlineProjForm && (
            <form onSubmit={handleCreateProjectSubmit} className="inline-create-project-form component-border">
              <h4 className="mono-text uppercase" style={{marginBottom: '8px'}}>&gt; SETUP_PROJECT</h4>
              <input 
                type="text" 
                className="terminal-input mono-text" 
                placeholder="PROJECT_NAME..."
                value={newProjName}
                onChange={e => setNewProjName(e.target.value)}
                required
                style={{marginBottom: '12px', width: '100%', padding: '8px'}}
              />
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <label className="mono-text" style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem'}}>
                  <input type="checkbox" checked={newProjPublic} onChange={e => setNewProjPublic(e.target.checked)} />
                  PUBLIC_NETWORK
                </label>
                <button type="submit" disabled={createProjectMutation.isPending} className="mono-text" style={{padding: '6px 12px', fontSize: '0.8rem'}}>
                  {createProjectMutation.isPending ? 'EXECUTING...' : 'EXECUTE'}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* 8. Weekly Contribution Chart */}
        <section className="dashboard-section medium component-border contributions-section">
          <h2 className="section-title mono-text uppercase">[ 02_CONTRIBUTION_TELEMETRY ]</h2>
          <div className="dashboard-contributions-wrapper">
            <ContributionGraph contributions={analytics.projectActivity ? (dashboardData.contributions || []) : []} />
            <div className="contributions-metrics mono-text">
              <div className="metric-row">
                <span>WEEKLY_LOGS:</span>
                <span className="val">{stats.contributionsThisWeek}</span>
              </div>
              <div className="metric-row">
                <span>CURRENT_STREAK:</span>
                <span className="val">{stats.currentStreak} DAYS</span>
              </div>
              <div className="metric-row">
                <span>LONGEST_STREAK:</span>
                <span className="val">{stats.longestStreak} DAYS</span>
              </div>
              <div className="metric-row">
                <span>TOTAL_TRANSMISSIONS:</span>
                <span className="val">{stats.totalContributions}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 11. Dashboard Analytics */}
      <section className="dashboard-section wide component-border analytics-charts-section" style={{marginBottom: '24px'}}>
        <h2 className="section-title mono-text uppercase">[ 03_GRID_ANALYTICS_TELEMETRY ]</h2>
        <div style={{padding: '16px'}}>
          <DashboardAnalytics analytics={analytics} />
        </div>
      </section>

      {/* MAIN 4-COLUMN RESPONSIVE LAYOUT GRID FOR SECTIONS */}
      <div className="dashboard-grid">
        
        {/* 5. Projects Worked On */}
        <section className="dashboard-section component-border projects-section">
          <h2 className="section-title mono-text uppercase">[ 04_PROJECTS_OBSERVED ]</h2>
          <div className="section-body">
            {recentProjects.length === 0 ? (
              <div className="empty-state mono-text">
                CREATE_YOUR_FIRST_PROJECT
                <button onClick={() => setShowInlineProjForm(true)} style={{marginTop: '12px'}}>CREATE_NOW</button>
              </div>
            ) : (
              <div className="projects-list">
                {recentProjects.map(proj => {
                  const progress = proj.total_issues > 0 ? Math.round((proj.resolved_issues / proj.total_issues) * 100) : 100;
                  return (
                    <div 
                      key={proj.name} 
                      className="project-row-item component-border"
                      onClick={() => {
                        // route to workspaces and auto select is done in component,
                        // for now switch to workspaces.
                        setCurrentView('workspaces');
                      }}
                    >
                      <div className="proj-row-header">
                        <span className="proj-name mono-text">&gt;_ {proj.name}</span>
                        <span className={`proj-badge mono-text ${proj.is_public !== 0 ? 'public' : 'private'}`}>
                          {proj.is_public !== 0 ? 'PUBLIC' : 'PRIVATE'}
                        </span>
                      </div>
                      <div className="proj-progress-section mono-text">
                        <div className="proj-progress-info">
                          <span>PROGRESS {progress}%</span>
                          <span>ISSUES: {proj.open_issues}</span>
                        </div>
                        <div className="proj-progress-bar-container">
                          <div className="proj-progress-bar" style={{ width: `${progress}%` }}></div>
                        </div>
                      </div>
                      <span className="proj-updated-time mono-text">
                        UPDATED: {formatRelativeTime(proj.last_updated)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <button className="view-all-btn mono-text" onClick={() => setCurrentView('workspaces')}>
              [ VIEW_ALL_PROJECTS ]
            </button>
          </div>
        </section>

        {/* 6. Trending Logs */}
        <section className="dashboard-section component-border trending-section">
          <h2 className="section-title mono-text uppercase">[ 05_TRENDING_LOGS ]</h2>
          <div className="section-body">
            {trendingLogs.length === 0 ? (
              <div className="empty-state mono-text">
                SHARE_YOUR_FIRST_DEBUGGING_JOURNEY
                <button onClick={() => setIsModalOpen(true)} style={{marginTop: '12px'}}>POST_LOG</button>
              </div>
            ) : (
              <div className="trending-list">
                {trendingLogs.map(log => (
                  <div 
                    key={log.id} 
                    className={`trending-row-item component-border ${log.status === 'error' ? 'error-type' : log.status === 'resolved' ? 'resolved-type' : ''}`}
                    onClick={() => {
                      setSearchQuery(log.title);
                      setCurrentView('feed');
                    }}
                  >
                    <div className="trending-top">
                      <span className="trending-title mono-text">{log.title}</span>
                      <span className="trending-author mono-text">@{log.author}</span>
                    </div>
                    <div className="trending-meta mono-text">
                      <span className="trending-category">PROJ: {log.project}</span>
                      <div className="trending-scores">
                        <span>❤️ {log.likes_count}</span>
                        <span>💬 {log.comments_count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 3. Recent Notifications */}
        <section className="dashboard-section component-border alerts-section">
          <h2 className="section-title mono-text uppercase">[ 06_RECENT_ALERTS ]</h2>
          <div className="section-body">
            {recentNotifications.length === 0 ? (
              <div className="empty-state mono-text">NO_ALERTS_ON_GRID</div>
            ) : (
              <div className="alerts-list">
                {recentNotifications.map(n => {
                  let alertText = `User ${n.actor} triggered an event`;
                  if (n.type === 'like') alertText = `🔔 ${n.actor} liked your log "${n.log_title || 'Untitled'}"`;
                  else if (n.type === 'comment') alertText = `💬 ${n.actor} commented on "${n.log_title || 'Untitled'}"`;
                  else if (n.type === 'follow') alertText = `👤 ${n.actor} started following you`;
                  else if (n.type === 'accept_solution') alertText = `✅ Your solution was accepted on "${n.log_title || 'Untitled'}"`;

                  return (
                    <div key={n.id} className={`alert-row-item mono-text ${!n.is_read ? 'unread' : ''}`}>
                      <div className="alert-content">
                        {alertText}
                      </div>
                      <div className="alert-time">
                        {formatRelativeTime(n.timestamp)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <button className="view-all-btn mono-text" onClick={() => handleQuickAction('open_notifications')}>
              [ VIEW_ALL_NOTIFICATIONS ]
            </button>
          </div>
        </section>

        {/* 4. Recent Followers */}
        <section className="dashboard-section component-border followers-section">
          <h2 className="section-title mono-text uppercase">[ 07_RECENT_FOLLOWERS ]</h2>
          <div className="section-body">
            {recentFollowers.length === 0 ? (
              <div className="empty-state mono-text">
                START_CONNECTING_WITH_DEVELOPERS
              </div>
            ) : (
              <div className="followers-list">
                {recentFollowers.map(f => (
                  <div key={f.username} className="follower-row-item component-border">
                    <div className="follower-left">
                      <span className="follower-avatar">👤</span>
                      <div className="follower-info">
                        <span className="follower-username mono-text">@{f.username}</span>
                        <span className="follower-bio mono-text">{f.bio}</span>
                      </div>
                    </div>
                    {!f.is_following && (
                      <button 
                        className="follow-back-btn mono-text"
                        onClick={() => followMutation.mutate({ username: f.username, isFollowing: false })}
                        disabled={followMutation.isPending}
                      >
                        [FOLLOW]
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 10. Suggested Developers */}
        <section className="dashboard-section component-border suggestions-section">
          <h2 className="section-title mono-text uppercase">[ 08_SUGGESTED_DEVELOPERS ]</h2>
          <div className="section-body">
            {suggestedUsers.length === 0 ? (
              <div className="empty-state mono-text">NO_SUGGESTIONS_AVAILABLE</div>
            ) : (
              <div className="suggestions-list">
                {suggestedUsers.map(s => (
                  <div key={s.username} className="suggestion-row-item component-border">
                    <div className="suggestion-left">
                      <span className="suggestion-avatar">👤</span>
                      <div className="suggestion-info">
                        <span className="suggestion-username mono-text">@{s.username}</span>
                        <span className="suggestion-bio mono-text">{s.bio}</span>
                        {s.mutual_count > 0 && (
                          <span className="suggestion-mutual mono-text">{s.mutual_count} MUTUAL OBSERVERS</span>
                        )}
                      </div>
                    </div>
                    <button 
                      className="follow-suggest-btn mono-text"
                      onClick={() => followMutation.mutate({ username: s.username, isFollowing: false })}
                      disabled={followMutation.isPending}
                    >
                      FOLLOW
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 7. Activity Timeline */}
        <section className="dashboard-section component-border timeline-section">
          <h2 className="section-title mono-text uppercase">[ 09_ACTIVITY_FEED ]</h2>
          <div className="section-body">
            {activityTimeline.length === 0 ? (
              <div className="empty-state mono-text">NO_ACTIVITIES_LOGGED</div>
            ) : (
              <div className="timeline-activity-list">
                {Object.keys(groupedTimeline).map(dateKey => (
                  <div key={dateKey} className="timeline-date-group">
                    <h4 className="timeline-date-header mono-text">{dateKey}</h4>
                    <div className="timeline-group-items">
                      {groupedTimeline[dateKey].map((act, idx) => {
                        let activityMsg = '';
                        if (act.type === 'post') activityMsg = `✔ Posted log "${act.title}" in workspace [${act.project}]`;
                        else if (act.type === 'comment') activityMsg = `✔ Suggested solution on "${act.log_title || 'Untitled'}"`;
                        else if (act.type === 'follow') activityMsg = `✔ Established observation on user @${act.followed}`;
                        else if (act.type === 'project') activityMsg = `✔ Initialized new project workspace "${act.project_title}"`;
                        else if (act.type === 'accept_solution') activityMsg = `✔ Accepted @${act.solver}'s solution for "${act.log_title || 'Untitled'}"`;

                        return (
                          <div key={idx} className="timeline-item mono-text">
                            <span className="timeline-item-msg">{activityMsg}</span>
                            <span className="timeline-item-time">{formatRelativeTime(act.timestamp)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
