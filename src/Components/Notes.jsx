import React, { useState, useEffect, useRef } from 'react';
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
} from 'firebase/firestore';
import { 
  List, 
  ListOrdered, 
  Link, 
  Type, 
  Search, 
  Clock, 
  Tag, 
  MessageSquare, 
  Save, 
  Download,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  X
} from 'lucide-react';
import './Notes.css';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";


const EnhancedNotes = () => {
  const [note, setNote] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [savedNotes, setSavedNotes] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [editNoteId, setEditNoteId] = useState(null);
  const [visibleNotes, setVisibleNotes] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  
  // AI Features State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [synthesis, setSynthesis] = useState(null);
  const [speechRate, setSpeechRate] = useState(1);
  const [speechVoice, setSpeechVoice] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summaryResult, setSummaryResult] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  
  const editorRef = useRef(null);
  const speechSynthRef = useRef(null);

  // Templates
  const templates = {
    meeting: `# Meeting Notes\n\n**Date:** ${new Date().toLocaleDateString()}\n**Attendees:** \n\n## Agenda\n- \n\n## Discussion Points\n- \n\n## Action Items\n- [ ] \n\n## Next Steps\n- `,
    project: `# Project: [Project Name]\n\n**Start Date:** ${new Date().toLocaleDateString()}\n**Status:** Planning\n\n## Objectives\n- \n\n## Requirements\n- \n\n## Timeline\n- [ ] Phase 1: \n- [ ] Phase 2: \n\n## Resources\n- `,
    daily: `# Daily Log - ${new Date().toLocaleDateString()}\n\n## Today's Goals\n- [ ] \n- [ ] \n- [ ] \n\n## Accomplishments\n- \n\n## Challenges\n- \n\n## Tomorrow's Focus\n- `,
    research: `# Research Notes\n\n**Topic:** \n**Date:** ${new Date().toLocaleDateString()}\n**Sources:** \n\n## Key Findings\n- \n\n## Important Quotes\n> \n\n## Questions for Further Research\n- \n\n## References\n1. `
  };

  // Initialize Speech Recognition and Synthesis
  useEffect(() => {
    // Speech Recognition Setup
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setNote(prevNote => prevNote + finalTranscript + ' ');
        }
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    }
    
    // Speech Synthesis Setup
    if ('speechSynthesis' in window) {
      const synthInstance = window.speechSynthesis;
      setSynthesis(synthInstance);
      
      const loadVoices = () => {
        const voices = synthInstance.getVoices();
        setAvailableVoices(voices);
        if (voices.length > 0 && !speechVoice) {
          setSpeechVoice(voices[0]);
        }
      };
      
      loadVoices();
      synthInstance.addEventListener('voiceschanged', loadVoices);
      
      return () => {
        synthInstance.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, [speechVoice]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        const q = query(collection(db, 'notes'), where('uid', '==', user.uid));
        onSnapshot(q, (snapshot) => {
          const notesArray = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setSavedNotes(notesArray);
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (editNoteId && note.trim() && title.trim()) {
      setIsAutoSaving(true);
      const timeoutId = setTimeout(async () => {
        try {
          await updateDoc(doc(db, 'notes', editNoteId), {
            content: note,
            category,
            title,
            tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
            updatedAt: serverTimestamp(),
          });
          setIsAutoSaving(false);
        } catch (error) {
          console.error('Auto-save error:', error);
          setIsAutoSaving(false);
        }
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [note, title, category, tags, editNoteId]);

  // Word count update
  useEffect(() => {
    const words = note.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [note]);

  // Speech Recognition Functions
  const startListening = () => {
    if (recognition && !isListening) {
      setIsListening(true);
      recognition.start();
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  };

  // Text-to-Speech Functions
  const speakText = (text) => {
    if (synthesis && text.trim()) {
      // Stop any ongoing speech
      synthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = speechRate;
      utterance.voice = speechVoice;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      speechSynthRef.current = utterance;
      synthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (synthesis) {
      synthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const speakCurrentNote = () => {
    if (note.trim()) {
      speakText(note);
    }
  };

  // Simple client-side summarization (basic implementation)
  const summarizeText = async () => {
    if (!note.trim()) {
      alert('Please enter some text to summarize.');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Basic client-side summarization using text analysis
      const sentences = note.split(/[.!?]+/).filter(s => s.trim().length > 20);
      
      if (sentences.length <= 3) {
        setSummaryResult('Text is already concise. No summarization needed.');
        setShowSummary(true);
        setIsProcessing(false);
        return;
      }

      // Simple extractive summarization - take first, middle, and important sentences
      const firstSentence = sentences[0]?.trim();
      const middleSentence = sentences[Math.floor(sentences.length / 2)]?.trim();
      const lastSentence = sentences[sentences.length - 1]?.trim();
      
      // Look for sentences with important keywords
      const importantKeywords = ['important', 'key', 'main', 'significant', 'crucial', 'essential', 'summary', 'conclusion'];
      const importantSentences = sentences.filter(sentence => 
        importantKeywords.some(keyword => 
          sentence.toLowerCase().includes(keyword)
        )
      ).slice(0, 2);

      let summary = '## Key Points:\n\n';
      
      if (firstSentence) summary += `• ${firstSentence}.\n\n`;
      if (importantSentences.length > 0) {
        importantSentences.forEach(sentence => {
          summary += `• ${sentence.trim()}.\n\n`;
        });
      } else if (middleSentence && middleSentence !== firstSentence) {
        summary += `• ${middleSentence}.\n\n`;
      }
      if (lastSentence && lastSentence !== firstSentence && !summary.includes(lastSentence)) {
        summary += `• ${lastSentence}.\n\n`;
      }
      
      summary += `\n**Original Length:** ${wordCount} words\n**Summary Length:** ~${summary.split(' ').length} words`;

      setSummaryResult(summary);
      setShowSummary(true);
    } catch (error) {
      console.error('Summarization error:', error);
      alert('Failed to generate summary. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const insertSummary = () => {
    if (summaryResult) {
      setNote(prevNote => prevNote + '\n\n## AI Summary\n\n' + summaryResult + '\n\n');
      setShowSummary(false);
      setSummaryResult('');
    }
  };

  const insertText = (text) => {
    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = note.substring(0, start) + text + note.substring(end);
    setNote(newText);
    
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
      textarea.focus();
    }, 0);
  };

  const insertCurrentDateTime = () => {
    const now = new Date();
    const dateTime = now.toLocaleString();
    insertText(`\n**${dateTime}**\n`);
  };

  const insertTable = () => {
    const table = `\n| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n\n`;
    insertText(table);
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    const text = prompt('Enter link text:') || url;
    if (url) {
      insertText(`[${text}](${url})`);
    }
  };

  const applyTemplate = (templateKey) => {
    if (templates[templateKey]) {
      setNote(templates[templateKey]);
      setSelectedTemplate(templateKey);
    }
  };

  const handleSaveNote = async () => {
    const user = auth.currentUser;
    if (user && note.trim() !== '' && title.trim() !== '') {
      try {
        const noteData = {
          uid: user.uid,
          content: note,
          category,
          title,
          tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
          wordCount,
          createdAt: serverTimestamp(),
          hasVoiceInput: isListening, // Track if voice was used
          hasSummary: summaryResult ? true : false, // Track if summary was generated
        };

        if (editNoteId) {
          await updateDoc(doc(db, 'notes', editNoteId), {
            ...noteData,
            updatedAt: serverTimestamp(),
          });
          setSuccessMsg('Note updated successfully!');
          setEditNoteId(null);
        } else {
          await addDoc(collection(db, 'notes'), noteData);
          setSuccessMsg('Note saved successfully!');
        }

        setNote('');
        setTitle('');
        setCategory('');
        setTags('');
        setSelectedTemplate('');
        setSummaryResult('');
        setShowSummary(false);
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (error) {
        console.error('Error saving note:', error.message);
      }
    }
  };

  const handleEdit = (noteData) => {
    setNote(noteData.content);
    setTitle(noteData.title || '');
    setCategory(noteData.category || '');
    setTags(noteData.tags ? noteData.tags.join(', ') : '');
    setEditNoteId(noteData.id);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteDoc(doc(db, 'notes', id));
        setSuccessMsg('Note deleted successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (error) {
        console.error('Error deleting note:', error.message);
      }
    }
  };

  const toggleNoteVisibility = (id) => {
    setVisibleNotes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const exportNote = (noteData) => {
    const content = `# ${noteData.title}\n\n**Category:** ${noteData.category || 'Uncategorized'}\n**Tags:** ${noteData.tags ? noteData.tags.join(', ') : 'None'}\n**Date:** ${(noteData.updatedAt || noteData.createdAt)?.toDate().toLocaleString() || 'Unknown'}\n**Word Count:** ${noteData.wordCount || 0}\n\n---\n\n${noteData.content}`;
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${noteData.title.replace(/[^a-z0-9]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAll = () => {
    const content = savedNotes.map((n, idx) => {
      const date = (n.updatedAt || n.createdAt)?.toDate().toLocaleString() || 'Unknown date';
      return `# ${n.title}\n\n**Category:** ${n.category || 'Uncategorized'}\n**Tags:** ${n.tags ? n.tags.join(', ') : 'None'}\n**Date:** ${date}\n**Word Count:** ${n.wordCount || 0}\n\n${n.content}\n\n---\n\n`;
    }).join('\n');

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TaskSage_All_Notes.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredNotes = savedNotes.filter(note => 
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (note.category && note.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <div className="enhanced-notes-container">
      <div className="notes-header">
        <h2>Enhanced Notes</h2>
        <div className="header-controls">
          <div className="search-container">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="auto-save-indicator">
            {isAutoSaving && (
              <>
                <Clock size={14} />
                <span>Auto-saving...</span>
              </>
            )}
            {!isAutoSaving && isListening && (
              <>
                <Mic size={14} />
                <span className="ready-indicator">Listening...</span>
              </>
            )}
          </div>
        </div>
      </div>

      {successMsg && <div className="success-message">{successMsg}</div>}

      <div className="note-editor">
        {/* Template Selector */}
        <div className="template-selector">
          <label>Quick Templates:</label>
          <select 
            value={selectedTemplate} 
            onChange={(e) => applyTemplate(e.target.value)}
            className="template-dropdown"
          >
            <option value="">Choose a template...</option>
            <option value="meeting">Meeting Notes</option>
            <option value="project">Project Plan</option>
            <option value="daily">Daily Log</option>
            <option value="research">Research Notes</option>
          </select>
        </div>

        {/* Basic Info */}
        <div className="note-inputs">
          <input
            type="text"
            placeholder="Note Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="title-input"
          />
          <div className="meta-inputs">
            <input
              type="text"
              placeholder="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="category-input"
            />
            <input
              type="text"
              placeholder="Tags (comma separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="tags-input"
            />
          </div>
        </div>

        {/* AI Features Bar */}
        <div className="ai-features-bar">
          <div className="feature-group">
            <button 
              className={`voice-btn ${isListening ? 'listening' : ''}`}
              onClick={isListening ? stopListening : startListening}
              disabled={!recognition}
              title={isListening ? 'Stop Voice Input' : 'Start Voice Input'}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              {isListening ? 'Stop Listening' : 'Voice Input'}
            </button>
          </div>

          <div className="feature-group">
            <button 
              className={`tts-btn ${isSpeaking ? 'speaking' : ''}`}
              onClick={isSpeaking ? stopSpeaking : speakCurrentNote}
              disabled={!synthesis || !note.trim()}
              title={isSpeaking ? 'Stop Reading' : 'Read Aloud'}
            >
              {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
              {isSpeaking ? 'Stop Reading' : 'Read Aloud'}
            </button>
            <select 
              value={speechRate} 
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              className="feature-select speed-control"
              title="Speech Speed"
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>
          </div>

          <div className="feature-group">
            <button 
              className="summarize-btn"
              onClick={summarizeText}
              disabled={!note.trim() || isProcessing}
              title="AI Summarize"
            >
              <Sparkles size={16} />
              {isProcessing ? 'Summarizing...' : 'AI Summarize'}
            </button>
          </div>
        </div>

        {/* AI Summary Result Panel */}
        {showSummary && summaryResult && (
          <div className="ai-result-panel summary-panel">
            <div className="result-header">
              <h4 className="result-title">AI Generated Summary</h4>
              <div className="result-actions">
                <button className="insert-btn" onClick={insertSummary}>
                  Insert into Note
                </button>
                <button className="close-btn" onClick={() => setShowSummary(false)}>
                  <X size={12} />
                </button>
              </div>
            </div>
            <p className="result-content">{summaryResult}</p>
          </div>
        )}

        {/* Toolbar */}
        <div className="toolbar">
          <div className="toolbar-group">
            <button onClick={() => insertText('- ')} title="Bullet List">
              <List size={16} />
            </button>
            <button onClick={() => insertText('1. ')} title="Numbered List">
              <ListOrdered size={16} />
            </button>
          </div>

          <div className="toolbar-group">
            <button onClick={insertLink} title="Insert Link">
              <Link size={16} />
            </button>
            <button onClick={insertTable} title="Insert Table">
              <Type size={16} />
            </button>
          </div>

          <div className="toolbar-group">
            <button onClick={insertCurrentDateTime} title="Insert Date/Time">
              <Clock size={16} />
            </button>
            <button onClick={() => insertText('> ')} title="Quote">
              <MessageSquare size={16} />
            </button>
          </div>

          <div className="toolbar-group">
            <button onClick={() => insertText('# ')} title="Header 1">#</button>
            <button onClick={() => insertText('## ')} title="Header 2">##</button>
            <button onClick={() => insertText('### ')} title="Header 3">###</button>
          </div>
        </div>

        {/* Editor */}
        <div className="editor-container">
          {isListening && (
            <div className="listening-indicator">
              <div className="pulse-dot"></div>
              Listening...
            </div>
          )}
          <textarea
            ref={editorRef}
            placeholder="Start writing your note here... Use voice input, AI summarization, or the toolbar for enhanced features!"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`rich-editor ${isListening ? 'listening' : ''}`}
          />
          <div className="editor-stats">
            <span>Words: {wordCount}</span>
            <span>Characters: {note.length}</span>
            {recognition && <span className="ready-indicator">Voice Ready</span>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button className="save-button" onClick={handleSaveNote}>
            <Save size={16} />
            {editNoteId ? 'Update Note' : 'Save Note'}
          </button>
          <button className="export-button" onClick={handleExportAll}>
            <Download size={16} />
            Export All Notes
          </button>
        </div>
      </div>

      {/* Saved Notes */}
      <div className="saved-notes">
        <h3>Your Notes ({filteredNotes.length})</h3>
        {filteredNotes.length === 0 ? (
          <div className="no-notes">
            <MessageSquare size={48} />
            <p>No notes found. Start creating your first note!</p>
          </div>
        ) : (
          filteredNotes.map((n) => (
            <div key={n.id} className="note-card">
              <div className="note-header">
                <h4>{n.title}</h4>
                <div className="note-meta">
                  <span className="category">{n.category || 'Uncategorized'}</span>
                  {n.hasVoiceInput && (
                    <span className="feature-badge voice-badge">
                      <Mic size={10} />
                      Voice
                    </span>
                  )}
                  {n.hasSummary && (
                    <span className="feature-badge summary-badge">
                      <Sparkles size={10} />
                      AI Summary
                    </span>
                  )}
                  {n.tags && n.tags.length > 0 && (
                    <div className="tags">
                      {n.tags.map((tag, idx) => (
                        <span key={idx} className="tag">
                          <Tag size={12} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="note-stats">
                <span>{n.wordCount || 0} words</span>
                <span>
                  {n.updatedAt
                    ? `Updated: ${n.updatedAt.toDate().toLocaleDateString()}`
                    : n.createdAt
                    ? `Created: ${n.createdAt.toDate().toLocaleDateString()}`
                    : 'Just now'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  className="toggle-button"
                  onClick={() => toggleNoteVisibility(n.id)}
                >
                  {visibleNotes[n.id] ? 'Hide Content' : 'Show Content'}
                </button></div>
                <div>
               <button 
              className={`tts-btn ${isSpeaking ? 'speaking' : ''}`}
              onClick={isSpeaking ? stopSpeaking : speakCurrentNote}
              disabled={!synthesis || !note.trim()}
              title={isSpeaking ? 'Stop Reading' : 'Read Aloud'}
            >
              {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
              {isSpeaking ? 'Stop Reading' : 'Read Aloud'}
            </button>
                
              </div>
              
              

              {visibleNotes[n.id] && (
                <div className="note-content">
                  <pre>{n.content}</pre>
                </div>
              )}

              <div className="note-actions">
                <button onClick={() => handleEdit(n)} className="edit-btn">
                  ✏️ Edit
                </button>
                <button onClick={() => exportNote(n)} className="export-btn">
                  📁 Export
                </button>
                <button onClick={() => handleDelete(n.id)} className="delete-btn">
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EnhancedNotes;