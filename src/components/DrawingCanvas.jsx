import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { ZoomIn, ZoomOut, Maximize, Undo2 } from 'lucide-react';

const DrawingCanvas = forwardRef(({ 
  layers, activeLayerId, tool, symmetry, centerPoint, setCenterPoint, 
  drawMode, snapToGrid, gridSpacing, handleUndo, canUndo, onAddLine, onEraseLines 
}, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [ctx, setCtx] = useState(null);
  
  // Viewport transform
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  
  // Interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [currentLineStart, setCurrentLineStart] = useState(null);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [isErasing, setIsErasing] = useState(false);
  const [mousePos, setMousePos] = useState(null);

  // Multi-touch state
  const activePointers = useRef(new Map());
  const pinchState = useRef(null);

  useImperativeHandle(ref, () => canvasRef.current);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    setCtx(context);
    
    const handleResize = () => {
      if (containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
        draw();
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main draw loop
  const draw = () => {
    if (!ctx || !canvasRef.current) return;
    const canvas = canvasRef.current;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Setup transform
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);
    
    // Draw Grid (infinite background)
    drawGrid(ctx, canvas, transform);
    
    // Draw Center Point if active
    if (symmetry !== 'none' || tool === 'center') {
      drawCenterCross(ctx, centerPoint);
    }

    // Draw Layers
    layers.forEach(layer => {
      if (!layer.visible) return;
      
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.strokeStyle = layer.color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (layer.glow > 0) {
        ctx.shadowBlur = layer.glow;
        ctx.shadowColor = layer.color;
      }
      
      ctx.beginPath();
      layer.lines.forEach(line => {
        ctx.moveTo(line.start.x, line.start.y);
        ctx.lineTo(line.end.x, line.end.y);
      });
      ctx.stroke();
      ctx.restore();
    });

    // Draw active preview line or current stroke
    if (tool === 'draw') {
      const activeLayer = layers.find(l => l.id === activeLayerId);
      if (activeLayer) {
        ctx.save();
        ctx.globalAlpha = activeLayer.opacity * 0.7;
        ctx.strokeStyle = activeLayer.color;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        
        // Draw continuous stroke
        if (currentStroke.length > 0) {
          currentStroke.forEach(line => {
            ctx.moveTo(line.start.x, line.start.y);
            ctx.lineTo(line.end.x, line.end.y);
          });
        }
        
        // Draw segment preview
        if (currentLineStart && mousePos && drawMode === 'segment') {
          const endPoint = snapToGridPoint(mousePos);
          const linesToDraw = getSymmetricLines(currentLineStart, endPoint);
          linesToDraw.forEach(line => {
            ctx.moveTo(line.start.x, line.start.y);
            ctx.lineTo(line.end.x, line.end.y);
          });
        }
        
        ctx.stroke();
        ctx.restore();
      }
    }
    
    // Draw snap indicator
    if ((tool === 'draw' || tool === 'center' || tool === 'erase') && mousePos) {
      const snapped = tool === 'erase' ? mousePos : snapToGridPoint(mousePos);
      ctx.fillStyle = tool === 'erase' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(snapped.x, snapped.y, tool === 'erase' ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  };

  useEffect(() => {
    draw();
  }, [layers, transform, mousePos, currentLineStart, currentStroke, symmetry, centerPoint, tool, activeLayerId]);

  const drawGrid = (ctx, canvas, transform) => {
    // Calculate visible bounds in world coordinates
    const startX = (-transform.x) / transform.scale;
    const startY = (-transform.y) / transform.scale;
    const endX = (canvas.width - transform.x) / transform.scale;
    const endY = (canvas.height - transform.y) / transform.scale;

    const snapStartX = Math.floor(startX / gridSpacing) * gridSpacing;
    const snapStartY = Math.floor(startY / gridSpacing) * gridSpacing;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let x = snapStartX; x <= endX; x += gridSpacing) {
      for (let y = snapStartY; y <= endY; y += gridSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const drawCenterCross = (ctx, center) => {
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)'; // red-400
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(center.x - 20, center.y);
    ctx.lineTo(center.x + 20, center.y);
    ctx.moveTo(center.x, center.y - 20);
    ctx.lineTo(center.x, center.y + 20);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const getSymmetricLines = (start, end) => {
    const lines = [{ start, end }];
    const { x: cx, y: cy } = centerPoint;

    if (symmetry === '2-way' || symmetry === '4-way') {
      // Horizontal reflection (left/right)
      lines.push({
        start: { x: 2 * cx - start.x, y: start.y },
        end: { x: 2 * cx - end.x, y: end.y }
      });
    }
    
    if (symmetry === '4-way') {
      // Vertical reflection (top/bottom)
      lines.push({
        start: { x: start.x, y: 2 * cy - start.y },
        end: { x: end.x, y: 2 * cy - end.y }
      });
      // Both (diagonal)
      lines.push({
        start: { x: 2 * cx - start.x, y: 2 * cy - start.y },
        end: { x: 2 * cx - end.x, y: 2 * cy - end.y }
      });
    }

    // Deduplicate lines (if drawing exactly on the mirror axis)
    const uniqueLines = [];
    const seen = new Set();
    lines.forEach(line => {
      // Normalize line direction for deduplication
      const sx = Math.min(line.start.x, line.end.x);
      const sy = Math.min(line.start.y, line.end.y);
      const ex = Math.max(line.start.x, line.end.x);
      const ey = Math.max(line.start.y, line.end.y);
      const key = `${sx},${sy}-${ex},${ey}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueLines.push(line);
      }
    });

    return uniqueLines;
  };

  // Utilities
  const screenToWorld = (x, y) => {
    return {
      x: (x - transform.x) / transform.scale,
      y: (y - transform.y) / transform.scale
    };
  };

  const snapToGridPoint = (worldPoint) => {
    if (!snapToGrid && tool !== 'center') return worldPoint;
    
    // The user wants to snap to dots OR perfectly between 4 dots.
    // Standard snapping to dots:
    let snappedX = Math.round(worldPoint.x / gridSpacing) * gridSpacing;
    let snappedY = Math.round(worldPoint.y / gridSpacing) * gridSpacing;
    
    // For setting the center point, we allow half-grid snaps (between 4 dots)
    if (tool === 'center') {
      const halfGrid = gridSpacing / 2;
      snappedX = Math.round(worldPoint.x / halfGrid) * halfGrid;
      snappedY = Math.round(worldPoint.y / halfGrid) * halfGrid;
    }

    return { x: snappedX, y: snappedY };
  };

  const distToSegmentSquared = (p, v, w) => {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return (p.x - v.x) ** 2 + (p.y - v.y) ** 2;
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return (p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2;
  };

  const performErase = (worldPos) => {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) return;
    
    // Eraser radius in world coordinates
    const eraseRadiusSq = (10 / transform.scale) ** 2;
    const linesToRemove = [];
    
    activeLayer.lines.forEach(line => {
      const distSq = distToSegmentSquared(worldPos, line.start, line.end);
      if (distSq < eraseRadiusSq) {
        linesToRemove.push(line);
      }
    });
    
    if (linesToRemove.length > 0) {
      onEraseLines(linesToRemove);
    }
  };

  // Event Handlers
  const handlePointerDown = (e) => {
    e.target.setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 2) {
      const points = Array.from(activePointers.current.values());
      const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      pinchState.current = { 
        dist, 
        midX: (points[0].x + points[1].x) / 2, 
        midY: (points[0].y + points[1].y) / 2, 
        initialTransform: { ...transform } 
      };
      
      setIsDragging(false);
      setCurrentLineStart(null);
      setCurrentStroke([]);
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (e.button === 1 || tool === 'pan') { // Middle click or pan tool
      setIsDragging(true);
      setDragStart({ x: x - transform.x, y: y - transform.y });
      return;
    }

    const worldPos = screenToWorld(x, y);
    const snapped = snapToGridPoint(worldPos);

    if (tool === 'center') {
      setCenterPoint(snapped);
    } else if (tool === 'draw') {
      setCurrentLineStart(snapped);
      setCurrentStroke([]);
    } else if (tool === 'erase') {
      setIsErasing(true);
      performErase(worldPos);
    }
  };

  const handlePointerMove = (e) => {
    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    const rect = canvasRef.current.getBoundingClientRect();

    if (activePointers.current.size === 2 && pinchState.current) {
      const points = Array.from(activePointers.current.values());
      const newDist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const newMidX = (points[0].x + points[1].x) / 2;
      const newMidY = (points[0].y + points[1].y) / 2;
      
      const { dist, midX, midY, initialTransform } = pinchState.current;
      
      let newScale = initialTransform.scale * (newDist / dist);
      newScale = Math.max(0.1, Math.min(newScale, 5));
      
      const scaleRatio = newScale / initialTransform.scale;
      
      const offsetX = newMidX - rect.left;
      const offsetY = newMidY - rect.top;
      const initialMidX = midX - rect.left;
      const initialMidY = midY - rect.top;
      
      const newX = offsetX - (initialMidX - initialTransform.x) * scaleRatio;
      const newY = offsetY - (initialMidY - initialTransform.y) * scaleRatio;
      
      setTransform({ x: newX, y: newY, scale: newScale });
      return;
    }

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: x - dragStart.x,
        y: y - dragStart.y
      }));
    } else {
      const worldPos = screenToWorld(x, y);
      setMousePos(worldPos);
      
      if (tool === 'draw' && currentLineStart && drawMode === 'continuous') {
        const endPoint = snapToGridPoint(worldPos);
        if (currentLineStart.x !== endPoint.x || currentLineStart.y !== endPoint.y) {
          const newLines = getSymmetricLines(currentLineStart, endPoint);
          setCurrentStroke(prev => [...prev, ...newLines]);
          setCurrentLineStart(endPoint);
        }
      } else if (tool === 'erase' && isErasing) {
        performErase(worldPos);
      }
    }
  };

  const handlePointerUp = (e) => {
    activePointers.current.delete(e.pointerId);
    e.target.releasePointerCapture(e.pointerId);

    if (activePointers.current.size < 2) {
      pinchState.current = null;
    }

    if (isDragging) {
      setIsDragging(false);
      return;
    }

    if (tool === 'draw') {
      if (drawMode === 'segment' && currentLineStart && mousePos) {
        const endPoint = snapToGridPoint(mousePos);
        
        if (currentLineStart.x !== endPoint.x || currentLineStart.y !== endPoint.y) {
          const newLines = getSymmetricLines(currentLineStart, endPoint);
          onAddLine(newLines);
        }
      } else if (drawMode === 'continuous' && currentStroke.length > 0) {
        onAddLine(currentStroke);
      }
      
      setCurrentLineStart(null);
      setCurrentStroke([]);
    } else if (tool === 'erase') {
      setIsErasing(false);
    }
  };

  const handlePointerLeave = (e) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) {
      pinchState.current = null;
    }
    setMousePos(null);
    setCurrentLineStart(null);
    setCurrentStroke([]);
    setIsDragging(false);
    setIsErasing(false);
  };

  const handleWheel = (e) => {
    // Zooming
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomSensitivity = 0.001;
    const zoomDelta = -e.deltaY * zoomSensitivity;
    let newScale = transform.scale * Math.exp(zoomDelta);
    
    // Clamp scale
    newScale = Math.max(0.1, Math.min(newScale, 5));
    
    // Adjust transform.x and y to zoom towards mouse cursor
    const scaleRatio = newScale / transform.scale;
    const newX = mouseX - (mouseX - transform.x) * scaleRatio;
    const newY = mouseY - (mouseY - transform.y) * scaleRatio;
    
    setTransform({
      x: newX,
      y: newY,
      scale: newScale
    });
  };

  const handleZoom = (factor) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = rect.width / 2;
    const mouseY = rect.height / 2;
    
    let newScale = transform.scale * factor;
    newScale = Math.max(0.1, Math.min(newScale, 5));
    
    const scaleRatio = newScale / transform.scale;
    const newX = mouseX - (mouseX - transform.x) * scaleRatio;
    const newY = mouseY - (mouseY - transform.y) * scaleRatio;
    
    setTransform({ x: newX, y: newY, scale: newScale });
  };

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
        style={{ touchAction: 'none' }}
        onContextMenu={(e) => e.preventDefault()}
      />
      <div style={{ 
        position: 'absolute', bottom: '20px', left: '20px', 
        display: 'flex', gap: '8px', zIndex: 50 
      }}>
        <button 
          className="icon-button" 
          style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}
          onClick={() => handleZoom(1.2)}
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>
        <button 
          className="icon-button" 
          style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}
          onClick={() => handleZoom(1/1.2)}
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
        <button 
          className="icon-button" 
          style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}
          onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
          title="Reset View"
        >
          <Maximize size={18} />
        </button>
        <button 
          className="icon-button" 
          style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', opacity: canUndo ? 1 : 0.5 }}
          onClick={handleUndo}
          title="Undo"
          disabled={!canUndo}
        >
          <Undo2 size={18} />
        </button>
      </div>
    </div>
  );
});

export default DrawingCanvas;
