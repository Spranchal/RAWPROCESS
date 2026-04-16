import React, { useState, useEffect } from 'react';
import './ActiveSessions.css';

export default function ActiveSessions({ token, onLogout }) {
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setSessionData(data))
    .catch(console.error);
  }, [token]);

  if (!sessionData) return <div className="terminal-loader mono-text component-border">BOOTING SECURE TERMINAL...</div>;

  const date = new Date((sessionData.iat || Math.floor(Date.now()/1000)) * 1000).toLocaleString();

  return (
    <div className="sessions-container">
      <div className="terminal-screen component-border mono-text">
        <div className="terminal-header">
          <span>ROOT_ACCESS_TERMINAL // SESSION_TRACKER</span>
        </div>
        <div className="terminal-body">
          <p className="typewriter-text">&gt; ESTABLISHING SECURE CONNECTION...</p>
          <p className="typewriter-text">&gt; CONNECTION SECURED.</p>
          <br/>
          <table className="session-table">
            <tbody>
              <tr>
                <td>CONNECTED_USER:</td>
                <td style={{color: '#00ff00'}}>{sessionData.user?.username || 'UNKNOWN'}</td>
              </tr>
              <tr>
                <td>SECURITY_CLEARANCE:</td>
                <td>VERIFIED L-1</td>
              </tr>
              <tr>
                <td>SESSION_ESTABLISHED:</td>
                <td>{date}</td>
              </tr>
              <tr>
                <td>NETWORK_IP_ADDRESS:</td>
                <td>[ ENCRYPTED ]</td>
              </tr>
              <tr>
                <td>ENCRYPTED_KEY:</td>
                <td style={{wordBreak: 'break-all'}}>{token.substring(0, 40)}...</td>
              </tr>
            </tbody>
          </table>
          <br/>
          <button className="terminate-btn mono-text" onClick={onLogout}>
            [ DISCONNECT SESSION ]
          </button>
        </div>
      </div>
    </div>
  );
}
