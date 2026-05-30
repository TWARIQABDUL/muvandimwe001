import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Camera, AlertCircle, X, CheckCircle2 } from 'lucide-react';

export default function FullScreenScanner({ onScan, onClose, title = "Scan QR Code", description = "Position the QR code within the frame" }) {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [flashState, setFlashState] = useState(null); // 'success', 'error', or null

  // Lock body scroll when scanner is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleScan = (result) => {
    if (result && result.length > 0 && flashState !== 'success') {
      const value = result[0].rawValue;
      if (value) {
        setFlashState('success');
        // Wait for the flash animation to play before passing the result back
        setTimeout(() => {
          if (onScan) onScan(value);
        }, 500); // 500ms delay for the visual flash
      }
    }
  };

  const handleError = (error) => {
    console.error("QR Scanner Error:", error);
    setHasError(true);
    setFlashState('error');
    setErrorMessage(error?.message || "Camera access denied or failed.");
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000000',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      {/* Screen Flashing Overlay */}
      {flashState && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: flashState === 'success' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)',
          zIndex: 10000,
          pointerEvents: 'none',
          animation: 'flashOverlay 0.5s ease-out forwards',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {flashState === 'success' ? (
            <CheckCircle2 size={100} color="#ffffff" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))', animation: 'scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />
          ) : (
            <AlertCircle size={100} color="#ffffff" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))', animation: 'shake 0.4s ease-in-out' }} />
          )}
        </div>
      )}

      {/* Global styles for animations */}
      <style>
        {`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes flashOverlay { 0% { opacity: 0; } 20% { opacity: 1; } 100% { opacity: 0; } }
          @keyframes scaleIn { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
          }
        `}
      </style>

      {/* Header Bar */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        padding: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)'
          }}>
            <Camera size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{title}</h3>
            <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>{description}</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            width: '40px', height: '40px',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={24} />
        </button>
      </div>

      {/* Scanner Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        {hasError ? (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f172a',
            color: '#ef4444',
            padding: '20px',
            textAlign: 'center'
          }}>
            <AlertCircle size={64} style={{ marginBottom: '20px' }} />
            <p style={{ margin: 0, fontWeight: '600', fontSize: '18px', color: 'white' }}>Camera Access Failed</p>
            <p style={{ marginTop: '10px', fontSize: '15px', color: '#94a3b8', maxWidth: '300px' }}>
              {errorMessage}
            </p>
            <button 
              onClick={() => { setHasError(false); setFlashState(null); }}
              style={{ marginTop: '30px', padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600' }}
            >
              Try Again
            </button>
          </div>
        ) : (
          <Scanner
            onScan={handleScan}
            onError={handleError}
            formats={['qr_code']}
            components={{
              audio: false,
              tracker: true,
              finder: false
            }}
            styles={{
              container: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 },
              video: { width: '100%', height: '100%', objectFit: 'cover' }
            }}
          />
        )}

        {/* Custom Premium Overlay */}
        {!hasError && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* The transparent cutout box */}
            <div style={{
              width: '280px',
              height: '280px',
              position: 'relative',
              borderRadius: '24px',
              boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.65)', // Creates the dark surround
              border: '2px solid rgba(255, 255, 255, 0.3)'
            }}>
              {/* Corner markers */}
              <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '40px', height: '40px', borderTop: '5px solid #3b82f6', borderLeft: '5px solid #3b82f6', borderTopLeftRadius: '24px' }} />
              <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '40px', height: '40px', borderTop: '5px solid #3b82f6', borderRight: '5px solid #3b82f6', borderTopRightRadius: '24px' }} />
              <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '40px', height: '40px', borderBottom: '5px solid #3b82f6', borderLeft: '5px solid #3b82f6', borderBottomLeftRadius: '24px' }} />
              <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '40px', height: '40px', borderBottom: '5px solid #3b82f6', borderRight: '5px solid #3b82f6', borderBottomRightRadius: '24px' }} />
              
              {/* Animated Scan Line */}
              <style>
                {`
                  @keyframes scanLineFull {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                  }
                `}
              </style>
              <div style={{
                position: 'absolute',
                left: '5%',
                width: '90%',
                height: '3px',
                background: 'linear-gradient(90deg, rgba(59,130,246,0) 0%, rgba(59,130,246,1) 50%, rgba(59,130,246,0) 100%)',
                boxShadow: '0 0 12px rgba(59,130,246,1)',
                animation: 'scanLineFull 2s infinite cubic-bezier(0.4, 0, 0.2, 1)'
              }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
