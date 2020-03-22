var L = require('leaflet');
const R = require('ramda');
var topojson = require('topojson');

import { 
  loadMapDataFiles, 
  getMapDictionaryFromTsvData, 
  addDictionaryValuesToTopoJson 
} from './topo';

import {
  getYearlyConstituencyData,
  generateHistograms
} from './histogram';

import {
  numberWithCommas
} from './util';

let selected = null;
let tsvData = [];

const generateMapAndTopo = (id, url) => {
  loadMapDataFiles(url)
    .then(files => {
      const data = getMapDictionaryFromTsvData(files.tsv,'PCON18CD', ['GrantValue', 'GrantCount']);    
      tsvData = files.tsv;
      files.topo.objects.wpc.geometries = addDictionaryValuesToTopoJson(files.topo.objects.wpc.geometries, data);
      const gradientLevels = getGradientLevels(data.GrantValue.mean, data.GrantValue.min, data.GrantValue.max);
      window.map = createMap(id, files.topo, gradientLevels);
    });
}



const createMap = (id, topoData, gradientLevels) => {  
  var southWest = L.latLng(62.337823495982036, 20.742675781250004),
      northEast = L.latLng(46.03401915864286, -24.444824218750004),
      bounds = L.latLngBounds(southWest, northEast),
      getColor = createColorFunction(gradientLevels),
      style = createStyleFunction(getColor)      ;

  var map = L.map(id , {
    maxBounds: bounds,
    maxBoundsViscosity: 1.0,
    minZoom: 5.1,
    maxZoom: 8
  }).setView([54.648412502316695, -2.3510742187500004], 
    window.innerWidth < 500
      ? 5.1
      : 6.1);

  const opUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    mbUrl = 'https://api.mapbox.com/styles/v1/markhammond/ck3k09fw719f11cqklot917bd/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoibWFya2hhbW1vbmQiLCJhIjoiY2prbnRiZWZnMmllODNwbXp5YXR5NWxxbyJ9.1a4LPkQiu-lbEP4dtC7xUA';

  L.tileLayer(mbUrl, {
      id: 'markhammond.ck3k09fw719f11cqklot917bd',
      attributionControl: false
  }).addTo(map);

  var data = topojson.feature(topoData,topoData.objects['wpc']);
  window.geojson = L.geoJson(data, {
    style: style,
    onEachFeature: onEachFeature
  }).addTo(map);

  window.info = L.control();

  info.onAdd = function (map) {
      this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
      this.update();
      return this._div;
  };

  // method that we will use to update the control based on feature properties passed
  info.update = function (props) {
      this._div.innerHTML =  (props ? 
          `<div class="map-card">
              <div>
                <h4>${props.name}</h4>
              </div>
              <div class="map-card__applications"><span>${numberWithCommas(props.GrantCount)}</span> applications</div>
              <br/>
              <span class="map-card__value">with a total value of £${numberWithCommas(Math.round(props.GrantValue / 100000)/10)}m</span>
            </span>`
          : '');
  };

  info.addTo(map);

  var legend = L.control({position: 'bottomright'});

  legend.onAdd = function (map) {

      let div = L.DomUtil.create('div', 'info legend'),
          labels = [];

      // loop through our density intervals and generate a label with a colored square for each interval
      for (let i = 0; i < gradientLevels.length; i++) {
          div.innerHTML +=
              '<span style="background:' + getColor(gradientLevels[i] + 1) + '"></span> £' +
              Math.round(gradientLevels[i]/1000000) + 
              (i === 0 
                ? 'm +<br>'
                : (gradientLevels[i - 1] 
                  ? 'm &ndash; £' + Math.round(gradientLevels[i-1]/1000000) + 'm' + '<br>' 
                  : '-'));

          if(!gradientLevels[i + 1])
            div.innerHTML +=
                '<span style="background:' + getColor(gradientLevels[i] - 1) + '"></span> £' +
                Math.round(gradientLevels[i]/1000000) + 'm -';
      }

      return div;
  };

  legend.addTo(map);

  document.querySelector('.map__sidebar_close')
    .addEventListener('click', () => {
      document.querySelector('.map__sidebar').classList.remove('show');
      selected = null;
    });

  return map;
}

const getGradientLevels = (mean, min, max) => {
  const diff = R.mean([(mean-min), (max-mean)])*0.0+R.min((mean-min), (max-mean))*1, //weighted slightly towards the peaks
  incr = diff/3;

  //console.log(mean, min, max, max-mean, mean-min);

  return [
    (min + incr*6),
    (min + incr*5),
    (min + incr*4),
    (min + incr*3),
    (min + incr*2),
    (min + incr),
  ]
}

const createColorFunction = (levels) => {
  const colors = ['#ffffb2','#fed976','#feb24c','#fd8d3c','#fc4e2a','#e31a1c','#b10026']
  
  return (d) => d > levels[0] ? colors[6] :
      d > levels[1] ? colors[5] :
      d > levels[2] ? colors[4] :
      d > levels[3] ? colors[3] :
      d > levels[4] ? colors[2] :
      d > levels[5] ? colors[1] :
                colors[0];
}

const createStyleFunction = (getColor) => {
  return (feature) => {
      return {
        fillColor: getColor(feature.properties.GrantValue),
        weight: 1,
        opacity: .5,
        color: '#888',
        fillOpacity: 1
      };
    }
}

function highlightFeature(e) {
  if (selected && selected !== e)
   return;

  var layer = e.target;
  if (window.currentTarget)
    resetHighlight(window.currentTarget)

  window.currentTarget = e;

  layer.setStyle({
      weight: 2,
      color: '#111',
      opacity: 1,
      fillOpacity: 1
  });

  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
      layer.bringToFront();
  }

  info.update(layer.feature.properties);
}

function resetHighlight(e) {
  geojson.resetStyle(e.target);
  info.update();
}

function zoomToFeature(e) {
  const histoData = getYearlyConstituencyData(e.target.feature.id)(tsvData);
  generateHistograms(histoData);

  document.querySelector('.map__sidebar').classList.add('show');

  map.fitBounds(e.target.getBounds());
  selected = e;
  highlightFeature(e);
  
}

function onEachFeature(feature, layer) {
  layer.on({
      mouseover: highlightFeature,
      //mouseout: resetHighlight,
      click: zoomToFeature
  });
}

export { generateMapAndTopo, createMap };