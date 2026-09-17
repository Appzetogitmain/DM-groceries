import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import AutorenewIcon from '@mui/icons-material/Autorenew';

export default function PullToRefresh({ onRefresh, children }) {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const containerRef = useRef(null);
  const controls = useAnimation();

  const MAX_PULL = 120;
  const THRESHOLD = 70;

  const handleTouchStart = (e) => {
    if (window.scrollY === 0 && !isRefreshing) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (startY === 0 || isRefreshing) return;

    const y = e.touches[0].clientY;
    const diff = y - startY;

    if (diff > 0 && window.scrollY === 0) {
      // Prevent default scrolling when pulling down at the top
      if (e.cancelable) e.preventDefault();
      
      const pullDist = Math.min(diff * 0.5, MAX_PULL);
      setCurrentY(pullDist);
      setPullProgress(Math.min(pullDist / THRESHOLD, 1));
      controls.set({ y: pullDist });
    }
  };

  const handleTouchEnd = async () => {
    if (startY === 0 || isRefreshing) return;

    if (currentY >= THRESHOLD) {
      setIsRefreshing(true);
      controls.start({ y: 50, transition: { type: 'spring', stiffness: 300, damping: 20 } });
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        controls.start({ y: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
        setCurrentY(0);
        setPullProgress(0);
      }
    } else {
      controls.start({ y: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
      setCurrentY(0);
      setPullProgress(0);
    }
    setStartY(0);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    // Use passive: false so we can preventDefault
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [startY, currentY, isRefreshing]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {/* Pull Indicator */}
      <div 
        className="absolute top-0 left-0 w-full flex justify-center items-center pointer-events-none z-50"
        style={{ height: '50px', transform: `translateY(${Math.min(currentY - 50, 0)}px)` }}
      >
        <div 
          className="bg-white rounded-full shadow-md flex items-center justify-center transition-transform"
          style={{ 
            width: '36px', 
            height: '36px',
            opacity: pullProgress > 0 || isRefreshing ? 1 : 0,
            transform: `scale(${isRefreshing ? 1 : Math.max(0.5, pullProgress)}) rotate(${isRefreshing ? 0 : pullProgress * 360}deg)`
          }}
        >
          <AutorenewIcon 
            className={`text-primary ${isRefreshing ? 'animate-spin' : ''}`} 
            style={{ fontSize: '20px' }} 
          />
        </div>
      </div>

      <motion.div animate={controls} className="w-full h-full min-h-screen">
        {children}
      </motion.div>
    </div>
  );
}
