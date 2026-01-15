"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet.heat"

type LayerType = "traffic" | "heatmap" | "satellite"

interface Incident {
  id: string
  type: "severe" | "moderate" | "construction" | "cleared"
  title: string
  location: string
  time: string
  lat: number
  lng: number
}

interface LeafletMapProps {
  incidents: Incident[]
  activeLayer: LayerType
  selectedIncident: Incident | null
  onSelectIncident: (incident: Incident | null) => void
  onMapReady?: (map: L.Map) => void
}

// Custom marker icons for different incident types
const createIncidentIcon = (type: Incident["type"]) => {
  const colors: Record<string, string> = {
    severe: "#dc2626",
    moderate: "#f59e0b",
    construction: "#007bff",
    cleared: "#10b981",
  }

  const color = colors[type]
  const pulse = type === "severe" ? "animation: pulse 2s infinite;" : ""

  return L.divIcon({
    className: "custom-incident-marker",
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background: ${color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px ${color}80;
        ${pulse}
        cursor: pointer;
        border: 3px solid white;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          ${
            type === "severe"
              ? '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>'
              : type === "moderate"
                ? '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>'
                : type === "construction"
                  ? '<rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7"/><path d="M7 14v7"/><path d="M17 3v3"/><path d="M7 3v3"/><path d="M10 14 2.3 6.3"/><path d="m14 6 7.7 7.7"/><path d="m8 6 8 8"/>'
                  : '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>'
          }
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  })
}

export function LeafletMap({
  incidents,
  activeLayer,
  selectedIncident,
  onSelectIncident,
  onMapReady,
}: LeafletMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const heatLayerRef = useRef<L.HeatLayer | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    // Create map centered on a default location
    const map = L.map(mapContainer.current, {
      center: [14.5995, 120.9842], // Manila, Philippines as default
      zoom: 13,
      zoomControl: false,
    })

    // Add zoom control to bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map)

    mapRef.current = map
    markersRef.current = L.layerGroup().addTo(map)

    // Add initial tile layer
    tileLayerRef.current = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(map)

    // Inject pulse animation CSS
    const style = document.createElement("style")
    style.textContent = `
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
      }
      .custom-incident-marker {
        background: transparent !important;
        border: none !important;
      }
      .leaflet-popup-content-wrapper {
        background: rgba(13, 17, 23, 0.95);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        color: #e5e7eb;
      }
      .leaflet-popup-tip {
        background: rgba(13, 17, 23, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      .leaflet-popup-close-button {
        color: #9ca3af !important;
      }
      .leaflet-popup-close-button:hover {
        color: #f3f4f6 !important;
      }
    `
    document.head.appendChild(style)

    if (onMapReady) {
      onMapReady(map)
    }

    return () => {
      map.remove()
      mapRef.current = null
      style.remove()
    }
  }, [onMapReady])

  // Update tile layer based on activeLayer
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return

    const map = mapRef.current

    // Remove current tile layer
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current)
    }

    // Remove heatmap if exists
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current)
      heatLayerRef.current = null
    }

    // Add appropriate tile layer
    let tileUrl: string
    let attribution: string

    switch (activeLayer) {
      case "satellite":
        tileUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution =
          "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
        break
      case "heatmap":
        // Use dark tiles for heatmap background
        tileUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution =
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        break
      default:
        // Traffic - use dark theme
        tileUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution =
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }

    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution,
      maxZoom: 19,
    }).addTo(map)

    // Add heatmap layer if heatmap is active
    if (activeLayer === "heatmap" && incidents.length > 0) {
      const heatData: [number, number, number][] = incidents.map((incident) => {
        // Weight based on severity
        const weight =
          incident.type === "severe"
            ? 1.0
            : incident.type === "moderate"
              ? 0.7
              : incident.type === "construction"
                ? 0.4
                : 0.2
        return [incident.lat, incident.lng, weight]
      })

      heatLayerRef.current = L.heatLayer(heatData, {
        radius: 35,
        blur: 25,
        maxZoom: 17,
        gradient: {
          0.2: "#10b981",
          0.4: "#007bff",
          0.6: "#f59e0b",
          0.8: "#ef4444",
          1.0: "#dc2626",
        },
      }).addTo(map)
    }
  }, [activeLayer, incidents])

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return

    // Clear existing markers
    markersRef.current.clearLayers()

    // Don't show individual markers in heatmap mode
    if (activeLayer === "heatmap") return

    // Add markers for each incident
    incidents.forEach((incident) => {
      const marker = L.marker([incident.lat, incident.lng], {
        icon: createIncidentIcon(incident.type),
      })

      const typeColors: Record<string, string> = {
        severe: "#dc2626",
        moderate: "#f59e0b",
        construction: "#007bff",
        cleared: "#10b981",
      }

      marker.bindPopup(
        `
        <div style="min-width: 200px; padding: 4px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="
              width: 10px;
              height: 10px;
              border-radius: 50%;
              background: ${typeColors[incident.type]};
            "></div>
            <span style="
              font-size: 11px;
              text-transform: uppercase;
              color: ${typeColors[incident.type]};
              font-weight: 600;
            ">${incident.type}</span>
          </div>
          <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #f3f4f6;">
            ${incident.title}
          </h3>
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #9ca3af;">
            ${incident.location}
          </p>
          <p style="margin: 0; font-size: 11px; color: #6b7280;">
            ${incident.time}
          </p>
        </div>
      `,
        {
          closeButton: true,
          className: "incident-popup",
        },
      )

      marker.on("click", () => {
        onSelectIncident(incident)
      })

      markersRef.current?.addLayer(marker)
    })
  }, [incidents, activeLayer, onSelectIncident])

  // Pan to selected incident
  useEffect(() => {
    if (!mapRef.current || !selectedIncident) return

    mapRef.current.flyTo([selectedIncident.lat, selectedIncident.lng], 15, {
      duration: 0.5,
    })
  }, [selectedIncident])

  return <div ref={mapContainer} className="w-full h-full" style={{ background: "#0d1117" }} />
}
