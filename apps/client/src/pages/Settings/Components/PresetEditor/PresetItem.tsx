import { useState } from 'react'
import { Preset } from '@/types/xKey/types'
import { RiDraggable } from 'react-icons/ri'
import { getIcon } from '../../../XKey/assets/iconConfig'
import { useDraggable, useDropTarget } from '../../../XKey/components/DragDrop/hooks'
import './PresetItem.css'
import { Button } from 'antd'

interface PresetItemProps {
  preset: Preset
  index: number
  disabled?: boolean
  onEdit: (preset: Preset) => void
  onDelete: (preset: Preset) => void
}

export const PresetItem = ({ 
  preset, 
  index,
  disabled,
  onEdit, 
  onDelete,
}: PresetItemProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { draggableProps, isDragging } = useDraggable(preset.id, index)
  const { dropTargetProps, isOver } = useDropTarget(preset.id, index)

  const handleDelete = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }
    onDelete(preset)
    setShowDeleteConfirm(false)
  }

  return (
    <div 
      className={`preset-item ${isDragging ? 'dragging' : ''} ${isOver ? 'drop-target' : ''} ${disabled ? 'disabled' : ''} bg-white`}
      onMouseLeave={() => {
        setShowDeleteConfirm(false)
      }}
      {...dropTargetProps}
    >
      {/* Drag Handle */}
      <div className="preset-drag-handle" {...draggableProps}>
        <RiDraggable />
      </div>

      {/* Icon and Title */}
      <div className="preset-info">
        <div className="preset-icon">
          {getIcon(preset.icon)}
        </div>
        <div className="preset-title">
          {preset.title}
        </div>
        <div className="preset-provider">
          {preset.provider}
        </div>
      </div>

      {/* Actions */}
      <div className="preset-actions">
        <Button 
          onClick={() => onEdit(preset)}
        >
          编辑
        </Button>
        <Button 
          className={` ${showDeleteConfirm ? 'danger' : ''}`}
          onClick={handleDelete}
        >
          {showDeleteConfirm ? "确认删除?" : "删除"}
        </Button>
      </div>
    </div>
  )
} 