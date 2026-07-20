import { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Upload, Plus, Trash2, Eye, EyeOff, Minus, Maximize, MousePointer2, Move, Crosshair } from 'lucide-react';
import DrawingCanvas from './components/DrawingCanvas';
import Toolbar from './components/Toolbar';
import LayersPanel from './components/LayersPanel';
import DraggablePanel from './components/DraggablePanel';
import GalleryModal from './components/GalleryModal';

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
  const [layers, setLayers] = useState(() => {
    const autosave = localStorage.getItem('artWorldAutosave');
    if (autosave) {
      try {
        const parsed = JSON.parse(autosave);
        if (parsed.layers) return parsed.layers;
      } catch (e) {
        console.error("Failed to parse autosave", e);
      }
    }
    return [defaultLayer()];
  });
  const [activeLayerId, setActiveLayerId] = useState(layers[0].id);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  
  const [tool, setTool] = useState('draw'); // draw, pan, center, erase
  const [symmetry, setSymmetry] = useState('none'); // none, 2-way, 4-way
  const [centerPoint, setCenterPoint] = useState({ x: 0, y: 0 }); // relative to world origin 0,0
  
  const [drawMode, setDrawMode] = useState('segment'); // segment, continuous
  const [snapToGrid, setSnapToGrid] = useState(true);
  
  const [gridSpacing, setGridSpacing] = useState(() => {
    const autosave = localStorage.getItem('artWorldAutosave');
    if (autosave) {
      try {
        const parsed = JSON.parse(autosave);
        if (parsed.gridSpacing) return parsed.gridSpacing;
      } catch (e) {}
    }
    return 40;
  });

  useEffect(() => {
    const saveData = { layers, gridSpacing };
    localStorage.setItem('artWorldAutosave', JSON.stringify(saveData));
  }, [layers, gridSpacing]);
  
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
  
  const exportImage = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `art-world-${Date.now()}.png`;
    a.click();
  };

  const exportSVG = () => {
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
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `art-world-${Date.now()}.svg`;
    a.click();
  };

  const saveProject = () => {
    const projectData = {
      layers,
      symmetry,
      centerPoint,
      gridSpacing
    };
    const blob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = 'art-world-project.json';
    link.href = URL.createObjectURL(blob);
    link.click();
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

  const handleSaveToGallery = (name) => {
    const saved = JSON.parse(localStorage.getItem('artWorldProjects') || '[]');
    const newProject = {
      id: generateId(),
      name,
      date: new Date().toISOString(),
      data: { layers, gridSpacing }
    };
    localStorage.setItem('artWorldProjects', JSON.stringify([newProject, ...saved]));
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
