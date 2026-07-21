import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { ZoomIn, ZoomOut, Maximize, Undo2 } from 'lucide-react';

const DrawingCanvas = forwardRef(({ 
  layers, activeLayerId, updateLayer, tool, setTool, symmetry, centerPoint, setCenterPoint, 
  drawMode, snapToGrid, gridSpacing, canvasWidth, canvasHeight, brushSize,
  handleUndo, canUndo, onAddStrokes, onEraseElements 
}, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [ctx, setCtx] = useState(null);
  const layerCache = useRef(new Map());
  
  // Viewport transform
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  
  // Interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [currentLineStart, setCurrentLineStart] = useState(null);
  const [currentStrokePoints, setCurrentStrokePoints] = useState([]);
  const [isErasing, setIsErasing] = useState(false);
  const [mousePos, setMousePos] = useState(null);
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  // Transform / Lasso state
  const [transformStrokes, setTransformStrokes] = useState(null);
  const [transformOffset, setTransformOffset] = useState({ x: 0, y: 0 });
  const [isDraggingTransform, setIsDraggingTransform] = useState(false);

  // Multi-touch state
  const activePointers = useRef(new Map());
  const pinchState = useRef(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    exportHighRes: () => {
      const pixelWidth = canvasWidth * gridSpacing;
      const pixelHeight = canvasHeight * gridSpacing;
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = pixelWidth;
      exportCanvas.height = pixelHeight;
      const eCtx = exportCanvas.getContext('2d');
      
      // Draw background
      eCtx.fillStyle = '#1a1a2e';
      eCtx.fillRect(0, 0, pixelWidth, pixelHeight);
      
      // Draw layers
      layers.forEach(layer => {
        if (!layer.visible) return;
        
        eCtx.save();
        eCtx.globalAlpha = layer.opacity;
        eCtx.globalCompositeOperation = layer.blendMode || 'source-over';
        
        // Use cached canvas if available, otherwise draw directly
        const cache = layerCache.current.get(layer.id);
        if (cache && cache.canvas) {
          eCtx.drawImage(cache.canvas, 0, 0);
        } else {
          eCtx.strokeStyle = layer.color;
          eCtx.lineCap = 'round';
          eCtx.lineJoin = 'round';
          
          if (layer.glow > 0) {
            eCtx.shadowBlur = layer.glow;
            eCtx.shadowColor = layer.color;
          }
          
          if (layer.lines && layer.lines.length > 0) {
            eCtx.lineWidth = 2;
            eCtx.beginPath();
            layer.lines.forEach(line => {
              eCtx.moveTo(line.start.x, line.start.y);
              eCtx.lineTo(line.end.x, line.end.y);
            });
            eCtx.stroke();
          }

          if (layer.strokes && layer.strokes.length > 0) {
            layer.strokes.forEach(stroke => {
              eCtx.lineWidth = stroke.size || 2;
              eCtx.beginPath();
              if (stroke.points.length > 0) {
                eCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
                for (let i = 1; i < stroke.points.length; i++) {
                  eCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
                }
              }
              eCtx.stroke();
            });
          }
        }
        eCtx.restore();
      });
      
      return exportCanvas.toDataURL('image/png');
    }
  }));

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    setCtx(context);
    
    const handleResize = () => {
      setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Commit transform when tool changes from lasso
  useEffect(() => {
    if (tool !== 'lasso' && transformStrokes) {
      const transformedStrokes = transformStrokes.map(stroke => ({
        ...stroke,
        points: stroke.points.map(p => ({
          x: p.x + transformOffset.x,
          y: p.y + transformOffset.y
        }))
      }));
      onAddStrokes(transformedStrokes);
      setTransformStrokes(null);
      setTransformOffset({ x: 0, y: 0 });
    }
  }, [tool, transformStrokes, transformOffset, onAddStrokes]);

  // Update layer cache
  const updateLayerCache = (layer) => {
    let cache = layerCache.current.get(layer.id);
    const pixelWidth = canvasWidth * gridSpacing;
    const pixelHeight = canvasHeight * gridSpacing;
    
    // Check if we need to recreate the cache canvas (size change or missing)
    if (!cache || cache.width !== pixelWidth || cache.height !== pixelHeight) {
      const c = document.createElement('canvas');
      c.width = pixelWidth;
      c.height = pixelHeight;
      cache = { canvas: c, updatedAt: 0, width: pixelWidth, height: pixelHeight };
      layerCache.current.set(layer.id, cache);
    }
    
    // Check if layer content has changed
    if (cache.updatedAt !== layer.updatedAt) {
      const cCtx = cache.canvas.getContext('2d');
      cCtx.clearRect(0, 0, pixelWidth, pixelHeight);
      
      cCtx.strokeStyle = layer.color;
      cCtx.lineCap = 'round';
      cCtx.lineJoin = 'round';
      
      if (layer.glow > 0) {
        cCtx.shadowBlur = layer.glow;
        cCtx.shadowColor = layer.color;
      }
      
      // Legacy Lines
      if (layer.lines && layer.lines.length > 0) {
        cCtx.lineWidth = 2;
        cCtx.beginPath();
        layer.lines.forEach(line => {
          cCtx.moveTo(line.start.x, line.start.y);
          cCtx.lineTo(line.end.x, line.end.y);
        });
        cCtx.stroke();
      }

      // Modern Strokes
      if (layer.strokes && layer.strokes.length > 0) {
        layer.strokes.forEach(stroke => {
          cCtx.lineWidth = stroke.size || 2;
          cCtx.beginPath();
          if (stroke.points.length > 0) {
            cCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
              cCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
          }
          cCtx.stroke();
        });
      }
      
      cache.updatedAt = layer.updatedAt;
    }
    
    return cache.canvas;
  };

  // Main draw loop
  const draw = () => {
    if (!ctx || !canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    
    const dpr = window.devicePixelRatio || 1;
    const actualWidth = Math.floor(containerRef.current.clientWidth * dpr);
    const actualHeight = Math.floor(containerRef.current.clientHeight * dpr);
    
    if (canvas.width !== actualWidth || canvas.height !== actualHeight) {
      canvas.width = actualWidth;
      canvas.height = actualHeight;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Clean up layer cache for deleted layers
    const layerIds = new Set(layers.map(l => l.id));
    for (const id of layerCache.current.keys()) {
      if (!layerIds.has(id)) {
        layerCache.current.delete(id);
      }
    }
    
    // Setup transform
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);
    
    const pixelWidth = canvasWidth * gridSpacing;
    const pixelHeight = canvasHeight * gridSpacing;
    
    // Draw Finite Canvas Bounds (Border)
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1 / transform.scale;
    ctx.strokeRect(0, 0, pixelWidth, pixelHeight);
    
    // Draw Grid (clipped to finite canvas)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, pixelWidth, pixelHeight);
    ctx.clip();
    drawGrid(ctx, canvas, transform);
    ctx.restore();
    
    // Draw Center Point if active
    if (symmetry !== 'none' || tool === 'center') {
      drawCenterCross(ctx, centerPoint);
    }

    // Draw Layers
    layers.forEach(layer => {
      if (!layer.visible) return;
      
      const cachedCanvas = updateLayerCache(layer);
      
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blendMode || 'source-over';
      ctx.drawImage(cachedCanvas, 0, 0);
      ctx.restore();
    });

    // Draw active preview line or current stroke
    if (tool === 'draw') {
      const activeLayer = layers.find(l => l.id === activeLayerId);
      if (activeLayer) {
        ctx.save();
        ctx.globalAlpha = activeLayer.opacity * 0.7;
        ctx.strokeStyle = activeLayer.color;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Draw continuous stroke actively
        if (currentStrokePoints.length > 0 && tool === 'draw') {
          const symStrokes = getSymmetricStrokes(currentStrokePoints, brushSize);
          symStrokes.forEach(stroke => {
            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
              ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            ctx.stroke();
          });
        }
        
        // Draw segment preview and shape previews
        if (currentLineStart && mousePos) {
          const endPoint = snapToGridPoint(mousePos);
          let points = [];
          
          if (tool === 'draw' && drawMode === 'segment') {
            points = [currentLineStart, endPoint];
          } else if (tool === 'line') {
            points = [currentLineStart, endPoint];
          } else if (tool === 'circle') {
            const radius = Math.hypot(endPoint.x - currentLineStart.x, endPoint.y - currentLineStart.y);
            points = generateCircleStrokes(currentLineStart, radius);
          } else if (tool === 'ellipse') {
            points = generateEllipseStrokes(currentLineStart, endPoint);
          }
          
          if (points.length > 0) {
            const symStrokes = getSymmetricStrokes(points, brushSize);
            symStrokes.forEach(stroke => {
              ctx.beginPath();
              ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
              for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
              }
              ctx.stroke();
            });
          }
        }
        
        // Draw lasso polygon preview
        if (tool === 'lasso' && !transformStrokes && currentStrokePoints.length > 0) {
          ctx.strokeStyle = '#ffffff';
          ctx.setLineDash([5 / transform.scale, 5 / transform.scale]);
          ctx.lineWidth = 1 / transform.scale;
          ctx.beginPath();
          ctx.moveTo(currentStrokePoints[0].x, currentStrokePoints[0].y);
          for (let i = 1; i < currentStrokePoints.length; i++) {
            ctx.lineTo(currentStrokePoints[i].x, currentStrokePoints[i].y);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Draw transformed strokes & bounding box
        if (transformStrokes) {
          ctx.save();
          ctx.translate(transformOffset.x, transformOffset.y);
          
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

          transformStrokes.forEach(stroke => {
            ctx.lineWidth = stroke.size || 2;
            ctx.strokeStyle = '#38bdf8'; // Highlight color
            ctx.beginPath();
            if (stroke.points.length > 0) {
              ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
              stroke.points.forEach(p => {
                ctx.lineTo(p.x, p.y);
                if (p.x < minX) minX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.x > maxX) maxX = p.x;
                if (p.y > maxY) maxY = p.y;
              });
            }
            ctx.stroke();
          });

          if (minX !== Infinity) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2 / transform.scale;
            ctx.setLineDash([5 / transform.scale, 5 / transform.scale]);
            ctx.strokeRect(minX - 5, minY - 5, (maxX - minX) + 10, (maxY - minY) + 10);
            ctx.setLineDash([]);
          }

          ctx.restore();
        }
        
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
  }, [layers, transform, mousePos, currentLineStart, currentStrokePoints, symmetry, centerPoint, tool, activeLayerId, canvasWidth, canvasHeight, brushSize, transformStrokes, transformOffset, drawMode, snapToGrid, gridSpacing, windowSize]);

  const drawGrid = (ctx, canvas, transform) => {
    // Calculate visible bounds in world coordinates
    let startX = (-transform.x) / transform.scale;
    let startY = (-transform.y) / transform.scale;
    let endX = (canvas.width - transform.x) / transform.scale;
    let endY = (canvas.height - transform.y) / transform.scale;

    // Clamp to finite canvas bounds
    startX = Math.max(0, startX);
    startY = Math.max(0, startY);
    endX = Math.min(canvasWidth * gridSpacing, endX);
    endY = Math.min(canvasHeight * gridSpacing, endY);

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

  const getSymmetricStrokes = (points, size) => {
    const strokes = [{ points: [...points], size }];
    const { x: cx, y: cy } = centerPoint;

    if (symmetry === '2-way' || symmetry === '4-way') {
      // Horizontal reflection (left/right)
      strokes.push({
        points: points.map(p => ({ x: 2 * cx - p.x, y: p.y })),
        size
      });
    }
    
    if (symmetry === '4-way') {
      // Vertical reflection (top/bottom)
      strokes.push({
        points: points.map(p => ({ x: p.x, y: 2 * cy - p.y })),
        size
      });
      // Both (diagonal)
      strokes.push({
        points: points.map(p => ({ x: 2 * cx - p.x, y: 2 * cy - p.y })),
        size
      });
    }

    return strokes;
  };

  const generateCircleStrokes = (center, radius, pointsCount = 64) => {
    const points = [];
    for (let i = 0; i <= pointsCount; i++) {
      const angle = (i / pointsCount) * Math.PI * 2;
      points.push({
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius
      });
    }
    return points;
  };

  const generateEllipseStrokes = (p1, p2, pointsCount = 64) => {
    const points = [];
    const cx = (p1.x + p2.x) / 2;
    const cy = (p1.y + p2.y) / 2;
    const rx = Math.abs(p1.x - p2.x) / 2;
    const ry = Math.abs(p1.y - p2.y) / 2;
    
    for (let i = 0; i <= pointsCount; i++) {
      const angle = (i / pointsCount) * Math.PI * 2;
      points.push({
        x: cx + Math.cos(angle) * rx,
        y: cy + Math.sin(angle) * ry
      });
    }
    return points;
  };

  const rgbToHex = (r, g, b) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  const pointInPolygon = (point, polygon) => {
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) isInside = !isInside;
    }
    return isInside;
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
    const strokesToRemove = [];
    
    if (activeLayer.lines) {
      activeLayer.lines.forEach(line => {
        const distSq = distToSegmentSquared(worldPos, line.start, line.end);
        if (distSq < eraseRadiusSq) {
          linesToRemove.push(line);
        }
      });
    }

    if (activeLayer.strokes) {
      activeLayer.strokes.forEach(stroke => {
        for (let i = 0; i < stroke.points.length - 1; i++) {
          const distSq = distToSegmentSquared(worldPos, stroke.points[i], stroke.points[i+1]);
          if (distSq < eraseRadiusSq) {
            strokesToRemove.push(stroke);
            break; // Remove entire stroke if any part is erased
          }
        }
      });
    }
    
    if (linesToRemove.length > 0 || strokesToRemove.length > 0) {
      onEraseElements(linesToRemove, strokesToRemove);
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
    } else if (['draw', 'line', 'circle', 'ellipse'].includes(tool)) {
      setCurrentLineStart(snapped);
      if (tool === 'draw') setCurrentStrokePoints([snapped]);
    } else if (tool === 'lasso') {
      if (transformStrokes) {
        setIsDraggingTransform(true);
        setDragStart({ x: worldPos.x - transformOffset.x, y: worldPos.y - transformOffset.y });
      } else {
        setCurrentLineStart(snapped);
        setCurrentStrokePoints([snapped]);
      }
    } else if (tool === 'erase') {
      setIsErasing(true);
      performErase(worldPos);
    } else if (tool === 'eyedropper') {
      // Handled in pointerUp
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
          setCurrentStrokePoints(prev => [...prev, endPoint]);
          setCurrentLineStart(endPoint);
        }
      } else if (tool === 'lasso') {
        if (transformStrokes && isDraggingTransform) {
          setTransformOffset({
            x: worldPos.x - dragStart.x,
            y: worldPos.y - dragStart.y
          });
        } else if (!transformStrokes && currentLineStart) {
          setCurrentStrokePoints(prev => [...prev, worldPos]);
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
          const points = [currentLineStart, endPoint];
          onAddStrokes(getSymmetricStrokes(points, brushSize));
        }
      } else if (drawMode === 'continuous' && currentStrokePoints.length > 1) {
        onAddStrokes(getSymmetricStrokes(currentStrokePoints, brushSize));
      }
      setCurrentLineStart(null);
      setCurrentStrokePoints([]);
    } else if (['line', 'circle', 'ellipse'].includes(tool)) {
      if (currentLineStart && mousePos) {
        const endPoint = snapToGridPoint(mousePos);
        let points = [];
        if (tool === 'line') {
          points = [currentLineStart, endPoint];
        } else if (tool === 'circle') {
          const radius = Math.hypot(endPoint.x - currentLineStart.x, endPoint.y - currentLineStart.y);
          points = generateCircleStrokes(currentLineStart, radius);
        } else if (tool === 'ellipse') {
          points = generateEllipseStrokes(currentLineStart, endPoint);
        }
        if (points.length > 1) {
          onAddStrokes(getSymmetricStrokes(points, brushSize));
        }
      }
      setCurrentLineStart(null);
    } else if (tool === 'lasso') {
      if (transformStrokes) {
        setIsDraggingTransform(false);
      } else {
        if (currentStrokePoints.length > 2) {
          const activeLayer = layers.find(l => l.id === activeLayerId);
          if (activeLayer) {
            const selected = [];
            const remaining = [];
            
            if (activeLayer.strokes) {
              activeLayer.strokes.forEach(stroke => {
                const isSelected = stroke.points.some(p => pointInPolygon(p, currentStrokePoints));
                if (isSelected) {
                  selected.push(stroke);
                } else {
                  remaining.push(stroke);
                }
              });
            }
            
            if (selected.length > 0) {
              updateLayer(activeLayerId, { strokes: remaining });
              setTransformStrokes(selected);
            }
          }
        }
        setCurrentLineStart(null);
        setCurrentStrokePoints([]);
      }
    } else if (tool === 'erase') {
      setIsErasing(false);
    } else if (tool === 'eyedropper') {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const worldPos = screenToWorld(x, y);

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 1;
      tempCanvas.height = 1;
      const tCtx = tempCanvas.getContext('2d');
      
      layers.forEach(layer => {
        if (!layer.visible) return;
        const cache = layerCache.current.get(layer.id);
        if (cache && cache.canvas) {
          tCtx.globalAlpha = layer.opacity;
          tCtx.globalCompositeOperation = layer.blendMode || 'source-over';
          tCtx.drawImage(cache.canvas, -worldPos.x, -worldPos.y);
        }
      });
      
      const pixel = tCtx.getImageData(0, 0, 1, 1).data;
      if (pixel[3] > 0) { // If not completely transparent
        const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
        updateLayer(activeLayerId, { color: hex });
      }
      setTool('draw'); // Switch back to draw after picking
    }
  };

  const handlePointerLeave = (e) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) {
      pinchState.current = null;
    }
    setMousePos(null);
    setCurrentLineStart(null);
    setCurrentStrokePoints([]);
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
