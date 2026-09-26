import { useEffect, useState, useRef } from 'react';

export const useExamBrowser = (isActive: boolean) => {
  const [isBlurred, setIsBlurred] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const isBlurredRef = useRef(false);

  useEffect(() => {
    isBlurredRef.current = isBlurred;
  }, [isBlurred]);

  useEffect(() => {
    if (!isActive) return;

    // Prevent context menu (right click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Prevent copy, cut, paste
    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    // Prevent specific keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+C, Ctrl+V, PrintScreen
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'u')) ||
        (e.ctrlKey && (e.key === 'C' || e.key === 'c')) ||
        (e.ctrlKey && (e.key === 'V' || e.key === 'v')) ||
        (e.ctrlKey && (e.key === 'X' || e.key === 'x')) ||
        e.key === 'PrintScreen'
      ) {
        e.preventDefault();
      }
    };

    const handleViolation = () => {
      if (!isBlurredRef.current) {
        setIsBlurred(true);
        setViolationCount(prev => prev + 1);
      }
    };

    // Handle visibility change (tab switch)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation();
      }
    };

    // Handle window blur (clicking outside, opening Snipping Tool/other apps)
    const handleBlur = () => {
      handleViolation();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    // Add user-select: none to body to prevent text highlighting
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none'; // for Safari
    (document.body.style as any).WebkitTouchCallout = 'none'; // Disable iOS long-press menu

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      
      document.body.style.userSelect = 'auto';
      document.body.style.webkitUserSelect = 'auto';
      (document.body.style as any).WebkitTouchCallout = 'auto';
    };
  }, [isActive]);

  const resetExamBrowser = () => {
    setIsBlurred(false);
    setViolationCount(0);
  };

  return { isBlurred, setIsBlurred, violationCount, resetExamBrowser };
};
