import React from 'react';
import { Plus, Trash2, Eye, EyeOff, Layers, Eraser, Copy, ArrowDownToLine } from 'lucide-react';

const LayersPanel = ({ 
  layers, 
  activeLayerId, setActiveLayerId, 
  updateLayer, addLayer, deleteLayer, clearLayer, duplicateLayer, mergeDown
}) => {
  return (
    <div className="layer-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '300px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Layers size={20} /> Layers
        </h2>
        <button onClick={addLayer} title="Add Layer" style={{ padding: '4px 8px' }}>
          <Plus size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {layers.map((layer, index) => (
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
                    duplicateLayer(layer.id);
                  }}
                  title="Duplicate Layer"
                >
                  <Copy size={16} />
                </button>
                <button 
                  className="icon-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    mergeDown(layer.id);
                  }}
                  title="Merge Down"
                  disabled={index === layers.length - 1}
                  style={{ opacity: index === layers.length - 1 ? 0.3 : 1 }}
                >
                  <ArrowDownToLine size={16} />
                </button>
                <button 
                  className="icon-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateLayer(layer.id, { visible: !layer.visible });
                  }}
                  title="Toggle Visibility"
                >
                  {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button 
                  className="icon-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearLayer(layer.id);
                  }}
                  title="Clear Layer"
                >
                  <Eraser size={16} />
                </button>
                <button 
                  className="icon-button danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteLayer(layer.id);
                  }}
                  disabled={layers.length === 1}
                  title="Delete Layer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {layer.id === activeLayerId && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                
                <div className="control-group">
                  <label>Blend Mode</label>
                  <select
                    value={layer.blendMode || 'source-over'}
                    onChange={(e) => updateLayer(layer.id, { blendMode: e.target.value })}
                    style={{ 
                      width: '100%', padding: '6px', 
                      backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                      color: 'white', border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '4px'
                    }}
                  >
                    <option value="source-over">Normal</option>
                    <option value="multiply">Multiply</option>
                    <option value="screen">Screen</option>
                    <option value="overlay">Overlay</option>
                    <option value="darken">Darken</option>
                    <option value="lighten">Lighten</option>
                    <option value="color-dodge">Color Dodge</option>
                    <option value="color-burn">Color Burn</option>
                    <option value="hard-light">Hard Light</option>
                    <option value="soft-light">Soft Light</option>
                    <option value="difference">Difference</option>
                    <option value="exclusion">Exclusion</option>
                    <option value="hue">Hue</option>
                    <option value="saturation">Saturation</option>
                    <option value="color">Color</option>
                    <option value="luminosity">Luminosity</option>
                  </select>
                </div>

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
