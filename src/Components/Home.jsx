import React, { useEffect, useState } from 'react';
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { 
  CheckCircle, 
  Clock, 
  FileText, 
  Target, 
  Calendar,
  TrendingUp,
  AlertCircle,
  User,
  Activity,
  BookOpen,
  ListTodo
} from 'lucide-react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [userStats, setUserStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    totalNotes: 0,
    recentActivity: []
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [recentNotes, setRecentNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);

        // Try to get username from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUsername(userDoc.data().username);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }

        // Set up real-time listeners for tasks and notes
        setupDataListeners(user.uid);
      } else {
        setUser(null);
        setUsername("");
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

      const now = new Date();
      const completedTasks = tasks.filter(task => task.completed).length;
      const pendingTasks = tasks.filter(task => !task.completed).length;
      const overdueTasks = tasks.filter(task => 
        !task.completed && task.dueDate && new Date(task.dueDate) < now
      ).length;

      // Get recent tasks (last 5)
      const sortedTasks = tasks
        .sort((a, b) => {
          const aDate = a.createdAt?.toDate() || new Date(0);
          const bDate = b.createdAt?.toDate() || new Date(0);
          return bDate - aDate;
        })
        .slice(0, 5);

      setRecentTasks(sortedTasks);
      setUserStats(prev => ({
        ...prev,
        totalTasks: tasks.length,
        completedTasks,
        pendingTasks,
        overdueTasks
      }));
    });

    // Notes listener
    const notesQuery = query(collection(db, 'notes'), where('uid', '==', uid));
    const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
      const notes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get recent notes (last 3)
      const sortedNotes = notes
        .sort((a, b) => {
          const aDate = a.createdAt?.toDate() || new Date(0);
          const bDate = b.createdAt?.toDate() || new Date(0);
          return bDate - aDate;
        })
        .slice(0, 3);

      setRecentNotes(sortedNotes);
      setUserStats(prev => ({
        ...prev,
        totalNotes: notes.length
      }));

      setLoading(false);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeNotes();
    };
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const getCompletionRate = () => {
    if (userStats.totalTasks === 0) return 0;
    return Math.round((userStats.completedTasks / userStats.totalTasks) * 100);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="home-container">
        <div className="loading-spinner">
          <Activity className="spinner-icon" size={32} />
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Header Section */}
      <div className="home-header">
        <div className="welcome-section">
          <h1 className="greeting">
            {getGreeting()}, {username || (user?.displayName ? user.displayName : user?.email?.split('@')[0] || "Guest")}!
          </h1>
          <p className="welcome-subtitle">Here's what's happening with your tasks and notes</p>
        </div>
        <div className="user-avatar">
          <User size={40} />
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">
            <Target size={24} />
          </div>
          <div className="stat-content">
            <h3>{userStats.totalTasks}</h3>
            <p>Total Tasks</p>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>{userStats.completedTasks}</h3>
            <p>Completed</p>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <h3>{userStats.pendingTasks}</h3>
            <p>Pending</p>
          </div>
        </div>

        <div className="stat-card danger">
          <div className="stat-icon">
            <AlertCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>{userStats.overdueTasks}</h3>
            <p>Overdue</p>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">
            <FileText size={24} />
          </div>
          <div className="stat-content">
            <h3>{userStats.totalNotes}</h3>
            <p>Notes</p>
          </div>
        </div>

        <div className="stat-card accent">
          <div className="stat-icon">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <h3>{getCompletionRate()}%</h3>
            <p>Completion Rate</p>
          </div>
        </div>
      </div>

      
      <div className="content-grid">
     
        

      
        <div className="content-section quick-actions">
          <div className="section-header">
            <h2>
              <Activity size={20} />
              Quick Actions
            </h2>
          </div>
          <div className="action-buttons">
            <Link to="/Task" >
            <button className="action-btn primary">
              <Target size={18} />
              Create Task
            </button>
            </Link>
          <Link to="/Notes" >
          <button className="action-btn secondary" >
              <FileText size={18} />
              Write Note
            </button>
          </Link>
            
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;