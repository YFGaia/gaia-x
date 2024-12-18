import { OpenAIFormTemplate } from './OpenAIFormTemplate'
import { GaiaAIFormTemplate } from './GaiaAIFormTemplate'
import { DifyFormTemplate } from './DifyFormTemplate'
import { CommonFormTemplate } from './CommonFormTemplate'
import './FormEditor.css'
import { useToolPresetStore } from '@/stores/ToolPresetStore'


export const FormEditor = () => {
  const { formData } = useToolPresetStore()
  const provider = formData?.provider || ''
  return (
    <>
      <CommonFormTemplate/>

      {provider === 'openai' && (
        <OpenAIFormTemplate/>
      )}

      {provider === 'gaia' && (
        <GaiaAIFormTemplate/>
      )}

      {provider.startsWith('dify') && (
        <DifyFormTemplate/>
      )}
    </>
  )
} 