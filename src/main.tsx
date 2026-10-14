import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import './styles-harvest.css'

// Harvest Edition: Google Sheets garden-planner theme, for old times' sake
try {
  if (localStorage.getItem('theme') === 'harvest' || window.location.pathname.includes('harvest')) {
    document.body.classList.add('theme-harvest')
  }
} catch {
  /* ignore */
}

const root = ReactDOM.createRoot(document.getElementById('root')!)
// Throwaway variants on the existing app route; never included in production.
if (import.meta.env.DEV && new URL(location.href).searchParams.get('prototype') === 'calibration') {
  import('./components/Calibration.prototype').then(({ default: CalibrationPrototype }) =>
    root.render(<React.StrictMode><CalibrationPrototype /></React.StrictMode>),
  )
} else {
  root.render(<React.StrictMode><App /></React.StrictMode>)
}
