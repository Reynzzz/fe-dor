const xlsx = require('xlsx');
const fs = require('fs');

function extractData(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Read data as array of arrays
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    // Extract first column, convert to string, and pad to 5 digits if needed
    // Assuming bib is numeric, maybe string
    const bibs = [];
    for (let i = 0; i < data.length; i++) {
        if (data[i] && data[i][0] !== undefined) {
            let val = data[i][0].toString().trim();
            // Let's just keep the original string
            bibs.push(val);
        }
    }
    return bibs;
}

const allPrizes = extractData('src/data/all-doorprize.xlsx');
const kacamata = extractData('src/data/kacamata.xlsx');

fs.writeFileSync('src/data/all-doorprize.json', JSON.stringify(allPrizes, null, 2));
fs.writeFileSync('src/data/kacamata.json', JSON.stringify(kacamata, null, 2));

console.log("Written to json files:");
console.log("allPrizes count:", allPrizes.length);
console.log("kacamata count:", kacamata.length);
