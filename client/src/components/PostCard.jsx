import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './PostCard.css';

export default function PostCard({ post, onAcknowledge }) {
  const [commentText, setCommentText] = useState('');
  const [solutionText, setSolutionText] = useState('');
  
  const token = localStorage.getItem('rawprocess_token');

  const handleLike = async () => {
    fetch(`http://localhost:3001/api/feed/${post.id}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  };

  const submitComment = async (type, text, setter) => {
    if (!text.trim()) return;
    await fetch(`http://localhost:3001/api/feed/${post.id}/comment`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: text, type })
    });
    setter('');
  };

  const acceptSolution = async (commentId) => {
    await fetch(`http://localhost:3001/api/feed/${post.id}/solution/${commentId}/accept`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  };

  const isError = post.status === 'error';
  const isResolved = post.status === 'resolved';
  
  if (isError) {
    const traceIndex = post.content.indexOf('STACK_TRACE:');
    let message = post.content;
    let trace = '';
    if (traceIndex !== -1) {
      message = post.content.substring(0, traceIndex).trim();
      trace = post.content.substring(traceIndex).trim();
    }

    const renderMessage = (text) => {
      const parts = text.split('```');
      return parts.map((part, index) => {
        if (index % 2 === 1) {
          return <pre key={index} className="error-code-snippet"><code>{part.trim()}</code></pre>;
        }
        let processedPart = part;
        if (index === 0 && !processedPart.startsWith('[LOG_START]')) {
          processedPart = `[LOG_START] ${processedPart}`;
        }
        return <span key={index} style={{ whiteSpace: 'pre-line' }}>{processedPart}</span>;
      });
    };

    return (
      <article className="error-card">
        <div className="error-header mono-text">
          <span>USER::SYSTEM_CRASH / CRITICAL_FAILURE</span>
          <span>SYSTEM_ERROR_LOG</span>
        </div>
        <div className="error-body">
          <div className="error-icon-container">
            <div className="error-icon">
              <span className="exclamation">!</span>
            </div>
          </div>
          <div className="error-content">
            <h3 className="error-title">{post.title.toUpperCase()}</h3>
            
            {post.imageUrl && (
              <img 
                src={`http://localhost:3001${post.imageUrl}`} 
                alt="Error Visual Data" 
                style={{ width: '100%', marginBottom: '16px', display: 'block', objectFit: 'cover', maxHeight: '400px', border: '2px solid #ffffff' }} 
              />
            )}

            <div className="error-message mono-text">
              {renderMessage(message)}
            </div>
            
            <div className="error-trace mono-text">
              {trace ? trace.split('\n').map((line, i) => <div key={i}>{line}</div>) : (
                <>
                  <div>STACK_TRACE: 0x0045FF -&gt; SegFault at null_ptr_ref</div>
                  <div>LOCATION: src/core/physics/resolver.rs:442</div>
                </>
              )}
            </div>

            <div className="error-solutions mono-text">
              <h4 className="solutions-header">[ PROPOSED_FIXES ]</h4>
              {(post.comments || []).filter(c => c.type === 'solution').map(c => (
                <div key={c.id} className="solution-item">
                  <span className="solution-author">{c.username}: </span>
                  <span className="solution-content">{c.content}</span>
                  {c.accepted ? (
                    <span className="solution-accepted">[ACCEPTED_FIX]</span>
                  ) : (
                    <button className="accept-btn" onClick={() => acceptSolution(c.id)}>MARK_ACCEPTED</button>
                  )}
                </div>
              ))}
              <div className="solution-input-container">
                <input 
                  type="text" 
                  className="solution-input mono-text" 
                  placeholder="SUGGEST FIX..." 
                  value={solutionText}
                  onChange={e => setSolutionText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitComment('solution', solutionText, setSolutionText)}
                />
                <button className="solution-submit-btn" onClick={() => submitComment('solution', solutionText, setSolutionText)}>+</button>
              </div>
            </div>
          </div>
        </div>
        <div className="error-footer mono-text">
          <span>FAILURE_STATUS: UNRESOLVED</span>
          <div className="error-actions">
            <button className="error-btn" onClick={handleLike}>LIKE_ERR [{post.likes?.length || 0}]</button>
            <button className="error-btn" onClick={() => onAcknowledge(post.id)}>FORK_DEBUG</button>
            <button className="error-btn" onClick={() => onAcknowledge(post.id)}>ANALYZE</button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="post-card component-border">
      <div className="card-header">
        <h3 className="card-title mono-text" style={{ flexWrap: 'wrap', gap: '8px', display: 'flex', alignItems: 'center' }}>
          &gt;_ {post.title}
          {isResolved && <span className="resolved-badge">[ ORIGINALLY_ERROR: NOW_SOLVED ]</span>}
        </h3>
        <div style={{ display: 'flex', gap: '16px', color: 'var(--on-surface-variant)' }}>
          <span 
            className="card-author mono-text profile-link" 
            onClick={() => post.author && (window.location.hash = `#/profile/${post.author}`)}
          >
            [ USER_{post.author?.toUpperCase() || 'SYSTEM'} ]
          </span>
          <span className="card-time mono-text">{new Date(post.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
      <div className="card-body">
        {post.imageUrl && (
          <img 
            src={`http://localhost:3001${post.imageUrl}`} 
            alt="Log Visual Data" 
            className="component-border" 
            style={{ width: '100%', marginBottom: '16px', display: 'block', objectFit: 'cover', maxHeight: '400px' }} 
          />
        )}
        <div className="card-markdown-content">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>
        
        {isResolved && (
          <div className="accepted-solution-block component-border">
            <h4 className="mono-text">[ / ACCEPTED_SOLUTION_APPLIED / ]</h4>
            {(post.comments || []).filter(c => c.accepted).map(c => (
              <div key={c.id} className="accepted-solution-item mono-text">
                <span className="solution-author">{c.username}:</span> 
                <span className="solution-text"> {c.content}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card-footer">
        <span className="mono-text label" style={{padding: '8px'}}>{isResolved ? 'STATUS_RESOLVED' : 'STATUS_OK'}</span>
      </div>
      
      <div className="card-interactions mono-text component-border">
        <button className="interaction-btn" onClick={handleLike}>
          LIKE_PROC [{post.likes?.length || 0}]
        </button>
      </div>

      <div className="card-comments mono-text component-border">
        {(post.comments || []).filter(c => c.type === 'comment').map(c => (
          <div key={c.id} className="comment-item">
            <span className="comment-author">{c.username}: </span>
            <span className="comment-content">{c.content}</span>
          </div>
        ))}
        <div className="comment-input-container">
          <input 
            type="text" 
            className="comment-input mono-text" 
            placeholder="APPEND_COMMENT..." 
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitComment('comment', commentText, setCommentText)}
          />
        </div>
      </div>
    </article>
  );
}
