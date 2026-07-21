import React from 'react';
import { Palette, PenTool, Image as ImageIcon } from 'lucide-react';

const Home = ({ onStart }) => {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'url(/icon.jpg) center/cover no-repeat',
      backgroundColor: '#0f172a',
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
        <h1 style={{
          fontSize: '4rem',
          fontWeight: '800',
          margin: '0 0 10px 0',
          color: 'white',
          textShadow: '0 4px 15px rgba(0,0,0,0.8)'
        }}>
          Art World
        </h1>
        
        <p style={{
          fontSize: '1.5rem',
          color: '#e2e8f0',
          marginBottom: '10px',
          fontWeight: 'bold',
          textShadow: '0 2px 10px rgba(0,0,0,0.5)'
        }}>
          Version 2.0
        </p>

        <p style={{
          fontSize: '1.2rem',
          color: '#cbd5e1',
          marginBottom: '40px',
          textShadow: '0 2px 10px rgba(0,0,0,0.5)'
        }}>
          Created by You
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
