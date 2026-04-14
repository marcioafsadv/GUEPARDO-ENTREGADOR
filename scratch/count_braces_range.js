import fs from 'fs';
const content = fs.readFileSync('c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx', 'utf8');
const lines = content.split('\n');
const subContent = lines.slice(3791, 4179).join('\n');
let openCount = 0;
let closeCount = 0;
for (let char of subContent) {
  if (char === '{') openCount++;
  if (char === '}') closeCount++;
}
console.log(`Open: ${openCount}, Close: ${closeCount}`);
