import fs from 'fs';
const content = fs.readFileSync('c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx', 'utf8');
const lines = content.split('\n');
const subContent = lines.slice(3602, 3664).join('\n');
let openB = 0;
let closeB = 0;
for (let char of subContent) {
  if (char === '{') openB++;
  if (char === '}') closeB++;
}
console.log(`Open: ${openB}, Close: ${closeB}`);
