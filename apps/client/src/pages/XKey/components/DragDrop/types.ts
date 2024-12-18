export interface DragItem {
  id: string;
  index: number;
  data?: any;
}

export interface DropTarget {
  id: string;
  index: number;
}

export interface DragDropState {
  isDragging: boolean;
  draggedItem: DragItem | null;
  activeDropTarget: DropTarget | null;
}

export interface DragDropContextValue extends DragDropState {
  onDragStart: (e: React.DragEvent, item: DragItem) => void;
  onDragEnd: () => void;
  registerDropTarget: (id: string, index: number) => void;
  unregisterDropTarget: (id: string) => void;
}

export type DragDropAction =
  | { type: 'START_DRAG'; payload: DragItem }
  | { type: 'END_DRAG' }
  | { type: 'REGISTER_DROP_TARGET'; payload: DropTarget }
  | { type: 'UNREGISTER_DROP_TARGET'; payload: string }; 