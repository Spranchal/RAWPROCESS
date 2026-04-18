import React from 'react';
import PostCard from './PostCard';
import ContributionGraph from './ContributionGraph';
import LogSkeleton from './LogSkeleton';
import { useProfile, useFollowUser } from '../hooks/useUser';
import './ProfileView.css';

export default function ProfileView({ username, onAcknowledge }) {
  const { data: profile, isLoading, isError } = useProfile(username);
  const followMutation = useFollowUser(username);

  const handleFollow = () => {
    if (!profile) return;
    followMutation.mutate({ isFollowing: profile.isFollowing });
  };

  if (isLoading) {
    return (
      <div className="profile-view-container">
        <div className="profile-header skeleton component-border" style={{height: '200px'}}></div>
        <LogSkeleton />
        <LogSkeleton />
      </div>
    );
  }

  if (isError || !profile) return <div className="profile-view-container mono-text">ERROR: USER_NOT_FOUND</div>;

  const contributions = profile.contributions || [];
  const userLogs = profile.logs || [];

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
        <button 
          className={`follow-btn mono-text ${profile.isFollowing ? 'following' : ''}`} 
          onClick={handleFollow}
          disabled={followMutation.isPending}
        >
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
