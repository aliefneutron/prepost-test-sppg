const xlsx = require('xlsx');
const fs = require('fs');

const workbook = xlsx.readFile('IKL Jasa Boga Permen 17 2024.xlsx');
const sheetNameList = workbook.SheetNames;
console.log('Sheets:', sheetNameList);

const allData = {};
for (const sheet of sheetNameList) {
  allData[sheet] = xlsx.utils.sheet_to_json(workbook.Sheets[sheet], { header: 1 });
}

fs.writeFileSync('excelData.json', JSON.stringify(allData, null, 2));
console.log('Saved to excelData.json');
