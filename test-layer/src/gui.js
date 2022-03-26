import * as dat from 'dat.gui';

export const GUI = {
    create({ payload, map }) {
        const gui = new dat.GUI();
        gui.open();
        gui.width = 250;

        // MAP SECTION
        const mapSection = gui.addFolder('Map');
        mapSection.close();

        mapSection
            .add(payload.map, 'style', { Light: 'light-v10', Dark: 'dark-v10' })
            .onChange((value) => {
                map.update({ property: 'style', value });
            });
        mapSection
            .add(payload.map, 'geoCenterType', {
                'Data Center': 'dataCenter', Manual: 'manual', 'Data Bound': 'dataBound',
            });
        mapSection
            .add(payload.map, 'geoCenterString');
        mapSection
            .add(payload.map, 'zoom');

        // ### DATA SECTION ###
        const dataSection = gui.addFolder('Data');
        dataSection.close();
        dataSection
            .add(payload.data, 'locationPath');

        // ### BUTTONS ###
        const actionSection = gui.addFolder('Actions');
        actionSection.open();

        // Fly-to zoom / center
        const sampleCenterValue = JSON.stringify({ zoom: 10, lat: -73.595, long: 45.488 });
        const customCenter = { sampleCenterValue };

        const flyBtn = { 'fly to center': () => {
            const center = payload.map.geoCenterString.split(',').map((d) => Number(d));
            map.flyToCenter({ center, zoom: payload.map.zoom });
        } };
        actionSection.add(flyBtn, 'fly to center');

        // Fly-to selected feature
        const flyToSelection = { 'fly to selected feature': () => {
            map.flyToSelectedFeature();
        } };
        actionSection.add(flyToSelection, 'fly to selected feature');

        // Fly-to custom feature
        const sampleFeatureValue = JSON.stringify({ id: 'zipData', key: 'CFSAUID', value: 'H2L' });
        const customFeature = { sampleFeatureValue };
        actionSection
            .add(customFeature, 'sampleFeatureValue');

        const flyToFeature = { 'fly to sample feature': () => {
            const JSONfeature = JSON.parse(customFeature.sampleFeatureValue);
            map.flyToFeature({ JSONfeature });
        } };
        actionSection.add(flyToFeature, 'fly to sample feature');
    },
};
