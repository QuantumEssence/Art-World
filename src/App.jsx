import { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Upload, Plus, Trash2, Eye, EyeOff, Minus, Maximize, MousePointer2, Move, Crosshair } from 'lucide-react';
import DrawingCanvas from './components/DrawingCanvas';
import Toolbar from './components/Toolbar';
import LayersPanel from './components/LayersPanel';

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
  
  const [tool, setTool] = useState('draw'); // draw, pan, center
  const [symmetry, setSymmetry] = useState('none'); // none, 2-way, 4-way
  const [centerPoint, setCenterPoint] = useState({ x: 0, y: 0 }); // relative to world origin 0,0
  
  const [gridSpacing, setGridSpacing] = useState(40);
  
  // Undo history (very basic: store last N states of layers)
  const [history, setHistory] = useState([]);

  const handleAddLine = (newLines) => {
    setHistory(prev => [...prev.slice(-20), layers]); // Keep last 20 actions
    
    setLayers(prevLayers => prevLayers.map(layer => {
      if (layer.id === activeLayerId) {
        return { ...layer, lines: [...layer.lines, ...newLines] };
      }
      return layer;
    }));
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const prevLayers = history[history.length - 1];
      setLayers(prevLayers);
      setHistory(prev => prev.slice(0, -1));
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
    if (layers.length === 1) return;
    setLayers(prev => prev.filter(l => l.id !== id));
    if (activeLayerId === id) {
      setActiveLayerId(layers.find(l => l.id !== id).id);
    }
  };

  // Export functionality
  const canvasRef = useRef(null);
  
  const exportImage = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'art-world-drawing.png';
    link.href = dataUrl;
    link.click();
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

  return (
    <div className="app-container">
      <Toolbar 
        tool={tool} setTool={setTool}
        symmetry={symmetry} setSymmetry={setSymmetry}
        handleUndo={handleUndo}
        canUndo={history.length > 0}
        exportImage={exportImage}
        saveProject={saveProject}
        loadProject={loadProject}
        gridSpacing={gridSpacing}
        setGridSpacing={setGridSpacing}
      />
      
      <div className="canvas-container">
        <DrawingCanvas 
          ref={canvasRef}
          layers={layers}
          activeLayerId={activeLayerId}
          tool={tool}
          symmetry={symmetry}
          centerPoint={centerPoint}
          setCenterPoint={setCenterPoint}
          gridSpacing={gridSpacing}
          onAddLine={handleAddLine}
        />
      </div>

      <LayersPanel 
        layers={layers}
        activeLayerId={activeLayerId}
        setActiveLayerId={setActiveLayerId}
        updateLayer={updateLayer}
        addLayer={addLayer}
        deleteLayer={deleteLayer}
      />
    </div>
  );
}

export default App;
