const csv = require('csv-parser');
const fs = require('fs');

function sanitize(obj) {
  for (const [key, value] of Object.entries(obj)) {
    if (['years', 'congress'].includes(key)) {
      continue;
    }
    obj[key] = parseInt(value === '-' ? 0 : value, 10);
  }
}

function tableRow(cols) {
  return process.stdout.write(cols.join(' | ') + '\n');
}

const average = (arr) => arr.reduce((sum, value) => sum + value, 0) / arr.length;

const findAllIndexes = (value, array) => array.reduce((acc, elem, index) => { if (elem == value) acc.push(index); return acc; }, []);

const calculateStats = (arr, attribute) => {
  const data = arr.map(val => val[attribute]);
  const mean = average(data);
  const sortedData = data.slice().sort((a, b) => a - b);
  let median;
  let medianIndex;
  if (data.length % 2 == 1) {
    const lowerIndex = Math.trunc(data.length / 2);
    median = (data[lowerIndex] + data[lowerIndex + 1])/2;
    medianIndex = -1;
  } else {
    medianIndex = data.length / 2;
    median = data[medianIndex];
  }
  const std = Math.sqrt(average(data.map(val => (val - mean)*(val - mean))));
  const min = sortedData[0];
  const minIndexes = findAllIndexes(min, data);

  return {
    mean,
    median,
    medianIndex,
    min,
    minIndexes,
    std
  };
}

const results = [];
fs.createReadStream('parties.csv')
.pipe(csv({ mapHeaders: ({ header}) => header.toLowerCase() }))
.on('data', (datum) => {
  results.push(datum)
})
.on('end', () => {
  console.log(`end results length = ${results.length}`);
  let ind;
  // 0 is the row of headers.
  const data = [];
  sanitize(results[1]);
  for (ind = 2; ind < results.length; ind++) {
    sanitize(results[ind]);
    results[ind].sizeDelta = results[ind].total - results[ind - 1].total;
    const majorityParty = results[ind - 1].dems > results[ind - 1].reps ? 'dems' : 'reps';
    if (results[ind - 1].dems === results[ind - 1].reps) {
      console.log(`abberation ${results[ind].years}`);
    }
    results[ind].delta = results[ind][majorityParty] - results[ind - 1][majorityParty];
    results[ind].deltaP = results[ind].delta / results[ind][majorityParty];
    results[ind].majorityParty = majorityParty;
    const isMidterm = ind%2 === 0;
    data.push({ isMidterm, ...results[ind] });
  }
  const midTerms = data.filter(elem => elem.isMidterm);
  const stats = calculateStats(data, 'delta');
  const midStats = calculateStats(midTerms, 'delta');
  const data1929 = data.filter(elem => elem.years >= "1929-1931");
  const stats1929 = calculateStats(data1929, 'delta');
  const midterms1929 = data.filter(elem => elem.isMidterm && elem.years >= "1929-1931");
  const midStats1929 = calculateStats(midterms1929, 'delta');
  console.log(`overall: mean = ${stats.mean.toFixed(2)} std = ${stats.std.toFixed(4)} median = ${stats.median} min = ${stats.min}`);
  console.log(`midterm: mean = ${midStats.mean.toFixed(2)} std = ${midStats.std.toFixed(4)} median = ${midStats.median} min = ${midStats.min}`);
  console.log(`overall since 1929: mean = ${stats1929.mean.toFixed(2)} std = ${stats1929.std.toFixed(4)} median = ${stats1929.median} min = ${stats1929.min}`);
  console.log(`midterm since 1929: mean = ${midStats1929.mean.toFixed(2)} std = ${midStats1929.std.toFixed(4)} median = ${midStats1929.median} min = ${midStats1929.min}`);
  process.stdout.write('a - overall min\n');
  process.stdout.write('b - midterm min\n');
  process.stdout.write('c - overall min since 1929\n');
  process.stdout.write('d - midterm min since 1929\n');
  tableRow(['Midterm?', 'Years', 'Size Change', 'Majority Party Last Year', 'Abs Delta', 'Percentage Delta']);
  tableRow(['---', '---', '---', '---', '---', '---']);
  // Finde mins relatve to the data source we are iterating over
  const dataValues = data.map(elem => elem.delta);
  stats.minIndexes = findAllIndexes(stats.min, dataValues);
  midStats.minIndexes = findAllIndexes(midStats.min, dataValues);
  stats1929.minIndexes = findAllIndexes(stats1929.min, dataValues);
  midStats1929.minIndexes = findAllIndexes(midStats1929.min, dataValues);
  data.forEach((datum, index) => {
    const subscripts = [];
    if (stats.minIndexes.indexOf(index) != -1) subscripts.push('a');
    if (midStats.minIndexes.indexOf(index) != -1) subscripts.push('b');
    if (stats1929.minIndexes.indexOf(index) != -1) subscripts.push('c');
    if (midStats1929.minIndexes.indexOf(index) != -1) subscripts.push('d');
    let years = datum.years;
    if (subscripts.length !== 0) {
      years = `${years}<sub>${subscripts.join('')}</sub>`;
    }
    tableRow([datum.isMidterm, years, datum.sizeDelta, datum.majorityParty, datum.delta, (datum.deltaP * 100).toFixed(2)]);
  });
});
