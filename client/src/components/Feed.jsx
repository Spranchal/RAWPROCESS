import React from 'react';
import PostCard from './PostCard';
import './Feed.css';

export default function Feed({ logs, onAcknowledge, searchQuery = '' }) {
  if (!logs || logs.length === 0) {
    return <div className="feed-loading mono-text component-border">FETCHING LOGS...</div>;
  }

  const filteredLogs = logs.filter(log => 
    log.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    log.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="feed-container">
      {filteredLogs.map(log => (
        <PostCard key={log.id} post={log} onAcknowledge={onAcknowledge} />
      ))}
      {filteredLogs.length === 0 && <div className="feed-loading mono-text component-border">NO LOGS FOUND MATCHING QUERY '{searchQuery}'</div>}
    </div>
  );
}
