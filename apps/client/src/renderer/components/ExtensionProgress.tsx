import { useEffect, useState } from 'react';

interface ActivationProgress {
  extensionId: string;
  status: 'pending' | 'activating' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export const ExtensionProgress: React.FC = () => {
  const [progress, setProgress] = useState<Record<string, ActivationProgress>>({});

  useEffect(() => {
    const handler = (event: any, data: ActivationProgress) => {
      setProgress(prev => ({
        ...prev,
        [data.extensionId]: data
      }));
    };

    const cleanup = window.ipcRenderer.on('extension:progress', handler);
    return () => {
      cleanup();
    };
  }, []);

  return (
    <div className="extension-progress">
      {Object.entries(progress).map(([id, data]) => (
        <div key={id} className="progress-item">
          <span>{id}</span>
          <progress value={data.progress} max="100" />
          {data.status === 'error' && (
            <span className="error">{data.error}</span>
          )}
        </div>
      ))}
    </div>
  );
}; 