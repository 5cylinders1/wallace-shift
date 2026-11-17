import ServiceHome from '../components/ServiceHome/ServiceHome'
import { useRouteMeta } from '../hooks/useDocumentMeta'

export function HomePage() {
  useRouteMeta('/')
  return <ServiceHome />
}
