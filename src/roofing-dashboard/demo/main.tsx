import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DashboardApp } from '../DashboardApp'
import { createFixtureDataSource } from '../adapters/fixtureDataSource'
import { coastalConfig, northvaneConfig } from './config'
import '../dashboard.css'

const config = new URLSearchParams(window.location.search).get('brand') === 'coastal'
  ? coastalConfig
  : northvaneConfig
const dataSource = createFixtureDataSource(config)

document.title = `${config.company} | Client Dashboard Demo`

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DashboardApp config={config} dataSource={dataSource} />
  </StrictMode>,
)
