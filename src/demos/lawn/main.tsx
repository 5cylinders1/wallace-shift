import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import LareauApp from './LareauApp'
import './lawn.css'
import './estimate/estimator.css'

createRoot(document.getElementById('root')!).render(<StrictMode><LareauApp /></StrictMode>)
