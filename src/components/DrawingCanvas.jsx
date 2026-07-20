import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

const DrawingCanvas = forwardRef(({ 
  layers, activeLayerId, tool, symmetry, centerPoint, setCenterPoint, gridSpacing, onAddLine 
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
  const [mousePos, setMousePos] = useState(null);

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

    // Draw active preview line
    if (tool === 'draw' && currentLineStart && mousePos) {
      const activeLayer = layers.find(l => l.id === activeLayerId);
      if (activeLayer) {
        ctx.save();
        ctx.globalAlpha = activeLayer.opacity * 0.7;
        ctx.strokeStyle = activeLayer.color;
        ctx.lineWidth = 2;
        
        const endPoint = snapToGridPoint(mousePos);
        const linesToDraw = getSymmetricLines(currentLineStart, endPoint);
        
        ctx.beginPath();
        linesToDraw.forEach(line => {
          ctx.moveTo(line.start.x, line.start.y);
          ctx.lineTo(line.end.x, line.end.y);
        });
        ctx.stroke();
        ctx.restore();
      }
    }
    
    // Draw snap indicator
    if ((tool === 'draw' || tool === 'center') && mousePos) {
      const snapped = snapToGridPoint(mousePos);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(snapped.x, snapped.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  };

  useEffect(() => {
    draw();
  }, [layers, transform, mousePos, currentLineStart, symmetry, centerPoint, tool, activeLayerId]);

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

  // Event Handlers
  const handlePointerDown = (e) => {
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
    }
  };

  const handlePointerMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: x - dragStart.x,
        y: y - dragStart.y
      }));
    } else {
      setMousePos(screenToWorld(x, y));
    }
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      return;
    }

    if (tool === 'draw' && currentLineStart && mousePos) {
      const endPoint = snapToGridPoint(mousePos);
      
      // Don't draw if start and end are the same
      if (currentLineStart.x !== endPoint.x || currentLineStart.y !== endPoint.y) {
        const newLines = getSymmetricLines(currentLineStart, endPoint);
        onAddLine(newLines);
      }
      
      setCurrentLineStart(endPoint); // Allow continuous drawing by keeping the end point as the new start
      // To break the line, user can right click or hit escape. Or just set currentLineStart to null.
      // Let's make it click-to-start, click-to-end (continuous)
      // Actually, standard drawing is drag. Let's make it drag-based.
      setCurrentLineStart(null);
    }
  };

  const handlePointerLeave = () => {
    setMousePos(null);
    setCurrentLineStart(null);
    setIsDragging(false);
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
        onContextMenu={(e) => e.preventDefault()} // Prevent right-click menu to use right-click for breaking lines later if needed
      />
    </div>
  );
});

export default DrawingCanvas;
