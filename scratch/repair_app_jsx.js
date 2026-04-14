import fs from 'fs';

const filePath = 'c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = `                    {status === DriverStatus.ARRIVED_AT_CUSTOMER && (
                      <>
                        {(['DINHEIRO', 'CASH', 'CARD', 'CARTAO', 'CARTÃO'].some(p => mission?.paymentMethod?.toUpperCase()?.includes(p)) || 
                          mission?.paymentMethod?.toUpperCase()?.includes('MAQUIN')) && (
                          <div className="mb-4 p-4 rounded-[24px] bg-[#FF6B00] border-2 border-white/20 shadow-xl animate-in slide-in-from-top duration-500">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                                <i className="fas \${\['DINHEIRO', 'CASH'\].includes\(mission.paymentMethod?.toUpperCase\(\) || ''\) ? 'fa-money-bill-1' : 'fa-credit-card'} text-white text-2xl"></i>
                              </div>
                              <div className="flex-1 text-left">
                                <p className="text-white font-black uppercase text-[10px] tracking-widest opacity-80 mb-0.5">
                                  Atenção: Cobrar do Cliente
                                </p>
                      </div>
                    </>
                  )}`;

// Note: The above target might be slightly off due to escaping or exact whitespace.
// I will use a regex to find the corrupted block.

const regex = /\{status === DriverStatus\.ARRIVED_AT_CUSTOMER && \(\s+<>\s+\{\(\['DINHEIRO', 'CASH', 'CARD', 'CARTAO', 'CARTÃO'\]\.some\(p => mission\?\.paymentMethod\?\.toUpperCase\(\)\?\.includes\(p\)\) \|\| \s+mission\?\.paymentMethod\?\.toUpperCase\(\)\?\.includes\('MAQUIN'\)\) && \(\s+<div className="mb-4 p-4 rounded-\[24px\] bg-\[#FF6B00\] border-2 border-white\/20 shadow-xl animate-in slide-in-from-top duration-500">\s+<div className="flex items-center space-x-3">\s+<div className="w-12 h-12 rounded-2xl bg-white\/20 flex items-center justify-center shrink-0">\s+<i className=\{`fas \${.*?\} text-white text-2xl`\}><\/i>\s+<\/div>\s+<div className="flex-1 text-left">\s+<p className="text-white font-black uppercase text-\[10px\] tracking-widest opacity-80 mb-0\.5">\s+Atenção: Cobrar do Cliente\s+<\/p>\s+<\/div>\s+<>\s+<\/}\s+.*?\)/s;

// Wait, the regex is too complex. I'll just use the line numbers and substring.

const lines = content.split('\n');
const startLine = 3188; // 0-indexed is 3188 (App.tsx:3189)
const endLine = 3204; // 0-indexed is 3204 (App.tsx:3205)

const replacement = `                    {status === DriverStatus.ARRIVED_AT_CUSTOMER && (
                      <>
                        {(['DINHEIRO', 'CASH', 'CARD', 'CARTAO', 'CARTÃO'].some(p => mission?.paymentMethod?.toUpperCase()?.includes(p)) || 
                          mission?.paymentMethod?.toUpperCase()?.includes('MAQUIN')) && (
                          <div className="mb-4 p-4 rounded-[24px] bg-[#FF6B00] border-2 border-white/20 shadow-xl animate-in slide-in-from-top duration-500">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                                <i className={\`fas \${['DINHEIRO', 'CASH'].includes(mission?.paymentMethod?.toUpperCase() || '') ? 'fa-money-bill-1' : 'fa-credit-card'} text-white text-2xl\`}></i>
                              </div>
                              <div className="flex-1 text-left">
                                <p className="text-white font-black uppercase text-[10px] tracking-widest opacity-80 mb-0.5">
                                  Atenção: Cobrar do Cliente
                                </p>
                                <h3 className="text-white text-2xl font-black leading-tight italic">
                                  R$ {(mission?.deliveryValue || 0).toFixed(2)}
                                </h3>
                                {['DINHEIRO', 'CASH'].includes(mission?.paymentMethod?.toUpperCase() || '') && (
                                  <div className="flex items-center space-x-1 mt-1">
                                    <div className="w-1 h-1 rounded-full bg-white animate-pulse"></div>
                                    <p className="text-white text-[9px] font-bold uppercase tracking-tighter opacity-90">
                                      Confira o troco e o dinheiro!
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className={\`p-4 rounded-[24px] border mb-4 transition-all chocolate-inner-card-v2 \${isCodeValid() ? 'border-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'border-white/5'}\`}>
                          <p className={\`text-[9px] font-black uppercase text-center mb-3 tracking-widest \${isCodeValid() ? 'text-green-500' : 'text-chocolate-muted'}\`}>
                            CÓDIGO DE ENTREGA (CONFIRMAR C/ CLIENTE):
                          </p>
                          <div className="flex justify-center space-x-2">
                            {[0, 1, 2, 3].map(i => (
                              <input
                                key={i}
                                ref={codeInputRefs[i]}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={typedCode[i] || ''}
                                onChange={(e) => handleCodeChange(i, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(i, e)}
                                className={\`w-11 h-14 rounded-xl text-center text-2xl font-black transition-all outline-none border-2 \${isCodeValid() ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-black/40 border-white/10 text-white focus:border-[#FF6B00] focus:shadow-[0_0_15px_rgba(255,107,0,0.2)]'}\`}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    )}`;

lines.splice(startLine, endLine - startLine + 1, replacement);
fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Successfully repaired App.tsx section.');
