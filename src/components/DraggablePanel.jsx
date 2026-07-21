import React, { useState, useRef } from 'react';
import { Minus, Square, GripHorizontal } from 'lucide-react';

const DraggablePanel = ({ title, defaultPosition, children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState(defaultPosition || { x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef(null);
  const hasMovedRef = useRef(false);

  const handlePointerDown = (e) => {
    if (e.target.closest('button')) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = { 
      offsetX: e.clientX - position.x, 
      offsetY: e.clientY - position.y,
      clientX: e.clientX,
      clientY: e.clientY
    };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    
    if (Math.abs(e.clientX - dragStartRef.current.clientX) > 3 || Math.abs(e.clientY - dragStartRef.current.clientY) > 3) {
      hasMovedRef.current = true;
    }

    let newX = e.clientX - dragStartRef.current.offsetX;
    let newY = e.clientY - dragStartRef.current.offsetY;
    
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));
    }

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      e.target.releasePointerCapture(e.pointerId);
      
      if (!hasMovedRef.current) {
        setIsCollapsed(!isCollapsed);
      }
    }
  };

  return (
    <div 
      ref={panelRef}
      className={`glass-panel draggable-panel `}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        position: 'absolute',
        zIndex: 100,
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
        gap: 0
      }}
    >
      <div 
        className="panel-header"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          cursor: isDragging ? 'grabbing' : 'grab',
          borderBottom: isCollapsed ? 'none' : '1px solid var(--border-color)',
          background: 'rgba(255, 255, 255, 0.02)',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
          borderBottomLeftRadius: isCollapsed ? '12px' : '0',
          borderBottomRightRadius: isCollapsed ? '12px' : '0',
          touchAction: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GripHorizontal size={16} style={{ opacity: 0.5 }} />
          <h3 style={{ margin: 0, fontSize: '1rem' }}>{title}</h3>
        </div>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="icon-button"
          style={{ padding: '4px' }}
        >
          {isCollapsed ? <Square size={14} /> : <Minus size={14} />}
        </button>
      </div>
      
      {!isCollapsed && (
        <div className="panel-content" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
          {children}
        </div>
      )}
    </div>
  );
};

export default DraggablePanel;
