import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PoolApp from './PoolApp'
import './pools.css'

createRoot(document.getElementById('root')!).render(<StrictMode><PoolApp /></StrictMode>)
