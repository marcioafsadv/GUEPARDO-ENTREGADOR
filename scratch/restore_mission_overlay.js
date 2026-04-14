import fs from 'fs';

const filePath = 'c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

const MISSION_OVERLAY = `
            {mission && status !== DriverStatus.ALERTING && (
              <div className="absolute bottom-0 left-0 right-0 z-[1001] flex">
                <div className={\`rounded-t-[40px] p-5 shadow-2xl border-t pb-24 transition-colors w-full flex flex-col overflow-hidden \${cardBg}\`}>

                  <div className="flex justify-between items-center mb-3 shrink-0">
                    <span className={\`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter italic \${status === DriverStatus.ARRIVED_AT_STORE || status === DriverStatus.PICKING_UP || status === DriverStatus.ARRIVED_AT_CUSTOMER ? 'bg-[#FFD700] text-black' : 'bg-[#FF6B00] text-white'}\`}>
                      {getStatusLabel(status)}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowMissionMapPicker(!showMissionMapPicker)}
                        className={\`px-3 h-9 rounded-xl flex items-center space-x-2 font-black text-[9px] uppercase transition-all active:scale-95 \${showMissionMapPicker ? 'bg-[#33CCFF] text-white' : \`\${innerBg} \${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-600'}\`}\`}
                      >
                        <i className="fas fa-location-arrow text-[10px]"></i>
                        <span>GPS</span>
                      </button>
                      <button
                        onClick={() => setShowDeliveryHelpModal(!showDeliveryHelpModal)}
                        className={\`px-3 h-9 rounded-xl flex items-center space-x-2 font-black text-[9px] uppercase transition-all active:scale-95 \${showDeliveryHelpModal ? 'bg-[#FF6B00] text-white' : \`\${innerBg} \${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-600'}\`}\`}
                      >
                        <i className="fas fa-circle-question text-[10px]"></i>
                        <span>Ajuda</span>
                      </button>
                      <button onClick={() => setShowSOSModal(true)} className={\`w-9 h-9 rounded-xl flex items-center justify-center text-red-500 \${innerBg}\`}><i className="fas fa-headset text-xs"></i></button>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 mb-4 pr-1">
                    {showMissionMapPicker && (
                      <div className={\`p-3 rounded-[20px] border border-white/5 flex justify-center space-x-8 \${innerBg}\`}>
                        <button onClick={() => openNavigation('waze')} className="flex flex-col items-center space-y-1 active:scale-90 transition-transform">
                          <div className="w-11 h-11 rounded-xl bg-[#33CCFF]/10 flex items-center justify-center text-[#33CCFF]"><i className="fab fa-waze text-xl"></i></div>
                          <span className="text-[8px] font-black text-[#33CCFF] uppercase">Waze</span>
                        </button>
                        <button onClick={() => openNavigation('google')} className="flex flex-col items-center space-y-1 active:scale-90 transition-transform">
                          <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500"><i className="fas fa-map-marked-alt text-xl"></i></div>
                          <span className="text-[8px] font-black text-green-500 uppercase">Maps</span>
                        </button>
                      </div>
                    )}

                    {showDeliveryHelpModal && (
                      <div className={\`p-4 rounded-[20px] border border-white/5 space-y-3 \${innerBg} animate-in fade-in slide-in-from-top-2 mb-3\`}>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className={\`text-xs font-black uppercase tracking-widest \${textPrimary}\`}>Central de Ajuda</h3>
                          <button onClick={() => { setShowDeliveryHelpModal(false); setActiveHelpOption(null); }} className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400"><i className="fas fa-times text-[10px]"></i></button>
                        </div>

                        {activeHelpOption === null ? (
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => setActiveHelpOption('customer_not_found')}
                              className={\`p-3 rounded-xl border flex flex-col items-center text-center space-y-2 active:scale-95 transition-all \${theme === 'dark' ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-200 bg-white'}\`}
                            >
                              <div className="w-10 h-10 rounded-full bg-[#FF6B00]/10 flex items-center justify-center text-[#FF6B00]"><i className="fas fa-user-slash"></i></div>
                              <span className={\`text-[10px] font-bold \${textPrimary}\`}>Cliente não localizado</span>
                            </button>
                            <button
                              onClick={() => setActiveHelpOption('talk_to_store')}
                              className={\`p-3 rounded-xl border flex flex-col items-center text-center space-y-2 active:scale-95 transition-all \${theme === 'dark' ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-200 bg-white'}\`}
                            >
                              <div className="w-10 h-10 rounded-full bg-[#FFD700]/10 flex items-center justify-center text-[#FFD700]"><i className="fas fa-store"></i></div>
                              <span className={\`text-[10px] font-bold \${textPrimary}\`}>Falar com Lojista</span>
                            </button>
                          </div>
                        ) : activeHelpOption === 'customer_not_found' ? (
                          <div className="space-y-3 animate-in slide-in-from-right">
                            <p className={\`\${textMuted} text-[10px]\`}>Envie uma mensagem direta para o cliente:</p>
                            <textarea
                              value={customerMessage}
                              onChange={(e) => setCustomerMessage(e.target.value)}
                              placeholder="Olá, estou em frente ao endereço mas não encontrei ninguém..."
                              className={\`w-full h-20 rounded-xl p-3 text-xs outline-none resize-none border focus:border-[#FF6B00] \${theme === 'dark' ? 'bg-black text-white border-zinc-700' : 'bg-white text-black border-zinc-300'}\`}
                            />
                            <div className="flex space-x-2">
                              <button onClick={() => setActiveHelpOption(null)} className={\`flex-1 h-10 rounded-xl font-bold text-xs uppercase \${textMuted} border border-transparent hover:border-zinc-700\`}>Voltar</button>
                              <button onClick={handleSendCustomerMessage} className="flex-[2] h-10 bg-[#FF6B00] rounded-xl font-black text-white text-xs uppercase shadow-lg flex items-center justify-center space-x-2">
                                <i className="fab fa-whatsapp"></i>
                                <span>Enviar Mensagem</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3 animate-in slide-in-from-right text-center">
                            <p className={\`\${textMuted} text-[10px]\`}>Número do Lojista:</p>
                            <p className={\`text-xl font-black \${textPrimary} mb-2\`}>{mission.storePhone}</p>
                            <div className="flex space-x-2">
                              <button onClick={() => setActiveHelpOption(null)} className={\`flex-1 h-10 rounded-xl font-bold text-xs uppercase \${textMuted} border border-transparent hover:border-zinc-700\`}>Voltar</button>
                              <button onClick={handleCallStore} className="flex-[2] h-10 bg-[#FFD700] rounded-xl font-black text-black text-xs uppercase shadow-lg flex items-center justify-center space-x-2">
                                <i className="fas fa-phone"></i>
                                <span>Ligar Agora</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="px-1">
                      <h3 className={\`text-lg font-black leading-tight \${textPrimary}\`}>
                        {status.includes('STORE') || status === DriverStatus.PICKING_UP ? mission.storeName : mission.customerName}
                      </h3>
                      <p className={\`\${textMuted} text-[11px] mt-0.5 leading-snug line-clamp-2\`}>
                        {status.includes('STORE') || status === DriverStatus.PICKING_UP ? mission.storeAddress : mission.customerAddress}
                      </p>
                    </div>

                    {status === DriverStatus.ARRIVED_AT_STORE && (
                      <div className={\`p-4 rounded-[24px] border border-dashed flex items-center space-x-4 transition-all duration-500 \${isOrderReady ? 'bg-[#FFD700]/10 border-[#FFD700]/40' : \`\${theme === 'dark' ? 'bg-zinc-800/30 border-zinc-700' : 'bg-zinc-100 border-zinc-300'}\`}\`}>
                        <div className={\`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors \${isOrderReady ? 'bg-[#FFD700]/20' : 'bg-[#FF6B00]/10'}\`}>
                          <i className={\`fas \${isOrderReady ? 'fa-check-double text-[#FFD700] blink-soft' : 'fa-utensils text-[#FF6B00] animate-pulse'} text-xl\`}></i>
                        </div>
                        <div className="flex-1">
                          <h4 className={\`text-xs font-black uppercase italic \${textPrimary}\`}>
                            {isOrderReady ? 'Retire no Balcão' : 'Aguarde o Lojista'}
                          </h4>
                          <p className={\`\${textMuted} text-[9px] font-bold uppercase tracking-widest mt-0.5\`}>ID: {mission.id}</p>
                        </div>
                      </div>
                    )}

                    {status === DriverStatus.PICKING_UP && (
                      <div className="relative overflow-hidden rounded-[28px] border-2 border-dashed border-[#FF6B00]/40 bg-[#FF6B00]/5 p-6 flex flex-col items-center text-center animate-in zoom-in duration-300">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF6B00] to-transparent opacity-50"></div>

                        <div className="mb-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF6B00] mb-2">Mostre ao Atendente</p>
                          <div className="flex items-center justify-center space-x-3 mb-1">
                            <i className="fas fa-ticket text-3xl text-[#FFD700]"></i>
                            <span className={\`text-6xl font-black italic tracking-tighter \${textPrimary}\`}>{mission.collectionCode}</span>
                          </div>
                        </div>

                        <div className="w-full h-px bg-[#FF6B00]/20 mb-4"></div>

                        <div className="flex flex-col items-center">
                          <p className={\`\${textMuted} text-[9px] font-black uppercase tracking-widest mb-1\`}>Cliente</p>
                          <h2 className={\`text-2xl font-black \${textPrimary} line-clamp-1\`}>{mission.customerName}</h2>
                        </div>
                      </div>
                    )}

                    {status === DriverStatus.ARRIVED_AT_CUSTOMER && (
                      <div className={\`p-4 rounded-[24px] border mb-4 transition-all \${isCodeValid() ? 'bg-green-500/10 border-green-500/40' : 'bg-white/5 border-white/5'}\`}>
                        <p className={\`text-[9px] font-black uppercase text-center mb-3 tracking-widest \${isCodeValid() ? 'text-green-500' : textMuted}\`}>
                          CÓDIGO DE ENTREGA (4 DÍGITOS DO CELULAR):
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
                              className={\`w-11 h-14 rounded-xl text-center text-2xl font-black transition-all outline-none border-2 \${isCodeValid() ? 'bg-green-500/20 border-green-500 text-green-500' : \`\${innerBg} border-white/10 text-white focus:border-[#FF6B00]\`}\`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 w-full">
                    <HoldToFillButton
                      onConfirm={handleMainAction}
                      label={
                        status === DriverStatus.GOING_TO_STORE ? 'Segure p/ Chegar na Loja' :
                          status === DriverStatus.ARRIVED_AT_STORE ? (isOrderReady ? 'Segure p/ Iniciar Saída' : 'Aguardando Preparo...') :
                            status === DriverStatus.PICKING_UP ? 'Segure p/ Confirmar Coleta' :
                              status === DriverStatus.GOING_TO_CUSTOMER ? 'Segure p/ Chegar no Cliente' :
                                'Segure p/ Finalizar Entrega'
                      }
                      disabled={(status === DriverStatus.ARRIVED_AT_CUSTOMER) && !isCodeValid()}
                      color={status === DriverStatus.ARRIVED_AT_STORE || status === DriverStatus.PICKING_UP || status === DriverStatus.ARRIVED_AT_CUSTOMER ? '#FFD700' : '#FF6B00'}
                      icon={(status === DriverStatus.ARRIVED_AT_CUSTOMER && isCodeValid()) || status === DriverStatus.PICKING_UP ? 'fa-check' : 'fa-chevron-right'}
                      fillDuration={1500}
                    />
                  </div>
                </div>
              </div>
            )}`;

// Find the line after the map block (which ends with '            )}' at level 4)
const mapEndIndex = lines.findIndex(l => l.includes('            )}') && l.length < 15);

if (mapEndIndex !== -1) {
    console.log('Inserting mission overlay at line', mapEndIndex + 2);
    lines.splice(mapEndIndex + 1, 0, MISSION_OVERLAY);
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log('Successfully restored mission overlay.');
} else {
    console.error('Could not find map block closure.');
}
