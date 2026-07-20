import { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Upload, Plus, Trash2, Eye, EyeOff, Minus, Maximize, MousePointer2, Move, Crosshair } from 'lucide-react';
import DrawingCanvas from './components/DrawingCanvas';
import Toolbar from './components/Toolbar';
import LayersPanel from './components/LayersPanel';
import DraggablePanel from './components/DraggablePanel';
import GalleryModal from './components/GalleryModal';
import localforage from 'localforage';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const generateId = () => Math.random().toString(36).substr(2, 9);

const defaultLayer = () => ({
  id: generateId(),
  name: 'Layer 1',
  visible: true,
  color: '#38bdf8',
  opacity: 1,
  glow: 10,
  lines: []
});

function App() {
  const [layers, setLayers] = useState([defaultLayer()]);
  const [activeLayerId, setActiveLayerId] = useState(layers[0].id);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  
  const [tool, setTool] = useState('draw'); // draw, pan, center, erase
  const [symmetry, setSymmetry] = useState('none'); // none, 2-way, 4-way
  const [centerPoint, setCenterPoint] = useState({ x: 0, y: 0 }); // relative to world origin 0,0
  
  const [drawMode, setDrawMode] = useState('segment'); // segment, continuous
  const [snapToGrid, setSnapToGrid] = useState(true);
  
  const [gridSpacing, setGridSpacing] = useState(40);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadAutosave = async () => {
      try {
        const autosave = await localforage.getItem('artWorldAutosave');
        if (autosave) {
          if (autosave.layers && autosave.layers.length > 0) {
            setLayers(autosave.layers);
            setActiveLayerId(autosave.layers[0].id);
          }
          if (autosave.gridSpacing) setGridSpacing(autosave.gridSpacing);
        }
      } catch (e) {
        console.error("Failed to load autosave", e);
      }
      setIsLoaded(true);
    };
    loadAutosave();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const saveData = { layers, gridSpacing };
    localforage.setItem('artWorldAutosave', saveData).catch(e => console.error("Autosave failed", e));
  }, [layers, gridSpacing, isLoaded]);
  
  const [history, setHistory] = useState([]);
  const [redoHistory, setRedoHistory] = useState([]);

  const handleAddLine = (newLines) => {
    setHistory(prev => [...prev.slice(-20), layers]); // Keep last 20 actions
    setRedoHistory([]); // Clear redo on new action
    
    setLayers(prevLayers => prevLayers.map(layer => {
      if (layer.id === activeLayerId) {
        return { ...layer, lines: [...layer.lines, ...newLines] };
      }
      return layer;
    }));
  };

  const handleEraseLines = (linesToRemove) => {
    if (linesToRemove.length === 0) return;
    setHistory(prev => [...prev.slice(-20), layers]);
    setRedoHistory([]);
    
    setLayers(prevLayers => prevLayers.map(layer => {
      if (layer.id === activeLayerId) {
        return { 
          ...layer, 
          lines: layer.lines.filter(l => !linesToRemove.includes(l)) 
        };
      }
      return layer;
    }));
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const prevLayers = history[history.length - 1];
      setRedoHistory(prev => [...prev, layers]);
      setLayers(prevLayers);
      setHistory(prev => prev.slice(0, -1));
    }
  };

  const handleRedo = () => {
    if (redoHistory.length > 0) {
      const nextLayers = redoHistory[redoHistory.length - 1];
      setHistory(prev => [...prev, layers]);
      setLayers(nextLayers);
      setRedoHistory(prev => prev.slice(0, -1));
    }
  };

  const updateLayer = (id, updates) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const addLayer = () => {
    const newLayer = { ...defaultLayer(), name: `Layer ${layers.length + 1}` };
    setLayers(prev => [newLayer, ...prev]);
    setActiveLayerId(newLayer.id);
  };

  const deleteLayer = (id) => {
    if (layers.length > 1) {
      setHistory(prev => [...prev.slice(-20), layers]);
      setRedoHistory([]);
      setLayers(prev => prev.filter(l => l.id !== id));
      if (activeLayerId === id) {
        setActiveLayerId(layers.find(l => l.id !== id).id);
      }
    }
  };

  const clearLayer = (id) => {
    setHistory(prev => [...prev.slice(-20), layers]);
    setRedoHistory([]);
    setLayers(prev => prev.map(l => l.id === id ? { ...l, lines: [] } : l));
  };

  // Export functionality
  const canvasRef = useRef(null);
  
  const exportImage = async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d');
    
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(canvas, 0, 0);
    
    const dataUrl = exportCanvas.toDataURL('image/png');
    const fileName = `art-world-${Date.now()}.png`;

    if (Capacitor.isNativePlatform()) {
      try {
        const base64Data = dataUrl.split(',')[1];
        const result = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache
        });
        await Share.share({
          title: 'Art World Export',
          url: result.uri,
          dialogTitle: 'Share or Save your Artwork'
        });
      } catch (e) {
        console.error("Export Image error:", e);
        alert('Failed to save or share on device.');
      }
    } else {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = fileName;
      a.click();
    }
  };

  const exportSVG = async () => {
    let minX = 0, minY = 0, maxX = 0, maxY = 0;
    let hasPoints = false;

    layers.forEach(layer => {
      if (!layer.visible) return;
      layer.lines.forEach(line => {
        if (!hasPoints) {
          minX = maxX = line.start.x;
          minY = maxY = line.start.y;
          hasPoints = true;
        }
        minX = Math.min(minX, line.start.x, line.end.x);
        maxX = Math.max(maxX, line.start.x, line.end.x);
        minY = Math.min(minY, line.start.y, line.end.y);
        maxY = Math.max(maxY, line.start.y, line.end.y);
      });
    });

    const padding = 50;
    minX -= padding; minY -= padding;
    maxX += padding; maxY += padding;
    const width = hasPoints ? maxX - minX : 1000;
    const height = hasPoints ? maxY - minY : 1000;

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">`;
    svgContent += `<rect width="100%" height="100%" fill="#1a1a2e" x="${minX}" y="${minY}" />`;
    
    layers.forEach(layer => {
      if (!layer.visible) return;
      svgContent += `<g stroke="${layer.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="${layer.opacity}">`;
      layer.lines.forEach(line => {
         svgContent += `<line x1="${line.start.x}" y1="${line.start.y}" x2="${line.end.x}" y2="${line.end.y}" />`;
      });
      svgContent += `</g>`;
    });
    
    svgContent += `</svg>`;
    const fileName = `art-world-${Date.now()}.svg`;

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: svgContent,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });
        await Share.share({
          title: 'Art World Vector',
          url: result.uri,
          dialogTitle: 'Share SVG File'
        });
      } catch (e) {
        console.error("Export SVG error:", e);
        alert("Failed to export SVG on device.");
      }
    } else {
      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const saveProject = async () => {
    const projectData = {
      layers,
      symmetry,
      centerPoint,
      gridSpacing,
      version: 1
    };
    const jsonString = JSON.stringify(projectData);
    const fileName = `art-world-project-${Date.now()}.json`;

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: jsonString,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });
        await Share.share({
          title: 'Art World Project',
          url: result.uri,
          dialogTitle: 'Share Project File'
        });
      } catch (e) {
        console.error("Save JSON error:", e);
        alert("Failed to save project on device.");
      }
    } else {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const loadProject = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.layers) setLayers(data.layers);
        if (data.symmetry) setSymmetry(data.symmetry);
        if (data.centerPoint) setCenterPoint(data.centerPoint);
        if (data.gridSpacing) setGridSpacing(data.gridSpacing);
        if (data.layers.length > 0) setActiveLayerId(data.layers[0].id);
        setHistory([]);
      } catch (err) {
        alert("Failed to load project file.");
      }
    };
    reader.readAsText(file);
    e.target.value = null; // Reset input
  };

  const handleSaveToGallery = async (name) => {
    try {
      const saved = await localforage.getItem('artWorldProjects') || [];
      const newProject = {
        id: generateId(),
        name,
        date: new Date().toISOString(),
        data: { layers, gridSpacing }
      };
      await localforage.setItem('artWorldProjects', [newProject, ...saved]);
    } catch (e) {
      console.error(e);
      alert("Failed to save project to gallery.");
    }
  };

  const handleLoadFromGallery = (project) => {
    setLayers(project.data.layers);
    setGridSpacing(project.data.gridSpacing);
    setHistory([]);
    setRedoHistory([]);
    setIsGalleryOpen(false);
  };

  return (
    <div className="app-container">
      <DraggablePanel title="Tools" defaultPosition={{ x: 20, y: 20 }}>
        <Toolbar 
          tool={tool} setTool={setTool}
          symmetry={symmetry} setSymmetry={setSymmetry}
          drawMode={drawMode} setDrawMode={setDrawMode}
          snapToGrid={snapToGrid} setSnapToGrid={setSnapToGrid}
          handleUndo={handleUndo}
          canUndo={history.length > 0}
          handleRedo={handleRedo}
          canRedo={redoHistory.length > 0}
          exportImage={exportImage}
          exportSVG={exportSVG}
          saveProject={saveProject}
          loadProject={loadProject}
          openGallery={() => setIsGalleryOpen(true)}
          gridSpacing={gridSpacing}
          setGridSpacing={setGridSpacing}
        />
      </DraggablePanel>
      <button 
        className="quick-undo-btn"
        onClick={handleUndo} 
        disabled={history.length === 0} 
        style={{ 
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          zIndex: 90,
          opacity: history.length > 0 ? 1 : 0.4,
          padding: '20px',
          borderRadius: '50%',
          background: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-main)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Undo2 size={28} />
      </button>
      
      <div className="canvas-container">
        <DrawingCanvas 
          ref={canvasRef}
          layers={layers}
          activeLayerId={activeLayerId}
          tool={tool}
          symmetry={symmetry}
          drawMode={drawMode}
          snapToGrid={snapToGrid}
          centerPoint={centerPoint}
          setCenterPoint={setCenterPoint}
          gridSpacing={gridSpacing}
          handleUndo={handleUndo}
          canUndo={history.length > 0}
          onAddLine={handleAddLine}
          onEraseLines={handleEraseLines}
        />
      </div>

      <DraggablePanel title="Layers" defaultPosition={{ x: window.innerWidth > 800 ? window.innerWidth - 360 : 20, y: 20 }}>
        <LayersPanel 
          layers={layers}
          activeLayerId={activeLayerId}
          setActiveLayerId={setActiveLayerId}
          updateLayer={updateLayer}
          addLayer={addLayer}
          deleteLayer={deleteLayer}
          clearLayer={clearLayer}
        />
      </DraggablePanel>

      {isGalleryOpen && (
        <GalleryModal 
          onClose={() => setIsGalleryOpen(false)}
          onSave={handleSaveToGallery}
          onLoad={handleLoadFromGallery}
        />
      )}
    </div>
  );
}

export default App;
