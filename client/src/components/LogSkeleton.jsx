import React from 'react';
import './LogSkeleton.css';

const LogSkeleton = () => {
  return (
    <div className="log-skeleton component-border">
      <div className="skeleton-header">
        <div className="skeleton-block header-title-sub"></div>
        <div className="skeleton-block header-info"></div>
      </div>
      <div className="skeleton-body">
        <div className="skeleton-line full"></div>
        <div className="skeleton-line medium"></div>
        <div className="skeleton-line short"></div>
        <div className="skeleton-image"></div>
      </div>
      <div className="skeleton-footer">
        <div className="skeleton-label"></div>
      </div>
    </div>
  );
};

export default LogSkeleton;
