import fs from 'fs';
const content = fs.readFileSync('c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx', 'utf8');
const lines = content.split('\n');
let openB = 0;
let closeB = 0;
let openP = 0;
let closeP = 0;
let openD = 0;
let closeD = 0;
for (let i = 2709; i < 4182; i++) {
  const line = lines[i];
  openB += (line.match(/{/g) || []).length;
  closeB += (line.match(/}/g) || []).length;
  openP += (line.match(/\(/g) || []).length;
  closeP += (line.match(/\)/g) || []).length;
  openD += (line.match(/<div/g) || []).length;
  closeD += (line.match(/<\/div>/g) || []).length;
}
console.log(`Braces: ${openB}/${closeB}`);
console.log(`Parens: ${openP}/${closeP}`);
console.log(`Divs: ${openD}/${closeD}`);
