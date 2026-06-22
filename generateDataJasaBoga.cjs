const fs = require('fs');

const rawData = JSON.parse(fs.readFileSync('excelData.json', 'utf-8'));
const sheetData = rawData['jasa boga Gol B'] || rawData['Sheet1'];

const criteria = [];
let currentCategory = '';
let currentMainText = '';

let idCounter = 1;

for (let i = 0; i < sheetData.length; i++) {
  const row = sheetData[i];
  if (!row || row.length === 0) continue;

  // Header detection
  if (row[1] && typeof row[1] === 'string' && row[1].match(/^[A-Z]$/) && row[2]) {
    currentCategory = row[2].trim();
    continue;
  }

  // Update currentMainText if there is a text in column 2 and no score
  // Or if there is a text in column 2 WITH a score, it becomes the main text too.
  if (row[2] && typeof row[2] === 'string') {
     currentMainText = row[2].trim();
  }

  const score = typeof row[4] === 'number' ? row[4] : (typeof row[3] === 'number' ? row[3] : 0);

  if (score > 0) {
    let text = row[3] && typeof row[3] === 'string' ? row[3].trim() : '';
    
    // If text is empty, it means the criteria is just currentMainText
    let finalDescription = '';
    if (text) {
       // if row[2] has text on the SAME line, use it
       if (row[2] && typeof row[2] === 'string') {
          finalDescription = row[2].trim() + " " + text;
       } else {
          finalDescription = currentMainText ? `${currentMainText} - ${text}` : text;
       }
    } else {
       finalDescription = currentMainText;
    }

    criteria.push({
      id: `jb_${idCounter++}`,
      text: finalDescription,
      score: score,
      category: currentCategory
    });
  }
}

let tsContent = `export interface IKLJasaBogaCriteria {\n  id: string;\n  text: string;\n  score: number;\n  category?: string;\n  suggestion?: string;\n}\n\nexport const IKL_JASA_BOGA_DATA: IKLJasaBogaCriteria[] = [\n`;

criteria.forEach(c => {
  tsContent += `  {\n    id: "${c.id}",\n    text: ${JSON.stringify(c.text)},\n    score: ${c.score},\n    category: ${JSON.stringify(c.category)},\n    suggestion: "Lakukan tindakan perbaikan."\n  },\n`;
});

tsContent += `];\n`;

fs.writeFileSync('pages/pengawasan/dataJasaBoga.ts', tsContent);
console.log('Generated pages/pengawasan/dataJasaBoga.ts, Total Points:', criteria.reduce((sum, c) => sum + c.score, 0));
