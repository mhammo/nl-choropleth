const R = require('ramda');
const d3 = {
  ...require("d3-fetch"), 
  ...require("d3-geo"), 
  ...require("d3-queue")
};

const loadMapDataFiles = (url) => {
  const jsonUrl = 'topo_wpc.json'

  var promise = new Promise((resolve, reject) => {
    d3.json(jsonUrl)
      .then((topo) => {
        d3.tsv(url)
          .then((tsv) => {
            resolve({ topo, tsv });
          })
      })  
  });
  return promise;
}

const getMapDictionaryFromTsvData = (tsvData, key, valueKeys) => {
  const sumValuesByKey = (valueKeys, key, data) => R.reduce((rv, x) => {
    if (!rv.groupings[x[key]]) {
      rv.groupings[x[key]] = { GrantValue: 0, GrantCount: 0 }
    } 

    R.forEach((valKey) => {
      rv.groupings[x[key]][valKey] += parseInt(x[valKey]);
    }, valueKeys);

    return rv;
  }, { groupings: {} }, data),
  getMaximumAndMinimumValue = (valueKeys, groupedData) => R.reduce((data, prop) => { 
    if (Object.prototype.hasOwnProperty.call(data.groupings, prop)) {
      data = R.reduce((rv, x) => {
        rv[x] = rv[x] || {};
        rv[x]['list'] = rv[x]['list'] || [];
        rv[x]['max'] = R.max(rv['groupings'][prop][x], rv[x]['max'] || -9007199254740991);
        rv[x]['min'] = R.min(rv['groupings'][prop][x], rv[x]['min'] || 9007199254740991);
        rv[x]['list'].push(rv['groupings'][prop][x]);

        return rv;
      }, data, valueKeys)         
    }
    return data;
  }, groupedData, Object.keys(groupedData.groupings)),
  getMeanValues = (valueKeys, groupedData) => {
    R.forEach((valKey) => {
      //groupedData[valKey]['median'] = R.median(groupedData[valKey]['list']);
      groupedData[valKey]['mean'] = R.mean(groupedData[valKey]['list']);
      delete groupedData[valKey]['list'];
    }, valueKeys);

    return groupedData;
  },
  processMapData = R.compose(
    R.curry(getMeanValues)(valueKeys),
    R.curry(getMaximumAndMinimumValue)(valueKeys),
    R.curry(sumValuesByKey)(valueKeys, key)
  );
  
  return processMapData(tsvData);
}

const addDictionaryValuesToTopoJson = (geometries, data) => 
  R.map((item) => {
    item.properties.name = item.properties['PCON13NM'] || item.properties['PC_NAME'];

    if (data.groupings[item.id])
      R.forEach((prop) => { 
        if (data.groupings[item.id].hasOwnProperty(prop))
          item.properties[prop] = data.groupings[item.id][prop];
      }, Object.keys(data.groupings[item.id]));        

    return item;
  }, geometries);

export { 
  loadMapDataFiles, 
  getMapDictionaryFromTsvData, 
  addDictionaryValuesToTopoJson 
};