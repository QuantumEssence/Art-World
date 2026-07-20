import React from 'react';
import { Download, Upload, Undo2, MousePointer2, Move, Crosshair, Grid } from 'lucide-react';

const Toolbar = ({ 
  tool, setTool, 
  symmetry, setSymmetry, 
  handleUndo, canUndo,
  exportImage, saveProject, loadProject,
  gridSpacing, setGridSpacing
}) => {
  return (
    <div className="glass-panel toolbar">
      <div className="tool-group">
        <h3>Tools</h3>
        <div className="button-row">
          <button 
            className={tool === 'draw' ? 'active' : ''} 
            onClick={() => setTool('draw')}
            title="Draw Line"
          >
            <MousePointer2 size={18} /> Draw
          </button>
          <button 
            className={tool === 'pan' ? 'active' : ''} 
            onClick={() => setTool('pan')}
            title="Pan Canvas"
          >
            <Move size={18} /> Pan
          </button>
          <button 
            className={tool === 'center' ? 'active' : ''} 
            onClick={() => setTool('center')}
            title="Set Symmetry Center"
          >
            <Crosshair size={18} /> Center
          </button>
        </div>
      </div>

      <div className="tool-group">
        <h3>Symmetry</h3>
        <div className="button-row">
          <button 
            className={symmetry === 'none' ? 'active' : ''} 
            onClick={() => setSymmetry('none')}
          >
            Off
          </button>
          <button 
            className={symmetry === '2-way' ? 'active' : ''} 
            onClick={() => setSymmetry('2-way')}
          >
            2-Way
          </button>
          <button 
            className={symmetry === '4-way' ? 'active' : ''} 
            onClick={() => setSymmetry('4-way')}
          >
            4-Way
          </button>
        </div>
      </div>

      <div className="tool-group">
        <h3>Grid Size</h3>
        <div className="button-row" style={{ alignItems: 'center' }}>
          <Grid size={18} />
          <input 
            type="range" 
            min="10" max="100" 
            value={gridSpacing}
            onChange={(e) => setGridSpacing(Number(e.target.value))}
            style={{ width: '100px' }}
          />
        </div>
      </div>

      <div className="tool-group">
        <h3>Actions</h3>
        <div className="button-row">
          <button onClick={handleUndo} disabled={!canUndo} style={{ opacity: canUndo ? 1 : 0.5 }}>
            <Undo2 size={18} /> Undo
          </button>
        </div>
      </div>

      <div className="tool-group">
        <h3>File</h3>
        <div className="button-row">
          <button onClick={exportImage}>
            <Download size={18} /> PNG
          </button>
          <button onClick={saveProject}>
            <Download size={18} /> Save
          </button>
          <label className="button" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            padding: '8px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Upload size={18} /> Load
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={loadProject} />
          </label>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
