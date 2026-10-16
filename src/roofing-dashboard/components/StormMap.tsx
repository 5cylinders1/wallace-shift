import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Coordinate, DashboardConfig, PropertyMatch, Scenario, WeatherEvent, WeatherType } from '../types'
import './map.css'

interface StormMapProps {
  config: DashboardConfig
  scenario: Scenario
  events: WeatherEvent[]
  matches: PropertyMatch[]
  selectedEventId: string | null
  selectedPropertyId: string | null
  onSelectEvent: (id: string) => void
  onSelectProperty: (id: string) => void
  showCustomers: boolean
  showProspects: boolean
  radiusMiles: number
}

const weatherColors: Record<WeatherType, string> = {
  hail: '#ba791e',
  wind: '#397dc0',
  tornado: '#8a61bd',
  hurricane: '#228c83',
}

const weatherNames: Record<WeatherType, string> = {
  hail: 'Hail',
  wind: 'Wind',
  tornado: 'Tornado',
  hurricane: 'Hurricane',
}

const evidenceLabels = {
  report: 'Reported point',
  estimated: 'Estimated weather area',
  warning: 'Warning area',
}

const weatherPaths: Record<WeatherType, string[]> = {
  hail: ['M6 7h.01M12 5h.01M18 7h.01M8 14h.01M16 14h.01M12 20h.01'],
  wind: ['M3 8h11a3 3 0 1 0-3-3', 'M3 12h15a3 3 0 1 1-3 3', 'M3 16h6'],
  tornado: ['M3 5h18M5 9h14M8 13h10M11 17h5M13 21h2'],
  hurricane: ['M17 3c-6-2-13 4-12 10', 'M7 21c6 2 13-4 12-10', 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0'],
}

function latLng([longitude, latitude]: Coordinate): L.LatLngTuple {
  return [latitude, longitude]
}

function safeAttributionUrl(value?: string): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

function textTooltip(title: string, detail: string) {
  const element = document.createElement('div')
  const heading = document.createElement('strong')
  const description = document.createElement('span')
  heading.textContent = title
  description.textContent = detail
  description.className = 'storm-map-tooltip-detail'
  element.append(heading, description)
  return element
}

function weatherIcon(event: WeatherEvent, selected: boolean) {
  const element = document.createElement('span')
  element.className = `storm-map-weather-symbol storm-map-weather-symbol--${event.evidence}`
  element.style.setProperty('--weather-color', weatherColors[event.type])
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  for (const data of weatherPaths[event.type]) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', data)
    svg.append(path)
  }
  element.append(svg)
  return L.divIcon({
    className: `storm-map-weather-marker${selected ? ' is-selected' : ''}`,
    html: element,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    tooltipAnchor: [0, -22],
  })
}

function propertyIcon(match: PropertyMatch, selected: boolean) {
  const element = document.createElement('span')
  const relationship = match.property.relationship
  element.className = `storm-map-property-symbol storm-map-property-symbol--${relationship}`
  element.setAttribute('aria-hidden', 'true')
  if (relationship !== 'prospect') {
    element.textContent = relationship === 'lead' ? '+' : '✓'
  }
  return L.divIcon({
    className: `storm-map-property-marker${selected ? ' is-selected' : ''}`,
    html: element,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    tooltipAnchor: [0, -14],
  })
}

