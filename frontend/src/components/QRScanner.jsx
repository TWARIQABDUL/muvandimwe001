import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Camera, AlertCircle } from 'lucide-react';

export default function QRScanner({ onScan, title = "Scan QR Code", description = "Position the QR code within the frame" }) {
  const [hasError, setHasError] = useState(false);

  const handleScan = (result) => {
    if (result && result.length > 0) {
      // The scanner returns an array of objects
      const value = result[0].rawValue;
      if (value && onScan) {
        onScan(value);
      }
    }
  };

  const handleError = (error) => {
    console.error("QR Scanner Error:", error);
    setHasError(true);
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '400px',
      margin: '0 auto',
      backgroundColor: '#ffffff',
      borderRadius: '24px',
      overflow: 'hidden',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)',
      border: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '24px 20px 16px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: '#eff6ff',
          color: '#3b82f6',
          marginBottom: '16px'
        }}>
          <Camera size={24} />
        </div>
        <h3 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '20px', fontWeight: '700' }}>
          {title}
        </h3>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>
          {description}
        </p>
      </div>

      {/* Scanner Area */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', backgroundColor: '#000000' }}>
        {hasError ? (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc',
            color: '#ef4444',
            padding: '20px',
            textAlign: 'center'
          }}>
            <AlertCircle size={48} style={{ marginBottom: '16px', opacity: 0.8 }} />
            <p style={{ margin: 0, fontWeight: '500', fontSize: '15px' }}>Camera Access Denied</p>
            <p style={{ marginTop: '8px', fontSize: '13px', color: '#64748b' }}>Please ensure camera permissions are granted for this app or browser.</p>
          </div>
        ) : (
          <Scanner
            onScan={handleScan}
            onError={handleError}
            formats={['qr_code']}
            components={{
              audio: false,
              tracker: true,
              finder: false // We will use our own custom finder UI overlay
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
              width: '70%',
              height: '70%',
              position: 'relative',
              borderRadius: '16px',
              boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.45)', // Creates the dark surround
              border: '2px solid rgba(255, 255, 255, 0.2)'
            }}>
              {/* Corner markers */}
              <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '30px', height: '30px', borderTop: '4px solid #3b82f6', borderLeft: '4px solid #3b82f6', borderTopLeftRadius: '16px' }} />
              <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '30px', height: '30px', borderTop: '4px solid #3b82f6', borderRight: '4px solid #3b82f6', borderTopRightRadius: '16px' }} />
              <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '30px', height: '30px', borderBottom: '4px solid #3b82f6', borderLeft: '4px solid #3b82f6', borderBottomLeftRadius: '16px' }} />
              <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '30px', height: '30px', borderBottom: '4px solid #3b82f6', borderRight: '4px solid #3b82f6', borderBottomRightRadius: '16px' }} />
              
              {/* Animated Scan Line (using CSS animation injected directly) */}
              <style>
                {`
                  @keyframes scanLine {
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
                height: '2px',
                background: 'linear-gradient(90deg, rgba(59,130,246,0) 0%, rgba(59,130,246,1) 50%, rgba(59,130,246,0) 100%)',
                boxShadow: '0 0 8px rgba(59,130,246,0.8)',
                animation: 'scanLine 2.5s infinite cubic-bezier(0.4, 0, 0.2, 1)'
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div style={{
        padding: '16px',
        textAlign: 'center',
        backgroundColor: '#f8fafc',
        borderTop: '1px solid #f1f5f9'
      }}>
        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: hasError ? '#ef4444' : '#10b981', display: 'inline-block' }} />
          {hasError ? 'Scanner offline' : 'Camera active and scanning'}
        </p>
      </div>
    </div>
  );
}
