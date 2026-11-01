import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import RiffleApp from './RiffleApp'
import './water.css'

createRoot(document.getElementById('root')!).render(<StrictMode><RiffleApp /></StrictMode>)
