import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'


import './index.css'

import './demos/ipc'
// If you want use Node.js, the`nodeIntegration` needs to be enabled in the Main process.
// import './demos/node'

if (process.env.NODE_ENV === 'development' && import.meta.env.VITE_ENABLE_MSW === 'true') {
  import('./mocks/browser')
    .then(({ browserWorker }) => browserWorker.start({
      onUnhandledRequest: (request, print) => {
        // 忽略对源代码文件、静态资源等的请求
        const shouldIgnore = [
          '/src/',
          '.ts',
          '.tsx',
          '.js',
          '.css',
          '.png',
          '.svg',
          '.ico',
        ].some(path => request.url.includes(path))
    
        if (!shouldIgnore) {
          print.warning()
        }
      },
    }))
    .catch(console.error)
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

postMessage({ payload: 'removeLoading' }, '*')
