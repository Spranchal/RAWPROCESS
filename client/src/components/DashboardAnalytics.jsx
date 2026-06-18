import React from 'react';
import './DashboardAnalytics.css';

export default function DashboardAnalytics({ analytics }) {
  if (!analytics) return null;

  const { logsPerWeek = [0,0,0,0], likesPerWeek = [0,0,0,0], commentsPerWeek = [0,0,0,0], projectActivity = [] } = analytics;

  const renderSparkline = (data, title, color) => {
    const max = Math.max(...data, 1);
    const height = 60;
    const width = 180;
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (val / max) * (height - 10) - 5;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="sparkline-card component-border">
        <div className="sparkline-header mono-text uppercase">{title}</div>
        <div className="sparkline-body">
          <svg className="sparkline-svg" width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
            <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="#e0e0e0" strokeDasharray="3,3" strokeWidth="1" />
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="4"
              points={points}
            />
            {data.map((val, i) => {
              const x = (i / (data.length - 1)) * width;
              const y = height - (val / max) * (height - 10) - 5;
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r="5" fill="#000000" stroke={color} strokeWidth="2" />
                  <title>{`Week ${i+1}: ${val}`}</title>
                </g>
              );
            })}
          </svg>
          <div className="sparkline-footer mono-text">
            <span>W1: {data[0]}</span>
            <span>W4: {data[3]}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-analytics-container">
      <div className="sparklines-grid">
        {renderSparkline(logsPerWeek, 'Logs_Posted_Weekly', '#000000')}
        {renderSparkline(likesPerWeek, 'Likes_Received_Weekly', '#FF4B4B')}
        {renderSparkline(commentsPerWeek, 'Comments_Weekly', '#dc3135')}
      </div>
      
      <div className="project-activity-card component-border" style={{ marginTop: '24px' }}>
        <div className="activity-card-header mono-text uppercase">Project_Workload_Distribution</div>
        <div className="activity-card-body">
          {projectActivity.length === 0 ? (
            <div className="mono-text" style={{ padding: '12px', color: '#666' }}>NO_PROJECT_ACTIVITY_RECORDED</div>
          ) : (
            projectActivity.map((proj) => {
              const maxCount = Math.max(...projectActivity.map(p => p.count), 1);
              const percentage = Math.round((proj.count / maxCount) * 100);
              return (
                <div key={proj.project} className="project-activity-row">
                  <div className="project-activity-info mono-text">
                    <span className="project-name">{proj.project.toUpperCase()}</span>
                    <span className="project-count">{proj.count} LOGS</span>
                  </div>
                  <div className="project-bar-container">
                    <div 
                      className="project-bar" 
                      style={{ 
                        width: `${percentage}%` 
                      }}
                    ></div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
