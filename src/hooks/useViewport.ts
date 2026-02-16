import { useState, useCallback, useRef, type PointerEvent, type WheelEvent } from 'react';

interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

export function useViewport(initialScale = 0.85) {
  const [viewport, setViewport] = useState<ViewportState>({ x: 0, y: 0, scale: initialScale });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e: PointerEvent) => {
    if (e.button !== 0) return;
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setViewport((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const onWheel = useCallback((e: WheelEvent) => {
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    setViewport((v) => {
      const newScale = Math.min(3, Math.max(0.2, v.scale * factor));
      return { ...v, scale: newScale };
    });
  }, []);

  const resetViewport = useCallback(() => {
    setViewport({ x: 0, y: 0, scale: initialScale });
  }, [initialScale]);

  const transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`;

  return {
    viewport,
    transform,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onWheel },
    resetViewport,
  };
}
