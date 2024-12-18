import { useState } from 'react'
import { getIcon } from '../../../../XKey/assets/iconConfig'
import { IconPicker } from '../../../../XKey/components/IconPicker'
import { useToolPresetStore } from '@/stores/ToolPresetStore'
import { Form, Input, Select, Tooltip, Row, Col, Button } from 'antd'

/** 预设表单模板,配置命名和API路由 */
export const CommonFormTemplate = () => {
  const { formData, handleFieldChange, errors } = useToolPresetStore()
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)
  
  const handleIconSelect = (iconName: string) => {
    handleFieldChange('icon', iconName)
  }
  
  return (
    <Form layout="vertical">
      <Row gutter={16}>
        <Col span={18}>
          <Form.Item 
            label={<Tooltip title="预设名称，用于在工具条中显示">名称 & 图标</Tooltip>}
            validateStatus={errors.title ? 'error' : undefined}
            help={errors.title}
          >
            <Input
              value={formData?.title}
              onChange={e => handleFieldChange('title', e.target.value)}
              placeholder="预设名称"
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label=" ">
            <Button 
              icon={<span className="selected-icon">{getIcon(formData?.icon || '')}</span>}
              onClick={() => setIsIconPickerOpen(true)}
              className="icon-selector"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span>🎨</span>
            </Button>
            <IconPicker 
              isOpen={isIconPickerOpen}
              onSelect={handleIconSelect}
              onClose={() => setIsIconPickerOpen(false)}
            />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label="提供商">
        <Select
          value={formData?.provider}
          onChange={value => handleFieldChange('provider', value)}
          options={[
            // { value: 'dify', label: 'Dify' },
            { value: 'openai', label: 'OpenAI' },
            { value: 'gaia', label: 'GaiaAI' },
            { value: 'none', label: '无' }
          ]}
        />
      </Form.Item>
    </Form>
  )
}
