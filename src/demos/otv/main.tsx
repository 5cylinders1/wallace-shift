import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import OtvApp from './OtvApp'
import './otv.css'

createRoot(document.getElementById('root')!).render(<StrictMode><OtvApp /></StrictMode>)
