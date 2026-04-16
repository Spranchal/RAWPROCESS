import React from 'react';
import './ContributionGraph.css';

const ContributionGraph = ({ contributions = [] }) => {
  // Generate last 100 days for the terminal view (simpler than a full year for now)
  const days = [];
  const today = new Date();
  
  for (let i = 99; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const contrib = contributions.find(c => c.date === dateStr);
    days.push({
      date: dateStr,
      count: contrib ? contrib.count : 0
    });
  }

  const getLevel = (count) => {
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 10) return 3;
    return 4;
  };

  return (
    <div className="contribution-graph-container component-border">
      <div className="graph-header mono-text">CONTRIBUTION_GRID [LAST_100_DAYS]</div>
      <div className="graph-grid">
        {days.map((day, i) => (
          <div 
            key={i} 
            className={`graph-cell level-${getLevel(day.count)}`}
            title={`${day.date}: ${day.count} LOGS`}
          ></div>
        ))}
      </div>
      <div className="graph-legend mono-text">
        <span>LESS</span>
        <div className="graph-cell level-0"></div>
        <div className="graph-cell level-1"></div>
        <div className="graph-cell level-2"></div>
        <div className="graph-cell level-3"></div>
        <div className="graph-cell level-4"></div>
        <span>MORE</span>
      </div>
    </div>
  );
};

export default ContributionGraph;
