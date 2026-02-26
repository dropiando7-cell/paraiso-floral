const xlsx = require('xlsx');

const workbook = xlsx.readFile('D:\\sistemas-elim-app\\plantilla-concilia\\Inventario Activos IT - 20240906.xlsx');
const sheetNames = workbook.SheetNames;

const result = {};

sheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    if (data.length > 0) {
        result[sheetName] = data[0]; // first row is assumed to be headers
    } else {
        result[sheetName] = [];
    }
});

console.log(JSON.stringify(result, null, 2));
