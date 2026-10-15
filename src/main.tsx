import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import './styles-minimal.css'
import { restoreTheme } from './logic/theme'

restoreTheme()
window.addEventListener('storage', (event) => {
  if (event.key === 'theme') restoreTheme()
})

const root = ReactDOM.createRoot(document.getElementById('root')!)
if (new URLSearchParams(location.search).get('view') === 'calibration') {
  import('./components/CalibrationPage').then(({ CalibrationPage }) =>
    root.render(<React.StrictMode><CalibrationPage /></React.StrictMode>),
  )
} else {
  root.render(<React.StrictMode><App /></React.StrictMode>)
}
