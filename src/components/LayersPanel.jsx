import React from 'react';
import { Plus, Trash2, Eye, EyeOff, Layers } from 'lucide-react';

const LayersPanel = ({ 
  layers, 
  activeLayerId, setActiveLayerId, 
  updateLayer, addLayer, deleteLayer 
}) => {
  return (
    <div className="glass-panel layers-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Layers size={20} /> Layers
        </h2>
        <button onClick={addLayer} title="Add Layer" style={{ padding: '4px 8px' }}>
          <Plus size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {layers.map(layer => (
          <div 
            key={layer.id} 
            className={`layer-item ${layer.id === activeLayerId ? 'active' : ''}`}
            onClick={() => setActiveLayerId(layer.id)}
          >
            <div className="layer-header">
              <span className="layer-name">{layer.name}</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  className="icon-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateLayer(layer.id, { visible: !layer.visible });
                  }}
                >
                  {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button 
                  className="icon-button danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteLayer(layer.id);
                  }}
                  disabled={layers.length === 1}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {layer.id === activeLayerId && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                <div className="control-group">
                  <label>
                    Color
                    <input 
                      type="color" 
                      value={layer.color} 
                      onChange={(e) => updateLayer(layer.id, { color: e.target.value })}
                    />
                  </label>
                </div>
                
                <div className="control-group">
                  <label>
                    Opacity <span>{Math.round(layer.opacity * 100)}%</span>
                  </label>
                  <input 
                    type="range" 
                    min="0" max="1" step="0.05"
                    value={layer.opacity}
                    onChange={(e) => updateLayer(layer.id, { opacity: parseFloat(e.target.value) })}
                  />
                </div>
                
                <div className="control-group">
                  <label>
                    Glow <span>{layer.glow}px</span>
                  </label>
                  <input 
                    type="range" 
                    min="0" max="50" step="1"
                    value={layer.glow}
                    onChange={(e) => updateLayer(layer.id, { glow: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LayersPanel;
