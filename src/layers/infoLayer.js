import * as d3 from 'd3';
import mapboxgl from 'mapbox-gl';

export const infoLayer = {

    /**
     * fetch data from Tile query API and draw icons on map
     * @infoLayerData {object} contains detailed info about features to draw
     * @MAPBOX_API {string} API key
     */
    async create({ infoLayerData, MAPBOX_API, map }) {
        const { lng, lat } = map.getCenter();

        if (infoLayerData.longitude === '' || !infoLayerData.longitude) infoLayerData.longitude = lng;
        if (infoLayerData.latitude === '' || !infoLayerData.latitude) infoLayerData.latitude = lat;

        const infoFeatures = await infoLayer.getData({ infoLayerData, MAPBOX_API });
        infoLayer.update.call(this, { infoLayerData, infoFeatures, map, MAPBOX_API });
    },

    /**
     * filter features by sub category
     * @infoLayerData {object} contains detailed info about features to draw
     * @infoFeatures {geoJSON} all features returned from API
     */
    update({ infoLayerData, infoFeatures, map, MAPBOX_API }) {
        // console.log({ infoLayerData, infoFeatures });

        const { visibleLayers } = infoLayerData;

        // Filter sub-categories
        const filterFeatures = (layer) => {
            const key = layer.selectionKey;

            const groups = layer && layer.icons
                ? Object.keys(layer.icons).map((d) => d)
                : [];

            /*
            ! Do we need to filter second query as well?
            */
            const selectedFeatures = layer.icons && groups.length > 0
                ? infoFeatures.features.filter((d) => groups.includes(d.properties[key]))
                : infoFeatures.features.filter((d) => d.properties.tilequery.layer === layer.layer);

            selectedFeatures.forEach((feature) => {
                addIconProperties({ layer, feature });
            });

            return selectedFeatures;
        };

        const addIconProperties = ({ layer, feature }) => {
            const key = layer.selectionKey;
            const iconKey = feature.properties[key];
            const icon = typeof key === 'undefined' ? `${layer.layer}.png` : `${iconKey}.png`;
            feature.icon = infoLayerData.infoIconPath + icon;
        };

        // Filter only if sub categories are defined + combine features
        const selectedFeatures = visibleLayers.map((layer) => filterFeatures(layer)).flat();
        infoLayer.drawMarker.call(this, { infoLayerData, selectedFeatures, map, MAPBOX_API });
    },

    /**
     * draw markers on screen
     * @selectedFeatures {geoJSON} array of features to be drawn on screen
     * @map {object} the MapBox map object
     */
    drawMarker({ infoLayerData, selectedFeatures, map, MAPBOX_API }) {
        infoLayer.removeMarker(map);

        const startLocation = `${infoLayerData.longitude},${infoLayerData.latitude}`;

        const centerPoint = () => {
            const el = document.createElement('div');
            el.className = 'center';
            el.style.backgroundImage = `url(${infoLayerData.infoIconPath}center.png)`;
            el.style.backgroundSize = '100%';

            new mapboxgl.Marker(el).setLngLat(startLocation.split(',')).addTo(map);
        };

        selectedFeatures.forEach((feature) => {
            const el = document.createElement('div');
            el.className = 'marker';
            el.style.backgroundImage = `url(${feature.icon})`;
            el.style.backgroundSize = '100%';

            el.addEventListener('click', (event) => {
                const properties = feature.properties;

                map.MapCCV.appState = {
                    type: 'user',
                    value: 'click',
                    message: `clicked on ${properties.name} (distance: ${Math.floor(properties.tilequery.distance)}m)`,
                    data: properties,
                };

                const endLocation = feature.geometry.coordinates;

                infoLayer.drawPath({ map, startLocation, endLocation, MAPBOX_API });
            });

            new mapboxgl.Marker(el).setLngLat(feature.geometry.coordinates).addTo(map);
        });

        centerPoint();
    },

    /*
    * remove all icons / markers
    */
    removeMarker(map) {
        const markers = document.querySelectorAll('div.marker');
        const center = document.querySelector('div.center');

        if (markers.length > 0) markers.forEach((d) => d.remove());
        if (center) center.remove();

        if (map.getLayer('route')) map.setLayoutProperty('route', 'visibility', 'none');
    },

    /**
     * draw features on screen
     * @selectedFeatures {geoJSON} array of features to be drawn on screen
     */
    async drawPath({ startLocation, endLocation, map, MAPBOX_API }) {
        const baseURL = 'https://api.mapbox.com/directions/v5/mapbox/walking/';
        const pathQuery = `${baseURL}${startLocation};${endLocation}?geometries=geojson&access_token=${MAPBOX_API}`;
        const pathInfo = await d3.json(pathQuery);

        const data = pathInfo.routes[0];
        const route = data.geometry.coordinates;
        const geojson = {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: route,
            },
        };

        // Reset route if already existing
        if (map.getSource('route')) {
            map.getSource('route').setData(geojson);
        } else {
            map.addLayer({
                id: 'route',
                type: 'line',
                source: {
                    type: 'geojson',
                    data: geojson,
                },
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round',
                },
                paint: {
                    'line-color': '#1c86a7',
                    'line-width': 5,
                    'line-opacity': 0.75,
                },
            });
        }

        map.setLayoutProperty('route', 'visibility', 'visible');
    },

    async getData({ infoLayerData, MAPBOX_API }) {
        const layers = infoLayerData.visibleLayers.map((d) => d.layer).join();
        const infoQuery = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/
        ${infoLayerData.longitude},${infoLayerData.latitude}.json?radius=${infoLayerData.radius}&limit=
        ${d3.min([infoLayerData.maxItems, 50])}&layers=${layers}&access_token=${MAPBOX_API}`;

        const loadData = async () => {
            const infoFeatures = await d3.json(infoQuery);

            infoFeatures.features.forEach((d, i) => console.log(i, d.properties));
            return infoFeatures;
        };

        return new Promise((resolve) => {
            resolve(loadData());
        });
    },
};
