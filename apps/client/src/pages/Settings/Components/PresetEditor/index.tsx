import { defaultPreset, useToolPresetStore } from '@/stores/ToolPresetStore';
import { SettingChannel, ToolbarChannel } from '@/types/ipc/xKey';
import { Preset, PresetConfig } from '@/types/xKey/types';
import { Button, Modal } from 'antd';
import { useEffect, useState } from 'react';
import { RiAddLine, RiDownload2Line, RiUpload2Line } from 'react-icons/ri';
import { DragDropProvider } from '../../../XKey/components/DragDrop';
import { FormEditor } from './Forms/FormEditor';
import { validateForm } from './Forms/utils';
import './index.css';
import { PresetItem } from './PresetItem';

export default function PresetEditor() {
  // State management
  const { formData, setFormData, setErrors } = useToolPresetStore();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null)
  const [toolbarSize, setToolbarSize] = useState(3);

  const handleSubmit = () => {
    if (!formData) return
    console.log('saving preset', formData)
    const errors = validateForm(formData)
    console.log('errors', errors)
    if (Object.keys(errors).length === 0) {
      handleSavePreset()
      setIsModalOpen(false)
    } else {
      setErrors(errors)
    }
  }

  // Load presets from main process
  useEffect(() => {
    const handlePresetsUpdate = (_: Electron.IpcRendererEvent, presets: PresetConfig) => {
      setPresets(presets.presets);
      setToolbarSize(presets.toolbarSize);
    };

    const cleanUp = window.ipcRenderer.on(SettingChannel.UPDATE_PRESETS, handlePresetsUpdate);
    // window.ipcRenderer.send(IpcMessage.GET_PRESETS, null)
    window.ipcRenderer.invoke(SettingChannel.GET_PRESETS).then((presets) => {
      setPresets(presets.presets);
      setToolbarSize(presets.toolbarSize);
    });

    return () => {
      cleanUp();
    };
  }, []);

  // Handlers for preset operations
  const handleEdit = (preset: Preset) => {
    setFormData(preset);
    setIsModalOpen(true);
  };

  const handleDelete = (preset: Preset) => {
    // only perform confirm check at PresetItem, don't do that twice
    const updatedPresets = presets.filter((p) => p.id !== preset.id);
    // Update local state first
    setPresets(updatedPresets);
    // Then save to main process
    savePresets(updatedPresets);
  };

  const handleAdd = () => {
    // setSelectedPreset(null)
    setFormData(defaultPreset);
    setIsModalOpen(true);
  };

  const handleImport = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const text = await file.text();
        const imported = JSON.parse(text);

        // Extract presets array from either PresetConfig or direct array format
        const importedPresets = Array.isArray(imported) ? imported : imported.presets;

        // Validate imported data structure
        if (!Array.isArray(importedPresets)) {
          throw new Error('Invalid preset configuration format');
        }

        // Handle ID conflicts by generating new IDs for duplicates
        const existingIds = new Set(presets.map((p) => p.id));
        const newPresets = importedPresets.map((preset) => {
          if (existingIds.has(preset.id)) {
            return {
              ...preset,
              id: `${preset.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            };
          }
          return preset;
        });

        // Merge with existing presets and update state
        const updatedPresets = [...presets, ...newPresets];
        setPresets(updatedPresets);
        savePresets(updatedPresets);
      };

      input.click();
    } catch (error) {
      console.error('Import failed:', error);
      alert('导入失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleExport = () => {
    try {
      // Only export the presets array
      const blob = new Blob([JSON.stringify(presets, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `presets-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleSavePreset = () => {
    let updatedPresets: Preset[];
    if (!formData) return;

    if (formData.id) {
      // Edit existing preset
      updatedPresets = presets.map((p) => (p.id === formData.id ? formData : p));
    } else {
      //new preset
      const newId = `preset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      updatedPresets = [...presets, { ...formData, id: newId }];
    }

    setPresets(updatedPresets); // 浏览器进程
    savePresets(updatedPresets); // 主进程

    setIsModalOpen(false);
    setErrors({});
    console.log('formData', formData);
    console.log('updatedPresets', updatedPresets);
  };

  // Save presets to main process
  const savePresets = (newPresets: Preset[]) => {
    const config: PresetConfig = {
      toolbarSize, // Use current toolbarSize instead of hardcoded value
      presets: newPresets,
    };
    window.ipcRenderer.send?.(SettingChannel.SET_PRESETS, JSON.stringify(config));
  };

  // Handle reordering of presets
  const handleReorder = (sourceIndex: number, targetIndex: number) => {
    if (sourceIndex === targetIndex) return;
    const items = Array.from(presets);
    const [reorderedItem] = items.splice(sourceIndex, 1);
    items.splice(targetIndex, 0, reorderedItem);
    savePresets(items);
    setPresets(items);
    window.ipcRenderer.send?.(ToolbarChannel.INTERRUPT_SELECTION, null);
  };

  // Ant Design Modal样式配置
  const modalStyle = {
    width: '80%',
    maxWidth: '800px',
    top: '10vh', // 从顶部10%的位置开始，这样底部会留出10%的空间
  };

  // 内容区域样式
  const bodyStyle = {
    padding: 0,
    maxHeight: 'calc(80vh - 110px)', // 减去标题和底部按钮的高度
    overflow: 'hidden',
  };

  return (
    <div className="preset-editor">
      {/* Action buttons */}
      <div className="preset-editor-header">
        <div>编辑工具条预设，拖动调整顺序</div>
        <div className="preset-list-actions">
          <Button icon={<RiDownload2Line />} onClick={handleImport}>
            导入
          </Button>
          <Button icon={<RiUpload2Line />} onClick={handleExport}>
            导出
          </Button>
          <Button icon={<RiAddLine />} onClick={handleAdd}>
            添加
          </Button>
        </div>
      </div>

      {/* Preset list with drag and drop */}
      <DragDropProvider onReorder={handleReorder}>
        <div className="preset-list">
          {presets.map((preset, index) => (
            <PresetItem
              key={preset.id}
              preset={preset}
              index={index}
              disabled={index >= toolbarSize}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </DragDropProvider>

      
      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSavePreset}
        title={formData ? '编辑预设' : '新建预设'}
        footer={[
          <Button key="cancel" onClick={() => setIsModalOpen(false)}>取消</Button>,
          <Button key="submit" type="primary" onClick={handleSubmit}>保存</Button>
        ]}
        style={modalStyle}
        styles={{
          body: bodyStyle
        }}
        destroyOnClose={true}
        maskClosable={true}
        centered={false}
        className="preset-editor-modal"
      >
        <div className="preset-modal-content">
          <FormEditor />
        </div>
      </Modal>
    </div>
  );
}
