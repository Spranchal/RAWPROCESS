import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import './App.css'
import Sidebar from './components/Sidebar'
import Hero from './components/Hero'
import Feed from './components/Feed'
import ProjectsView from './components/ProjectsView'
import NewLogModal from './components/NewLogModal'
import Login from './components/Login'
import ProjectDetails from './components/ProjectDetails'
import ActiveSessions from './components/ActiveSessions'
import ProfileView from './components/ProfileView'

function App() {
  const [token, setToken] = useState(localStorage.getItem('rawprocess_token') || null);
  const [logs, setLogs] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState('feed');
  const [searchQuery, setSearchQuery] = useState('');
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [viewingUsername, setViewingUsername] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchLogs = (offset = 0) => {
    if (!token) return;
    const url = `http://localhost:3001/api/feed/paginated?limit=10&offset=${offset}`;
    
    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (offset === 0) {
          setLogs(data.logs || []);
          setProjectsList(data.projects || []);
        } else {
          setLogs(prev => [...prev, ...(data.logs || [])]);
        }
        setHasMore(data.hasMore);
      })
      .catch(err => console.error("Could not load feed logs:", err))
      .finally(() => setIsLoadingMore(false));
  };

  const handleLoadMore = () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    fetchLogs(logs.length);
  };

  useEffect(() => {
    if (token) {
      const newSocket = io('http://localhost:3001');
      setSocket(newSocket);
      fetchLogs();
      
      // Fetch initial array
      fetch('http://localhost:3001/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setNotifications(data.notifications || []))
      .catch(err => console.error("Could not load notifications:", err));
      
      return () => newSocket.close();
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
      }
    }
  }, [token]);

  useEffect(() => {
    // Handle URL hash navigation for profiles (e.g., #/profile/admin)
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/profile/')) {
        const username = hash.split('/profile/')[1];
        setViewingUsername(username);
        setCurrentView('profile');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check initial hash
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('newLog', (newLog) => {
      setLogs((prev) => {
        if (prev.some(l => l.id === newLog.id)) return prev;
        return [{...newLog, comments: [], likes: []}, ...prev];
      });
    });
    socket.on('acknowledgeLog', (id) => {
      setLogs((prev) => prev.map(log => 
        log.id === parseInt(id) ? { ...log, status: 'success' } : log
      ));
    });
    socket.on('likeUpdated', ({ logId, likes }) => {
      setLogs(prev => prev.map(log => 
        log.id === parseInt(logId) ? { ...log, likes } : log
      ));
    });
    socket.on('newComment', ({ logId, comment }) => {
      setLogs(prev => prev.map(log => 
        log.id === parseInt(logId) ? { ...log, comments: [...(log.comments || []), comment] } : log
      ));
    });
    socket.on('solutionAccepted', ({ logId, commentId }) => {
      setLogs(prev => prev.map(log => {
        if (log.id === parseInt(logId)) {
          return {
            ...log,
            status: 'resolved',
            comments: (log.comments || []).map(c => c.id === parseInt(commentId) ? { ...c, accepted: 1 } : c)
          };
        }
        return log;
      }));
    });
    socket.on('newProject', (proj) => {
      // proj can be an object {name, is_public} or a string — normalize it
      setProjectsList(prev => {
        const projObj = typeof proj === 'string' ? { name: proj, is_public: 1 } : proj;
        if (prev.some(p => (p.name || p) === projObj.name)) return prev;
        return [...prev, projObj];
      });
    });
    socket.on('newNotification', () => {
      fetch('http://localhost:3001/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setNotifications(data.notifications || []))
      .catch(console.error);
    });
    socket.on('onlineCount', (count) => {
      setOnlineCount(count);
    });
    return () => {
      socket.off('newLog');
      socket.off('acknowledgeLog');
      socket.off('likeUpdated');
      socket.off('newComment');
      socket.off('solutionAccepted');
      socket.off('newProject');
      socket.off('newNotification');
      socket.off('onlineCount');
    };
  }, [socket, token]);

  const handleLogin = (newToken, user) => {
    localStorage.setItem('rawprocess_token', newToken);
    if (user) localStorage.setItem('rawprocess_user', user);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.setItem('rawprocess_token', '');
    setToken(null);
  };

  const handleNewLog = async (logData) => {
    try {
      const formData = new FormData();
      formData.append('title', logData.title);
      formData.append('content', logData.content);
      formData.append('status', logData.status);
      if (logData.project) formData.append('project', logData.project);
      if (logData.image) formData.append('image', logData.image);

      const res = await fetch('http://localhost:3001/api/feed', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(prev => {
          if (prev.some(l => l.id === data.log.id)) return prev;
          return [{...data.log, comments: [], likes: []}, ...prev];
        });
        setIsModalOpen(false);
      }
      else if (res.status === 401 || res.status === 403) handleLogout();
    } catch (err) {
      console.error("Error posting log:", err);
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      const res = await fetch(`http://localhost:3001/api/feed/${id}/acknowledge`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok && (res.status === 401 || res.status === 403)) handleLogout();
    } catch (err) {
      console.error("Error acknowledging log:", err);
    }
  };

  const handleNewProjectLocal = (proj) => {
    // proj can be {name, is_public} object or a string — normalize it
    setProjectsList(prev => {
      const projObj = typeof proj === 'string' ? { name: proj, is_public: 1 } : proj;
      if (prev.some(p => (p.name || p) === projObj.name)) return prev;
      return [...prev, projObj];
    });
  };

  const markNotificationsRead = () => {
    fetch('http://localhost:3001/api/notifications/read', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(() => {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    }).catch(console.error);
  };

  if (!token) return <Login onLoginComplete={(t, u) => handleLogin(t, u)} />;

  return (
    <div className="app-container">
      <Sidebar 
        onNewLogClick={() => setIsModalOpen(true)} 
        onLogout={handleLogout}
        currentView={currentView}
        setCurrentView={setCurrentView}
        onlineCount={onlineCount}
      />
      <main className="main-content">
        <Hero 
          onNewLogClick={() => setIsModalOpen(true)} 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          currentView={currentView}
          notifications={notifications}
          markNotificationsRead={markNotificationsRead}
        />
        {currentView === 'feed' ? (
          <Feed 
            logs={logs.filter(log => log.is_public !== 0)} 
            onAcknowledge={handleAcknowledge} 
            searchQuery={searchQuery} 
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            isLoadingMore={isLoadingMore}
          />
        ) : currentView === 'projects' ? (
          <ProjectsView 
             logs={logs} 
             onAcknowledge={handleAcknowledge} 
             searchQuery={searchQuery} 
             projectsList={projectsList} 
             onProjectCreated={handleNewProjectLocal} 
          />
        ) : currentView === 'project_details' ? (
          <ProjectDetails logs={logs} projectsList={projectsList} />
        ) : currentView === 'profile' ? (
          <ProfileView 
            username={viewingUsername} 
            onAcknowledge={handleAcknowledge} 
            socket={socket}
          />
        ) : (
          <ActiveSessions token={token} onLogout={handleLogout} />
        )}
      </main>

      {isModalOpen && <NewLogModal onClose={() => setIsModalOpen(false)} onSubmit={handleNewLog} projectsList={projectsList} />}
    </div>
  )
}

export default App
