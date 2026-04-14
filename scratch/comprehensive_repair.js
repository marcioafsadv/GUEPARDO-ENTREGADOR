import fs from 'fs';

const filePath = 'c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

// 1. Fix missing </div> and add case 'IDENTITY_VERIFICATION'
// We found that case 'HOME' return has 4 open divs (2912, 2920, 3015, 3240) but only 3 closures before the )}.
// We need to add one more </div>.

const index3258 = 3258; // App.tsx:3259 (0-indexed)
if (lines[index3258].trim() === ')}' && lines[index3258-1].trim() === '</div>' && lines[index3258-2].trim() === '</div>') {
    lines.splice(index3258, 0, '                  </div>');
}

// 2. Add case 'IDENTITY_VERIFICATION' around line 3324
// The code between 3324 and 3342 is currently dangling.
// We'll wrap it.

// Search for the unique string to find the identity block
const identityIndex = lines.findIndex(l => l.includes('Verificação de Identidade'));
if (identityIndex !== -1) {
    const startWrap = identityIndex - 2; // Roughly where the floating block starts
    // Let's find the </div> before it
    let blockStart = startWrap;
    while (blockStart > 0 && !lines[blockStart].includes('}')) blockStart--;
    blockStart++; // Point to the first dangling line

    lines.splice(blockStart, 0, "      case 'IDENTITY_VERIFICATION': {", "        return (");
    
    // Find where the returning block ends (should be before 'case WALLET')
    let walletIndex = lines.findIndex(l => l.includes("case 'WALLET':"));
    let blockEnd = walletIndex - 1;
    while (blockEnd > blockStart && !lines[blockEnd].includes(');')) blockEnd--;
    
    // Check if there's a dangling '}' after ');'
    if (lines[blockEnd + 1].trim() === '}') {
        // already has a brace?
    } else {
        lines.splice(blockEnd + 1, 0, "      }");
    }
}

// 3. Fix missing case 'ORDERS' and 'NOTIFICATIONS'
const ordersSearch = 'Como podemos te ajudar?'; // Unique string in what should be case 'ORDERS'
const ordersIndex = lines.findIndex(l => l.includes(ordersSearch));
if (ordersIndex !== -1) {
    // Find the return above it
    let returnIndex = ordersIndex;
    while (returnIndex > 0 && !lines[returnIndex].includes('return (')) returnIndex--;
    if (returnIndex > 0 && !lines[returnIndex-1].includes('case')) {
        lines.splice(returnIndex, 0, "      case 'ORDERS': {");
        // Add closing brace after the return block
        let nextReturn = lines.findIndex((l, i) => i > ordersIndex && l.includes('return ('));
        lines.splice(nextReturn - 1, 0, "      }");
    }
}

const notationsSearch = 'Avisos'; // Unique string in NOTIFICATIONS
const notationsIndex = lines.findIndex(l => l.includes(notationsSearch));
if (notationsIndex !== -1) {
    let returnIndex = notationsIndex;
    while (returnIndex > 0 && !lines[returnIndex].includes('return (')) returnIndex--;
    if (returnIndex > 0 && !lines[returnIndex-1].includes('case')) {
        lines.splice(returnIndex, 0, "      case 'NOTIFICATIONS': {");
        // Add closing brace
        let settingsIndex = lines.findIndex(l => l.includes("case 'SETTINGS':"));
        lines.splice(settingsIndex, 0, "      }");
    }
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Successfully applied comprehensive repairs to App.tsx.');
