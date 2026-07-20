import React, { useState, useRef } from 'react';
import { Minus, Square, GripHorizontal } from 'lucide-react';

const DraggablePanel = ({ title, defaultPosition, children, className = '' }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState(defaultPosition || { x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e) => {
    if (e.target.closest('button')) return;
    setIsDragging(true);
    dragStartRef.current = { 
      x: e.clientX - position.x, 
      y: e.clientY - position.y 
    };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      e.target.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div 
      className={`glass-panel draggable-panel `}
      style={{
        left: ${position.x}px,
        top: ${position.y}px,
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
