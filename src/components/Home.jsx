import React from 'react';
import { Palette, PenTool, Image as ImageIcon } from 'lucide-react';

const Home = ({ onStart }) => {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Decorative background blobs */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '20%',
        width: '400px',
        height: '400px',
        background: 'rgba(56, 189, 248, 0.1)',
        filter: 'blur(100px)',
        borderRadius: '50%',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '20%',
        width: '500px',
        height: '500px',
        background: 'rgba(168, 85, 247, 0.1)',
        filter: 'blur(120px)',
        borderRadius: '50%',
        zIndex: 0
      }} />

      <div style={{
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        padding: '60px',
        borderRadius: '30px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '30px',
          color: '#38bdf8'
        }}>
          <Palette size={48} />
          <PenTool size={48} />
          <ImageIcon size={48} />
        </div>
        
        <h1 style={{
          fontSize: '4rem',
          fontWeight: '800',
          margin: '0 0 10px 0',
          background: 'linear-gradient(to right, #38bdf8, #a855f7)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Art World
        </h1>
        
        <p style={{
          fontSize: '1.2rem',
          color: '#94a3b8',
          marginBottom: '40px',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          Unleash your creativity with infinite layers, powerful tools, and a beautiful canvas.
        </p>

        <button
          onClick={onStart}
          style={{
            background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
            border: 'none',
            padding: '16px 40px',
            borderRadius: '9999px',
            color: 'white',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 10px 15px -3px rgba(56, 189, 248, 0.3)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 15px 20px -3px rgba(56, 189, 248, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(56, 189, 248, 0.3)';
          }}
        >
          Start Drawing
        </button>
      </div>
    </div>
  );
};

export default Home;
