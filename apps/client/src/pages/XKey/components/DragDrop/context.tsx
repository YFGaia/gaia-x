import { createContext, useReducer, useMemo, useCallback, ReactNode } from 'react';
import { DragDropContextValue, DragDropState, DragDropAction } from './types';
import { ToolbarChannel } from '@/types/ipc/xKey';

const initialState: DragDropState = {
  isDragging: false,
  draggedItem: null,
  activeDropTarget: null,
};

function dragDropReducer(state: DragDropState, action: DragDropAction): DragDropState {
  switch (action.type) {
    case 'START_DRAG':
      return {
        ...state,
        isDragging: true,
        draggedItem: action.payload,
      };
    case 'END_DRAG':
      return {
        ...state,
        isDragging: false,
        draggedItem: null,
        activeDropTarget: null,
      };
    case 'REGISTER_DROP_TARGET':
      return {
        ...state,
        activeDropTarget: action.payload,
      };
    case 'UNREGISTER_DROP_TARGET':
      return {
        ...state,
        activeDropTarget: state.activeDropTarget?.id === action.payload
          ? null
          : state.activeDropTarget,
      };
    default:
      return state;
  }
}

export const DragDropContext = createContext<DragDropContextValue | null>(null);

interface DragDropProviderProps {
  children: ReactNode;
  onReorder: (sourceIndex: number, targetIndex: number) => void;
}

export function DragDropProvider({ children, onReorder }: DragDropProviderProps) {
  const [state, dispatch] = useReducer(dragDropReducer, initialState);
  
  const onDragStart = useCallback((e: React.DragEvent, item: any) => {
    e.dataTransfer?.setData('application/json', JSON.stringify(item));
    dispatch({ type: 'START_DRAG', payload: item });
    window.ipcRenderer.send?.(ToolbarChannel.INTERRUPT_SELECTION, null)
  }, []);

  const onDragEnd = useCallback(() => {
    if (state.draggedItem && state.activeDropTarget) {
      onReorder(state.draggedItem.index, state.activeDropTarget.index);
    }
    dispatch({ type: 'END_DRAG' });
  }, [state.draggedItem, state.activeDropTarget, onReorder]);

  const registerDropTarget = useCallback((id: string, index: number) => {
    dispatch({ type: 'REGISTER_DROP_TARGET', payload: { id, index } });
  }, []);

  const unregisterDropTarget = useCallback((id: string) => {
    dispatch({ type: 'UNREGISTER_DROP_TARGET', payload: id });
  }, []);
  
  const contextValue = useMemo<DragDropContextValue>(() => ({
    ...state,
    onDragStart,
    onDragEnd,
    registerDropTarget,
    unregisterDropTarget,
  }), [state, onDragStart, onDragEnd, registerDropTarget, unregisterDropTarget]);

  return (
    <DragDropContext.Provider value={contextValue}>
      {children}
    </DragDropContext.Provider>
  );
} 