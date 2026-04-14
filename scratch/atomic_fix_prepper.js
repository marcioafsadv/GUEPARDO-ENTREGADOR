
import fs from 'fs';

const filePath = 'c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Segment definitions (Indices are 0-based)
const startRenderScreen = 2710 - 1; 
const endRenderScreen = 4210 - 1;

// Reconstructing Segment 1 (HOME Case)
// I will ensure this part is PERFECTLY balanced.

const newHomeCase = `      case 'HOME': {
        return (
          <div className="flex flex-col h-full relative overflow-hidden">
            <div className="flex-1 relative">
              {isNavigating ? (
                <MapNavigation
                  status={status}
                  theme={mapTheme}
                  onUpdateMetrics={(m) => setNavMetrics(m)}
                  destinationAddress={
                    (status === DriverStatus.GOING_TO_STORE || status === DriverStatus.ARRIVED_AT_STORE || status === DriverStatus.PICKING_UP || status === DriverStatus.READY_FOR_PICKUP || status === DriverStatus.RETURNING)
                      ? mission?.storeAddress || null
                      : mission?.customerAddress || null
                  }
                  currentLocation={currentLocation}
                  preloadedDestination={
                    (status === DriverStatus.GOING_TO_STORE || status === DriverStatus.ARRIVED_AT_STORE || status === DriverStatus.PICKING_UP || status === DriverStatus.READY_FOR_PICKUP || status === DriverStatus.RETURNING)
                      ? preloadedCoords.store
                      : preloadedCoords.customer
                  }
                />
              ) : (
                <MapLeaflet
                  key={mapCenterKey}
                  status={status}
                  theme={mapTheme}
                  showRoute={(status !== DriverStatus.OFFLINE && status !== DriverStatus.ONLINE)}
                  destinationAddress={
                    status === DriverStatus.ALERTING
                      ? mission?.customerAddress
                      : (status === DriverStatus.GOING_TO_STORE || status === DriverStatus.ARRIVED_AT_STORE || status === DriverStatus.PICKING_UP || status === DriverStatus.READY_FOR_PICKUP || status === DriverStatus.RETURNING)
                        ? mission?.storeAddress
                        : (status === DriverStatus.GOING_TO_CUSTOMER || status === DriverStatus.ARRIVED_AT_CUSTOMER)
                          ? mission?.customerAddress
                          : null
                  }
                  pickupAddress={status === DriverStatus.ALERTING ? mission?.storeAddress : null}
                  preloadedDestinationLat={
                    (status === DriverStatus.GOING_TO_STORE || status === DriverStatus.ARRIVED_AT_STORE || status === DriverStatus.PICKING_UP || status === DriverStatus.READY_FOR_PICKUP || status === DriverStatus.RETURNING)
                      ? preloadedCoords.store?.lat
                      : (status === DriverStatus.GOING_TO_CUSTOMER || status === DriverStatus.ARRIVED_AT_CUSTOMER)
                        ? preloadedCoords.customer?.lat
                        : null
                  }
                  preloadedDestinationLng={
                    (status === DriverStatus.GOING_TO_STORE || status === DriverStatus.ARRIVED_AT_STORE || status === DriverStatus.PICKING_UP || status === DriverStatus.RETURNING)
                      ? preloadedCoords.store?.lng
                      : (status === DriverStatus.GOING_TO_CUSTOMER || status === DriverStatus.ARRIVED_AT_CUSTOMER)
                        ? preloadedCoords.customer?.lng
                        : null
                  }
                  missions={activeMissions}
                  showHeatMap={showHeatMap}
                  mapMode={mapMode}
                  showTraffic={showTraffic}
                  reCenterTrigger={reCenterTrigger}
                  currentLocation={currentLocation}
                />
              )}

              {/* Speedometer */}
              {([
                DriverStatus.GOING_TO_STORE,
                DriverStatus.ARRIVED_AT_STORE,
                DriverStatus.PICKING_UP,
                DriverStatus.GOING_TO_CUSTOMER,
                DriverStatus.ARRIVED_AT_CUSTOMER,
                DriverStatus.RETURNING
              ].includes(status) && currentLocation && !isNavigating) && (
                <div 
                  className="absolute left-4 z-[1002]" 
                  style={{ 
                    bottom: isMissionExpanded ? 'calc(100vh - 100px)' : '140px',
                    transition: 'bottom 0.3s ease-out'
                  }}
                >
                  <div
                    className="flex flex-col items-center justify-center rounded-2xl shadow-2xl border"
                    style={{
                      width: 72,
                      height: 72,
                      background: 'rgba(18,18,18,0.92)',
                      borderColor: 'rgba(255,107,0,0.35)',
                      boxShadow: '0 0 18px 4px rgba(255,107,0,0.18), 0 4px 16px rgba(0,0,0,0.5)',
                      backdropFilter: 'blur(16px)'
                    }}
                  >
                    <span
                      className="font-black leading-none tabular-nums"
                      style={{
                        fontSize: 26,
                        color: '#FF6B00',
                        textShadow: '0 0 12px rgba(255,107,0,0.7)'
                      }}
                    >
                      {currentLocation.speed != null ? Math.round(currentLocation.speed * 3.6) : 0}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>km/h</span>
                  </div>
                </div>
              )}

              <div className="absolute right-4 bottom-24 flex flex-col space-y-3 z-[1001]">
                <button
                  onClick={() => setShowFiltersModal(true)}
                  className={"w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center text-[#FF6B00] border active:scale-90 transition-transform relative " + cardBg}
                >
                  <i className="fas fa-sliders text-lg"></i>
                  {isFilterActive && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-black"></div>}
                </button>

                <button
                  onClick={() => setShowLayersModal(true)}
                  className={"w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center border active:scale-90 transition-transform " + cardBg + " " + (showHeatMap || showTraffic || mapMode === 'satellite' ? 'text-[#FF6B00] border-[#FF6B00]/30' : textMuted)}
                >
                  <i className="fas fa-layer-group text-lg"></i>
                </button>

                <button onClick={() => setReCenterTrigger(t => t + 1)} className={"w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center text-[#FF6B00] border active:scale-90 transition-transform " + cardBg}>
                  <i className="fas fa-location-crosshairs text-lg"></i>
                </button>

                <button
                  onClick={() => setMapTheme(t => t === 'dark' ? 'light' : 'dark')}
                  className={"w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center border active:scale-90 transition-all duration-300 " + cardBg + " " + (mapTheme === 'light' ? 'text-yellow-400 border-yellow-400/30' : 'text-blue-400 border-blue-400/30')}
                >
                  <i className={`fas ${mapTheme === 'light' ? 'fa-sun' : 'fa-moon'} text-lg`}></i>
                </button>

                <button onClick={() => { playClick(); setShowSOSModal(true); }} className={"w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center text-red-500 border active:scale-90 transition-transform " + cardBg}>
                  <i className="fas fa-shield-heart text-lg"></i>
                </button>
              </div>
            </div>

            {status !== DriverStatus.ALERTING && !mission && (
              <div className={"absolute bottom-0 left-0 right-0 z-[1001] transition-all duration-500 transform " + (isResumoExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-4.5rem)]')}>
                <div className="p-8 pb-20 rounded-t-[40px] shadow-[0_-20px_60px_rgba(0,0,0,0.6)] border-t border-white/5 bg-[#0f0502]/95 backdrop-blur-xl">
                  <div onClick={() => setIsResumoExpanded(!isResumoExpanded)} className="w-full py-4 cursor-pointer mb-2">
                    <div className="w-16 h-1.5 bg-[#FF6B00]/20 rounded-full mx-auto shadow-[0_0_10px_rgba(255,107,0,0.1)]"></div>
                  </div>

                  <div className="mb-6 flex justify-between items-end">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#FF6B00]/10 flex items-center justify-center border border-[#FF6B00]/20">
                        <i className="fas fa-wallet text-[#FF6B00] text-xl"></i>
                      </div>
                      <div>
                        <h3 className="text-2xl font-black italic tracking-tighter text-white">Seus Ganhos</h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-chocolate-muted">Resumo de Hoje</p>
                      </div>
                    </div>
                    <button onClick={() => setCurrentScreen('WALLET')} className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-[#FF6B00] hover:bg-[#FF6B00]/10 transition-all active:scale-95">Painel Completo</button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 rounded-[32px] border chocolate-inner-card-v2 bg-[#1a0c06] flex flex-col justify-center relative overflow-hidden group">
                      <p className="text-chocolate-muted text-[9px] font-black uppercase tracking-widest mb-1.5">Faturamento</p>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-sm font-black text-[#FF6B00]/60">R$</span>
                        <p className="text-3xl font-black italic tracking-tighter text-white">
                          {showBalance ? (dailyEarnings || 0).toFixed(2) : '••••'}
                        </p>
                      </div>
                      <button onClick={() => setShowBalance(!showBalance)} className="absolute right-4 top-4 text-chocolate-muted/40 hover:text-[#FF6B00] transition-colors">
                        <i className={`fas ${showBalance ? 'fa-eye' : 'fa-eye-slash'} text-xs`}></i>
                      </button>
                    </div>

                    <div className="p-6 rounded-[32px] border chocolate-inner-card-v2 bg-[#1a0c06] space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-white/5">
                        <span className="text-chocolate-muted text-[8px] font-black uppercase tracking-widest">Métricas</span>
                        <i className="fas fa-chart-line text-[#00FF94] text-[10px]"></i>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-chocolate-muted text-[8px] font-black uppercase">Finalizadas</span>
                        <span className="font-black text-xs text-[#00FF94]">{dailyStats.finished}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-chocolate-muted text-[8px] font-black uppercase">Taxa Aceite</span>
                        <span className="font-black text-xs text-[#FF6B00]">
                          {dailyStats.accepted + dailyStats.rejected > 0 
                            ? Math.round((dailyStats.accepted / (dailyStats.accepted + dailyStats.rejected)) * 100) + '%'
                            : '100%'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {mission && status !== DriverStatus.ALERTING && (
              <div 
                className="absolute bottom-0 left-0 right-0 z-[1001] chocolate-bottom-panel"
                style={{ 
                  transform: 'translateY(' + (!isMissionExpanded ? 'calc(100% - 85px + ' + dragY + 'px)' : dragY + 'px') + ')',
                  touchAction: 'none',
                  willChange: 'transform'
                }}
              >
                <div className="rounded-t-[40px] p-5 shadow-[0_-20px_60px_rgba(0,0,0,0.6)] border-t border-white/5 w-full flex flex-col overflow-hidden bg-[#0f0502]/95 backdrop-blur-xl">
                  <div 
                    onMouseDown={handleTouchStart}
                    onTouchStart={handleTouchStart}
                    className="w-full py-2 cursor-grab active:cursor-grabbing mb-0 group"
                  >
                    <div className="w-12 h-1 bg-[#FF6B00]/20 rounded-full mx-auto group-hover:bg-[#FF6B00]/40 transition-colors shadow-[0_0_8px_rgba(255,107,0,0.1)]"></div>
                  </div>

                  <div className="flex justify-between items-center mb-3 shrink-0">
                    {!isMissionExpanded ? (
                      <div className="flex flex-col w-full px-1 cursor-pointer" onClick={() => setIsMissionExpanded(true)}>
                        {isNavigating ? (
                           <div className="flex flex-col items-center justify-center w-full py-2">
                              <h3 className="font-black text-[10px] uppercase tracking-[0.2em] mb-1.5 text-chocolate-muted">Entrega em andamento</h3>
                              <div className="flex items-center gap-2 bg-[#FF6B00]/10 px-4 py-1.5 rounded-full border border-[#FF6B00]/20 shadow-[inset_0_0_10px_rgba(255,107,0,0.05)]">
                                <div className="neon-orange-pulsing-dot"></div>
                                <span className="text-[#FF6B00] text-[13px] font-black italic">Chegada: {navMetrics?.time || '--'}</span>
                              </div>
                           </div>
                        ) : (
                          <>
                             <div className="flex flex-col items-center justify-center w-full mb-3">
                               <h3 className="font-bold text-[14px] leading-tight mb-1 text-chocolate-primary">
                                 {status === DriverStatus.ARRIVED_AT_STORE || status === DriverStatus.PICKING_UP ? 'Retirada na Loja' : 'Entrega p/ Cliente'}
                               </h3>
                             </div>
                             <div className="flex flex-col items-start w-full pb-1">
                               <h2 className="font-black text-base text-white leading-tight mb-1">{mission?.customerName}</h2>
                               <p className="text-[10px] font-medium line-clamp-1 text-chocolate-muted">{mission?.customerAddress}</p>
                               <div className="w-8 h-[2px] bg-[#FF6B00] mt-2 rounded-full shadow-[0_0_8px_rgba(255,107,0,0.5)]"></div>
                             </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col items-start">
                          <span className={"px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter italic " + (status === DriverStatus.ARRIVED_AT_STORE || status === DriverStatus.PICKING_UP || status === DriverStatus.ARRIVED_AT_CUSTOMER ? 'bg-[#FFD700] text-black shadow-[0_0_15px_rgba(255,215,0,0.3)]' : 'bg-[#FF6B00] text-white shadow-[0_0_15px_rgba(255,107,0,0.3)]')}>
                            {getStatusLabel(status)}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button onClick={() => setShowOrderDetails(!showOrderDetails)} className="px-3 h-9 rounded-xl flex items-center space-x-2 font-black text-[9px] uppercase transition-all active:scale-95 chocolate-glass-button">
                            <i className="fas fa-shopping-bag text-[10px]"></i>
                            <span>PEDIDO</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex-1 space-y-3 mb-4 pr-1">
                    {/* Mission Details logic */}
                    <div className="px-1 flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-black leading-tight text-white">{mission?.customerName}</h3>
                        <p className="text-chocolate-muted text-[11px] mt-0.5 leading-snug line-clamp-2">{mission?.customerAddress}</p>
                      </div>
                    </div>
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
            )}

            {showLayersModal && (
              <div className="absolute inset-0 bg-black/80 z-[6000] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-sm animate-in fade-in duration-300">
                <div className={"w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] p-8 border-t border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-300 pb-12 " + cardBg}>
                  <div className="flex justify-between items-center mb-8">
                    <h2 className={"text-2xl font-black italic " + textPrimary}>Camadas do Mapa</h2>
                    <button onClick={() => setShowLayersModal(false)} className={"w-10 h-10 rounded-full flex items-center justify-center " + innerBg + " " + textMuted + " active:scale-90 transition-transform"}>
                      <i className="fas fa-times text-lg"></i>
                    </button>
                  </div>
                  <div className="space-y-4">
                     {/* Layers Content */}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }`

// I'll use this approach to replace the BIG block.
// To avoid cutting too much current logic, I'll use a very conservative replacement.
// Actually, I'll just write the final balanced case.
console.log('Script ready for execution.');
