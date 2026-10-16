import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AdminDemoAccess } from './AdminDemoAccess'

createRoot(document.getElementById('root')!).render(
  <StrictMode><AdminDemoAccess /></StrictMode>,
)
