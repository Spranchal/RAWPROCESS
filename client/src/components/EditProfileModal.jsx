import React, { useState } from 'react';
import './EditProfileModal.css';

export default function EditProfileModal({ profile, onClose, onSubmit }) {
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [skills, setSkills] = useState(profile.skills || '');
  const [techStack, setTechStack] = useState(profile.tech_stack || '');
  const [githubLink, setGithubLink] = useState(profile.github_link || '');
  const [linkedinLink, setLinkedinLink] = useState(profile.linkedin_link || '');
  const [portfolioLink, setPortfolioLink] = useState(profile.portfolio_link || '');
  const [company, setCompany] = useState(profile.company || '');
  const [college, setCollege] = useState(profile.college || '');
  const [location, setLocation] = useState(profile.location || '');

  // Avatar states
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarMode, setAvatarMode] = useState(profile.avatar_url && !profile.avatar_url.startsWith('/uploads') ? 'url' : 'file');

  // Cover states
  const [coverUrl, setCoverUrl] = useState(profile.cover_url || '');
  const [coverFile, setCoverFile] = useState(null);
  const [coverMode, setCoverMode] = useState(profile.cover_url && !profile.cover_url.startsWith('/uploads') ? 'url' : 'file');

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('full_name', fullName);
    formData.append('bio', bio);
    formData.append('skills', skills);
    formData.append('tech_stack', techStack);
    formData.append('github_link', githubLink);
    formData.append('linkedin_link', linkedinLink);
    formData.append('portfolio_link', portfolioLink);
    formData.append('company', company);
    formData.append('college', college);
    formData.append('location', location);

    if (avatarMode === 'file' && avatarFile) {
      formData.append('avatar', avatarFile);
    } else {
      formData.append('avatar_url', avatarUrl);
    }

    if (coverMode === 'file' && coverFile) {
      formData.append('cover', coverFile);
    } else {
      formData.append('cover_url', coverUrl);
    }

    onSubmit(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container profile-edit-modal component-border">
        <div className="modal-header">
          <h2 className="mono-text uppercase">&gt;_ Configure_Identity_Module</h2>
          <button className="close-btn" onClick={onClose}>[X]</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form scrollable-form">
          <div className="form-grid-2">
            <div className="input-group">
              <label className="mono-text uppercase label-sm">Full Name</label>
              <input 
                className="terminal-input mono-text" 
                type="text" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Observer Name"
              />
            </div>
            <div className="input-group">
              <label className="mono-text uppercase label-sm">Location</label>
              <input 
                className="terminal-input mono-text" 
                type="text" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Sector-7, Grid"
              />
            </div>
          </div>

          <div className="input-group">
            <label className="mono-text uppercase label-sm">Identity Bio (Observer description)</label>
            <textarea 
              className="terminal-input mono-text" 
              value={bio} 
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Decoupling memory cycles from vertex cores."
              rows={3}
            />
          </div>

          {/* AVATAR CONFIGURATION */}
          <div className="input-group toggle-group component-border">
            <div className="toggle-header">
              <span className="mono-text uppercase label-sm">Avatar Image</span>
              <div className="mode-toggle">
                <button 
                  type="button" 
                  className={`toggle-btn mono-text ${avatarMode === 'file' ? 'active' : ''}`}
                  onClick={() => setAvatarMode('file')}
                >
                  UPLOAD_FILE
                </button>
                <button 
                  type="button" 
                  className={`toggle-btn mono-text ${avatarMode === 'url' ? 'active' : ''}`}
                  onClick={() => setAvatarMode('url')}
                >
                  IMAGE_URL
                </button>
              </div>
            </div>
            {avatarMode === 'file' ? (
              <input 
                className="terminal-input mono-text" 
                type="file" 
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files[0])}
              />
            ) : (
              <input 
                className="terminal-input mono-text" 
                type="text" 
                value={avatarUrl} 
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
            )}
          </div>

          {/* COVER IMAGE CONFIGURATION */}
          <div className="input-group toggle-group component-border">
            <div className="toggle-header">
              <span className="mono-text uppercase label-sm">Cover backdrop</span>
              <div className="mode-toggle">
                <button 
                  type="button" 
                  className={`toggle-btn mono-text ${coverMode === 'file' ? 'active' : ''}`}
                  onClick={() => setCoverMode('file')}
                >
                  UPLOAD_FILE
                </button>
                <button 
                  type="button" 
                  className={`toggle-btn mono-text ${coverMode === 'url' ? 'active' : ''}`}
                  onClick={() => setCoverMode('url')}
                >
                  IMAGE_URL
                </button>
              </div>
            </div>
            {coverMode === 'file' ? (
              <input 
                className="terminal-input mono-text" 
                type="file" 
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files[0])}
              />
            ) : (
              <input 
                className="terminal-input mono-text" 
                type="text" 
                value={coverUrl} 
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://example.com/cover.jpg"
              />
            )}
          </div>

          <div className="form-grid-2">
            <div className="input-group">
              <label className="mono-text uppercase label-sm">Current Company / Network</label>
              <input 
                className="terminal-input mono-text" 
                type="text" 
                value={company} 
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. DeepMind"
              />
            </div>
            <div className="input-group">
              <label className="mono-text uppercase label-sm">College / Academy</label>
              <input 
                className="terminal-input mono-text" 
                type="text" 
                value={college} 
                onChange={(e) => setCollege(e.target.value)}
                placeholder="e.g. MIT"
              />
            </div>
          </div>

          <div className="form-grid-3">
            <div className="input-group">
              <label className="mono-text uppercase label-sm">GitHub URL</label>
              <input 
                className="terminal-input mono-text" 
                type="text" 
                value={githubLink} 
                onChange={(e) => setGithubLink(e.target.value)}
                placeholder="https://github.com/..."
              />
            </div>
            <div className="input-group">
              <label className="mono-text uppercase label-sm">LinkedIn URL</label>
              <input 
                className="terminal-input mono-text" 
                type="text" 
                value={linkedinLink} 
                onChange={(e) => setLinkedInLink(e.target.value)}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div className="input-group">
              <label className="mono-text uppercase label-sm">Portfolio URL</label>
              <input 
                className="terminal-input mono-text" 
                type="text" 
                value={portfolioLink} 
                onChange={(e) => setPortfolioLink(e.target.value)}
                placeholder="https://observer.dev"
              />
            </div>
          </div>

          <div className="input-group">
            <label className="mono-text uppercase label-sm">Skills (comma-separated)</label>
            <input 
              className="terminal-input mono-text" 
              type="text" 
              value={skills} 
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. Rust, WebGL, Low-Level Assembly, Caching"
            />
          </div>

          <div className="input-group">
            <label className="mono-text uppercase label-sm">Tech Stack Badges (comma-separated)</label>
            <input 
              className="terminal-input mono-text" 
              type="text" 
              value={techStack} 
              onChange={(e) => setTechStack(e.target.value)}
              placeholder="e.g. React, SQLite, Socket.io, Node.js"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onClose}>Cancel</button>
            <button type="submit">Deploy_Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
