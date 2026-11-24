import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import App from './App'

const root = document.getElementById('root')!
hydrateRoot(root, <StrictMode><App slug={root.dataset.lpSlug ?? ''} lang={root.dataset.lpLang === 'es' ? 'es' : 'en'} /></StrictMode>)
