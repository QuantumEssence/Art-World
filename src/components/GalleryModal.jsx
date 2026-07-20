import React, { useState, useEffect } from 'react';
import { X, Save, FolderOpen, Trash2 } from 'lucide-react';

const GalleryModal = ({ onClose, onSave, onLoad }) => {
  const [projects, setProjects] = useState([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    const saved = localStorage.getItem('artWorldProjects');
    if (saved) {
      setProjects(JSON.parse(saved));
    }
  };

  const handleSave = () => {
    if (!newName.trim()) return;
    onSave(newName);
    setNewName('');
    loadProjects();
  };

  const handleDelete = (id) => {
    const updated = projects.filter(p => p.id !== id);
    localStorage.setItem('artWorldProjects', JSON.stringify(updated));
    setProjects(updated);
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000
    }}>
      <div className="glass-panel" style={{ width: '400px', maxWidth: '90vw', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Project Gallery</h2>
          <button className="icon-button" onClick={onClose}><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <input 
            type="text" 
            placeholder="New Project Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Save size={16} /> Save
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
          {projects.length === 0 ? (
            <p style={{ textAlign: 'center', opacity: 0.5 }}>No saved projects.</p>
          ) : projects.map(p => (
            <div key={p.id} style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div>
                <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>{new Date(p.date).toLocaleString()}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="icon-button" onClick={() => onLoad(p)} title="Load">
                  <FolderOpen size={16} />
                </button>
                <button className="icon-button danger" onClick={() => handleDelete(p.id)} title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GalleryModal;
