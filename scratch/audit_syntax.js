const fs = require('fs');
const content = fs.readFileSync('c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx', 'utf8');

function checkImbalances(code) {
    const stack = [];
    const openers = { '{': '}', '(': ')', '[': ']' };
    const closers = { '}': '{', ')': '(', ']': '[' };
    let inString = false;
    let quoteChar = '';
    let jsxStack = [];
    
    // Simple naive parser
    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        
        if (!inString) {
            if (char === '"' || char === "'" || char === '`') {
                inString = true;
                quoteChar = char;
            } else if (openers[char]) {
                stack.push({ char, line: code.substring(0, i).split('\n').length });
            } else if (closers[char]) {
                if (stack.length === 0 || stack[stack.length - 1].char !== closers[char]) {
                    console.log(`Mismatch: found ${char} at line ${code.substring(0, i).split('\n').length} but stack is ${stack.slice(-1)[0]?.char}`);
                } else {
                    stack.pop();
                }
            }
        } else {
            if (char === quoteChar && code[i-1] !== '\\') {
                inString = false;
            }
        }
    }
    
    if (stack.length > 0) {
        console.log("Unclosed items:");
        stack.forEach(item => console.log(`${item.char} on line ${item.line}`));
    } else {
        console.log("Brackets/BracesBalanced!");
    }
}

checkImbalances(content);
