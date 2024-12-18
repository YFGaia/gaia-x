import { useContext, useEffect, useMemo } from 'react';
import { DragDropContext } from './context';

export function useDraggable(id: string, index: number, data?: any) {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error('useDraggable must be used within a DragDropProvider');
  }

  const { onDragStart, onDragEnd, isDragging, draggedItem } = context;
  
  return {
    draggableProps: {
      draggable: true,
      onDragStart: (e: React.DragEvent) => onDragStart(e, { id, index, data }),
      onDragEnd: () => onDragEnd(),
    },
    isDragging: isDragging && draggedItem?.id === id,
  };
}

export function useDropTarget(id: string, index: number) {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error('useDropTarget must be used within a DragDropProvider');
  }

  const { registerDropTarget, unregisterDropTarget, activeDropTarget } = context;
  
  useEffect(() => {
    return () => {
      unregisterDropTarget(id);
    };
  }, [id]);

  const dropTargetProps = useMemo(() => ({
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDragEnter: (e: React.DragEvent) => {
      e.preventDefault();
      registerDropTarget(id, index);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      registerDropTarget(id, index);
    },
  }), [id, index, registerDropTarget]);

  return {
    dropTargetProps,
    isOver: activeDropTarget?.id === id,
  };
} 