import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api.js';

const VIEWS = { NOTES: 'notes', LINKS: 'links', PINNED: 'pinned' };

function Icon({ name, size = 16 }) {
  const icons = {
    search: <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />,
    plus: <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
    pin: <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />,
    trash: <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />,
    link: <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />,
    note: <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />,
    sun: <><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
    moon: <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />,
    external: <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {icons[name]}
    </svg>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getViewTitle(view, activeNotebook, notebooks) {
  if (view === VIEWS.LINKS) return { title: 'Pinned Links', subtitle: 'Your quick-access bookmarks' };
  if (view === VIEWS.PINNED) return { title: 'Pinned Notes', subtitle: 'Important notes at a glance' };
  if (activeNotebook) {
    const nb = notebooks.find((n) => n.id === activeNotebook);
    return { title: nb?.name || 'Notebook', subtitle: 'Notes in this notebook' };
  }
  return { title: 'All Notes', subtitle: 'Your workspace' };
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('onenote-theme') || 'dark');
  const [view, setView] = useState(VIEWS.NOTES);
  const [notes, setNotes] = useState([]);
  const [notebooks, setNotebooks] = useState([]);
  const [links, setLinks] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [activeNotebook, setActiveNotebook] = useState(null);
  const [search, setSearch] = useState('');
  const [health, setHealth] = useState('checking');
  const [saving, setSaving] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showNotebookModal, setShowNotebookModal] = useState(false);
  const [linkForm, setLinkForm] = useState({ title: '', url: '', description: '' });
  const [notebookForm, setNotebookForm] = useState({ name: '', color: '#6366f1' });
  const saveTimer = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('onenote-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const loadData = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (view === VIEWS.PINNED) params.pinned = 'true';
      if (activeNotebook) params.notebook_id = activeNotebook;

      const [notesData, notebooksData, linksData] = await Promise.all([
        api.getNotes(params),
        api.getNotebooks(),
        api.getLinks(),
      ]);
      setNotes(notesData);
      setNotebooks(notebooksData);
      setLinks(linksData);
      setHealth('ok');
    } catch {
      setHealth('error');
    }
  }, [search, view, activeNotebook]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createNote = async () => {
    const note = await api.createNote({
      title: 'Untitled Note',
      notebook_id: activeNotebook || notebooks[0]?.id || 1,
    });
    setNotes((prev) => [note, ...prev]);
    setActiveNote(note);
    setView(VIEWS.NOTES);
  };

  const updateNoteField = (field, value) => {
    if (!activeNote) return;
    const updated = { ...activeNote, [field]: value };
    setActiveNote(updated);
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await api.updateNote(updated.id, { [field]: value });
      } finally {
        setSaving(false);
      }
    }, 600);
  };

  const togglePin = async (note, e) => {
    e?.stopPropagation();
    const updated = await api.togglePin(note.id);
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    if (activeNote?.id === updated.id) setActiveNote(updated);
  };

  const deleteNote = async (id) => {
    await api.deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeNote?.id === id) setActiveNote(null);
  };

  const createLink = async () => {
    if (!linkForm.title || !linkForm.url) return;
    const link = await api.createLink(linkForm);
    setLinks((prev) => [...prev, link]);
    setShowLinkModal(false);
    setLinkForm({ title: '', url: '', description: '' });
  };

  const deleteLink = async (id) => {
    await api.deleteLink(id);
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  const createNotebook = async () => {
    if (!notebookForm.name) return;
    const nb = await api.createNotebook(notebookForm);
    setNotebooks((prev) => [...prev, { ...nb, note_count: 0 }]);
    setShowNotebookModal(false);
    setNotebookForm({ name: '', color: '#6366f1' });
  };

  const { title: viewTitle, subtitle: viewSubtitle } = getViewTitle(view, activeNotebook, notebooks);
  const pinnedCount = notes.filter((n) => n.is_pinned).length;

  return (
    <>
      <div className="app-bg" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="brand">
              <div className="logo">ON</div>
              <span className="logo-text">OneNote</span>
            </div>
            <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            </button>
          </div>

          <div className="search-box">
            <div className="search-wrapper">
              <Icon name="search" size={15} />
              <input
                placeholder="Search notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="sidebar-scroll">
            <div className="sidebar-section">
              <button
                className={`nav-item ${view === VIEWS.NOTES && !activeNotebook ? 'active' : ''}`}
                onClick={() => { setView(VIEWS.NOTES); setActiveNotebook(null); }}
              >
                <Icon name="note" size={16} />
                All Notes
                <span className="badge">{notes.length}</span>
              </button>
              <button
                className={`nav-item ${view === VIEWS.PINNED ? 'active' : ''}`}
                onClick={() => { setView(VIEWS.PINNED); setActiveNotebook(null); }}
              >
                <Icon name="pin" size={16} />
                Pinned
                {pinnedCount > 0 && <span className="badge">{pinnedCount}</span>}
              </button>
              <button
                className={`nav-item ${view === VIEWS.LINKS ? 'active' : ''}`}
                onClick={() => setView(VIEWS.LINKS)}
              >
                <Icon name="link" size={16} />
                Pinned Links
                <span className="badge">{links.length}</span>
              </button>
            </div>

            <div className="sidebar-section">
              <div className="section-title">Notebooks</div>
              {notebooks.map((nb) => (
                <button
                  key={nb.id}
                  className={`nav-item ${activeNotebook === nb.id ? 'active' : ''}`}
                  onClick={() => { setView(VIEWS.NOTES); setActiveNotebook(nb.id); }}
                >
                  <span className="notebook-dot" style={{ background: nb.color, color: nb.color }} />
                  {nb.name}
                  <span className="badge">{nb.note_count}</span>
                </button>
              ))}
              <button className="nav-item" onClick={() => setShowNotebookModal(true)}>
                <Icon name="plus" size={14} />
                New Notebook
              </button>
            </div>
          </div>

          <div className="sidebar-footer">
            <button className="btn btn-primary btn-full" onClick={createNote}>
              <Icon name="plus" size={15} />
              New Note
            </button>
          </div>
        </aside>

        <main className="main">
          <header className="main-header">
            <div className="header-title-group">
              <h2>{viewTitle}</h2>
              <p>{viewSubtitle}</p>
            </div>
            <div className="header-actions">
              <div className="stat-pill">
                <span className={`dot ${health === 'error' ? 'error' : ''}`} />
                {health === 'ok' ? 'Live' : health === 'error' ? 'Offline' : 'Connecting'}
              </div>
              {view === VIEWS.LINKS && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowLinkModal(true)}>
                  <Icon name="plus" size={14} /> Add Link
                </button>
              )}
            </div>
          </header>

          {view === VIEWS.LINKS ? (
            <div className="links-panel">
              <div className="links-intro">
                <h3>Quick Links</h3>
                <p>Bookmark your most important resources for instant access.</p>
              </div>
              <div className="links-grid">
                {links.map((link, i) => (
                  <div key={link.id} className="link-card" style={{ animationDelay: `${i * 0.06}s` }}>
                    <div className="link-card-actions">
                      <button className="btn-icon btn-danger" onClick={() => deleteLink(link.id)}>
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                    <div className="link-card-icon">🔗</div>
                    <h3>{link.title}</h3>
                    <p>{link.description || 'No description'}</p>
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                      {link.url} <Icon name="external" size={12} />
                    </a>
                  </div>
                ))}
                {links.length === 0 && (
                  <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                    <div className="empty-state-icon"><Icon name="link" size={24} /></div>
                    <p>No links yet. Add your first bookmark!</p>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowLinkModal(true)}>
                      <Icon name="plus" size={14} /> Add Link
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="content-area">
              <div className="notes-panel">
                <div className="notes-panel-header">
                  <span>{notes.length} {notes.length === 1 ? 'note' : 'notes'}</span>
                  <button className="btn btn-primary btn-sm" onClick={createNote}>
                    <Icon name="plus" size={14} />
                  </button>
                </div>
                <div className="notes-list">
                  {notes.map((note, i) => (
                    <div
                      key={note.id}
                      className={`note-card ${activeNote?.id === note.id ? 'active' : ''}`}
                      style={{ animationDelay: `${i * 0.04}s` }}
                      onClick={() => setActiveNote(note)}
                    >
                      <div className="note-card-title">{note.title}</div>
                      <div className="note-card-preview">{note.content?.slice(0, 100) || 'No content yet...'}</div>
                      <div className="note-card-meta">
                        {note.is_pinned && <span className="pin-badge">📌 Pinned</span>}
                        <span>{formatDate(note.updated_at)}</span>
                      </div>
                    </div>
                  ))}
                  {notes.length === 0 && (
                    <div className="empty-state">
                      <div className="empty-state-icon"><Icon name="note" size={24} /></div>
                      <p>No notes here yet. Create your first one!</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="editor-panel">
                {activeNote ? (
                  <>
                    <div className="editor-toolbar">
                      <input
                        className="editor-title"
                        value={activeNote.title}
                        onChange={(e) => updateNoteField('title', e.target.value)}
                        placeholder="Note title..."
                      />
                      <button
                        className={`btn-icon ${activeNote.is_pinned ? 'pinned' : ''}`}
                        onClick={(e) => togglePin(activeNote, e)}
                        title={activeNote.is_pinned ? 'Unpin' : 'Pin note'}
                      >
                        <Icon name="pin" size={18} />
                      </button>
                      <button
                        className="btn-icon btn-danger"
                        onClick={() => deleteNote(activeNote.id)}
                        title="Delete note"
                      >
                        <Icon name="trash" size={18} />
                      </button>
                    </div>
                    <div className="editor-meta">
                      <span>Last edited {formatDate(activeNote.updated_at)}</span>
                      {saving && <span className="saving">Saving...</span>}
                    </div>
                    <div className="editor-content">
                      <textarea
                        className="editor-textarea"
                        value={activeNote.content}
                        onChange={(e) => updateNoteField('content', e.target.value)}
                        placeholder="Start writing your note..."
                      />
                    </div>
                  </>
                ) : (
                  <div className="editor-empty">
                    <div className="editor-empty-visual">
                      <Icon name="note" size={48} />
                    </div>
                    <h3>Ready to write?</h3>
                    <p>Select a note from the list or create a new one to get started.</p>
                    <button className="btn btn-primary" onClick={createNote}>
                      <Icon name="plus" size={15} /> Create Note
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="status-bar">
            <span className={`status-dot ${health === 'error' ? 'error' : ''}`} />
            {health === 'ok' ? 'Connected' : health === 'error' ? 'Disconnected' : 'Connecting...'}
            {saving && <span className="saving-indicator">Auto-saving...</span>}
          </div>
        </main>
      </div>

      {showLinkModal && (
        <Modal title="Add Pinned Link" onClose={() => setShowLinkModal(false)}>
          <div className="form-group">
            <label>Title</label>
            <input value={linkForm.title} onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })} placeholder="Link title" />
          </div>
          <div className="form-group">
            <label>URL</label>
            <input value={linkForm.url} onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label>Description</label>
            <input value={linkForm.description} onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })} placeholder="Optional description" />
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setShowLinkModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={createLink}>Add Link</button>
          </div>
        </Modal>
      )}

      {showNotebookModal && (
        <Modal title="New Notebook" onClose={() => setShowNotebookModal(false)}>
          <div className="form-group">
            <label>Name</label>
            <input value={notebookForm.name} onChange={(e) => setNotebookForm({ ...notebookForm, name: e.target.value })} placeholder="Notebook name" autoFocus />
          </div>
          <div className="form-group">
            <label>Color</label>
            <div className="color-input-wrap">
              <input type="color" value={notebookForm.color} onChange={(e) => setNotebookForm({ ...notebookForm, color: e.target.value })} />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Pick a notebook color</span>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setShowNotebookModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={createNotebook}>Create Notebook</button>
          </div>
        </Modal>
      )}
    </>
  );
}
