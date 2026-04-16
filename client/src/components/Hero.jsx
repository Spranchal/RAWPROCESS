import React, { useState } from 'react';
import './Hero.css';
import bellIcon from '../assets/bell.png';
import terminalIcon from '../assets/terminal.png';

export default function Hero({ onNewLogClick, searchQuery, setSearchQuery, currentView, notifications = [], markNotificationsRead }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const topText = currentView === 'feed' ? 'FEED / GLOBAL' : 'FEED / MY_PROJECTS';
  
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const toggleNotifications = () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);
    if (nextState && unreadCount > 0) markNotificationsRead();
  };

  return (
    <div className="top-header-layout">
      {/* Top Header Bar */}
      <header className="global-header component-border">
        <div className="header-left">
          <h2 className="header-title uppercase">{topText}</h2>
          <input 
            type="text" 
            className="search-input mono-text component-border" 
            placeholder="SEARCH_PROCESS..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="header-right" style={{ position: 'relative' }}>
          <div className="notification-wrapper" onClick={toggleNotifications}>
            <img src={bellIcon} alt="Notifications" className="header-icon" />
            {unreadCount > 0 && <span className="notification-badge mono-text">{unreadCount}</span>}
          </div>
          <img src={terminalIcon} alt="Terminal" className="header-icon" />
          <img className="avatar component-border" src="/favicon.png" alt="User" />
        
          {showNotifications && (
            <div className="notification-panel component-border">
              <div className="notification-header mono-text">NETWORK_ALERTS</div>
              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div className="notification-item mono-text" style={{justifyContent: 'center', color: '#888'}}>NO_ALERTS</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`notification-item mono-text ${n.is_read ? 'read' : 'unread'}`}>
                      [ &gt; ] USER_{n.actor?.toUpperCase()} {n.type === 'like' ? 'APPROVED' : 'COMMENTED ON'} YOUR PROCESS
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-content-section">
        <div className="hero-text-block">
          <h1 className="hero-heading">LIVE_UPDATES</h1>
          <p className="hero-subtext mono-text">SYNCHRONIZING RAW DEVELOPMENT LOGS ACROSS THE GRID.</p>
        </div>
        <button className="new-update-btn mono-text" onClick={onNewLogClick}>
          + NEW UPDATE
        </button>
      </section>
      <div className="separator-line"></div>
    </div>
  );
}
