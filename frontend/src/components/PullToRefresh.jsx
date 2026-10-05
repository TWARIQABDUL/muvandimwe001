import React, { useRef, useState } from 'react';
import { useRefresh } from '../hooks/useRefresh.jsx';

const THRESHOLD = 70;   // how far to drag before the pull counts
const MAX_PULL = 110;   // how far the content can follow the finger
const RESISTANCE = 0.5; // drag feels weighted rather than 1:1

// Drag down from the top of a screen to reload it, the way a native app does.
// Falls back to doing nothing on a mouse, where the header's Refresh button is used.
export default function PullToRefresh({ children }) {
  const { refresh, isRefreshing } = useRefresh();
  const [pull, setPull] = useState(0);
  const startY = useRef(null);
  const scrollerRef = useRef(null);

  const atTop = () => {
    const el = scrollerRef.current;
    return !el || el.scrollTop <= 0;
  };

  const handleTouchStart = (e) => {
    startY.current = atTop() ? e.touches[0].clientY : null;
  };

  const handleTouchMove = (e) => {
    if (startY.current === null || isRefreshing) return;

    const delta = e.touches[0].clientY - startY.current;

    // Scrolling up, or no longer at the top: hand the gesture back to the browser.
    if (delta <= 0 || !atTop()) {
      if (pull !== 0) setPull(0);
      return;
    }

    setPull(Math.min(delta * RESISTANCE, MAX_PULL));
  };

  const handleTouchEnd = () => {
    if (pull >= THRESHOLD) refresh();
    setPull(0);
    startY.current = null;
  };

  const armed = pull >= THRESHOLD;
  const offset = isRefreshing ? THRESHOLD : pull;

  return (
    <main
      ref={scrollerRef}
      className="content-area"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{ position: 'relative', overscrollBehaviorY: 'contain' }}
    >
      <div
        aria-hidden={offset === 0}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: `${offset}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          pointerEvents: 'none',
          opacity: offset === 0 ? 0 : 1,
          transition: pull === 0 ? 'height 180ms ease, opacity 180ms ease' : 'none',
          color: 'var(--text-secondary)',
          fontSize: '13px'
        }}
      >
        {isRefreshing ? 'Refreshing...' : armed ? 'Release to refresh' : 'Pull to refresh'}
      </div>

      {/* A transform - even translateY(0) - makes this a containing block for
          position:fixed children, which would break the full screen scanner.
          So the property is only present while the user is actually pulling. */}
      <div style={offset === 0 ? undefined : { transform: `translateY(${offset}px)` }}>
        {children}
      </div>
    </main>
  );
}
