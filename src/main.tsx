import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.tsx'
import { createRuntimeDataClient } from './app/createRuntimeDataClient'

const dataClient = createRuntimeDataClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App dataClient={dataClient} />
  </StrictMode>,
)
