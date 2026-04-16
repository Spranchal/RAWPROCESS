import React, { useState } from 'react';
import './Login.css';

export default function Login({ onLoginComplete }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    
    const endpoint = isRegistering ? 'register' : 'login';
    
    try {
      const res = await fetch(`http://localhost:3001/api/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      if (res.ok) {
        onLoginComplete(data.token);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Connection to auth server failed.');
    }
  };

  return (
    <div className="login-screen">
      <div className="login-module component-border">
        <div className="module-header">
          <h2 className="mono-text">&gt;_ SYSTEM_AUTHORIZATION_REQUIRED</h2>
        </div>
        <form onSubmit={handleAuth} className="login-form">
          <p className="mono-text login-instructions">
            {isRegistering 
              ? "Establish a new localized node identity within the RawProcess grid." 
              : "Enter valid credentials to access the RawProcess social grid."}
          </p>
          
          {error && <div className="login-error mono-text uppercase">{error}</div>}
          
          <div className="input-group">
            <label className="mono-text uppercase label-sm">Observer_ID</label>
            <input 
              className="terminal-input mono-text"
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)}
              placeholder="Observer_ID"
              autoFocus
            />
          </div>

          <div className="input-group">
            <label className="mono-text uppercase label-sm">Passkey</label>
            <input 
              className="terminal-input mono-text"
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              placeholder="password"
            />
          </div>

          <button type="submit" className="login-btn">
            {isRegistering ? 'Establish_Identity()' : 'Initiate_Handshake()'}
          </button>
        </form>
        <div className="auth-toggle mono-text">
          {isRegistering ? (
            <span>Existing Node? <button type="button" className="toggle-btn" onClick={() => setIsRegistering(false)}>Run Protocol: Login</button></span>
          ) : (
            <span>New to Grid? <button type="button" className="toggle-btn" onClick={() => setIsRegistering(true)}>Run Protocol: Register</button></span>
          )}
        </div>
      </div>
    </div>
  );
}
