import Plotly from 'plotly.js-dist';
const R = require('ramda');

/**
 * Does the entry belong to the constituency ID provided?
 * @param {string} constituencyCode 
 * @param {Object} entry 
 */
const isInConstituency = (constituencyCode, entry) => entry['PCON18CD'] === constituencyCode;

/**
 * Groups an array of data containing the fields Year, GrantValue and GrantCount by the Year field. The other two fields must be numeric
 * @param {Array} data 
 */
const groupByYear = (data) => R.reduce((acc, x) => {
  acc[x.Year] = acc[x.Year] || { value: 0, count: 0 };
  acc[x.Year].value += parseInt(x.GrantValue);
  acc[x.Year].count += parseInt(x.GrantCount);

  return acc;
}, {}, data);

/**
 * Takes a dictionary object (i.e. an object with a set of lookup keys containing tabular data), and unstacks it into an array. 
 * @param {String} colName The name you want the dictionary key value to be stored under
 * @param {Object} dict The dictionary object
 */
const unstackDictionary = (colName, dict) => R.reduce((rv, prop) => { 
  if (Object.prototype.hasOwnProperty.call(dict, prop)) {
    const entry = { value: dict[prop].value, count: dict[prop].count };
    entry[colName] = parseInt(prop);
    
    rv.push(entry);
  }
  return rv;
}, [], Object.keys(dict))


/**
 * Creates a function for extracting constituency data, and aggregating it by year for a histogram
 * @param {string} constituencyCode 
 */
const getYearlyConstituencyData = (constituencyCode) => R.compose(
    R.curry(unstackDictionary)('year'),
    groupByYear,
    R.filter(R.curry(isInConstituency)(constituencyCode))
  );


const generateHistograms = (data) => {
  var sharedLayout = {
    height: 300,
    bargap: 0.05, 
    bargroupgap: 0.2, 
    barmode: "overlay",
    xaxis: {
      title: {
        text: "Year",
        font: {
          size: 12
        }
      }
    }
  },
  valueLayout = {
    title: { 
      text: "<b>Grant Value by Year</b>",
      font: {
        size: 14,
      },
    }, 
    yaxis: {
      title: {
        text: "Value",
        font: {
          size: 12
        }
      }
    },
    ...sharedLayout
  },
  countLayout = {
    title: { 
      text: "<b>Grant Applications by Year</b>",
      font: {
        size: 14,
      },
    },
    yaxis: {
      title: {
        text: "Count",
        font: {
          size: 12
        }
      }
    },
    ...sharedLayout
  },
  sharedTrace = {
    x: R.map(x => x.year, data),
    marker: {
      color: "rgba(20, 40, 115, 0.7)", 
      line: {
        color:  "rgb(20, 40, 115)", 
        width: 1
      }
    },  
    opacity: 0.7, 
    type: "bar"
  },
  valueTrace = {
    y: R.map(x => x.value, data),
    ...sharedTrace
  },
  countTrace = {
    y: R.map(x => x.count, data),
    ...sharedTrace
  };

  Plotly.newPlot('valueHistogram', [valueTrace], valueLayout, {responsive: true, displayModeBar: false});
  Plotly.newPlot('countHistogram', [countTrace], countLayout, {responsive: true, displayModeBar: false});
}

export { getYearlyConstituencyData, generateHistograms };