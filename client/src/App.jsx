import { useEffect, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import './App.css'
import Sidebar from './components/Sidebar'
import Hero from './components/Hero'
import Feed from './components/Feed'
import WorkspaceControl from './components/WorkspaceControl'
import NewLogModal from './components/NewLogModal'
import Login from './components/Login'
import ProfileView from './components/ProfileView'

import { useLogs, useAcknowledgeLog } from './hooks/useLogs'
import { useNotifications, useMarkNotificationsRead } from './hooks/useNotifications'
import { useProjects } from './hooks/useProjects'

function App() {
  const [token, setToken] = useState(localStorage.getItem('rawprocess_token') || null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState('feed');
  const [searchQuery, setSearchQuery] = useState('');
  const [socket, setSocket] = useState(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [viewingUsername, setViewingUsername] = useState('');
  const [offset, setOffset] = useState(0);

  const queryClient = useQueryClient();

  // Queries
  const { data: logsData, isLoading: isLoadingLogs } = useLogs({ limit: 10 + offset });
  const { data: notificationsData } = useNotifications();
  const { data: projectsList = [] } = useProjects();

  // Mutations
  const acknowledgeMutation = useAcknowledgeLog();
  const markReadMutation = useMarkNotificationsRead();

  const handleLoadMore = () => {
    setOffset(prev => prev + 10);
  };

  useEffect(() => {
    if (token) {
      const newSocket = io('http://localhost:3001');
      setSocket(newSocket);
      
      return () => newSocket.close();
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
      }
    }
  }, [token]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/profile/')) {
        const username = hash.split('/profile/')[1];
        if (username) {
          setViewingUsername(username);
          setCurrentView('profile');
        }
      } else if (currentView === 'profile') {
        setCurrentView('feed');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentView]);

  useEffect(() => {
    if (currentView !== 'profile') {
      if (window.location.hash.startsWith('#/profile/')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  }, [currentView]);

  // Socket.io integration with React Query
  useEffect(() => {
    if (!socket) return;

    socket.on('newLog', () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    });
    socket.on('acknowledgeLog', () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    });
    socket.on('likeUpdated', () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    });
    socket.on('newComment', () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    });
    socket.on('solutionAccepted', () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    });
    socket.on('newProject', () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    });
    socket.on('newNotification', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
  }, [socket, queryClient]);

  const handleLogin = (newToken, user) => {
    localStorage.setItem('rawprocess_token', newToken);
    if (user) localStorage.setItem('rawprocess_user', user);
    setToken(newToken);
    queryClient.invalidateQueries();
  };

  const handleLogout = () => {
    localStorage.removeItem('rawprocess_token');
    localStorage.removeItem('rawprocess_user');
    setToken(null);
    queryClient.clear();
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
        queryClient.invalidateQueries({ queryKey: ['logs'] });
        setIsModalOpen(false);
      } else if (res.status === 401 || res.status === 403) {
        handleLogout();
      }
    } catch (err) {
      console.error("Error posting log:", err);
    }
  };

  if (!token) return <Login onLoginComplete={handleLogin} />;

  const logs = logsData?.logs || [];
  const hasMore = logsData?.hasMore || false;
  const notifications = notificationsData?.notifications || [];

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
          markNotificationsRead={() => markReadMutation.mutate()}
        />
        {currentView === 'feed' ? (
          <Feed 
            logs={logs.filter(log => log.is_public !== 0)} 
            onAcknowledge={(id) => acknowledgeMutation.mutate(id)} 
            searchQuery={searchQuery} 
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            isLoadingMore={isLoadingLogs}
          />
        ) : currentView === 'workspaces' ? (
          <WorkspaceControl 
             logs={logs} 
             searchQuery={searchQuery} 
             projectsList={projectsList} 
             token={token}
             onLogout={handleLogout}
          />
        ) : currentView === 'profile' ? (
          <ProfileView 
            username={viewingUsername} 
            onAcknowledge={(id) => acknowledgeMutation.mutate(id)} 
            socket={socket}
          />
        ) : (
          <Feed 
            logs={logs.filter(log => log.is_public !== 0)} 
            onAcknowledge={(id) => acknowledgeMutation.mutate(id)} 
            searchQuery={searchQuery} 
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            isLoadingMore={isLoadingLogs}
          />
        )}
      </main>

      {isModalOpen && (
        <NewLogModal 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={handleNewLog} 
          projectsList={projectsList} 
        />
      )}
    </div>
  )
}

export default App
