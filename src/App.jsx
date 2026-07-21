import { useState, useRef, useEffect } from 'react';
import { Undo2 } from 'lucide-react';
import DrawingCanvas from './components/DrawingCanvas';
import Toolbar from './components/Toolbar';
import LayersPanel from './components/LayersPanel';
import DraggablePanel from './components/DraggablePanel';
import GalleryModal from './components/GalleryModal';
import Home from './components/Home';
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
  blendMode: 'source-over',
  lines: [],
  strokes: [],
  updatedAt: Date.now()
});

function App() {
  const [currentRoute, setCurrentRoute] = useState('home'); // 'home', 'editor'
  
  const [layers, setLayers] = useState([defaultLayer()]);
  const [activeLayerId, setActiveLayerId] = useState(layers[0].id);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  
  const [tool, setTool] = useState('draw'); // draw, pan, center, erase
  const [symmetry, setSymmetry] = useState('none'); // none, 2-way, 4-way
  const [canvasWidth, setCanvasWidth] = useState(2000);
  const [canvasHeight, setCanvasHeight] = useState(2000);
  const [centerPoint, setCenterPoint] = useState({ x: 1000, y: 1000 }); 
  const [brushSize, setBrushSize] = useState(2);
  
  const [drawMode, setDrawMode] = useState('segment'); // segment, continuous
  const [snapToGrid, setSnapToGrid] = useState(true);
  
  const [gridSpacing, setGridSpacing] = useState(40);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlayingTimelapse, setIsPlayingTimelapse] = useState(false);

  const timelapseAbortController = useRef(null);

  useEffect(() => {
    return () => {
      if (timelapseAbortController.current) {
        timelapseAbortController.current.abort();
      }
    };
  }, []);

  const playTimelapse = async () => {
    if (isPlayingTimelapse) return;
    setIsPlayingTimelapse(true);
    timelapseAbortController.current = new AbortController();
    const signal = timelapseAbortController.current.signal;

    try {
      const originalLayers = JSON.parse(JSON.stringify(layers));
      let currentLayers = originalLayers.map(l => ({ ...l, strokes: [], lines: [], updatedAt: Date.now() }));
      setLayers(currentLayers);

      for (let i = originalLayers.length - 1; i >= 0; i--) {
        const originalLayer = originalLayers[i];
        const strokes = originalLayer.strokes || [];
        const lines = originalLayer.lines || [];
        
        for (let j = 0; j < lines.length; j++) {
          if (signal.aborted) return;
          currentLayers = currentLayers.map(l => l.id === originalLayer.id ? { ...l, lines: [...l.lines, lines[j]], updatedAt: Date.now() } : l);
          setLayers(currentLayers);
          await new Promise(r => setTimeout(r, 50));
        }

        for (let j = 0; j < strokes.length; j++) {
          if (signal.aborted) return;
          currentLayers = currentLayers.map(l => l.id === originalLayer.id ? { ...l, strokes: [...l.strokes, strokes[j]], updatedAt: Date.now() } : l);
          setLayers(currentLayers);
          await new Promise(r => setTimeout(r, 20));
        }
      }
    } finally {
      setIsPlayingTimelapse(false);
    }
  };

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
          if (autosave.canvasWidth) setCanvasWidth(autosave.canvasWidth);
          if (autosave.canvasHeight) setCanvasHeight(autosave.canvasHeight);
          if (autosave.centerPoint) setCenterPoint(autosave.centerPoint);
        }
      } catch (e) {
        console.error("Failed to load autosave", e);
      }
      setIsLoaded(true);
    };
    loadAutosave();
  }, []);

  const autosaveTimeout = useRef(null);

  useEffect(() => {
    if (!isLoaded || isPlayingTimelapse) return;
    
    if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);
    
    autosaveTimeout.current = setTimeout(() => {
      const saveData = { layers, gridSpacing, canvasWidth, canvasHeight, centerPoint };
      localforage.setItem('artWorldAutosave', saveData).catch(e => console.error("Autosave failed", e));
    }, 1000); // 1s debounce
    
    return () => clearTimeout(autosaveTimeout.current);
  }, [layers, gridSpacing, canvasWidth, canvasHeight, centerPoint, isLoaded, isPlayingTimelapse]);
  
  const [history, setHistory] = useState([]);
  const [redoHistory, setRedoHistory] = useState([]);

  const handleAddStrokes = (newStrokes) => {
    setHistory(prev => [...prev.slice(-20), layers]); // Keep last 20 actions
    setRedoHistory([]); // Clear redo on new action
    
    setLayers(prevLayers => prevLayers.map(layer => {
      if (layer.id === activeLayerId) {
        return { 
          ...layer, 
          strokes: [...(layer.strokes || []), ...newStrokes],
          updatedAt: Date.now()
        };
      }
      return layer;
    }));
  };

  const handleEraseElements = (linesToRemove, strokesToRemove) => {
    if (linesToRemove.length === 0 && strokesToRemove.length === 0) return;
    setHistory(prev => [...prev.slice(-20), layers]);
    setRedoHistory([]);
    
    setLayers(prevLayers => prevLayers.map(layer => {
      if (layer.id === activeLayerId) {
        return { 
          ...layer, 
          lines: layer.lines ? layer.lines.filter(l => !linesToRemove.includes(l)) : [],
          strokes: layer.strokes ? layer.strokes.filter(s => !strokesToRemove.includes(s)) : [],
          updatedAt: Date.now()
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
    setLayers(prev => prev.map(l => l.id === id ? { ...l, lines: [], strokes: [], updatedAt: Date.now() } : l));
  };

  const duplicateLayer = (id) => {
    setHistory(prev => [...prev.slice(-20), layers]);
    setRedoHistory([]);
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === id);
      if (idx === -1) return prev;
      const layerToCopy = prev[idx];
      const newLayer = {
        ...layerToCopy,
        id: generateId(),
        name: `${layerToCopy.name} Copy`,
        lines: [...(layerToCopy.lines || [])],
        strokes: [...(layerToCopy.strokes || [])],
        updatedAt: Date.now()
      };
      const newLayers = [...prev];
      newLayers.splice(idx, 0, newLayer); // Insert above
      setActiveLayerId(newLayer.id);
      return newLayers;
    });
  };

  const mergeDown = (id) => {
    setHistory(prev => [...prev.slice(-20), layers]);
    setRedoHistory([]);
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === id);
      if (idx === -1 || idx === prev.length - 1) return prev; // Cannot merge down if last
      
      const topLayer = prev[idx];
      const bottomLayer = prev[idx + 1];
      
      const mergedLayer = {
        ...bottomLayer,
        lines: [...(bottomLayer.lines || []), ...(topLayer.lines || [])],
        strokes: [...(bottomLayer.strokes || []), ...(topLayer.strokes || [])],
        updatedAt: Date.now()
      };
      
      const newLayers = [...prev];
      newLayers[idx + 1] = mergedLayer; // Update bottom layer
      newLayers.splice(idx, 1); // Remove top layer
      
      if (activeLayerId === id) {
        setActiveLayerId(mergedLayer.id);
      }
      return newLayers;
    });
  };

  // Export functionality
  const canvasRef = useRef(null);
  
  const exportImage = async () => {
    if (!canvasRef.current || !canvasRef.current.exportHighRes) return;
    const dataUrl = canvasRef.current.exportHighRes();
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
      if (layer.lines) {
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
      }
      if (layer.strokes) {
        layer.strokes.forEach(stroke => {
          stroke.points.forEach(pt => {
            if (!hasPoints) {
              minX = maxX = pt.x;
              minY = maxY = pt.y;
              hasPoints = true;
            }
            minX = Math.min(minX, pt.x);
            maxX = Math.max(maxX, pt.x);
            minY = Math.min(minY, pt.y);
            maxY = Math.max(maxY, pt.y);
          });
        });
      }
    });

    // For finite canvas, we should ideally use the fixed bounds!
    // For finite canvas, we should ideally use the fixed bounds!
    // Let's use the explicit canvasWidth and canvasHeight for the SVG.
    const width = canvasWidth;
    const height = canvasHeight;

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
    svgContent += `<rect width="100%" height="100%" fill="#1a1a2e" x="0" y="0" />`;
    
    layers.forEach(layer => {
      if (!layer.visible) return;
      
      // Draw legacy lines
      if (layer.lines && layer.lines.length > 0) {
        svgContent += `<g stroke="${layer.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="${layer.opacity}">`;
        layer.lines.forEach(line => {
           svgContent += `<line x1="${line.start.x}" y1="${line.start.y}" x2="${line.end.x}" y2="${line.end.y}" />`;
        });
        svgContent += `</g>`;
      }

      // Draw modern strokes
      if (layer.strokes && layer.strokes.length > 0) {
        layer.strokes.forEach(stroke => {
          svgContent += `<path d="`;
          if (stroke.points.length > 0) {
            svgContent += `M ${stroke.points[0].x} ${stroke.points[0].y} `;
            for (let i = 1; i < stroke.points.length; i++) {
              svgContent += `L ${stroke.points[i].x} ${stroke.points[i].y} `;
            }
          }
          svgContent += `" stroke="${layer.color}" stroke-width="${stroke.size || 2}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${layer.opacity}" />`;
        });
      }
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
      canvasWidth,
      canvasHeight,
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
        if (data.canvasWidth) setCanvasWidth(data.canvasWidth);
        if (data.canvasHeight) setCanvasHeight(data.canvasHeight);
        if (data.layers && data.layers.length > 0) setActiveLayerId(data.layers[0].id);
        setHistory([]);
      } catch (e) {
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
        data: { layers, gridSpacing, canvasWidth, canvasHeight, centerPoint }
      };
      await localforage.setItem('artWorldProjects', [newProject, ...saved]);
    } catch (e) {
      console.error(e);
      alert("Failed to save project to gallery.");
    }
  };

  const handleLoadFromGallery = (project) => {
    setLayers(project.data.layers);
    if (project.data.gridSpacing) setGridSpacing(project.data.gridSpacing);
    if (project.data.canvasWidth) setCanvasWidth(project.data.canvasWidth);
    if (project.data.canvasHeight) setCanvasHeight(project.data.canvasHeight);
    if (project.data.centerPoint) setCenterPoint(project.data.centerPoint);
    setHistory([]);
    setRedoHistory([]);
    setIsGalleryOpen(false);
  };

  if (currentRoute === 'home') {
    return <Home onStart={() => setCurrentRoute('editor')} />;
  }

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
          canvasWidth={canvasWidth}
          setCanvasWidth={setCanvasWidth}
          canvasHeight={canvasHeight}
          setCanvasHeight={setCanvasHeight}
          brushSize={brushSize}
          setBrushSize={setBrushSize}
          playTimelapse={playTimelapse}
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
          updateLayer={updateLayer}
          tool={tool}
          setTool={setTool}
          symmetry={symmetry}
          drawMode={drawMode}
          snapToGrid={snapToGrid}
          centerPoint={centerPoint}
          setCenterPoint={setCenterPoint}
          gridSpacing={gridSpacing}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          brushSize={brushSize}
          handleUndo={handleUndo}
          canUndo={history.length > 0}
          onAddStrokes={handleAddStrokes}
          onEraseElements={handleEraseElements}
        />
        {isPlayingTimelapse && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '20px', pointerEvents: 'none' }}>
            <div style={{ background: 'rgba(0,0,0,0.7)', color: 'white', padding: '10px 20px', borderRadius: '20px', fontSize: '18px', fontWeight: 'bold' }}>
              Playing Timelapse...
            </div>
          </div>
        )}
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
          duplicateLayer={duplicateLayer}
          mergeDown={mergeDown}
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
