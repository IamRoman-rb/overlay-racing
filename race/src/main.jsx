import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { installFlexGapPolyfill } from './utils/flexGapPolyfill.js'
import { installDialogFocusFix } from './utils/dialogFocusFix.js'

installFlexGapPolyfill()
installDialogFocusFix()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
