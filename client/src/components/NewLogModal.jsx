import React, { useState } from 'react';
import './NewLogModal.css';

export default function NewLogModal({ onClose, onSubmit, projectsList = [] }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('success');
  const [project, setProject] = useState('');
  const [image, setImage] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title && content) {
      onSubmit({ title, content, status, image, project });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container component-border">
        <div className="modal-header">
          <h2 className="mono-text uppercase">&gt;_ Create_New_Log</h2>
          <button className="close-btn" onClick={onClose}>[X]</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="input-group">
            <label className="mono-text uppercase label-sm">Title</label>
            <input 
              className="terminal-input mono-text" 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter log title..."
              autoFocus
            />
          </div>

          <div className="input-group">
            <label className="mono-text uppercase label-sm">Description</label>
            <textarea 
              className="terminal-input mono-text" 
              value={content} 
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter log details..."
              rows={5}
            />
          </div>

          <div className="input-group">
            <label className="mono-text uppercase label-sm">Classification</label>
            <select className="terminal-input mono-text uppercase" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="success">Standard / Success</option>
              <option value="error">Failure / Alert</option>
            </select>
          </div>

          <div className="input-group">
            <label className="mono-text uppercase label-sm">Project_Workspace_Tag</label>
            <select 
              className="terminal-input mono-text uppercase" 
              value={project} 
              onChange={(e) => setProject(e.target.value)}
            >
              <option value="">[ NONE / GLOBAL ]</option>
              {projectsList.map(p => {
                const name = typeof p === 'string' ? p : p.name;
                return <option key={name} value={name}>{name}</option>;
              })}
            </select>
          </div>

          <div className="input-group">
            <label className="mono-text uppercase label-sm">Surveillance_Capture (Optional)</label>
            <input 
              className="terminal-input mono-text" 
              type="file" 
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onClose}>Cancel</button>
            <button type="submit">Submit_Log</button>
          </div>
        </form>
      </div>
    </div>
  );
}