export function StormMap({
  config,
  scenario,
  events,
  matches,
  selectedEventId,
  selectedPropertyId,
  onSelectEvent,
  onSelectProperty,
  showCustomers,
  showProspects,
  radiusMiles,
}: StormMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const eventLayersRef = useRef<L.LayerGroup | null>(null)
  const propertyLayersRef = useRef<L.LayerGroup | null>(null)
  const serviceLayerRef = useRef<L.LayerGroup | null>(null)
  const scenarioIdRef = useRef<string | null>(null)
  const lastPropertySelectionRef = useRef<string | null>(null)
  const callbacksRef = useRef({ onSelectEvent, onSelectProperty })
  const [basemapUnavailable, setBasemapUnavailable] = useState(false)

  useEffect(() => {
    callbacksRef.current = { onSelectEvent, onSelectProperty }
  }, [onSelectEvent, onSelectProperty])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const map = L.map(container, {
      center: [38, -97],
      zoom: 4,
      minZoom: 3,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      keyboard: true,
    })
    mapRef.current = map
    map.createPane('storm-weather-areas').style.zIndex = '410'
    map.createPane('storm-weather-markers').style.zIndex = '610'
    map.createPane('storm-properties').style.zIndex = '620'
    serviceLayerRef.current = L.layerGroup().addTo(map)
    eventLayersRef.current = L.layerGroup().addTo(map)
    propertyLayersRef.current = L.layerGroup().addTo(map)
    L.control.zoom({ position: 'topright' }).addTo(map)

    let disposed = false
    let resizeFrame = 0
    const onResize = () => {
      cancelAnimationFrame(resizeFrame)
      resizeFrame = requestAnimationFrame(() => {
        // Leaflet compensates for the changed pixel center when pan is true.
        if (!disposed) map.invalidateSize({ animate: false, pan: true })
      })
    }
    const observer = new ResizeObserver(onResize)
    observer.observe(container)

    return () => {
      disposed = true
      observer.disconnect()
      cancelAnimationFrame(resizeFrame)
      map.remove()
      mapRef.current = null
      eventLayersRef.current = null
      propertyLayersRef.current = null
      serviceLayerRef.current = null
      scenarioIdRef.current = null
      lastPropertySelectionRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || scenarioIdRef.current === scenario.id) return
    scenarioIdRef.current = scenario.id
    map.setView(latLng(scenario.center), scenario.zoom, { animate: false })
  }, [scenario.id, scenario.center, scenario.zoom])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.setMaxZoom(config.map.maxZoom)
    const tiles = L.tileLayer(config.map.tileUrl, {
      maxZoom: config.map.maxZoom,
      // OSM requires a Referer, while private demo pages use no-referrer.
      // Identify only the site origin; never send the demo path or query.
      referrerPolicy: 'strict-origin',
      updateWhenIdle: true,
      keepBuffer: 1,
    })
    let disposed = false
    let errors = 0
    let loaded = 0
    tiles.on('loading', () => {
      errors = 0
      loaded = 0
    })
    tiles.on('tileerror', () => { errors += 1 })
    tiles.on('tileload', () => {
      loaded += 1
      if (!disposed && loaded >= 3) setBasemapUnavailable(false)
    })
    tiles.on('load', () => {
      if (disposed) return
      // A single missing tile should not turn a usable basemap into an error.
      if (errors >= 3 && errors > loaded) setBasemapUnavailable(true)
      else if (loaded > 0) setBasemapUnavailable(false)
    })
    tiles.addTo(map)
    return () => {
      disposed = true
      tiles.off()
      tiles.remove()
    }
  }, [config.map.tileUrl, config.map.maxZoom])

  useEffect(() => {
    const layers = serviceLayerRef.current
    if (!layers) return
    layers.clearLayers()
    L.polygon(scenario.serviceArea.map(latLng), {
      color: '#75828b',
      weight: 1.5,
      opacity: 0.7,
      dashArray: '5 7',
      fill: false,
      interactive: false,
      pane: 'storm-weather-areas',
    }).addTo(layers)
    return () => { layers.clearLayers() }
  }, [scenario.serviceArea])

  useEffect(() => {
    const layers = eventLayersRef.current
    if (!layers) return
    layers.clearLayers()
    for (const event of events) {
      const selected = event.id === selectedEventId
      const color = weatherColors[event.type]
      const select = () => callbacksRef.current.onSelectEvent(event.id)
      const detail = `${evidenceLabels[event.evidence]}${event.magnitude ? ` · ${event.magnitude}` : ''} · Sample data`

      if (event.footprint && event.evidence !== 'report') {
        L.polygon(event.footprint.map(latLng), {
          color,
          weight: selected ? 2.5 : 1.5,
          opacity: selected ? 0.9 : 0.65,
          fillOpacity: event.evidence === 'warning' ? 0.025 : selected ? 0.2 : 0.13,
          dashArray: event.evidence === 'warning' ? '7 6' : undefined,
          pane: 'storm-weather-areas',
        })
          .bindTooltip(textTooltip(event.title, detail), { className: 'storm-map-tooltip', sticky: true })
          .on('click', select)
          .addTo(layers)
      }

      if (selected && event.evidence === 'report' && radiusMiles > 0) {
        L.circle(latLng(event.point), {
          radius: radiusMiles * 1609.344,
          color,
          weight: 1,
          opacity: 0.65,
          fillOpacity: 0.05,
          dashArray: '3 6',
          interactive: false,
          pane: 'storm-weather-areas',
        }).addTo(layers)
      }

      L.marker(latLng(event.point), {
        icon: weatherIcon(event, selected),
        keyboard: true,
        title: `${event.title}. ${detail}. Select event.`,
        alt: `${weatherNames[event.type]}: ${event.title}`,
        pane: 'storm-weather-markers',
        zIndexOffset: selected ? 300 : 0,
      })
        .bindTooltip(textTooltip(event.title, detail), { className: 'storm-map-tooltip', direction: 'top' })
        .on('click', select)
        .addTo(layers)
    }
    return () => { layers.clearLayers() }
  }, [events, selectedEventId, radiusMiles])

  useEffect(() => {
    const layers = propertyLayersRef.current
    if (!layers) return
    layers.clearLayers()
    for (const match of matches) {
      const property = match.property
      if (property.relationship === 'prospect' ? !showProspects : !showCustomers) continue
      const relationship = property.relationship === 'customer' ? 'Existing customer' : property.relationship === 'lead' ? 'Website lead' : 'Prospect property'
      L.marker(latLng(property.point), {
        icon: propertyIcon(match, property.id === selectedPropertyId),
        keyboard: true,
        title: `${property.address}. ${relationship}. Select property.`,
        alt: `${relationship}: ${property.address}`,
        pane: 'storm-properties',
        zIndexOffset: property.id === selectedPropertyId ? 1000 : 0,
      })
        .bindTooltip(textTooltip(property.address, relationship), { className: 'storm-map-tooltip', direction: 'top' })
        .on('click', () => callbacksRef.current.onSelectProperty(property.id))
        .addTo(layers)
    }
    return () => { layers.clearLayers() }
  }, [matches, selectedPropertyId, showCustomers, showProspects])

  useEffect(() => {
    const map = mapRef.current
    const selection = selectedPropertyId ? `${scenario.id}:${selectedPropertyId}` : null
    if (!map || selection === lastPropertySelectionRef.current) return
    lastPropertySelectionRef.current = selection
    const match = matches.find(({ property }) => property.id === selectedPropertyId)
    if (!match) return
    if (match.property.relationship === 'prospect' ? !showProspects : !showCustomers) return
    const position = L.latLng(latLng(match.property.point))
    if (!map.getBounds().pad(-0.1).contains(position)) map.panTo(position, { animate: false })
  }, [selectedPropertyId, scenario.id, matches, showCustomers, showProspects])

  const selectedReport = events.find(event => event.id === selectedEventId && event.evidence === 'report')
  const attributionUrl = safeAttributionUrl(config.map.attributionUrl)

  return (
    <div className="storm-map">
      <div ref={containerRef} className="storm-map-canvas" role="region" aria-label={`Sample weather and properties in ${scenario.region}`} />
      <div className="storm-map-badges">
        <span className="storm-map-sample-badge"><span aria-hidden="true" />Sample weather layers</span>
        {selectedReport && radiusMiles > 0 && <span className="storm-map-radius-label">{radiusMiles} mi search radius · targeting only</span>}
      </div>
      {basemapUnavailable && <div className="storm-map-error" role="status">Basemap unavailable. Property list remains available.</div>}
      <div className="storm-map-legend" aria-label="Map legend">
        <div className="storm-map-legend-weather">
          {(Object.keys(weatherNames) as WeatherType[]).map(type => (
            <span key={type}><i style={{ backgroundColor: weatherColors[type] }} aria-hidden="true" />{weatherNames[type]}</span>
          ))}
        </div>
        <div className="storm-map-legend-evidence">
          <span><i className="storm-map-key-report" aria-hidden="true" />Report</span>
          <span><i className="storm-map-key-area" aria-hidden="true" />Estimate</span>
          <span><i className="storm-map-key-warning" aria-hidden="true" />Warning</span>
          <span><i className="storm-map-key-service" aria-hidden="true" />Service area</span>
        </div>
        <div className="storm-map-legend-properties">
          <span><i className="storm-map-key-customer" aria-hidden="true">✓</i>Customer</span>
          <span><i className="storm-map-key-customer storm-map-key-lead" aria-hidden="true">+</i>Website lead</span>
          <span><i className="storm-map-key-prospect" aria-hidden="true" />Prospect</span>
        </div>
      </div>
      <div className="storm-map-attribution">{attributionUrl
        ? <a href={attributionUrl} target="_blank" rel="noreferrer">{config.map.attribution}</a>
        : config.map.attribution}</div>
    </div>
  )
}
