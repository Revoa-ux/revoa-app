import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';

interface BottomSheetProps {
  children: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export default function BottomSheet({ children, isOpen: controlledIsOpen, onOpenChange }: BottomSheetProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const currentTranslateY = useRef<number>(0);
  const velocityTracker = useRef<{ y: number; time: number }[]>([]);

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const setIsOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setInternalIsOpen(open);
    }
  };

  const COLLAPSED_PEEK = 24;
  const MAX_HEIGHT_PERCENT = 90;
  const VELOCITY_THRESHOLD = 0.3;
  const DRAG_THRESHOLD = 0.3;

  const getMaxHeight = () => {
    return window.innerHeight * (MAX_HEIGHT_PERCENT / 100);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    currentTranslateY.current = isOpen ? 0 : getMaxHeight() - COLLAPSED_PEEK;
    velocityTracker.current = [{ y: e.touches[0].clientY, time: Date.now() }];
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;

    velocityTracker.current.push({ y: currentY, time: Date.now() });
    if (velocityTracker.current.length > 3) {
      velocityTracker.current.shift();
    }

    let newTranslateY = currentTranslateY.current + deltaY;
    const maxHeight = getMaxHeight();

    newTranslateY = Math.max(0, Math.min(maxHeight - COLLAPSED_PEEK, newTranslateY));

    if (newTranslateY < maxHeight * 0.1) {
      newTranslateY = newTranslateY * 0.5;
    }

    setDragY(newTranslateY);
  };

  const calculateVelocity = () => {
    if (velocityTracker.current.length < 2) return 0;

    const recent = velocityTracker.current[velocityTracker.current.length - 1];
    const previous = velocityTracker.current[0];

    const deltaY = recent.y - previous.y;
    const deltaTime = recent.time - previous.time;

    return deltaTime > 0 ? deltaY / deltaTime : 0;
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;

    setIsDragging(false);
    const maxHeight = getMaxHeight();
    const velocity = calculateVelocity();

    const draggedDistance = dragY;
    const dragPercentage = draggedDistance / maxHeight;

    let shouldOpen = isOpen;

    if (Math.abs(velocity) > VELOCITY_THRESHOLD) {
      shouldOpen = velocity < 0;
    } else {
      if (isOpen) {
        shouldOpen = dragPercentage < DRAG_THRESHOLD;
      } else {
        shouldOpen = dragPercentage < (1 - DRAG_THRESHOLD);
      }
    }

    setIsOpen(shouldOpen);
    setDragY(0);
    velocityTracker.current = [];
  };

  const handleGripClick = () => {
    setIsOpen(!isOpen);
  };

  const handleBackdropClick = () => {
    setIsOpen(false);
  };

  const getTransformStyle = () => {
    if (isDragging) {
      return `translateY(${dragY}px)`;
    }

    const maxHeight = getMaxHeight();
    return isOpen ? 'translateY(0)' : `translateY(calc(100% - ${COLLAPSED_PEEK}px))`;
  };

  useEffect(() => {
    const handleResize = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragY(0);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isDragging]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={handleBackdropClick}
          style={{ opacity: isDragging ? Math.min(1, 1 - dragY / getMaxHeight()) : 1 }}
        />
      )}

      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1f1f1f] border-t border-gray-200 dark:border-[#2a2a2a] z-50 lg:hidden rounded-t-2xl shadow-2xl"
        style={{
          maxHeight: `${MAX_HEIGHT_PERCENT}vh`,
          transform: getTransformStyle(),
          transition: isDragging ? 'none' : 'transform 400ms cubic-bezier(0.32, 0.72, 0, 1)',
          touchAction: 'none'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex flex-col">
          <div
            className="py-3 flex justify-center cursor-pointer active:scale-95 transition-transform"
            onClick={handleGripClick}
          >
            <div className="w-10 h-1.5 bg-gray-300 dark:bg-[#4a4a4a] rounded-full" />
          </div>

          <div className="overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
