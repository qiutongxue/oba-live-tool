import './lib/wdyr'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from './router'
import './index.css'
import { autoCleanupStorage } from './utils/storage'

autoCleanupStorage()

ReactDOM.createRoot(document.getElementById('root') ?? document.createElement('div')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)

postMessage({ payload: 'removeLoading' }, '*')
