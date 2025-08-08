import React, { useState, useRef, useEffect } from 'react';
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { 
  CheckCircle, 
  Clock, 
  FileText, 
  BookOpen,
  ListTodo,
  ChevronRight,
  ChevronDown,
  Target,
  User
} from 'lucide-react';
import { Link } from 'react-router-dom';
import './static/Sidebar.css';

const Sidebar = () => {
  const [sidebarWidth, setSidebarWidth] = useState(280); // Increased default width
  const [user, setUser] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [recentNotes, setRecentNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const isResizing = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        setupDataListeners(user.uid);
      } else {
        setUser(null);
        setRecentTasks([]);
        setRecentNotes([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const setupDataListeners = (uid) => {
    // Tasks listener
    const tasksQuery = query(collection(db, 'tasks'), where('uid', '==', uid));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get recent tasks (last 5)
      const sortedTasks = tasks
        .sort((a, b) => {
          const aDate = a.createdAt?.toDate() || new Date(0);
          const bDate = b.createdAt?.toDate() || new Date(0);
          return bDate - aDate;
        })
        .slice(0, 5);

      setRecentTasks(sortedTasks);
    });

    // Notes listener
    const notesQuery = query(collection(db, 'notes'), where('uid', '==', uid));
    const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
      const notes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get recent notes (last 4)
      const sortedNotes = notes
        .sort((a, b) => {
          const aDate = a.createdAt?.toDate() || new Date(0);
          const bDate = b.createdAt?.toDate() || new Date(0);
          return bDate - aDate;
        })
        .slice(0, 4);

      setRecentNotes(sortedNotes);
      setLoading(false);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeNotes();
    };
  };

  const handleMouseDown = () => {
    isResizing.current = true;
  };

  const handleMouseMove = (e) => {
    if (!isResizing.current) return;
    const newWidth = e.clientX;
    if (newWidth > 200 && newWidth < 500) { // Adjusted min width
      setSidebarWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    isResizing.current = false;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
  };

  // Attach global mouse events
  React.useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (loading && user) {
    return (
      <div className="container">
        <div className="sidebar" style={{ width: `${sidebarWidth}px` }}>
          <div className="sidebar-header">
            <User size={20} />
            <h3>Recent Activity</h3>
          </div>
          <div className="loading-state">
            <p>Loading...</p>
          </div>
        </div>
        <div className="resizer" onMouseDown={handleMouseDown}></div>
      </div>
    );
  }

  return (
    <div className="container" aria-readonly>
      <div className="sidebar" style={{ width: `${sidebarWidth}px` }}>
        <div className="sidebar-header">
          <User size={20} />
          <h3>Recent Activity</h3>
        </div>

        {!user ? (
          <div className="auth-message">
            <p>Sign in to see your recent tasks and notes</p>
          </div>
        ) : (
          <div className="sidebar-content">
            {/* Recent Tasks Section */}
            <div className="sidebar-section">
              <div 
                className="section-header" 
                onClick={() => setShowTasks(!showTasks)}
              >
                <div className="section-title">
                  {showTasks ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <ListTodo size={16} />
                  <span>Recent Tasks</span>
                </div>
                <span className="count">{recentTasks.length}</span>
              </div>
              
              {showTasks && (
                <div className="section-content">
                  {recentTasks.length > 0 ? (
                    recentTasks.map(task => (
                      <Link 
                        key={task.id} 
                        to="/Tasks" 
                        className="sidebar-item task-item"
                        title={task.title}
                      >
                        <div className="item-icon">
                          {task.completed ? (
                            <CheckCircle size={14} className="completed" />
                          ) : (
                            <Clock size={14} className="pending" />
                          )}
                        </div>
                        <div className="item-content">
                          <div className={`item-title ${task.completed ? 'completed-text' : ''}`}>
                            {task.title.length > 20 ? task.title.substring(0, 20) + '...' : task.title}
                          </div>
                          <div className="item-meta">
                            <span className={`priority-dot ${task.priority}`}></span>
                            <span className="item-time">{formatDate(task.createdAt)}</span>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="empty-state">
                      <Target size={24} />
                      <p>No tasks yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recent Notes Section */}
            <div className="sidebar-section">
              <div 
                className="section-header" 
                onClick={() => setShowNotes(!showNotes)}
              >
                <div className="section-title">
                  {showNotes ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <BookOpen size={16} />
                  <span>Recent Notes</span>
                </div>
                <span className="count">{recentNotes.length}</span>
              </div>
              
              {showNotes && (
                <div className="section-content">
                  {recentNotes.length > 0 ? (
                    recentNotes.map(note => (
                      <Link 
                        key={note.id} 
                        to="/Notes" 
                        className="sidebar-item note-item"
                        title={note.title}
                      >
                        <div className="item-icon">
                          <FileText size={14} />
                        </div>
                        <div className="item-content">
                          <div className="item-title">
                            {note.title.length > 20 ? note.title.substring(0, 20) + '...' : note.title}
                          </div>
                          <div className="item-meta">
                            <span className="item-category">{note.category || 'Uncategorized'}</span>
                            <span className="item-time">{formatDate(note.createdAt)}</span>
                          </div>
                          {note.content && (
                            <div className="note-preview">
                              {note.content.length > 40 
                                ? note.content.substring(0, 40) + '...' 
                                : note.content
                              }
                            </div>
                          )}
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="empty-state">
                      <FileText size={24} />
                      <p>No notes yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            
          </div>
        )}
      </div>
      <div className="resizer" onMouseDown={handleMouseDown}></div>
    </div>
  );
};

export default Sidebar;