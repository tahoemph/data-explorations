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
  tableRow(['Midterm?', 'Years', 'Size Change', 'Majority Party Last Year', 'Abs Delta', 'Percentage Delta']);
  tableRow(['---', '---', '---', '---', '---', '---']);
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
    const isMidterm = ind%2 === 1;
    tableRow([isMidterm, results[ind].years, results[ind].sizeDelta, results[ind].majorityParty, results[ind].delta, (results[ind].deltaP * 100).toFixed(2)]);
  }
});
