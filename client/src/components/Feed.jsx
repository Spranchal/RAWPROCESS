import React from 'react';
import PostCard from './PostCard';
import './Feed.css';

export default function Feed({ logs, onAcknowledge, searchQuery = '', hasMore, onLoadMore, isLoadingMore }) {
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
      
      {hasMore && (
        <div className="load-more-container">
          <button 
            className="load-more-btn mono-text component-border" 
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "[ SYNCHRONIZING_GRID_DATA... ]" : "[ LOAD_MORE_DATA ]"}
          </button>
        </div>
      )}

      {!hasMore && filteredLogs.length > 0 && (
        <div className="feed-end mono-text">--- END_OF_TRANSMISSION ---</div>
      )}
    </div>
  );
}
