import { useState, useEffect, useCallback } from 'react';

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return !!(
      typeof document !== 'undefined' &&
      (document.fullscreenElement ||
        (document as any).webkitFullscreenElement)
    );
  });

  const [isSupported, setIsSupported] = useState<boolean>(true);

  useEffect(() => {
    const checkSupport = () => {
      const supported = !!(
        document.fullscreenEnabled ||
        (document as any).webkitFullscreenEnabled ||
        document.documentElement.requestFullscreen ||
        (document.documentElement as any).webkitRequestFullscreen
      );
      setIsSupported(supported);
    };
    checkSupport();

    const handleFullscreenChange = () => {
      const active = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement
      );
      setIsFullscreen(active);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const enterFullscreen = useCallback(async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      }
      setIsFullscreen(true);
      return true;
    } catch (err) {
      console.warn('Fullscreen request failed or was blocked by browser:', err);
      return false;
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      }
      setIsFullscreen(false);
      return true;
    } catch (err) {
      console.warn('Exit fullscreen failed:', err);
      return false;
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      return await exitFullscreen();
    } else {
      return await enterFullscreen();
    }
  }, [enterFullscreen, exitFullscreen]);

  return {
    isFullscreen,
    isSupported,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };
}
