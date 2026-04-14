import fs from 'fs';
const content = fs.readFileSync('c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx', 'utf8');
const lines = content.split('\n');
for (let i = 4181; i < 4275; i++) {
  const line = lines[i];
  let open = (line.match(/\(/g) || []).length;
  let close = (line.match(/\)/g) || []).length;
  if (open !== close) {
    console.log(`${i+1}: Open: ${open}, Close: ${close} -> ${line}`);
  }
}
