import React, { useEffect, useState } from 'react';
import PostCard from './PostCard';
import ContributionGraph from './ContributionGraph';
import LogSkeleton from './LogSkeleton';
import './ProfileView.css';

export default function ProfileView({ username, onAcknowledge, socket }) {
  const [profile, setProfile] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [userLogs, setUserLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('rawprocess_token');

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const [profileRes, contribRes, logsRes] = await Promise.all([
        fetch(`http://localhost:3001/api/users/${username}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:3001/api/users/${username}/contributions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:3001/api/feed/paginated?author=${username}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const profileData = await profileRes.json();
      const contribData = await contribRes.json();
      const logsData = await logsRes.json();

      setProfile(profileData);
      setContributions(contribData.contributions || []);
      setUserLogs(logsData.logs || []);
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [username]);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewLog = (newLog) => {
      if (newLog.author && newLog.author.toLowerCase() === username.toLowerCase()) {
        setUserLogs(prev => [newLog, ...prev]);
        setProfile(prev => ({
          ...prev,
          stats: {
            ...prev.stats,
            logs: prev.stats.logs + 1
          }
        }));
      }
    };

    socket.on('newLog', handleNewLog);
    return () => socket.off('newLog', handleNewLog);
  }, [socket, username]);

  const handleFollow = async () => {
    const method = profile.isFollowing ? 'DELETE' : 'POST';
    const res = await fetch(`http://localhost:3001/api/users/${username}/follow`, {
      method,
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      setProfile(prev => ({
        ...prev,
        isFollowing: !prev.isFollowing,
        stats: {
          ...prev.stats,
          followers: prev.isFollowing ? prev.stats.followers - 1 : prev.stats.followers + 1
        }
      }));
    }
  };

  if (loading) {
    return (
      <div className="profile-view-container">
        <div className="profile-header skeleton component-border" style={{height: '200px'}}></div>
        <LogSkeleton />
        <LogSkeleton />
      </div>
    );
  }

  if (!profile) return <div className="profile-view-container mono-text">ERROR: USER_NOT_FOUND</div>;

  return (
    <div className="profile-view-container">
      <header className="profile-header component-border">
        <div className="profile-info">
          <img className="profile-avatar component-border" src="/favicon.png" alt={username} />
          <div className="profile-text">
            <h1 className="profile-username mono-text">USER_{username.toUpperCase()}</h1>
            <div className="profile-stats mono-text">
              <div className="stat-item">
                <span className="stat-label">LOGS:</span>
                <span className="stat-value">{profile.stats.logs}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">FOLLOWERS:</span>
                <span className="stat-value">{profile.stats.followers}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">FOLLOWING:</span>
                <span className="stat-value">{profile.stats.following}</span>
              </div>
            </div>
          </div>
        </div>
        <button className={`follow-btn mono-text ${profile.isFollowing ? 'following' : ''}`} onClick={handleFollow}>
          {profile.isFollowing ? 'DISCONNECT_OBSERVATION' : 'ESTABLISH_OBSERVATION'}
        </button>
      </header>

      <ContributionGraph contributions={contributions} />

      <div className="profile-activity">
        <h2 className="activity-header mono-text">LATEST_TRANSMISSIONS</h2>
        <div className="profile-logs">
          {userLogs.length === 0 ? (
            <div className="no-logs mono-text component-border">NO_LOGS_ON_GRID</div>
          ) : (
            userLogs.map(log => (
              <PostCard key={log.id} post={log} onAcknowledge={onAcknowledge} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
