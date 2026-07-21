import React from 'react';
import { Download, Upload, Undo2, Redo2, MousePointer2, Move, Crosshair, Grid, Eraser, Magnet, FolderOpen, Pipette, Minus, Circle, Scissors, PlayCircle } from 'lucide-react';

const Toolbar = ({ 
  tool, setTool, 
  symmetry, setSymmetry, 
  drawMode, setDrawMode,
  snapToGrid, setSnapToGrid,
  handleUndo, canUndo,
  handleRedo, canRedo,
  exportImage, exportSVG,
  saveProject, loadProject, openGallery,
  gridSpacing, setGridSpacing,
  canvasWidth, setCanvasWidth,
  canvasHeight, setCanvasHeight,
  brushSize, setBrushSize,
  playTimelapse
}) => {
  return (
    <div className="tool-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
            className={tool === 'erase' ? 'active' : ''} 
            onClick={() => setTool('erase')}
            title="Erase"
          >
            <Eraser size={18} /> Erase
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
          <button 
            className={tool === 'eyedropper' ? 'active' : ''} 
            onClick={() => setTool('eyedropper')}
            title="Eyedropper"
          >
            <Pipette size={18} /> Color
          </button>
          <button 
            className={tool === 'lasso' ? 'active' : ''} 
            onClick={() => setTool('lasso')}
            title="Lasso Selection"
          >
            <Scissors size={18} /> Lasso
          </button>
        </div>
        <div className="button-row" style={{ marginTop: '8px' }}>
          <button 
            className={tool === 'line' ? 'active' : ''} 
            onClick={() => setTool('line')}
            title="Line"
          >
            <Minus size={18} /> Line
          </button>
          <button 
            className={tool === 'circle' ? 'active' : ''} 
            onClick={() => setTool('circle')}
            title="Perfect Circle"
          >
            <Circle size={18} /> Circle
          </button>
          <button 
            className={tool === 'ellipse' ? 'active' : ''} 
            onClick={() => setTool('ellipse')}
            title="Ellipse"
          >
            <Circle size={18} style={{ transform: 'scaleX(1.5)' }} /> Ellipse
          </button>
        </div>
      </div>

      <div className="tool-group">
        <h3>Draw Mode</h3>
        <div className="button-row">
          <button 
            className={drawMode === 'segment' ? 'active' : ''} 
            onClick={() => setDrawMode('segment')}
          >
            Segment
          </button>
          <button 
            className={drawMode === 'continuous' ? 'active' : ''} 
            onClick={() => setDrawMode('continuous')}
          >
            Continuous
          </button>
        </div>
      </div>

      <div className="tool-group">
        <h3>Grid Options</h3>
        <div className="button-row">
          <button 
            className={snapToGrid ? 'active' : ''} 
            onClick={() => setSnapToGrid(!snapToGrid)}
            title="Snap to Grid"
          >
            <Magnet size={18} /> Snap
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
        <h3>Brush Size</h3>
        <div className="button-row" style={{ alignItems: 'center' }}>
          <span style={{ fontSize: '12px', minWidth: '20px' }}>{brushSize}</span>
          <input 
            type="range" 
            min="1" max="50" 
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            style={{ width: '100px' }}
          />
        </div>
      </div>

      <div className="tool-group">
        <h3>Canvas Settings</h3>
        <div className="button-row" style={{ flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', width: '40px' }}>Width:</span>
            <input 
              type="number" 
              value={canvasWidth}
              onChange={(e) => setCanvasWidth(Number(e.target.value))}
              style={{ width: '80px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '4px', borderRadius: '4px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', width: '40px' }}>Height:</span>
            <input 
              type="number" 
              value={canvasHeight}
              onChange={(e) => setCanvasHeight(Number(e.target.value))}
              style={{ width: '80px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '4px', borderRadius: '4px' }}
            />
          </div>
        </div>
      </div>

      <div className="tool-group">
        <h3>Actions</h3>
        <div className="button-row">
          <button onClick={handleUndo} disabled={!canUndo} style={{ opacity: canUndo ? 1 : 0.5 }}>
            <Undo2 size={18} /> Undo
          </button>
          <button onClick={handleRedo} disabled={!canRedo} style={{ opacity: canRedo ? 1 : 0.5 }}>
            <Redo2 size={18} /> Redo
          </button>
          <button onClick={playTimelapse}>
            <PlayCircle size={18} /> Timelapse
          </button>
        </div>
      </div>

      <div className="tool-group">
        <h3>File</h3>
        <div className="button-row">
          <button onClick={() => openGallery()}>
            <FolderOpen size={18} /> Gallery
          </button>
          <button onClick={saveProject}>
            <Download size={18} /> Save JSON
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
            <Upload size={18} /> Load JSON
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={loadProject} />
          </label>
        </div>
        <div className="button-row" style={{ marginTop: '8px' }}>
          <button onClick={exportImage}>
            <Download size={18} /> PNG
          </button>
          <button onClick={exportSVG}>
            <Download size={18} /> SVG
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
