import fs from 'fs';
import { createCanvas } from 'canvas';

// Load the JSON project
const rawData = fs.readFileSync('C:/Users/carlo/Downloads/art-world-project-1784556233849.json');
const project = JSON.parse(rawData);

const width = 512;
const height = 512;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

const projectWidth = project.canvasWidth || 800;
const projectHeight = project.canvasHeight || 600;

// Scale to fit 512x512
const scaleX = width / projectWidth;
const scaleY = height / projectHeight;
const scale = Math.min(scaleX, scaleY);
const offsetX = (width - projectWidth * scale) / 2;
const offsetY = (height - projectHeight * scale) / 2;

ctx.fillStyle = '#1a1a2e';
ctx.fillRect(0, 0, width, height);

ctx.save();
ctx.translate(offsetX, offsetY);
ctx.scale(scale, scale);

project.layers.forEach(layer => {
  if (!layer.visible) return;
  
  ctx.save();
  ctx.globalAlpha = layer.opacity !== undefined ? layer.opacity : 1;
  ctx.globalCompositeOperation = layer.blendMode || 'source-over';
  
  ctx.strokeStyle = layer.color || '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  if (layer.glow > 0) {
    ctx.shadowBlur = layer.glow;
    ctx.shadowColor = layer.color;
  }
  
  if (layer.lines && layer.lines.length > 0) {
    ctx.lineWidth = 2;
    ctx.beginPath();
    layer.lines.forEach(line => {
      ctx.moveTo(line.start.x, line.start.y);
      ctx.lineTo(line.end.x, line.end.y);
    });
    ctx.stroke();
  }

  if (layer.strokes && layer.strokes.length > 0) {
    layer.strokes.forEach(stroke => {
      ctx.lineWidth = stroke.size || 2;
      ctx.beginPath();
      if (stroke.points && stroke.points.length > 0) {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
      }
      ctx.stroke();
    });
  }
  ctx.restore();
});

ctx.restore();

const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('public/icon.png', buffer);
console.log('Icon generated at public/icon.png');
