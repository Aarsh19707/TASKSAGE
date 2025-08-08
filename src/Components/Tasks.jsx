import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
  orderBy,
} from 'firebase/firestore';
import { 
  Plus, 
  Search, 
  Calendar, 
  Flag, 
  Tag, 
  CheckCircle, 
  Circle, 
  Edit3, 
  Trash2, 
  Download,
  Filter,
  Clock,
  AlertCircle,
  Star,
  Users,
  Target
} from 'lucide-react';
import './Tasks.css';

const EnhancedTasks = () => {
  const [task, setTask] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [sortBy, setSortBy] = useState('created');
  const [editTaskId, setEditTaskId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Task Templates
  const taskTemplates = {
    project: {
      title: 'Project Task',
      description: '• Define requirements\n• Create timeline\n• Assign responsibilities\n• Set milestones',
      category: 'Project',
      priority: 'high'
    },
    meeting: {
      title: 'Meeting Preparation',
      description: '• Prepare agenda\n• Send invites\n• Book conference room\n• Gather materials',
      category: 'Meeting',
      priority: 'medium'
    },
    bug: {
      title: 'Bug Fix',
      description: '• Reproduce issue\n• Identify root cause\n• Implement fix\n• Test solution\n• Deploy to production',
      category: 'Development',
      priority: 'high'
    },
    review: {
      title: 'Code Review',
      description: '• Review code changes\n• Check for best practices\n• Test functionality\n• Provide feedback',
      category: 'Development',
      priority: 'medium'
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        const q = query(
          collection(db, 'tasks'), 
          where('uid', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        onSnapshot(q, (snapshot) => {
          const tasksArray = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setTasks(tasksArray);
        }, (error) => {
          console.error('Error fetching tasks:', error);
          // If orderBy fails (no index), try without ordering
          const fallbackQuery = query(
            collection(db, 'tasks'), 
            where('uid', '==', user.uid)
          );
          onSnapshot(fallbackQuery, (snapshot) => {
            const tasksArray = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setTasks(tasksArray);
          });
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Filter and search tasks
  useEffect(() => {
    let filtered = tasks;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.category && task.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (task.tags && task.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => {
        if (filterStatus === 'completed') return task.completed;
        if (filterStatus === 'pending') return !task.completed;
        if (filterStatus === 'overdue') {
          return !task.completed && task.dueDate && new Date(task.dueDate) < new Date();
        }
        return true;
      });
    }

    // Priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    // Sort tasks
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return (b.createdAt?.toDate() || new Date()) - (a.createdAt?.toDate() || new Date());
      }
    });

    setFilteredTasks(filtered);
  }, [tasks, searchTerm, filterStatus, filterPriority, sortBy]);

  const applyTemplate = (templateKey) => {
    if (taskTemplates[templateKey]) {
      const template = taskTemplates[templateKey];
      setTaskTitle(template.title);
      setTaskDescription(template.description);
      setCategory(template.category);
      setPriority(template.priority);
      setSelectedTemplate(templateKey);
    }
  };

  const handleSaveTask = async () => {
    const user = auth.currentUser;
    
    // Check if user is authenticated
    if (!user) {
      console.error('User not authenticated');
      setSuccessMsg('Please sign in to create tasks');
      setTimeout(() => setSuccessMsg(''), 3000);
      return;
    }

    // Validate required fields
    if (!taskTitle.trim()) {
      console.error('Task title is required');
      setSuccessMsg('Please enter a task title');
      setTimeout(() => setSuccessMsg(''), 3000);
      return;
    }

    try {
      console.log('Saving task...', { taskTitle, taskDescription, category, priority });
      
      const taskData = {
        uid: user.uid,
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        category: category.trim() || 'Uncategorized',
        priority: priority,
        dueDate: dueDate || null,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        assignedTo: assignedTo.trim() || null,
        completed: false,
        createdAt: serverTimestamp(),
      };

      if (editTaskId) {
        console.log('Updating existing task:', editTaskId);
        await updateDoc(doc(db, 'tasks', editTaskId), {
          ...taskData,
          updatedAt: serverTimestamp(),
        });
        setSuccessMsg('Task updated successfully!');
        setEditTaskId(null);
      } else {
        console.log('Creating new task with data:', taskData);
        const docRef = await addDoc(collection(db, 'tasks'), taskData);
        console.log('Task created with ID:', docRef.id);
        setSuccessMsg('Task created successfully!');
      }

      // Reset form
      setTaskTitle('');
      setTaskDescription('');
      setCategory('');
      setPriority('medium');
      setDueDate('');
      setTags('');
      setAssignedTo('');
      setSelectedTemplate('');
      
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('Error saving task:', error);
      setSuccessMsg(`Error: ${error.message}`);
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  const toggleTaskComplete = async (taskId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        completed: !currentStatus,
        completedAt: !currentStatus ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating task:', error.message);
    }
  };

  const handleEditTask = (taskData) => {
    setTaskTitle(taskData.title);
    setTaskDescription(taskData.description || '');
    setCategory(taskData.category || '');
    setPriority(taskData.priority || 'medium');
    setDueDate(taskData.dueDate || '');
    setTags(taskData.tags ? taskData.tags.join(', ') : '');
    setAssignedTo(taskData.assignedTo || '');
    setEditTaskId(taskData.id);
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteDoc(doc(db, 'tasks', taskId));
        setSuccessMsg('Task deleted successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (error) {
        console.error('Error deleting task:', error.message);
      }
    }
  };

  const exportTasks = () => {
    const content = filteredTasks.map((task, idx) => {
      const status = task.completed ? '✅ COMPLETED' : '⏳ PENDING';
      const date = (task.updatedAt || task.createdAt)?.toDate().toLocaleString() || 'Unknown date';
      const dueDate = task.dueDate ? `Due: ${new Date(task.dueDate).toLocaleDateString()}` : 'No due date';
      
      return `${idx + 1}. ${task.title}\n` +
             `Status: ${status}\n` +
             `Priority: ${task.priority.toUpperCase()}\n` +
             `Category: ${task.category || 'Uncategorized'}\n` +
             `${dueDate}\n` +
             `Tags: ${task.tags ? task.tags.join(', ') : 'None'}\n` +
             `Created: ${date}\n` +
             `Description:\n${task.description || 'No description'}\n` +
             `${'-'.repeat(50)}\n\n`;
    }).join('');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TaskSage_Tasks.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return <AlertCircle size={16} className="priority-high" />;
      case 'medium': return <Flag size={16} className="priority-medium" />;
      case 'low': return <Circle size={16} className="priority-low" />;
      default: return <Flag size={16} />;
    }
  };

  const isOverdue = (dueDate) => {
    return dueDate && new Date(dueDate) < new Date();
  };

  const getTaskStats = () => {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;
    const overdue = tasks.filter(task => !task.completed && isOverdue(task.dueDate)).length;
    
    return { total, completed, pending, overdue };
  };

  const stats = getTaskStats();

  return (
    <div className="enhanced-tasks-container">
      {/* Header */}
      <div className="tasks-header">
        <h2>Task Management</h2>
        <div className="header-controls">
          <div className="search-container">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <button 
            className="filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filters
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMsg && <div className="success-message">{successMsg}</div>}

      {/* Stats Dashboard */}
      <div className="stats-dashboard">
        <div className="stat-card">
          <Target size={20} />
          <div>
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Total Tasks</span>
          </div>
        </div>
        <div className="stat-card completed">
          <CheckCircle size={20} />
          <div>
            <span className="stat-number">{stats.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>
        <div className="stat-card pending">
          <Clock size={20} />
          <div>
            <span className="stat-number">{stats.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
        <div className="stat-card overdue">
          <AlertCircle size={20} />
          <div>
            <span className="stat-number">{stats.overdue}</span>
            <span className="stat-label">Overdue</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>Status:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Tasks</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Priority:</label>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="created">Date Created</option>
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="title">Title</option>
            </select>
          </div>
        </div>
      )}

      {/* Task Creation Form */}
      <div className="task-form">
        <h3>{editTaskId ? 'Edit Task' : 'Create New Task'}</h3>
        
        {/* Template Selector */}
        <div className="template-selector">
          <label>Quick Templates:</label>
          <select 
            value={selectedTemplate} 
            onChange={(e) => applyTemplate(e.target.value)}
          >
            <option value="">Choose a template...</option>
            <option value="project">Project Task</option>
            <option value="meeting">Meeting Preparation</option>
            <option value="bug">Bug Fix</option>
            <option value="review">Code Review</option>
          </select>
        </div>

        <div className="form-row">
          <input
            type="text"
            placeholder="Task Title *"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            className="task-title-input"
            required
          />
        </div>

        <div className="form-row">
          <textarea
            placeholder="Task Description"
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            className="task-description"
            rows="4"
          />
        </div>

        <div className="form-grid">
          <input
            type="text"
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="due-date-input"
          />
          <input
            type="text"
            placeholder="Assigned To"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
          />
        </div>

        <div className="form-row">
          <input
            type="text"
            placeholder="Tags (comma separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="tags-input"
          />
        </div>

        <div className="form-actions">
          <button onClick={handleSaveTask} className="save-task-btn" type="button">
            <Plus size={16} />
            {editTaskId ? 'Update Task' : 'Create Task'}
          </button>
          {editTaskId && (
            <button 
              onClick={() => {
                setEditTaskId(null);
                setTaskTitle('');
                setTaskDescription('');
                setCategory('');
                setPriority('medium');
                setDueDate('');
                setTags('');
                setAssignedTo('');
                setSelectedTemplate('');
              }}
              className="cancel-btn"
              type="button"
            >
              Cancel
            </button>
          )}
          <button onClick={exportTasks} className="export-btn" type="button">
            <Download size={16} />
            Export Tasks
          </button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="tasks-list">
        <h3>Your Tasks ({filteredTasks.length})</h3>
        {filteredTasks.length === 0 ? (
          <div className="no-tasks">
            <Target size={48} />
            <p>No tasks found. Create your first task above!</p>
          </div>
        ) : (
          <div className="tasks-grid">
            {filteredTasks.map((taskItem) => (
              <div 
                key={taskItem.id} 
                className={`task-card ${taskItem.completed ? 'completed' : ''} ${isOverdue(taskItem.dueDate) && !taskItem.completed ? 'overdue' : ''}`}
              >
                <div className="task-header">
                  <div className="task-checkbox">
                    <button
                      onClick={() => toggleTaskComplete(taskItem.id, taskItem.completed)}
                      className="checkbox-btn"
                    >
                      {taskItem.completed ? <CheckCircle size={20} /> : <Circle size={20} />}
                    </button>
                  </div>
                  <div className="task-title-section">
                    <h4 className={taskItem.completed ? 'completed-title' : ''}>{taskItem.title}</h4>
                    <div className="task-meta">
                      {getPriorityIcon(taskItem.priority)}
                      <span className="category">{taskItem.category || 'Uncategorized'}</span>
                    </div>
                  </div>
                  <div className="task-actions">
                    <button onClick={() => handleEditTask(taskItem)} className="edit-task-btn">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => handleDeleteTask(taskItem.id)} className="delete-task-btn">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {taskItem.description && (
                  <div className="task-description">
                    <pre>{taskItem.description}</pre>
                  </div>
                )}

                <div className="task-footer">
                  <div className="task-details">
                    {taskItem.dueDate && (
                      <span className={`due-date ${isOverdue(taskItem.dueDate) && !taskItem.completed ? 'overdue' : ''}`}>
                        <Calendar size={14} />
                        Due: {new Date(taskItem.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {taskItem.assignedTo && (
                      <span className="assigned-to">
                        <Users size={14} />
                        {taskItem.assignedTo}
                      </span>
                    )}
                  </div>
                  
                  {taskItem.tags && taskItem.tags.length > 0 && (
                    <div className="task-tags">
                      {taskItem.tags.map((tag, idx) => (
                        <span key={idx} className="task-tag">
                          <Tag size={12} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="task-timestamps">
                  <small>
                    Created: {taskItem.createdAt?.toDate().toLocaleDateString() || 'Just now'}
                    {taskItem.completedAt && (
                      <> • Completed: {taskItem.completedAt.toDate().toLocaleDateString()}</>
                    )}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedTasks;