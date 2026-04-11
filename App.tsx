
import React, { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { DriverStatus, DeliveryMission, Transaction, NotificationModel, NotificationType, ChatRoomType } from './types';
import { COLORS, calculateEarnings, MOCK_NOTIFICATIONS, DEFAULT_AVATAR } from './constants';
import { MapLeaflet } from './components/MapLeaflet';
import { MapNavigation } from './components/MapNavigation';
import { SplashScreen } from './components/SplashScreen';
import { HoldToFillButton } from './components/HoldToFillButton';
import { Logo } from './components/Logo';
import * as supabaseClient from './supabase';
import WizardContainer, { WizardData } from './components/onboarding/WizardContainer';
import CitySelection from './components/onboarding/CitySelection';
import { ChatMultilateralModal } from './components/ChatMultilateralModal';
import { processWizardRegistration } from './utils/wizardProcessor';


type Screen = 'HOME' | 'WALLET' | 'ORDERS' | 'SETTINGS' | 'WITHDRAWAL_REQUEST' | 'NOTIFICATIONS' | 'IDENTITY_VERIFICATION';
type SettingsView = 'MAIN' | 'PERSONAL' | 'DOCUMENTS' | 'BANK' | 'EMERGENCY' | 'DELIVERY' | 'SOUNDS' | 'MAPS';
type AuthScreen = 'LOGIN' | 'REGISTER' | 'RECOVERY' | 'VERIFICATION' | 'PENDING_APPROVAL';
type OnboardingScreen = 'CITY_SELECTION' | 'WIZARD' | null;
type MapMode = 'standard' | 'satellite';

const SOUND_OPTIONS = [
  {
    id: 'cheetah',
    label: 'Rugido do Guepardo',
    description: 'Toque oficial e exclusivo da marca',
    url: '/sounds/rugido-guepardo.mp3',
    icon: 'fa-cat'
  },
  {
    id: 'symphony',
    label: 'Symphony',
    description: 'Toque clássico e elegante',
    url: '/sounds/symphony.mp3',
    icon: 'fa-music'
  },
  {
    id: 'guitar',
    label: 'Notificação Guitarra',
    description: 'Efeito de cordas vibrantes',
    url: '/sounds/guitar-notification.mp3',
    icon: 'fa-guitar'
  },
  {
    id: 'beep',
    label: 'Beep Once',
    description: 'Toque suave padrão',
    url: '/sounds/beep-notification.mp3',
    icon: 'fa-bell'
  }
];

const ANTICIPATION_FEE = 0.00; // Suspenso temporariamente conforme solicitação do usuário

// Helper para formatar data (dd MMM)
const formatDate = (date: Date) => {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
};

// Helper para formatar moeda (R$ 0,00)
const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Gerar semanas dinâmicas
const getWeekOptions = () => {
  const today = new Date();
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - today.getDay()); // Domingo
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // Sábado

  const lastWeekStart = new Date(currentWeekStart);
  lastWeekStart.setDate(currentWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(lastWeekStart);
  lastWeekEnd.setDate(lastWeekStart.getDate() + 6);

  const w3Start = new Date(lastWeekStart);
  w3Start.setDate(lastWeekStart.getDate() - 7);
  const w3End = new Date(w3Start);
  w3End.setDate(w3Start.getDate() + 6);

  return [
    { id: 'current', label: 'Semana Atual', range: `${formatDate(currentWeekStart)} - ${formatDate(currentWeekEnd)}` },
    { id: 'last', label: 'Semana Passada', range: `${formatDate(lastWeekStart)} - ${formatDate(lastWeekEnd)}` },
    { id: 'w3', label: `${formatDate(w3Start)} - ${formatDate(w3End)}`, range: `${formatDate(w3Start)} - ${formatDate(w3End)}` },
  ];
};

const MOCK_WEEKS = getWeekOptions();

// Helper para gerar timeline baseada no horário final
const generateTimeline = (endTime: string) => {
  const [hours, minutes] = endTime.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0);

  const format = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const events = [];
  events.unshift({ time: format(date), description: 'Fim da rota', status: 'done' });
  events.unshift({ time: format(date), description: 'Pedido entregue', status: 'done' });
  date.setMinutes(date.getMinutes() - 5);
  events.unshift({ time: format(date), description: 'Em direção ao cliente', status: 'done' });
  events.unshift({ time: format(date), description: 'Saiu da coleta', status: 'done' });
  date.setMinutes(date.getMinutes() - 3);
  events.unshift({ time: format(date), description: 'Chegou na coleta', status: 'done' });
  date.setMinutes(date.getMinutes() - 5);
  events.unshift({ time: format(date), description: 'Indo pra coleta', status: 'done' });
  events.unshift({ time: format(date), description: 'Rota aceita', status: 'done' });

  return events as any[];
};


// --- CLICK SOUND: Estalo Lento (Web Audio API) ---
let _audioCtx: AudioContext | null = null;

const getAudioCtx = (): AudioContext => {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
};

// Estalo Lento: dois estalos secos separados por 180ms
const playClick = () => {
  try {
    const ctx = getAudioCtx();
    const t = ctx.currentTime;
    const snap = (delay: number) => {
      const o1 = ctx.createOscillator(); const g1 = ctx.createGain();
      o1.type = 'sawtooth'; o1.frequency.setValueAtTime(3000, t + delay);
      g1.gain.setValueAtTime(0.13, t + delay); g1.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.01);
      o1.connect(g1); g1.connect(ctx.destination); o1.start(t + delay); o1.stop(t + delay + 0.02);
      const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
      o2.type = 'sawtooth'; o2.frequency.setValueAtTime(2000, t + delay);
      o2.frequency.exponentialRampToValueAtTime(1000, t + delay + 0.025);
      g2.gain.setValueAtTime(0.07, t + delay); g2.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.025);
      o2.connect(g2); g2.connect(ctx.destination); o2.start(t + delay); o2.stop(t + delay + 0.03);
    };
    snap(0);
    snap(0.18);
  } catch (e) { /* silencioso */ }
};


const getDisplayId = (items: any) => {
  if (!items) return undefined;
  if (Array.isArray(items)) {
    return items[0]?.displayId || items[0]?.id?.toString().slice(-4);
  }
  return items.displayId || items.id?.toString().slice(-4);
};

const STATUS_RANK: Record<string, number> = {
  'pending': 0,
  'accepted': 1,
  'arrived_pickup': 2,
  'ready_for_pickup': 3,
  'picking_up': 4,
  'in_transit': 5,
  'arrived_at_customer': 6,
  'returning': 7,
  'completed': 10,
  'cancelled': 10
};

const ACTIVE_DELIVERY_DB_STATUSES = ['accepted', 'arrived_pickup', 'ready_for_pickup', 'picking_up', 'in_transit', 'arrived_at_customer', 'returning'];

const DRIVER_STATUS_RANK: Record<string, number> = {
  [DriverStatus.OFFLINE]: -1,
  [DriverStatus.ONLINE]: 0,
  [DriverStatus.ALERTING]: 0.5,
  [DriverStatus.GOING_TO_STORE]: 1,
  [DriverStatus.ARRIVED_AT_STORE]: 2,
  [DriverStatus.READY_FOR_PICKUP]: 3,
  [DriverStatus.PICKING_UP]: 4,
  [DriverStatus.GOING_TO_CUSTOMER]: 5,
  [DriverStatus.ARRIVED_AT_CUSTOMER]: 6,
  [DriverStatus.RETURNING]: 7
};

const mapDbStatusToDriverStatus = (dbStatus: string): DriverStatus => {
  switch (dbStatus) {
    case 'accepted': return DriverStatus.GOING_TO_STORE;
    case 'arrived_pickup': return DriverStatus.ARRIVED_AT_STORE;
    case 'ready_for_pickup': return DriverStatus.READY_FOR_PICKUP;
    case 'picking_up': return DriverStatus.PICKING_UP;
    case 'in_transit': return DriverStatus.GOING_TO_CUSTOMER;
    case 'arrived_at_customer': return DriverStatus.ARRIVED_AT_CUSTOMER;
    case 'returning': return DriverStatus.RETURNING;
    case 'completed': return DriverStatus.ONLINE;  // Will be caught by success logic
    case 'cancelled': return DriverStatus.ONLINE;
    default: return DriverStatus.ONLINE;
  }
};

const getBestStatus = (missions: DeliveryMission[]) => {
  // Priority 1: Any mission that is pending or in delivery
  const activeDelivery = missions.find(m => m.status !== 'returning');
  if (activeDelivery) {
    return mapDbStatusToDriverStatus(activeDelivery.status);
  }
  
  // Priority 2: Return phase
  const returnMission = missions.find(m => m.status === 'returning');
  if (returnMission) return DriverStatus.RETURNING;
  
  return DriverStatus.ONLINE;
};

const mapDbDeliveryToMission = (d: any): DeliveryMission => {
  return {
    id: d.id,
    storeName: d.store_name || 'Loja',
    storeAddress: d.store_address || '',
    customerName: d.customer_name || 'Cliente',
    customerAddress: d.customer_address || '',
    customerPhoneSuffix: d.customer_phone_suffix || '',
    items: d.items || [],
    collectionCode: d.collection_code || '0000',
    distanceToStore: d.distance_to_store || 0,
    deliveryDistance: d.delivery_distance || 0,
    totalDistance: d.total_distance || 0,
    earnings: parseFloat(d.earnings || '0'),
    timeLimit: 25,
    status: d.status || 'pending',
    isReturnRequired: d.is_return_required || (d.items?.isReturnRequired) || ['DINHEIRO', 'CASH'].includes(d.payment_method?.toUpperCase()) || false,
    displayId: getDisplayId(d.items),
    batch_id: d.batch_id,
    destinationLat: d.destination_lat,
    destinationLng: d.destination_lng,
    stopNumber: d.stop_number || d.items?.stopNumber || 1,
    storePhone: d.store_phone || '',
    customerPhone: d.customer_phone || '',
    deliveryValue: parseFloat(d.delivery_value || '0'),
    paymentMethod: d.payment_method || 'PIX'
  };
};

const App: React.FC = () => {
  // Splash Screen
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(t);
  }, []);

  const handleLogout = async () => {
    try {
      if (typeof playClick === 'function') playClick();
      await supabaseClient.signOut();
      
      // Reset Auth State
      setIsAuthenticated(false);
      setUserId(null);
      setAuthScreen('LOGIN');
      
      // Reset User Profile
      setCurrentUser({
        name: '',
        email: '',
        phone: '',
        cpf: '',
        level: 'Guepardo PRO',
        avatar: DEFAULT_AVATAR,
        region: 'Itu - SP',
        vehicle: 'moto',
        verified: false,
        bank: {
          name: "Banco Digital",
          agency: "0001",
          account: "00000-0",
          type: "Conta Corrente",
          pixKey: ""
        },
        cnh: {
          number: "",
          category: "A",
          expiry: ""
        },
        preferredMap: 'internal',
        status: null
      });

      // Reset Statistics & Financials
      setBalance(0);
      setDailyEarnings(0);
      setDailyStats({ accepted: 0, finished: 0, rejected: 0, onlineTime: 0, earnings: 0 });
      setHistory([]);
      
      // Reset Mission State
      setActiveMissions([]);
      setStatus(DriverStatus.OFFLINE);
      setCurrentScreen('HOME');
      
      console.log('✅ Logout concluído com sucesso e estado limpo.');
    } catch (error) {
      console.error('❌ Erro durante o logout:', error);
      setIsAuthenticated(false);
      setAuthScreen('LOGIN');
    }
  };

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('LOGIN');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Onboarding State
  const [onboardingScreen, setOnboardingScreen] = useState<OnboardingScreen>(null);
  const [selectedCity, setSelectedCity] = useState<string>('');

  // Estado Dinâmico do Usuário (Inicia Vazio/Novo)
  const [currentUser, setCurrentUser] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    level: 'Guepardo PRO', // Nível fixo solicitado
    avatar: DEFAULT_AVATAR,
    region: 'Itu - SP',
    vehicle: 'moto',
    verified: false,
    bank: {
      name: "Banco Digital", // Default placeholder
      agency: "0001",
      account: "00000-0",
      type: "Conta Corrente",
      pixKey: ""
    },
    cnh: {
      number: "",
      category: "A",
      expiry: ""
    },
    preferredMap: 'internal' as 'internal' | 'google' | 'waze' | 'choose',
    status: null as 'pending' | 'approved' | 'rejected' | null
  });

  // Simulação de Banco de Dados de Usuários
  // O usuário mockado inicial também segue a lógica de "novo usuário" para teste
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([
    {
      cpf: '123.456.789-00',
      password: '123',
      name: 'João Motoca',
      email: 'joao@papaleguas.com',
      phone: '(11) 99999-9999',
      verified: true,
      level: 'Guepardo PRO'
    }
  ]);

  const [pendingUser, setPendingUser] = useState<any>(null);

  // Estados Globais
  const [status, setStatus] = useState<DriverStatus>(DriverStatus.OFFLINE);
  // Ref to always have the latest status inside realtime callbacks (avoids stale closure)
  const statusRef = useRef<DriverStatus>(DriverStatus.OFFLINE);
  useEffect(() => { statusRef.current = status; }, [status]);
  const [activeMissions, setActiveMissions] = useState<DeliveryMission[]>([]);
  const missionRef = useRef<DeliveryMission | null>(null);
  const mission = React.useMemo(() => {
    if (activeMissions.length === 0) return null;

    // Priority: Focus on deliveries that are NOT in "returning" status
    const pendingMission = activeMissions.find(m => m.status !== 'returning');
    if (pendingMission) return pendingMission;

    // If all are returning, focus on the first one
    return activeMissions[0];
  }, [activeMissions]);

  useEffect(() => { missionRef.current = mission; }, [mission]);

  const setMission = (m: DeliveryMission | null) => {
    if (m === null) setActiveMissions([]);
    else setActiveMissions(prev => {
      const alreadyExists = prev.some(existing => existing.id === m.id);
      if (alreadyExists) return prev;
      return [...prev, m];
    });
  };
  const [alertCountdown, setAlertCountdown] = useState(30);
  const [currentScreen, setCurrentScreen] = useState<Screen>('HOME');
  const [settingsView, setSettingsView] = useState<SettingsView>('MAIN');
  const [showPostDeliveryModal, setShowPostDeliveryModal] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [isResumoExpanded, setIsResumoExpanded] = useState(false);
  const [mapCenterKey, setMapCenterKey] = useState(0);
  const [lastEarnings, setLastEarnings] = useState(0);
  const [batchEarnings, setBatchEarnings] = useState(0);
  const [showBalance, setShowBalance] = useState(true);
  const [reCenterTrigger, setReCenterTrigger] = useState(0);
  const [batchHasReturn, setBatchHasReturn] = useState(false);
  const [isMissionExpanded, setIsMissionExpanded] = useState(true);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const isDraggingRef = useRef(false);

  // Pre-geocoded coords for instant route switching (store → customer)
  const [preloadedCoords, setPreloadedCoords] = useState<{
    store: { lat: number; lng: number } | null;
    customer: { lat: number; lng: number } | null;
  }>({ store: null, customer: null });

  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; speed?: number | null } | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navMetrics, setNavMetrics] = useState<{ time: string; distance: string } | null>(null);



  // Estado Heatmap e Camadas
  const [showHeatMap, setShowHeatMap] = useState(true);
  const [showLayersModal, setShowLayersModal] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>('standard');
  const [showTraffic, setShowTraffic] = useState(false);
  const [mapTheme, setMapTheme] = useState<'dark' | 'light'>('light');

  // Estado para Tabs da Wallet e Filtros
  const [walletTab, setWalletTab] = useState<'ENTRIES' | 'PAYOUTS'>('ENTRIES');
  const [activeWeekId, setActiveWeekId] = useState('current');
  const [showWeekSelector, setShowWeekSelector] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Simulação de Pedido Pronto
  const [isOrderReady, setIsOrderReady] = useState(false);

  const [showMissionMapPicker, setShowMissionMapPicker] = useState(false);
  const [typedCode, setTypedCode] = useState<string[]>(['', '', '', '']);
  const codeInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // OTP Verification
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpInputRefs = [
    useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)
  ];
  const [otpTimer, setOtpTimer] = useState(0);

  // Anticipation
  const [isAnticipating, setIsAnticipating] = useState(false);
  const [showSuccessAnticipation, setShowSuccessAnticipation] = useState(false);

  // Filtros
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [maxDistance, setMaxDistance] = useState(15);
  const [minPrice, setMinPrice] = useState(0);
  const [backHome, setBackHome] = useState(false);
  const [homeDestination, setHomeDestination] = useState('Centro - Itu');
  const [autoAccept, setAutoAccept] = useState(false);

  // Settings
  /* Delivery Help States */
  const [showDeliveryHelpModal, setShowDeliveryHelpModal] = useState(false);
  const [isMissionOverlayExpanded, setIsMissionOverlayExpanded] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [historicalOrder, setHistoricalOrder] = useState<DeliveryMission | null>(null);
  const [chatTab, setChatTab] = useState<ChatRoomType>('STORE_COURIER');
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [activeHelpOption, setActiveHelpOption] = useState<'customer_not_found' | 'talk_to_store' | null>(null);
  const [customerMessage, setCustomerMessage] = useState('');

  const handleSendCustomerMessage = () => {
    if (!mission) return;
    const text = encodeURIComponent(customerMessage);
    const url = `https://wa.me/${mission.customerPhone}?text=${text}`;
    window.open(url, '_blank');
    setShowDeliveryHelpModal(false);
    setActiveHelpOption(null);
    setCustomerMessage('');
  };

  const handleCallStore = () => {
    if (!mission) return;
    window.location.href = `tel:${mission.storePhone}`;
  };

  const handleOpenHistoricalChat = (transaction: Transaction) => {
    if (!transaction || !transaction.type) return;
    
    // O order_id está guardado no campo 'type' da transação
    const orderId = transaction.type;
    
    // Objeto mínimo necessário para o ChatMultilateralModal
    // Note: Campos como storeName e customerName podem não ser precisos, 
    // mas o ID é o que importa para puxar as mensagens do Supabase.
    const skeletonOrder: any = {
      id: orderId,
      status: 'completed',
      displayId: orderId.slice(-4),
      items: [],
      storeName: 'Pedido Anterior',
      customerName: 'Histórico de Chat'
    };
    
    setHistoricalOrder(skeletonOrder);
    setShowChatModal(true);
  };

  const [emergencyContact, setEmergencyContact] = useState({ name: '', phone: '', relation: '', isBeneficiary: false });
  const [selectedVehicle, setSelectedVehicle] = useState<'moto' | 'car' | 'bike'>('moto');

  // GPS
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  // Tema
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSoundId, setSelectedSoundId] = useState('cheetah');

  // Notificações
  const [notifications, setNotifications] = useState<NotificationModel[]>(MOCK_NOTIFICATIONS);
  const [notificationsSeen, setNotificationsSeen] = useState(false);

  const alertAudioRef = useRef<Howl | null>(null);

  // Estatísticas e Financeiro - INICIANDO ZERADOS PARA NOVO USUÁRIO
  const [balance, setBalance] = useState(0.00);
  const [dailyEarnings, setDailyEarnings] = useState(0.00);
  const [dailyStats, setDailyStats] = useState({ onlineTime: 0, earnings: 0, accepted: 0, rejected: 0, finished: 0 });

  // Initialize rejected missions from localStorage to persist across reloads
  const [rejectedMissions, setRejectedMissions] = useState<string[]>(() => {
    const saved = localStorage.getItem('rejectedMissions');
    return saved ? JSON.parse(saved) : [];
  });
  const [history, setHistory] = useState<Transaction[]>([]); // Histórico Vazio
  const [payoutsList, setPayoutsList] = useState<any[]>([]); // Lista de Repasses Vazia

  // Estados para Alerta de Nova Missão na Rota (Batching)
  const [showBatchAlert, setShowBatchAlert] = useState(false);
  const [newBatchEarnings, setNewBatchEarnings] = useState(0);
  const isCompletingMission = useRef(false);

  // Auth Inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerData, setRegisterData] = useState({ name: '', cpf: '', email: '', phone: '', password: '', confirmPassword: '' });

  const [recoveryMethod, setRecoveryMethod] = useState<'cpf' | 'email'>('cpf');
  const [recoveryInput, setRecoveryInput] = useState('');
  
  // Vehicle Details
  const [vehicleDetails, setVehicleDetails] = useState({ model: '', color: '', plate: '', cnh_number: '', cnh_validity: '2030-12-31' });

  // Address Details
  const [addressDetails, setAddressDetails] = useState({
    zip_code: '',
    street: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: ''
  });

  useEffect(() => {
    setTypedCode(['', '', '', '']);
  }, [status]);

  useEffect(() => {
    const handleWindowMouseMove = (e: any) => {
      if (!isDraggingRef.current) return;
      handleTouchMove(e);
    };

    const handleWindowMouseUp = () => {
      if (!isDraggingRef.current) return;
      handleTouchEnd();
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
      window.addEventListener('touchmove', handleWindowMouseMove as any, { passive: false });
      window.addEventListener('touchend', handleWindowMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchmove', handleWindowMouseMove as any);
      window.removeEventListener('touchend', handleWindowMouseUp);
    };
  }, [isDragging, isMissionExpanded, dragY]); 

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.body.className = theme === 'dark' ? 'bg-[#121212] text-white' : 'bg-zinc-50 text-zinc-900';
  }, [theme]);

  useEffect(() => {
    let timer: any;
    if (otpTimer > 0) {
      timer = setInterval(() => setOtpTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [otpTimer]);

  useEffect(() => {
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      if (result.state === 'granted') {
        setGpsEnabled(true);
      }
    }).catch(() => { });
  }, []);




  // Restore Session on Mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabaseClient.supabase.auth.getSession();
      if (session?.user) {
        console.log("Session restored:", session.user.id);
        setUserId(session.user.id);
        setIsAuthenticated(true);
      }
    };
    checkSession();
  }, []);

  // Auto-expand mission overlay when arriving (within 100m)
  useEffect(() => {
    if (navMetrics?.distanceValue && navMetrics.distanceValue < 100 && !isMissionOverlayExpanded) {
      setIsMissionOverlayExpanded(true);
    }
  }, [navMetrics?.distanceValue, isMissionOverlayExpanded]);

  useEffect(() => {
    // Reset expansion state when status changes to navigation phases
    if (status === DriverStatus.GOING_TO_STORE || status === DriverStatus.GOING_TO_CUSTOMER) {
      setIsMissionOverlayExpanded(false);
    }
  }, [status]);

  // Carregar dados do usuário quando autenticado
  useEffect(() => {
    let profileSubscription: any = null;

    const loadUserData = async () => {
      if (!userId) return;

      try {
        // Carregar dados de autenticação (Email)
        const { data: { user: authUser } } = await supabaseClient.supabase.auth.getUser();

        // Carregar perfil
        const profile = await supabaseClient.getProfile(userId);

        // Carregar dados bancários (se existirem)
        let bankData = null;
        try {
          bankData = await supabaseClient.getBankAccount(userId);
        } catch (e) {
          // Conta bancária pode não existir ainda
          console.log('Sem dados bancários ainda');
        }

        // Carregar veículo
        let vehicleData = null;
        try {
          vehicleData = await supabaseClient.getVehicle(userId);
        } catch (e) {
          console.log('Sem dados de veículo ainda');
        }

        if (profile) {
          setCurrentUser(prev => ({
            ...prev,
            // Prioriza full_name (novo schema), fallback para name (schema antigo)
            name: profile.full_name || profile.name || '',
            email: authUser?.email || prev.email,
            phone: profile.phone || prev.phone,
            cpf: profile.cpf || prev.cpf,
            level: 'Guepardo PRO',
            // Prioriza avatar_url
            avatar: profile.avatar_url || profile.avatar || prev.avatar,
            region: profile.work_city || profile.region || 'Itu - SP',
            vehicle: 'moto',
            verified: profile.status === 'approved' || profile.verified || false,
            bank: {
              ...prev.bank,
              // Mapeia dados bancários se existirem
              ...(bankData ? {
                name: bankData.bank_name || prev.bank.name,
                agency: bankData.agency || prev.bank.agency,
                account: bankData.account_number || prev.bank.account,
                type: bankData.account_type || prev.bank.type,
              } : {}),
              // Pix Key vem do perfil ou da conta bancária
              pixKey: profile.pix_key || (bankData?.pix_key) || prev.bank.pixKey
            },
            status: profile.status || null
          }));
        }

        if (vehicleData) {
          setVehicleDetails({
            model: vehicleData.model || '',
            color: vehicleData.color || '',
            plate: vehicleData.plate || '',
            cnh_number: vehicleData.cnh_number || '',
            cnh_validity: vehicleData.cnh_validity || '2030-12-31'
          });
          if (vehicleData.type) {
             setSelectedVehicle(vehicleData.type as any);
          }
        }

        // Carregar transações
        const transactions = await supabaseClient.getTransactions(userId);
        if (transactions) {
          // Filtrar duplicatas e mapear campos do banco para o frontend
          const uniqueTransactions = new Map();
          transactions.forEach((t: any) => {
            const createdAt = new Date(t.created_at);
            const mapped = {
              ...t,
              weekId: t.week_id || 'current', // Garantir mapeamento para o filtro
              date: createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
              time: createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            };
            uniqueTransactions.set(t.id, mapped);
          });
          const filteredTransactions = Array.from(uniqueTransactions.values());
          setHistory(filteredTransactions as Transaction[]);
        }

        // Carregar Endereço
        try {
          const addressData = await supabaseClient.getAddress(userId);
          if (addressData) {
            setAddressDetails({
              zip_code: addressData.zip_code || '',
              street: addressData.street || '',
              number: addressData.number || '',
              complement: addressData.complement || '',
              district: addressData.district || '',
              city: addressData.city || '',
              state: addressData.state || ''
            });
          }
        } catch (err) {
          console.error('Erro ao carregar endereço:', err);
        }

        // Carregar saldo
        const currentBalance = await supabaseClient.getBalance(userId);
        setBalance(currentBalance);

        // Carregar estatísticas do dia
        const stats = await supabaseClient.getDailyStats(userId);
        if (stats) {
          setDailyStats({
            accepted: stats.accepted || 0,
            finished: stats.finished || 0,
            rejected: stats.rejected || 0,
            onlineTime: stats.onlineTime || 0,
            earnings: stats.earnings || 0
          });
          setDailyEarnings(stats.earnings || 0);
        }

        // Carregar notificações
        const notifs = await supabaseClient.getNotifications(userId);
        if (notifs) {
          setNotifications(notifs as NotificationModel[]);
        }

        // Tenta recuperar missão ativa (State Recovery)
        const activeDbDelivery = await supabaseClient.getActiveDelivery(userId);
        if (activeDbDelivery) {
          console.log('🔄 Missão ativa encontrada no banco. Recuperando estado...');
          
          let missionsToSet: DeliveryMission[] = [];
          
          if (activeDbDelivery.batch_id) {
            // Se for parte de um lote, busca todos os pedidos do lote que não foram concluídos
            const { data: batchData } = await supabaseClient.supabase
              .from('deliveries')
              .select('*')
              .eq('batch_id', activeDbDelivery.batch_id)
              .not('status', 'in', '("completed","cancelled")')
              .order('stop_number', { ascending: true });
            
            if (batchData && batchData.length > 0) {
              missionsToSet = batchData.map(mapDbDeliveryToMission);
            }
          } else {
            missionsToSet = [mapDbDeliveryToMission(activeDbDelivery)];
          }

          if (missionsToSet.length > 0) {
            const recoveredStatus = getBestStatus(missionsToSet);
            const currentStatus = statusRef.current;
            
            // Smart Selection: Prioritize the first mission that is NOT 'returning'
            // This ensures Stop 2 is focused even if Stop 1 requires a return at the end.
            const bestMission = missionsToSet.find(m => m.status !== 'returning') || missionsToSet[0];
            
            setActiveMissions(missionsToSet);
            setMission(bestMission);
            
            // State Protection: Only revert if we are NOT in an active delivery
            // OR if the recovered status is actually MORE advanced than our local state.
            const isLocked = [
              DriverStatus.READY_FOR_PICKUP,
              DriverStatus.PICKING_UP,
              DriverStatus.GOING_TO_CUSTOMER,
              DriverStatus.ARRIVED_AT_CUSTOMER,
              DriverStatus.RETURNING
            ].includes(currentStatus);

            if (!isLocked || DRIVER_STATUS_RANK[recoveredStatus] > DRIVER_STATUS_RANK[currentStatus]) {
              console.log(`✅ Status Recovery: ${currentStatus} -> ${recoveredStatus}`);
              setStatus(recoveredStatus);
            } else {
              console.log(`🛡️ State Protection: Blocked revert from ${currentStatus} to ${recoveredStatus}`);
            }
            
            setIsNavigating(true);

            // Geocode para garantir que o mapa carregue o destino imediatamente
            const destAddr = (recoveredStatus === DriverStatus.GOING_TO_STORE || recoveredStatus === DriverStatus.ARRIVED_AT_STORE || recoveredStatus === DriverStatus.PICKING_UP || recoveredStatus === DriverStatus.RETURNING)
              ? missionsToSet[0].storeAddress
              : missionsToSet[0].customerAddress;
            
            geocodeAddress(destAddr).then(coords => {
              if (coords) {
                if (recoveredStatus.includes('STORE') || recoveredStatus === DriverStatus.PICKING_UP || recoveredStatus === DriverStatus.RETURNING) {
                  setPreloadedCoords(prev => ({ ...prev, store: coords }));
                } else {
                  setPreloadedCoords(prev => ({ ...prev, customer: coords }));
                }
              }
            });
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    if (isAuthenticated && userId) {
      loadUserData();

      // Iniciar escuta realtime para o perfil do usuário (ex: aprovação automática)
      profileSubscription = supabaseClient.supabase
        .channel(`profile-updates-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`
          },
          (payload) => {
            console.log('Perfil atualizado em tempo real:', payload);
            loadUserData();
          }
        )
        .subscribe();
    }

    return () => {
      if (profileSubscription) {
        supabaseClient.supabase.removeChannel(profileSubscription);
      }
    };
  }, [isAuthenticated, userId]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const handleActivateGPS = () => {
    setIsGpsLoading(true);
    if (!navigator.geolocation) {
      alert("Geolocalização não é suportada.");
      setIsGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        setGpsEnabled(true);
        setIsGpsLoading(false);
        setMapCenterKey(prev => prev + 1);
      },
      (error) => {
        console.error("Erro GPS:", error);
        setIsGpsLoading(false);
        setGpsEnabled(false);
        if (error.code === error.PERMISSION_DENIED) {
          alert("Você precisa permitir o acesso à localização.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const toggleOnlineStatus = () => {
    // Priority Check: Verification


    if (status === DriverStatus.ONLINE) {
      setStatus(DriverStatus.OFFLINE);
      setMission(null);
      setIsNavigating(false);
    } else {
      if (!gpsEnabled) {
        handleActivateGPS();
      } else {
        setStatus(DriverStatus.ONLINE);
        setMission(null);
        setBatchHasReturn(false);
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    isDraggingRef.current = true;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - dragStartY.current;
    
    // Only allow dragging down if expanded, or up if collapsed
    if (isMissionExpanded && deltaY > 0) {
      setDragY(deltaY);
    } else if (!isMissionExpanded && deltaY < 0) {
      setDragY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    if (isMissionExpanded && dragY > 100) {
      setIsMissionExpanded(false);
    } else if (!isMissionExpanded && dragY < -100) {
      setIsMissionExpanded(true);
    }
    setDragY(0);
  };

  const getStatusLabel = (status: DriverStatus) => {
    switch (status) {
      case DriverStatus.OFFLINE: return 'DESCONECTADO';
      case DriverStatus.ONLINE: return 'DISPONÍVEL';
      case DriverStatus.ALERTING: return 'CHAMADA RECEBIDA';
      case DriverStatus.GOING_TO_STORE: return 'INDO PARA COLETA';
      case DriverStatus.ARRIVED_AT_STORE: return isOrderReady ? 'PEDIDO PRONTO' : 'AGUARDANDO PEDIDO';
      case DriverStatus.PICKING_UP: return 'CONFIRMAÇÃO DE COLETA';
      case DriverStatus.GOING_TO_CUSTOMER: return 'INDO PARA O CLIENTE';
      case DriverStatus.ARRIVED_AT_CUSTOMER: return 'LOCAL DE ENTREGA';
      case DriverStatus.RETURNING: return 'RETORNANDO À LOJA';
      default: return (status as string).replace(/_/g, ' ');
    }
  };

  // --- REAL-TIME LOCATION TRACKING ---
  useEffect(() => {
    let watchId: number | null = null;

    if (status !== DriverStatus.OFFLINE && userId && gpsEnabled) {
      console.log("Starting Location Tracking...");

      // Initial Update
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          supabaseClient.updateProfile(userId, {
            current_lat: latitude,
            current_lng: longitude,
            is_online: true,
            last_location_update: new Date().toISOString()
          }).catch(e => console.error("Initial location update failed", e));
        },
        (err) => console.error("Error getting initial location", err),
        { enableHighAccuracy: true }
      );

      // Continuous Watch
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;

          // Update profile for real-time head-up display
          supabaseClient.updateProfile(userId, {
            current_lat: latitude,
            current_lng: longitude,
            last_location_update: new Date().toISOString()
          }).catch(e => console.error("Location update failed", e));

          // LOG HISTORY: If there's an active mission, log the percurso
          const activeStates = [
            DriverStatus.GOING_TO_STORE,
            DriverStatus.ARRIVED_AT_STORE,
            DriverStatus.PICKING_UP,
            DriverStatus.GOING_TO_CUSTOMER,
            DriverStatus.ARRIVED_AT_CUSTOMER,
            DriverStatus.RETURNING
          ];

          if (mission && activeStates.includes(status)) {
            supabaseClient.supabase
              .from('delivery_tracking')
              .insert([{
                delivery_id: mission.id,
                latitude,
                longitude
              }])
              .then(({ error }) => {
                if (error) console.error("Error logging percurso:", error.message);
              });
          }

          setCurrentLocation({ 
            lat: latitude, 
            lng: longitude,
            speed: pos.coords.speed // m/s
          });
        },
        (err) => console.error("Location watch error", err),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else if (status === DriverStatus.OFFLINE && userId) {
      // Mark as offline in DB
      supabaseClient.updateProfile(userId, {
        is_online: false
      }).catch(e => console.error("Failed to mark offline", e));
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        console.log("Location Tracking Stopped.");
      }
    };
  }, [status, userId, gpsEnabled, currentUser.name, currentUser.vehicle]);


  const handleSOSAction = (type: 'police' | 'samu' | 'mechanic' | 'share') => {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    switch (type) {
      case 'police': window.location.href = 'tel:190'; break;
      case 'samu': window.location.href = 'tel:192'; break;
      case 'mechanic': window.open('https://www.google.com/maps/search/borracharia+mecanico+moto', '_blank'); break;
      case 'share':
        if (!navigator.geolocation) { alert("GPS indisponível."); return; }
        navigator.geolocation.getCurrentPosition((pos) => {
          const { latitude, longitude } = pos.coords;
          const message = `SOS! Preciso de ajuda. Estou aqui: https://maps.google.com/?q=${latitude},${longitude}`;
          window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
          setShowSOSModal(false);
        }, () => alert("Erro ao obter localização."), { enableHighAccuracy: true });
        break;
    }
  };

  const openNavigation = (provider: 'waze' | 'google', forcedAddress?: string) => {
    if (!mission && !forcedAddress) return;
    const isGoingToStore = status === DriverStatus.GOING_TO_STORE || status === DriverStatus.ARRIVED_AT_STORE || status === DriverStatus.PICKING_UP;
    const address = forcedAddress || (isGoingToStore ? mission?.storeAddress : mission?.customerAddress);
    if (!address) return;
    const encodedAddress = encodeURIComponent(address);
    const url = provider === 'waze'
      ? `https://waze.com/ul?q=${encodedAddress}&navigate=yes`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    window.open(url, '_blank');
    setShowMissionMapPicker(false);
  };

  useEffect(() => {
    const soundUrl = SOUND_OPTIONS.find(s => s.id === selectedSoundId)?.url || SOUND_OPTIONS[0].url;

    // Clean up previous instance
    if (alertAudioRef.current) {
      alertAudioRef.current.unload();
    }

    const howl = new Howl({
      src: [soundUrl],
      loop: true,
      volume: 0.8,
      html5: true, // Use HTML5 Audio for better mobile support with long files
      preload: true
    });

    alertAudioRef.current = howl;

    return () => {
      if (alertAudioRef.current) {
        alertAudioRef.current.unload();
      }
    };
  }, [selectedSoundId]);

  useEffect(() => {
    if (status === DriverStatus.ALERTING && soundEnabled && alertAudioRef.current) {
      console.log("🔊 Playing alert sound...");
      if (!alertAudioRef.current.playing()) {
        alertAudioRef.current.play();
      }
      if (autoAccept) {
        setTimeout(() => setStatus(DriverStatus.GOING_TO_STORE), 1500);
      }
    } else {
      if (alertAudioRef.current) {
        console.log("🔇 Stopping alert sound (Status: " + status + ")");
        alertAudioRef.current.stop();
        // Force stop if it's being stubborn
        try { alertAudioRef.current.pause(); } catch (e) { }
      }
    }
  }, [status, soundEnabled, autoAccept]);

  // Fix Bug #2: Monitorar o status 'ready_for_pickup' no banco de dados via Realtime
  // em vez de usar um timeout local de 10s que ignora o Lojista.
  useEffect(() => {
    if (status !== DriverStatus.ARRIVED_AT_STORE || !mission) {
      setIsOrderReady(false);
      return;
    }

    setIsOrderReady(false);

    // Ouvir mudanças de status para esta entrega específica
    const readyChannel = supabaseClient.supabase
      .channel(`ready-check-${mission.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deliveries',
          filter: `id=eq.${mission.id}`
        },
        (payload) => {
          console.log('📦 [READY_CHECK] Delivery updated:', payload.new.status);
          if (payload.new.status === 'ready_for_pickup') {
            console.log('✅ [READY_CHECK] Lojista marcou pedido como pronto!');
            setIsOrderReady(true);
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          }
        }
      )
      .subscribe();

    // Também verificar imediatamente o status atual no banco (caso já esteja pronto)
    supabaseClient.supabase
      .from('deliveries')
      .select('status')
      .eq('id', mission.id)
      .single()
      .then(({ data }) => {
          if (data?.status === 'ready_for_pickup') {
          console.log('✅ [READY_CHECK] Pedido já estava pronto no banco');
          setIsOrderReady(true);
          // Opcionalmente, pode-se atualizar o status global aqui se necessário
        } else if (data?.status === 'in_transit') {
          // Se já saiu, não precisa mais esperar "Pronto"
          setIsOrderReady(true);
        }
      });

    return () => {
      supabaseClient.supabase.removeChannel(readyChannel);
    };
  }, [status, mission?.id]);

  useEffect(() => {
    if (status === DriverStatus.ONLINE || status === DriverStatus.OFFLINE) {
      setShowMissionMapPicker(false);
      setTypedCode(['', '', '', '']);
    }
  }, [status]);



  useEffect(() => {
    let subscription: any;

    if (status === DriverStatus.ONLINE && !mission) {
      console.log("Listening for new missions...");

      // FETCH EXISTING PENDING DELIVERIES FIRST
      const fetchPendingDeliveries = async () => {
        try {
          console.log("🔍 Fetching existing pending deliveries... (Rejected count: " + rejectedMissions.length + ")");
          const { data: allPending, error } = await supabaseClient.supabase
            .from('deliveries')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(20);

          let pendingDeliveries = allPending;
          if (allPending) {
            // Filter locally: Only public OR targeted to ME
            pendingDeliveries = allPending.filter(d => !d.driver_id || d.driver_id === userId);
          }

          if (error) {
            console.error("❌ Error fetching pending deliveries:", error);
            return;
          }

          if (pendingDeliveries && pendingDeliveries.length > 0) {
            // Find the first pending delivery that hasn't been rejected
            const firstPending = pendingDeliveries.find(d => !rejectedMissions.includes(String(d.id)));

            if (firstPending) {
              console.log("✅ Found valid pending delivery:", firstPending);

              // Transform to DeliveryMission format using the centralized mapper
              const dynamicMission: DeliveryMission = mapDbDeliveryToMission(firstPending);

              // If it's a batch, fetch all stops
              if (firstPending.batch_id) {
                console.log("📦 Initial fetch detected batch:", firstPending.batch_id);
                const { data: batchData } = await supabaseClient.supabase
                  .from('deliveries')
                  .select('*')
                  .eq('batch_id', firstPending.batch_id)
                  .in('status', ['pending', 'accepted', 'arrived_pickup', 'picking_up', 'in_transit', 'arrived_at_customer', 'returning']);
                
                if (batchData && batchData.length > 0) {
                  const mappedBatch = batchData.map(mapDbDeliveryToMission);
                  setActiveMissions(mappedBatch);
                  // Smart Selection for the mission
                  const bestStartMission = mappedBatch.find(m => m.status !== 'returning') || mappedBatch[0];
                  setMission(bestStartMission);
                } else {
                  setMission(dynamicMission);
                  setActiveMissions([dynamicMission]);
                }
              } else {
                setMission(dynamicMission);
                setActiveMissions([dynamicMission]);
              }
              
              setStatus(DriverStatus.ALERTING);
              setAlertCountdown(30);
            } else {
              console.log("ℹ️ All pending deliveries were already rejected");
            }
          } else {
            console.log("ℹ️ No pending deliveries found");
          }
        } catch (err) {
          console.error("❌ Error in fetchPendingDeliveries:", err);
        }
      };

      console.log("ℹ️ Fetching existing pending deliveries... (Rejected count: " + rejectedMissions.length + ")");
      fetchPendingDeliveries();

      // THEN SUBSCRIBE TO NEW DELIVERIES AND UPDATES
      // THEN SUBSCRIBE TO NEW DELIVERIES AND UPDATES
      subscription = supabaseClient.subscribeToAvailableMissions(
        // Callback for new missions (INSERT)
        (newMissionPayload: any) => {
          console.log("📥 New mission received:", newMissionPayload, "| Rejected list:", rejectedMissions);

          // Only show if not already showing a mission
          if ((mission as any) && (!(mission as any).batch_id || (mission as any).batch_id !== newMissionPayload.batch_id)) {
            console.log("⚠️ Already showing a different mission or batch, ignoring new one");
            return;
          }

          // Ignore if this mission was previously rejected locally
          if (rejectedMissions.includes(String(newMissionPayload.id))) {
            console.log("🚫 Ignoring rejected mission (Subscription):", newMissionPayload.id);
            return;
          }

          // SECURITY: If it's targeted, ensure it's targeted to ME (or is public)
          if (newMissionPayload.driver_id && newMissionPayload.driver_id !== userId) {
            console.log("🤫 Mission targeted to someone else:", newMissionPayload.driver_id);
            return;
          }

          const getDisplayId = (items: any) => {
            if (!items) return undefined;
            if (Array.isArray(items)) {
              return items[0]?.displayId || items[0]?.id?.toString().slice(-4);
            }
            return items.displayId || items.id?.toString().slice(-4);
          };

          // Transform Supabase data to App's DeliveryMission format
          const dynamicMission: DeliveryMission = mapDbDeliveryToMission(newMissionPayload);

          // If it's a batch, fetch all stops to ensure we accept/reject them together
          if (newMissionPayload.batch_id) {
            console.log("📦 Multiple stops detected (Batch ID:", newMissionPayload.batch_id, "). Fetching all stops...");
            supabaseClient.supabase
              .from('deliveries')
              .select('*')
              .eq('batch_id', newMissionPayload.batch_id)
              .eq('status', 'pending')
              .then(({ data: batchMissions }) => {
                if (batchMissions && batchMissions.length > 0) {
                  const mappedBatch = batchMissions.map(mapDbDeliveryToMission)
                    .sort((a, b) => (a.stopNumber || 1) - (b.stopNumber || 1));

                  setActiveMissions(mappedBatch);
                  setMission(mappedBatch[0]);
                  setBatchHasReturn(mappedBatch.some(m => m.isReturnRequired));
                  setStatus(DriverStatus.ALERTING);
                  setAlertCountdown(30);
                }
              });
          } else {
            setMission(dynamicMission);
            setActiveMissions([dynamicMission]);
            setBatchHasReturn(dynamicMission.isReturnRequired || false);
            setStatus(DriverStatus.ALERTING);
            setAlertCountdown(30);
          }
        },
        // Callback for mission changes (UPDATE) - mostly irrelevant here as we unsubscribe when mission is set
        (unavailableMissionId) => {
          console.log("ℹ️ Mission became unavailable:", unavailableMissionId);
        }
      );
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [status, mission, rejectedMissions]);


  // PERIODIC POLLING: Check for pending or assigned deliveries
  // Estados onde o driver está ativamente em uma entrega e o polling NÃO deve alterar o status
  const DELIVERY_LOCKED_STATES = [
    DriverStatus.READY_FOR_PICKUP,
    DriverStatus.PICKING_UP,
    DriverStatus.GOING_TO_CUSTOMER,
    DriverStatus.ARRIVED_AT_CUSTOMER,
    DriverStatus.RETURNING,
  ];

  useEffect(() => {
    let pollingInterval: any;

    if (status !== DriverStatus.OFFLINE && userId && currentUser) {
      const checkForDeliveries = async () => {
        // Skip if currently processing a completion to avoid race conditions
        if (isCompletingMission.current) {
          console.log('⏳ Skipping polling update: Mission completion in progress...');
          return;
        }

        try {
          // No longer skipping poll entirely. We fetch and compare ranks.

          const getDisplayId = (items: any) => {
            if (!items) return undefined;
            if (Array.isArray(items)) {
              return items[0]?.displayId || items[0]?.id?.toString().slice(-4);
            }
            return items.displayId || items.id?.toString().slice(-4);
          };

          // 1. Check for orders DIRECTLY ASSIGNED to this driver (Active only to avoid ghost orders)
          const { data: assignedOrders } = await supabaseClient.supabase
            .from('deliveries')
            .select('*')
            .eq('driver_id', userId)
            .in('status', ['accepted', 'arrived_pickup', 'ready_for_pickup', 'picking_up', 'in_transit', 'arrived_at_customer', 'returning']);

          const dbMissions = assignedOrders || [];

          // 2. Targeted check for the CURRENT mission (to catch 'completed' or 'cancelled' finalization)
          if (missionRef.current?.id && !dbMissions.some(m => m.id === missionRef.current?.id)) {
            const { data: currentMissionStatus } = await supabaseClient.supabase
              .from('deliveries')
              .select('*')
              .eq('id', missionRef.current.id)
              .single();
            if (currentMissionStatus && (currentMissionStatus.status === 'completed' || currentMissionStatus.status === 'cancelled' || currentMissionStatus.status === 'returning')) {
              dbMissions.push(currentMissionStatus);
            }
          }

          if (dbMissions.length >= 0) { // Always sync, even if 0
            // Filter out missions the driver has already rejected locally
            const filteredAssigned = dbMissions.filter(d => !rejectedMissions.includes(String(d.id)));

            const syncMissions: DeliveryMission[] = filteredAssigned
              .map(mapDbDeliveryToMission)
              .sort((a,b) => (a.stopNumber || 0) - (b.stopNumber || 0));
            
            // Smart Selection: Prioritize the first mission that is NOT 'returning'
            const bestMission = syncMissions.find(m => m.status !== 'returning') || syncMissions[0];

            if (syncMissions.length > 0) {
              // Smart Selection: Prioritize the first mission that is NOT 'returning'
              const bestMission = syncMissions.find(m => m.status !== 'returning') || syncMissions[0];
              
              // --- SIDE EFFECTS & STATUS TRANSITIONS ---
              const currentRank = DRIVER_STATUS_RANK[status] || 0;
              // We sync against our current mission if it exists, or the best available one
              const mainServerMission = syncMissions.find(m => m.id === (mission?.id)) || bestMission;

              if (mainServerMission && currentRank > 0 && currentRank < 10) {
                const serverRank = STATUS_RANK[mainServerMission.status] || 0;
                
                if (serverRank > currentRank) {
                  console.log(`🚀 [POLLING] Status advance detected for mission ${mainServerMission.id}: ${status} -> ${mainServerMission.status}`);
                  
                  if (mainServerMission.status === 'completed' && (status === DriverStatus.RETURNING || status === DriverStatus.ARRIVED_AT_CUSTOMER)) {
                    processDeliverySuccess();
                  } else if (mainServerMission.status === 'cancelled') {
                    setMission(null);
                    setStatus(DriverStatus.ONLINE);
                  } else {
                    const nextStatus = mapDbStatusToDriverStatus(mainServerMission.status);
                    setStatus(nextStatus);
                    setMission(mainServerMission);
                  }
                } else if (serverRank < currentRank) {
                  console.log(`🛡️ [POLLING] Blocked status regression: Local is ${status} (${currentRank}), Server is ${mainServerMission.status} (${serverRank})`);
                }
              }

              // Detection if was ONLINE
              const activeOnlySyncMissions = syncMissions.filter(m => ACTIVE_DELIVERY_DB_STATUSES.includes(m.status));
              const bestActive = activeOnlySyncMissions.find(m => m.status !== 'returning') || activeOnlySyncMissions[0];

              if (status === DriverStatus.ONLINE && activeOnlySyncMissions.length > 0) {
                if (bestActive.status === 'pending') {
                  setMission(bestActive);
                  setStatus(DriverStatus.ALERTING);
                } else {
                  const nextStatus = mapDbStatusToDriverStatus(bestActive.status);
                  setStatus(nextStatus);
                  setMission(bestActive);
                }
              }

              // --- PURE STATE UPDATES ---
              setActiveMissions(prev => {
                // Determine truly new active missions for notifications
                const prevIds = new Set(prev.map(m => m.id));
                const newOnlyActive = activeOnlySyncMissions.filter(m => !prevIds.has(m.id));
                
                if ((status as string) !== DriverStatus.ONLINE && (status as string) !== DriverStatus.OFFLINE && (status as string) !== DriverStatus.ALERTING && newOnlyActive.length > 0) {
                  const addedEarnings = newOnlyActive.reduce((acc, m) => acc + m.earnings, 0);
                  setNewBatchEarnings(addedEarnings);
                  setShowBatchAlert(true);
                  setTimeout(() => setShowBatchAlert(false), 8000);
                }

                // SECURITY: If we were previously showing 2 items (batch) and now we see 1,
                // we might be in a temporary half-synced DB state. If status is NOT ONLINE,
                // we prefer to keep the larger set until explicit completion.
                if (prev.length > activeOnlySyncMissions.length && status !== DriverStatus.ONLINE && activeOnlySyncMissions.length > 0) {
                  const currentRemainingIds = new Set(activeOnlySyncMissions.map(m => m.id));
                  const isActuallyCompleted = prev.some(m => !currentRemainingIds.has(m.id) && (m.status === 'completed' || m.status === 'cancelled'));
                  
                  if (!isActuallyCompleted) {
                    console.log("🛡️ [POLLING] Protected batch state from partial DB sync.");
                    return prev;
                  }
                }

                return activeOnlySyncMissions;
              });
            } else {
              // Ensure we clear missions if none are found in DB, 
              // BUT ONLY if we are not currently ALERTING (to avoid flickering R$ 3.88)
              if (statusRef.current !== DriverStatus.ALERTING) {
                setActiveMissions([]);
              }
            }
          }

          // 2. Check for PENDING BROADCAST deliveries (only if ONLINE and not full)
          if (status === DriverStatus.ONLINE && activeMissions.length < 3) {
            const { data: allPending } = await supabaseClient.supabase
              .from('deliveries')
              .select('*')
              .eq('status', 'pending')
              .order('created_at', { ascending: true })
              .limit(10);

            if (allPending && allPending.length > 0) {
              // Filter locally: Only public OR targeted to ME
              const availablePending = allPending.filter(d => (!d.driver_id || d.driver_id === userId) && !rejectedMissions.includes(String(d.id)));

              const firstPending = availablePending[0];
              if (firstPending) {
                // If it's a batch, get all missions of that batch
                let missionsToAlert: DeliveryMission[] = [];

                if (firstPending.batch_id) {
                  console.log("📦 Polling detected batch:", firstPending.batch_id);
                  const { data: batchData } = await supabaseClient.supabase
                    .from('deliveries')
                    .select('*')
                    .eq('batch_id', firstPending.batch_id)
                    .eq('status', 'pending');

                  if (batchData && batchData.length > 0) {
                    missionsToAlert = batchData.map(mapDbDeliveryToMission)
                      .sort((a, b) => (a.stopNumber || 1) - (b.stopNumber || 1));
                  } else {
                    // Fallback to the subset if batch fetch fails
                    const batchItems = availablePending.filter(d => d.batch_id === firstPending.batch_id);
                    missionsToAlert = batchItems.map(mapDbDeliveryToMission)
                      .sort((a, b) => (a.stopNumber || 1) - (b.stopNumber || 1));
                  }
                } else {
                  missionsToAlert = [{
                    id: firstPending.id,
                    storeName: firstPending.store_name || 'Loja',
                    storeAddress: firstPending.store_address || '',
                    customerName: firstPending.customer_name || 'Cliente',
                    customerAddress: firstPending.customer_address || '',
                    customerPhoneSuffix: firstPending.customer_phone_suffix || '',
                    items: firstPending.items || [],
                    collectionCode: firstPending.collection_code || '0000',
                    distanceToStore: firstPending.distance_to_store || 0,
                    deliveryDistance: firstPending.delivery_distance || 0,
                    totalDistance: firstPending.total_distance || 0,
                    earnings: parseFloat(firstPending.earnings || '0'),
                    timeLimit: 25,
                    status: firstPending.status || 'pending',
                    isReturnRequired: firstPending.is_return_required || (firstPending.items?.isReturnRequired) || false,
                    storePhone: '',
                    customerPhone: firstPending.customer_phone_suffix ? `+55${firstPending.customer_phone_suffix}` : '',
                    destinationLat: firstPending.destination_lat,
                    destinationLng: firstPending.destination_lng,
                    displayId: getDisplayId(firstPending.items)
                  }];
                }

                setActiveMissions(missionsToAlert);
                setMission(missionsToAlert[0]);
                setBatchHasReturn(missionsToAlert.some(m => m.isReturnRequired));
                setStatus(DriverStatus.ALERTING);
                setAlertCountdown(30);
              }
            }
          }
        } catch (err) {
          console.error("❌ Polling exception:", err);
        }
      };

      checkForDeliveries();
      pollingInterval = setInterval(checkForDeliveries, 5000); // Poll every 5s for batching agility
    }

    return () => clearInterval(pollingInterval);
  }, [status, mission?.id, activeMissions.length, currentUser, rejectedMissions, userId]);


  useEffect(() => {
    let interval: any;
    if (status === DriverStatus.ALERTING && alertCountdown > 0) {
      interval = setInterval(() => setAlertCountdown(prev => prev - 1), 1000);
    } else if (alertCountdown === 0 && status === DriverStatus.ALERTING) {
      setDailyStats(prev => ({ ...prev, rejected: prev.rejected + 1 }));
      setStatus(DriverStatus.ONLINE);
      setMission(null);
    }
    return () => clearInterval(interval);
  }, [status, alertCountdown]);


  // Sucesso Eletrônico: bip duplo rápido
  const playSuccess = () => {
    try {
      const ctx = getAudioCtx();
      const t = ctx.currentTime;
      const beep = (freq: number, delay: number) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(freq, t + delay);
        g.gain.setValueAtTime(0.1, t + delay); g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.1);
        o.connect(g); g.connect(ctx.destination); o.start(t + delay); o.stop(t + delay + 0.12);
      };
      beep(880, 0);   // A5
      beep(1108, 0.1); // C#6
    } catch (e) { /* silencioso */ }
  };

  const playRugido = () => {
    try {
      const sound = new Howl({ src: ['/sounds/rugido-guepardo.mp3'], volume: 1.0 });
      sound.play();
    } catch (e) { console.error('Audio error:', e); }
  };

  // Keep statusRef always up to date so realtime callbacks never read stale closures
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // ─── FAST POLLING: Dedicated watcher for PICKING_UP → in_transit ───────────
  // When the courier is showing the collection code, poll the DB every 3 seconds.
  // This guarantees the automation works even if the Realtime WebSocket misses the event.
  useEffect(() => {
    if (status !== DriverStatus.PICKING_UP || !mission || !userId) return;

    console.log('⏱️ [PICKUP WATCHER] Starting fast-poll for in_transit...');

    const watchInterval = setInterval(async () => {
      try {
        const { data, error } = await supabaseClient.supabase
          .from('deliveries')
          .select('status')
          .eq('id', mission.id)
          .single();

        if (error) {
          console.error('❌ [PICKUP WATCHER] Error polling delivery:', error);
          return;
        }

        console.log(`🔍 [PICKUP WATCHER] DB status: ${data?.status}`);

        if (data?.status === 'in_transit') {
          console.log('🚀 [PICKUP WATCHER] in_transit detected! Auto-transitioning...');
          clearInterval(watchInterval);
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          playSuccess();
          setStatus(DriverStatus.GOING_TO_CUSTOMER);
        }
      } catch (e) {
        console.error('❌ [PICKUP WATCHER] Unexpected error:', e);
      }
    }, 3000); // check every 3 seconds

    return () => {
      console.log('🛑 [PICKUP WATCHER] Stopping fast-poll.');
      clearInterval(watchInterval);
    };
  }, [status, mission?.id, userId]);

  // MONITOR ACTIVE MISSION (ALERTING or IN_PROGRESS)
  // ⚠️  Depends only on mission?.id — NOT on status.
  //     The channel must stay alive across status transitions so
  //     we never miss the 'in_transit' event fired by the Lojista.
  useEffect(() => {
    let subscription: any;

    if (mission) {
      console.log(`👀 Monitoring active mission: ${mission.id}`);

      subscription = supabaseClient.subscribeToActiveMission(mission.id, (payload) => {
        const newStatus = payload.new.status;
        const currentStatus = statusRef.current;
        console.log(`📢 Mission ${mission.id} status update: ${newStatus} (local: ${currentStatus})`);

        if (currentStatus === DriverStatus.ALERTING) {
          const payloadDriverId = payload.new.driver_id;
          if (newStatus !== 'pending' && payloadDriverId !== userId) {
            console.log("⚠️ Alerting mission is no longer pending (taken by someone else). Removing alert.");
            setMission(null);
            setStatus(DriverStatus.ONLINE);
            setAlertCountdown(0);
            if (newStatus === 'cancelled') alert('O pedido foi cancelado pela loja.');
            else alert('Esta entrega acabou de ser aceita por outro entregador.');
          }
        }
        // CASE 2: Active delivery — handle cancellation, completion and merchant validation
        else if (currentStatus !== DriverStatus.ONLINE && currentStatus !== DriverStatus.OFFLINE) {
          if (newStatus === 'cancelled') {
            setMission(null);
            setStatus(DriverStatus.ONLINE);
          } else if (newStatus === 'completed' && (currentStatus === DriverStatus.RETURNING || currentStatus === DriverStatus.ARRIVED_AT_CUSTOMER)) {
            console.log("✅ Return confirmed by merchant.");
            processDeliverySuccess();
          } else if (newStatus === 'ready_for_pickup') {
            console.log("✅ [REALTIME] Store marked order as READY!");
            setIsOrderReady(true);
            // Also force status update to READY_FOR_PICKUP if we were waiting at store
            if (status === DriverStatus.ARRIVED_AT_STORE || status === DriverStatus.PICKING_UP) {
               setStatus(DriverStatus.READY_FOR_PICKUP);
            }
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          } else if (
            newStatus === 'in_transit' &&
            (
              currentStatus === DriverStatus.ARRIVED_AT_STORE ||
              currentStatus === DriverStatus.READY_FOR_PICKUP ||
              currentStatus === DriverStatus.PICKING_UP
            )
          ) {
            console.log("🚀 [REALTIME] Merchant validated code! Auto-transitioning to GOING_TO_CUSTOMER.");
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            playSuccess();
            setStatus(DriverStatus.GOING_TO_CUSTOMER);
          }
        }
      });
    }

    return () => {
      if (subscription) {
        console.log("🛑 Stopping active mission monitoring");
        subscription.unsubscribe();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission?.id]);



  const isProcessingDeliveryRef = useRef(false);
  const processedEarningsIdsRef = useRef<Set<string>>(new Set());

  const processDeliverySuccess = async () => {
    if (!mission || !userId) return;
    
    console.log('✅ Finalizing mission(s) - Clearing states...');
    isCompletingMission.current = true;
    
    if (isProcessingDeliveryRef.current) {
        console.log('⏳ Delivery already processing. Skipping.');
        return;
    }
    isProcessingDeliveryRef.current = true;

    const getNumericId = (m: any) => {
      if (m.displayId) return m.displayId;
      // Fallback robusto e numérico: usa o final do UUID convertido para número se displayId falhar
      const suffix = m.id.slice(-4);
      const numeric = parseInt(suffix, 16);
      return isNaN(numeric) ? suffix : numeric;
    };

    const missionId = `Entrega #${getNumericId(mission)}`;
    // Um ID exclusivo para não contabilizar na volta (mesmo que displayId/missionId seja igual)
    const earningsLockId = `${mission.id}-earnings`;
    
    // ⚠️ Transaction & Earnings logic: Only run if NOT already processed
    const alreadyProcessed = processedEarningsIdsRef.current.has(earningsLockId) || history.some(h => h.type === missionId);

    try {
      if (!alreadyProcessed) {
        processedEarningsIdsRef.current.add(earningsLockId);
        const earned = mission.earnings;

        // 2. Prepare transaction data
        const newTransaction: Transaction = {
          id: Math.random().toString(36).substr(2, 9),
          type: missionId,
          amount: earned,
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          date: 'Hoje',
          weekId: 'current',
          status: 'COMPLETED',
          details: {
            duration: '15 min',
            stops: 2,
            timeline: generateTimeline(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
          }
        };

        // 3. Save to Supabase (Transaction & Stats)
        console.log('💰 Creating transaction...', newTransaction);
        await supabaseClient.createTransaction({
          id: newTransaction.id,
          type: newTransaction.type,
          amount: newTransaction.amount,
          status: newTransaction.status,
          week_id: newTransaction.weekId,
          user_id: userId,
          details: newTransaction.details
        });

        console.log('📊 Updating daily stats...', { userId, earnings: earned });
        await supabaseClient.updateDailyStats(userId, {
          finished: 1,
          earnings: earned
        });

        // 4. Update local earnings state
        setBalance(prev => prev + earned);
        setDailyEarnings(prev => prev + earned);
        setLastEarnings(earned);
        setBatchEarnings(prev => prev + earned);
        setDailyStats(prev => ({ ...prev, finished: prev.finished + 1 }));
        setHistory(prev => [newTransaction, ...prev]);
        console.log('✅ Transaction and Earnings recorded.');
      } else {
        console.log('ℹ️ Mission already in history, skipping transaction creation.');
      }

      // 🎯 ALWAYS UPDATE MISSION STATUS AND CLEANUP STATE (Essential for Return Finalization)
      console.log('🎯 Updating mission status in database...', { missionId: mission.id, status });
      
      if (mission.isReturnRequired && status !== DriverStatus.RETURNING) {
        await supabaseClient.supabase
          .from('deliveries')
          .update({ status: 'returning' })
          .eq('id', mission.id)
          .eq('driver_id', userId);
        console.log('✅ Mission set to returning (awaiting end of batch)');
      } else {
        // 🎯 INDIVIDUAL MISSION FINALIZATION: Complete only the current mission
        await supabaseClient.completeMission(mission.id, userId);
        console.log('✅ Mission completed (phase finalized)');

      }

      // 🎯 FORCE RELIABLE STATE BY FETCHING DIRECTLY FROM DATABASE
      // This eliminates all React state batching and stale closure issues across the multi-stop sequencing.
      const ACTIVE_DELIVERY_STATUSES = ['pending', 'accepted', 'arrived_pickup', 'picking_up', 'in_transit', 'arrived_at_customer', 'ready_for_pickup'];
      
      // Look for missions assigned to me OR belonging to the same batch (even if somehow missing driver_id)
      let query = supabaseClient.supabase
        .from('deliveries')
        .select('*')
        .in('status', [...ACTIVE_DELIVERY_STATUSES, 'returning']);
      
      if (mission.batch_id) {
        query = query.or(`driver_id.eq.${userId},batch_id.eq.${mission.batch_id}`);
      } else {
        query = query.eq('driver_id', userId);
      }

      const { data: remainingMissions, error: fetchErr } = await query.order('stop_number', { ascending: true });

      if (fetchErr) {
        console.error('Error fetching remaining missions:', fetchErr);
        throw fetchErr;
      }

      const syncMissions: DeliveryMission[] = (remainingMissions || [])
        .map(mapDbDeliveryToMission)
        .sort((a,b) => (a.stopNumber || 0) - (b.stopNumber || 0));

      console.log('📝 Reliable DB Missions Remaining:', syncMissions.length, syncMissions.map(m => `${m.id.slice(-4)}:${m.status}`));
      
      setActiveMissions(syncMissions);

      const pendingOrTransit = syncMissions.filter(m => ACTIVE_DELIVERY_STATUSES.includes(m.status));
      const hasReturnMissions = syncMissions.some(m => m.status === 'returning');

      console.log('🧐 Flow Decision:', { pendingOrTransit: pendingOrTransit.length, hasReturnMissions });

      // The driver ONLY returns to store if there are ABSOLUTELY NO MORE pending/transit deliveries in the WHOLE batch/session
      if (pendingOrTransit.length > 0) {
        const nextToMove = pendingOrTransit[0];
        
        // If we just finished a stop at a store, we should check if the next one is from the SAME store
        // If it is, we are already "in_transit" for it usually
        const newTargetStatus = nextToMove.storeName === mission.storeName 
          ? DriverStatus.GOING_TO_CUSTOMER 
          : DriverStatus.GOING_TO_STORE;
        
        console.log(`➡️ Sequencing to next delivery stop: ${nextToMove.id.slice(-4)}, Target Status: ${newTargetStatus}`);
        setStatus(newTargetStatus);
        setMission(nextToMove);
        setShowPostDeliveryModal(false);
      } else if (hasReturnMissions) {
        // If no more deliveries, but some deliveries need return phase
        const nextToMove = syncMissions.find(m => m.status === 'returning') || syncMissions[0];
        console.log(`🔙 No more deliveries. Entering return phase for mission: ${nextToMove.id.slice(-4)}`);
        setStatus(DriverStatus.RETURNING);
        setMission(nextToMove);
        setShowPostDeliveryModal(false);
      } else {
        console.log('✨ All missions including returns finished. Returning to ONLINE.');
        setStatus(DriverStatus.ONLINE);
        setMission(null);
        setBatchHasReturn(false);
        setActiveMissions([]);
        playRugido();
        setShowPostDeliveryModal(true);
        setIsNavigating(false);
      }

      console.log('🚀 Success processing finished.');
      isCompletingMission.current = false;

    } catch (error: any) {
      console.error('Error completing mission:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });

      // Show more specific error message
      const errorMsg = error?.message || 'Erro desconhecido';
      alert(`Erro ao finalizar entrega: ${errorMsg}\n\nTente novamente.`);
    } finally {
      isCompletingMission.current = false;
      setTimeout(() => {
        isProcessingDeliveryRef.current = false;
      }, 1000);
    }
  };

  const handleFinishDelivery = () => {
    if (!mission) return;
    processDeliverySuccess();
  };


  const handleAnticipateRequest = async () => {
    if (!userId) return;
    setIsAnticipating(true);
    try {
      if (balance <= 0) {
        alert("Você não possui saldo suficiente para realizar um repasse.");
        setIsAnticipating(false);
        return;
      }
      const amountToWithdraw = balance;
      const fee = 0; // Taxa suspensa
      const netAmount = amountToWithdraw;

      await supabaseClient.createWithdrawalRequest({
        user_id: userId as string,
        amount: amountToWithdraw,
        pix_key: currentUser.bank.pixKey || '',
        pix_key_type: 'PIX', // Poderiamos expandir isso se necessário
        bank_name: currentUser.bank.name || '',
        bank_agency: currentUser.bank.agency || '',
        bank_account: currentUser.bank.account || '',
        bank_type: currentUser.bank.type || '',
        status: 'pending'
      });

      // Recarregar saldo e histórico para refletir a transação pendente
      const newBalance = await supabaseClient.getBalance(userId as string);
      setBalance(newBalance);
      
      const transactions = await supabaseClient.getTransactions(userId);
      if (transactions) {
        setHistory(transactions.map((t: any) => ({
          ...t,
          date: new Date(t.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
          time: new Date(t.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          weekId: t.week_id || 'current'
        })) as Transaction[]);
      }

      setIsAnticipating(false);
      setShowSuccessAnticipation(true);
    } catch (error) {
      console.error('Erro ao processar saque:', error);
      setIsAnticipating(false);
      // Poderiamos mostrar um alerta de erro aqui
    }
  };

  const handleCodeChange = (index: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    const newCode = [...typedCode];
    newCode[index] = val;
    setTypedCode(newCode);
    if (val && index < 3) codeInputRefs[index + 1].current?.focus();
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      otpInputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !typedCode[index] && index > 0) {
      codeInputRefs[index - 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs[index - 1].current?.focus();
    }
  };

  const isCodeValid = () => {
    if (!mission) return false;
    
    if (status === DriverStatus.ARRIVED_AT_CUSTOMER) {
      // Validação do código de entrega (4 últimos dígitos do telefone do cliente)
      const codeStr = typedCode.join('');
      const cleanedSuffix = String(mission.customerPhoneSuffix || '').replace(/\D/g, '').slice(-4);
      const isMatch = codeStr === cleanedSuffix;

      if (codeStr.length === 4 && !isMatch) {
        console.log("Validation mismatch:", { entered: codeStr, expected: cleanedSuffix, raw: mission.customerPhoneSuffix });
      }
      return isMatch;
    }
    
    return true; // Para os demais estados (como PICKING_UP), o código é apenas exibido
  };

  const applyCpfMask = (value: string) => {
    let v = value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return v;
  };

  const cardBg = theme === 'dark' ? 'bg-[#1a0a05] border-[#FF6B00]/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]' : 'bg-white border-zinc-200 shadow-sm';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-zinc-900';
  const textMuted = theme === 'dark' ? 'text-[#8b7d77]' : 'text-zinc-400';
  const innerBg = theme === 'dark' ? 'bg-[#0f0502]' : 'bg-zinc-100';
  const isFilterActive = backHome || maxDistance < 30 || minPrice > 0;



  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (e) {
      console.error('Geocoding error:', e);
    }
    return null;
  };

  const handleAcceptMission = async () => {
    if ((!mission && activeMissions.length === 0) || !userId) return;
    setBatchEarnings(0); // Reset batch earnings total
    try {
      const sourceMission = mission || activeMissions[0];
      let idsToAccept = activeMissions.map(m => m.id);

      // --- SHIELDED ACCEPT: Fetch ALL siblings from DB if it's a batch ---
      if (sourceMission.batch_id) {
        console.log(`🛡️ [SHIELDED ACCEPT] Fetching all siblings for batch ${sourceMission.batch_id}...`);
        const { data: allBatchItems } = await supabaseClient.supabase
          .from('deliveries')
          .select('id')
          .eq('batch_id', sourceMission.batch_id)
          .eq('status', 'pending');
        
        if (allBatchItems && allBatchItems.length > 0) {
          idsToAccept = Array.from(new Set([...idsToAccept, ...allBatchItems.map(item => item.id)]));
        }
      }

      console.log(`🎯 Atomic acceptance for ${idsToAccept.length} missions:`, idsToAccept);

      // 1. Perform atomic update for all missions
      const { error: acceptError } = await supabaseClient.supabase
        .from('deliveries')
        .update({ 
          driver_id: userId, 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', idsToAccept);

      if (acceptError) throw acceptError;
      console.log('✅ Missions accepted successfully in DB');

      // 2. Fetch fresh state for the batch to ensure total consistency
      const { data: freshBatch } = await supabaseClient.supabase
        .from('deliveries')
        .select('*')
        .in('id', idsToAccept);
      
      const mappedActive: DeliveryMission[] = (freshBatch || []).map(mapDbDeliveryToMission)
        .sort((a, b) => (a.stopNumber || 0) - (b.stopNumber || 0));

      setActiveMissions(mappedActive);
      setMission(mappedActive[0]);
      setBatchHasReturn(mappedActive.some(m => m.isReturnRequired));
      setDailyStats(s => ({ ...s, accepted: s.accepted + mappedActive.length }));
      setStatus(DriverStatus.GOING_TO_STORE);

      // Stop the sound immediately
      if (alertAudioRef.current) {
        console.log("🔇 Manual stop in handleAcceptMission");
        alertAudioRef.current.stop();
      }

      // Pre-geocode both addresses in parallel for instant route switching
      if (mappedActive.length > 0) {
        const targetMission = mappedActive[0];
        const [storeCoords, customerCoords] = await Promise.all([
          targetMission.storeAddress ? geocodeAddress(targetMission.storeAddress) : Promise.resolve(null),
          (targetMission.destinationLat && targetMission.destinationLng)
            ? Promise.resolve({ lat: targetMission.destinationLat, lng: targetMission.destinationLng })
            : (targetMission.customerAddress ? geocodeAddress(targetMission.customerAddress) : Promise.resolve(null))
        ]);
        console.log('📍 Precise/Geocoded store:', storeCoords, '| customer:', customerCoords);
        setPreloadedCoords({ store: storeCoords, customer: customerCoords });
        setIsNavigating(true);

        // Auto-open external map if preferred
        if (currentUser.preferredMap === 'google') {
          openNavigation('google');
        } else if (currentUser.preferredMap === 'waze') {
          openNavigation('waze');
        }
      }
    } catch (error: any) {
      console.error('❌ Error accepting mission:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      alert('Esta entrega já foi aceita por outro entregador ou não está mais disponível.');
      setStatus(DriverStatus.ONLINE);
      setMission(null);
      setPreloadedCoords({ store: null, customer: null }); // Clear preloaded coords on error
      setIsNavigating(false);
    }
  };

  const handleRejectMission = async () => {
    if ((!mission && activeMissions.length === 0) || !userId) return;

    const missionsToReject = activeMissions.length > 0 ? activeMissions : (mission ? [mission] : []);
    const rejectedIds = missionsToReject.map(m => m.id);

    // Add to local rejected list and persist to localStorage
    const newRejectedList = [...rejectedMissions, ...rejectedIds];
    setRejectedMissions(newRejectedList);
    localStorage.setItem('rejectedMissions', JSON.stringify(newRejectedList));

    await Promise.all(missionsToReject.map(m => supabaseClient.rejectMission(m.id, userId)));
    setDailyStats(prev => ({ ...prev, rejected: prev.rejected + missionsToReject.length }));
    setStatus(DriverStatus.ONLINE);
    setMission(null);
    setActiveMissions([]);
    setIsNavigating(false);

    // Stop the sound
    if (alertAudioRef.current) {
      alertAudioRef.current.stop();
    }
  };

  const handleMainAction = async () => {
    if (status === DriverStatus.GOING_TO_STORE) {
      // PROMISE: Check status before updating
      if (mission && userId) {
        try {
          const { data: currentDelivery, error: fetchError } = await supabaseClient.supabase
            .from('deliveries')
            .select('status')
            .eq('id', mission.id)
            .single();

          if (fetchError) throw fetchError;

          if (currentDelivery.status === 'cancelled') {
            alert('❌ Este pedido foi cancelado pela loja!');
            setMission(null);
            setStatus(DriverStatus.ONLINE);
            return;
          }

          // Update database when courier arrives at store
          await supabaseClient.supabase
            .from('deliveries')
            .update({ status: 'arrived_pickup' })
            .eq('id', mission.id)
            .eq('driver_id', userId);
          console.log('✅ Updated delivery status to arrived_pickup');
          setStatus(DriverStatus.ARRIVED_AT_STORE);
        } catch (error) {
          console.error('❌ Error updating delivery status:', error);
          alert('Erro ao atualizar status. Verifique sua conexão.');
        }
      }
    }
    else if (status === DriverStatus.ARRIVED_AT_STORE || status === DriverStatus.READY_FOR_PICKUP) {
      // Fix Bug 3: Persistir 'picking_up' no banco para evitar que o polling (5s) reverta
      // o status para ARRIVED_AT_STORE ao ler 'arrived_pickup' desatualizado do servidor.
      if (mission && userId) {
        supabaseClient.supabase
          .from('deliveries')
          .update({ status: 'picking_up' })
          .eq('id', mission.id)
          .eq('driver_id', userId)
          .then(({ error }) => {
            if (error) console.error('❌ Erro ao salvar status picking_up:', error);
            else console.log('✅ Status atualizado para picking_up no banco');
          });
      }
      setStatus(DriverStatus.PICKING_UP);
    }
    else if (status === DriverStatus.PICKING_UP && isCodeValid()) {
      // Update database status to in_transit when pickup code is validated
      if (mission && userId) {
        try {
          await supabaseClient.supabase
            .from('deliveries')
            .update({ status: 'in_transit' })
            .eq('id', mission.id)
            .eq('driver_id', userId);
          console.log('✅ Updated delivery status to in_transit after code validation');

          // --- FIX BUG #2: BATCHING AGILITY & BULK TRANSIT ---
          // Mark ALL missions of this batch from the same store as in_transit
          const { data: batchItemsToUpdate } = await supabaseClient.supabase
            .from('deliveries')
            .select('id, status, store_name')
            .eq('driver_id', userId)
            .in('status', ['accepted', 'arrived_pickup', 'picking_up', 'ready_for_pickup']);
          
          const sameStoreItems = (batchItemsToUpdate || []).filter(m => m.store_name === mission.storeName);
          const sameStoreIds = sameStoreItems.map(m => m.id);

          if (sameStoreIds.length > 0) {
            console.log(`📦 Marking ${sameStoreIds.length} batch items as in_transit...`);
            await supabaseClient.supabase
              .from('deliveries')
              .update({ status: 'in_transit' })
              .in('id', sameStoreIds);
          }

          const othersAtStore = sameStoreItems.filter(m => m.id !== mission.id);
          
          if (othersAtStore.length > 0) {
            console.log(`📦 Still have ${othersAtStore.length} items to pick up at the same store. Staying in PICKING_UP.`);
            // Update local state to next mission in batch
            const nextMissionId = othersAtStore[0].id;
            const updatedActive = activeMissions.map(m => m.id === mission.id ? { ...m, status: 'in_transit' } : m);
            setActiveMissions(updatedActive);
            const nextM = updatedActive.find(m => m.id === nextMissionId);
            if (nextM) setMission(nextM);
            // Stay in PICKING_UP, but reset code input
            setTypedCode(['', '', '', '']);
          } else {
            console.log('🚀 All items for this store collected! Transitioning to GOING_TO_CUSTOMER.');
            // Update local mission status before transitioning global state
            const updatedActive = activeMissions.map(m => m.id === mission.id ? { ...m, status: 'in_transit' } : m);
            setActiveMissions(updatedActive);
            setStatus(DriverStatus.GOING_TO_CUSTOMER);
          }
        } catch (error) {
          console.error('❌ Error updating delivery status:', error);
          setStatus(DriverStatus.GOING_TO_CUSTOMER); // Fallback to avoid getting stuck
        }
      } else {
        setStatus(DriverStatus.GOING_TO_CUSTOMER);
      }
    }
    else if (status === DriverStatus.GOING_TO_CUSTOMER) {
      // Update database when courier arrives at customer
      if (mission && userId) {
        try {
          await supabaseClient.supabase
            .from('deliveries')
            .update({ status: 'arrived_at_customer' })
            .eq('id', mission.id)
            .eq('driver_id', userId);
          console.log('✅ Updated delivery status to arrived_at_customer');
        } catch (error) {
          console.error('❌ Error updating delivery status:', error);
        }
      }
      setStatus(DriverStatus.ARRIVED_AT_CUSTOMER);
    }
    else if (mission && status === DriverStatus.ARRIVED_AT_CUSTOMER && isCodeValid()) {
      handleFinishDelivery();
    }
  };


  // ---------------- AUTH HANDLERS ----------------
  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      alert("Preencha E-mail e Senha.");
      return;
    }
    setIsLoadingAuth(true);
    try {
      const { user } = await supabaseClient.signIn(loginEmail, loginPassword);
      if (user) {
        setUserId(user.id);
        setIsAuthenticated(true);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      alert(error.message || "Erro ao fazer login. Verifique suas credenciais.");
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    // Instead of registering directly, start the onboarding wizard flow
    setOnboardingScreen('CITY_SELECTION');
  };

  const handleVerifyCode = () => {
    const code = otp.join('');
    if (code.length < 6) return;
    setIsLoadingAuth(true);
    setTimeout(() => {
      setIsLoadingAuth(false);
      if (code === '123456') {
        const newUser = {
          ...pendingUser,
          verified: true,
          level: 'Guepardo PRO' // Nível fixo para novos usuários
        };
        setRegisteredUsers(prev => [...prev, newUser]);
        setPendingUser(null);
        alert("Conta verificada com sucesso! Faça login.");
        setAuthScreen('LOGIN');
      } else {
        alert("Código inválido. Tente novamente. (Dica: use 123456)");
        setOtp(['', '', '', '', '', '']);
        otpInputRefs[0].current?.focus();
      }
    }, 1500);
  };

  const handleResendCode = () => {
    if (otpTimer > 0) return;
    setOtpTimer(60);
    alert(`Novo código enviado para ${pendingUser?.email}`);
  };

  const handleRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingAuth(true);
    setTimeout(() => {
      setIsLoadingAuth(false);
      alert(`Link de recuperação enviado para: ${recoveryInput}`);
      setAuthScreen('LOGIN');
    }, 1500);
  };

  // ---------------- ONBOARDING HANDLERS ----------------

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    setOnboardingScreen('WIZARD');
  };

  const handleWizardComplete = async (wizardData: WizardData) => {
    setIsLoadingAuth(true);
    try {
      // Add selected city to wizard data
      const completeData = {
        ...wizardData,
        workCity: selectedCity
      };

      await processWizardRegistration(completeData);
 
      // Instead of alert, show the dedicated pending approval screen
      setAuthScreen('PENDING_APPROVAL');
      setOnboardingScreen(null);
      setSelectedCity('');
    } catch (error: any) {
      console.error('Wizard registration error:', error);
      alert(error.message || "Erro ao completar cadastro. Tente novamente.");
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleWizardCancel = () => {
    setOnboardingScreen(null);
    setSelectedCity('');
    setAuthScreen('LOGIN');
  };


  const unreadCount = notifications.filter(n => !n.read).length;

  const handleOpenNotifications = () => {
    setCurrentScreen('NOTIFICATIONS');
    setNotificationsSeen(true);
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.FINANCIAL: return { icon: 'fa-sack-dollar', color: 'text-green-500', bg: 'bg-green-500/10' };
      case NotificationType.URGENT: return { icon: 'fa-triangle-exclamation', color: 'text-red-500', bg: 'bg-red-500/10' };
      case NotificationType.PROMOTION: return { icon: 'fa-fire', color: 'text-[#FF6B00]', bg: 'bg-[#FF6B00]/10' };
      case NotificationType.SYSTEM: return { icon: 'fa-circle-info', color: 'text-zinc-400', bg: 'bg-zinc-500/10' };
    }
  };

  const renderAuthScreen = () => {
    const inputStyle: React.CSSProperties = {
      background: 'rgba(255,255,255,0.07)',
      border: '1px solid rgba(255,140,40,0.2)',
      backdropFilter: 'blur(8px)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
    };
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = 'rgba(255,140,40,0.6)'; };
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = 'rgba(255,140,40,0.2)'; };

    return (
      <div
        className="min-h-full w-full flex flex-col relative overflow-hidden bg-transparent"
      >
        {/* ── WATERMARK: logo 60% tela, canto superior direito, desfocado ── */}
        <div
          className="absolute -top-16 -right-20 w-[65vw] max-w-[380px] pointer-events-none select-none"
          style={{ opacity: 0.11, filter: 'blur(2px) saturate(0.5)' }}
          aria-hidden
        >
          <img src="/guepardo-loading.png" alt="Guepardo Delivery" className="w-full h-auto object-contain" draggable={false} />
        </div>

        {/* ── Textura de grão sutil ── */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3Cfilter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
            mixBlendMode: 'overlay', opacity: 0.5,
          }}
        />

        {/* ── Ambient glow ── */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(200,80,10,0.22) 0%, transparent 65%)' }}
        />

        {/* ── CONTEÚDO PRINCIPAL ── */}
        <div className="relative z-10 flex flex-col h-full overflow-y-auto px-6">

          {/* Hero Logo */}
          <div className="flex flex-col items-center pt-14 pb-5 shrink-0">
            <img
              src="/cheetah-icon.png"
              alt="Guepardo Delivery"
              className="w-56 object-contain"
              style={{ filter: 'drop-shadow(0 16px 48px rgba(200,80,10,0.65)) drop-shadow(0 4px 12px rgba(0,0,0,0.7))' }}
            />
            <p className="mt-2 text-2xl font-black uppercase tracking-wider" style={{ color: 'white', textShadow: '0 2px 12px rgba(200,80,10,0.7)' }}>
              Guepardo <span style={{ color: '#FF8C28' }}>Delivery</span>
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.6em] mt-0.5" style={{ color: 'rgba(255,190,80,0.6)' }}>
              ENTREGADOR
            </p>
          </div>


          {/* Divider */}
          <div className="w-full flex items-center gap-3 mb-6 shrink-0">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(255,140,40,0.35))' }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF8C28', boxShadow: '0 0 8px 2px rgba(255,140,40,0.6)' }} />
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(255,140,40,0.35))' }} />
          </div>

          {/* ── TELA DE LOGIN ── */}
          {authScreen === 'LOGIN' && (
            <div className="flex flex-col gap-4">
              <div className="mb-2">
                <h1 className="text-3xl font-black text-white tracking-tight leading-tight">
                  Bem-vindo<br /><span style={{ color: '#FF8C28' }}>de volta!</span>
                </h1>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Acesse o app do entregador.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>E-mail</label>
                <input
                  type="email" placeholder="seu@email.com"
                  value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                  className="w-full h-14 rounded-2xl px-5 text-sm font-medium text-white placeholder-white/20 outline-none transition-all"
                  style={inputStyle} onFocus={handleFocus} onBlur={handleBlur}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Senha</label>
                <input
                  type="password" placeholder="••••••••"
                  value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                  className="w-full h-14 rounded-2xl px-5 text-sm font-medium text-white placeholder-white/20 outline-none transition-all"
                  style={inputStyle} onFocus={handleFocus} onBlur={handleBlur}
                />
              </div>

              <button
                onClick={handleLogin} disabled={isLoadingAuth}
                className="w-full h-14 rounded-2xl font-black text-white text-base uppercase tracking-widest mt-1 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #FF7A20 0%, #E55B00 100%)',
                  boxShadow: '0 8px 32px rgba(229,91,0,0.4), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,180,80,0.3)',
                }}
              >
                {isLoadingAuth ? <i className="fas fa-circle-notch fa-spin" /> : 'Entrar'}
              </button>

              <div className="flex items-center justify-between pt-1">
                <button onClick={() => { playClick(); setAuthScreen('RECOVERY'); }} className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Esqueci minha senha
                </button>
                <button onClick={() => { playClick(); setOnboardingScreen('CITY_SELECTION'); }} className="text-xs font-bold" style={{ color: '#FF8C28', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Cadastre-se →
                </button>
              </div>
            </div>
          )}

          {/* ── TELA DE CADASTRO ── */}
          {authScreen === 'REGISTER' && (
            <form onSubmit={handleRegister} className="flex flex-col gap-3">
              <div className="flex items-center justify-between mb-2">
                <button type="button" onClick={() => setAuthScreen('LOGIN')} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                  <i className="fas fa-chevron-left text-sm" />
                </button>
                <h2 className="text-xl font-black text-white italic">Criar Conta</h2>
                <div className="w-8" />
              </div>
              <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
                {[
                  { placeholder: 'Nome Completo', type: 'text', value: registerData.name, field: 'name' },
                  { placeholder: 'CPF', type: 'text', value: registerData.cpf, field: 'cpf' },
                  { placeholder: 'E-mail', type: 'email', value: registerData.email, field: 'email' },
                  { placeholder: 'Celular', type: 'tel', value: registerData.phone, field: 'phone' },
                  { placeholder: 'Senha', type: 'password', value: registerData.password, field: 'password' },
                  { placeholder: 'Confirmar Senha', type: 'password', value: registerData.confirmPassword, field: 'confirmPassword' },
                ].map(f => (
                  <input
                    key={f.field} type={f.type} placeholder={f.placeholder} value={f.value}
                    onChange={e => setRegisterData({ ...registerData, [f.field]: f.field === 'cpf' ? applyCpfMask(e.target.value) : e.target.value })}
                    className="w-full h-12 rounded-xl px-4 text-sm font-medium text-white placeholder-white/20 outline-none transition-all"
                    style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} required
                  />
                ))}
              </div>
              <div className="px-3 py-2 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,140,40,0.12)' }}>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Ao criar sua conta, você concorda com os{' '}
                  <a href="https://guepardodelivery.com.br/termos" target="_blank" rel="noopener noreferrer" style={{ color: '#FF8C28' }}>Termos de Uso</a>{' '}e{' '}
                  <a href="https://guepardodelivery.com.br/privacidade" target="_blank" rel="noopener noreferrer" style={{ color: '#FF8C28' }}>Política de Privacidade</a>.
                </p>
              </div>
              <button type="submit" disabled={isLoadingAuth}
                className="w-full h-14 rounded-2xl font-black text-white uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #FF7A20 0%, #E55B00 100%)', boxShadow: '0 8px 32px rgba(229,91,0,0.4), inset 0 1px 0 rgba(255,180,80,0.3)' }}
              >
                {isLoadingAuth ? <i className="fas fa-circle-notch fa-spin" /> : 'Continuar'}
              </button>
            </form>
          )}

          {/* ── VERIFICAÇÃO OTP ── */}
          {authScreen === 'VERIFICATION' && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setAuthScreen('REGISTER')} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                  <i className="fas fa-chevron-left text-sm" />
                </button>
                <h2 className="text-xl font-black text-white italic">Verificar E-mail</h2>
                <div className="w-8" />
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(255,107,0,0.12)', border: '1px solid rgba(255,107,0,0.3)' }}>
                  <i className="fas fa-envelope-open-text text-2xl text-[#FF6B00]" />
                </div>
                <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>Enviamos um código para<br /><span className="text-white">{pendingUser?.email}</span></p>
              </div>
              <div className="flex justify-center space-x-2">
                {otp.map((digit, index) => (
                  <input
                    key={index} ref={otpInputRefs[index]}
                    type="text" inputMode="numeric" maxLength={1} value={digit}
                    onChange={e => handleOtpChange(index, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(index, e)}
                    className="w-12 h-14 rounded-xl text-center text-xl font-black outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.07)', border: `2px solid ${digit ? '#FF6B00' : 'rgba(255,140,40,0.2)'}`, color: digit ? '#FF8C28' : 'white' }}
                  />
                ))}
              </div>
              <button onClick={handleVerifyCode} disabled={isLoadingAuth || otp.some(d => !d)}
                className="w-full h-14 rounded-2xl font-black text-white uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #FF7A20 0%, #E55B00 100%)', boxShadow: '0 8px 32px rgba(229,91,0,0.4), inset 0 1px 0 rgba(255,180,80,0.3)' }}
              >
                {isLoadingAuth ? <i className="fas fa-circle-notch fa-spin" /> : 'Confirmar Código'}
              </button>
              <div className="text-center">
                <button onClick={handleResendCode} disabled={otpTimer > 0} className="text-[11px] font-black uppercase tracking-widest" style={{ color: otpTimer > 0 ? 'rgba(255,255,255,0.3)' : '#FF8C28', background: 'none', border: 'none', cursor: otpTimer > 0 ? 'default' : 'pointer' }}>
                  {otpTimer > 0 ? `Reenviar em ${otpTimer}s` : 'Reenviar Código'}
                </button>
              </div>
            </div>
          )}

          {/* ── AGUARDANDO APROVAÇÃO ── */}
          {authScreen === 'PENDING_APPROVAL' && (
            <div className="flex flex-col items-center justify-center py-10 text-center animate-in zoom-in duration-500">
              <div className="w-24 h-24 bg-[#FF6B00]/10 rounded-full flex items-center justify-center mb-8 border border-[#FF6B00]/30 shadow-2xl shadow-orange-900/20">
                <i className="fas fa-clock text-4xl text-[#FF6B00] animate-pulse"></i>
              </div>
              <h2 className="text-3xl font-black italic mb-4 text-white uppercase">Conta em Análise</h2>
              <p className="text-zinc-400 font-bold mb-10 uppercase text-xs tracking-[0.2em] leading-relaxed">
                Seu cadastro foi recebido com sucesso!<br/>
                Estamos analisando seus documentos.<br/>
                <span className="text-[#FF6B00]">Aguardando aprovação do APP Guepardo Central.</span>
              </p>
              
              <div className="w-full bg-[#1a0a05]/50 p-6 rounded-[32px] border border-[#FF6B00]/10 mb-10">
                <p className="text-[#8b7d77] font-black text-[10px] uppercase mb-2">Status do Perfil</p>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                  <p className="text-lg font-black text-orange-500 italic uppercase">Pendente</p>
                </div>
              </div>

              <button 
                onClick={() => { 
                  supabaseClient.signOut(); 
                  setIsAuthenticated(false); 
                  setUserId(null);
                  setAuthScreen('LOGIN'); 
                }} 
                className="w-full h-16 bg-[#1a0c06] rounded-2xl font-black text-white uppercase italic tracking-widest shadow-xl active:scale-95 transition-transform"
              >
                Voltar ao Login
              </button>
              
              <p className="mt-8 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                Guepardo Logística © 2026
              </p>
            </div>
          )}

          {/* ── RECUPERAÇÃO DE SENHA ── */}
          {authScreen === 'RECOVERY' && (
            <form onSubmit={handleRecovery} className="flex flex-col gap-4">
              <div className="flex items-center justify-between mb-1">
                <button type="button" onClick={() => setAuthScreen('LOGIN')} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                  <i className="fas fa-chevron-left text-sm" />
                </button>
                <h2 className="text-xl font-black text-white italic">Recuperar Senha</h2>
                <div className="w-8" />
              </div>
              <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>Informe seus dados para receber um link de redefinição.</p>
              <div className="flex rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,140,40,0.15)' }}>
                <button type="button" onClick={() => setRecoveryMethod('cpf')} className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl"
                  style={{ background: recoveryMethod === 'cpf' ? 'linear-gradient(135deg,#FF7A20,#E55B00)' : 'transparent', color: recoveryMethod === 'cpf' ? 'white' : 'rgba(255,255,255,0.4)' }}>Via CPF</button>
                <button type="button" onClick={() => setRecoveryMethod('email')} className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl"
                  style={{ background: recoveryMethod === 'email' ? 'linear-gradient(135deg,#FF7A20,#E55B00)' : 'transparent', color: recoveryMethod === 'email' ? 'white' : 'rgba(255,255,255,0.4)' }}>Via E-mail</button>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>{recoveryMethod === 'cpf' ? 'Seu CPF' : 'Seu E-mail'}</label>
                <input type={recoveryMethod === 'cpf' ? 'text' : 'email'} value={recoveryInput}
                  onChange={e => setRecoveryInput(e.target.value)}
                  placeholder={recoveryMethod === 'cpf' ? '000.000.000-00' : 'exemplo@email.com'}
                  className="w-full h-14 rounded-2xl px-5 text-sm font-medium text-white placeholder-white/20 outline-none transition-all"
                  style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} required
                />
              </div>
              <button type="submit" disabled={isLoadingAuth}
                className="w-full h-14 rounded-2xl font-black text-white uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #FF7A20 0%, #E55B00 100%)', boxShadow: '0 8px 32px rgba(229,91,0,0.4), inset 0 1px 0 rgba(255,180,80,0.3)' }}
              >
                {isLoadingAuth ? <i className="fas fa-circle-notch fa-spin" /> : 'Enviar Link'}
              </button>
            </form>
          )}

          {/* Rodapé */}
          <div className="mt-auto pt-8 pb-6 text-center shrink-0">
            <p className="text-[10px] tracking-widest" style={{ color: 'rgba(255,255,255,0.15)' }}>
              © 2026 Guepardo Delivery · Todos os direitos reservados
            </p>
          </div>
        </div>
      </div>
    );
  };


  const renderScreen = () => {
    switch (currentScreen) {
      case 'HOME': {
        return (
          <div className="flex flex-col h-full relative overflow-hidden">
            <div className="flex-1 relative">
              {isNavigating ? (
                <MapNavigation
                  status={status}
                  theme={mapTheme}
                  onUpdateMetrics={(m) => setNavMetrics(m)}
                  isMissionOverlayExpanded={isMissionOverlayExpanded}
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
                  // Pass pre-geocoded coords for instant route switch (no geocoding delay)
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
                  onUpdateMetrics={(metrics) => setNavMetrics(metrics)}
                  isMissionOverlayExpanded={isMissionOverlayExpanded}
                  currentLocation={currentLocation}
                />
            )}

            {mission && status !== DriverStatus.ALERTING && (
              <div className="absolute bottom-0 left-0 right-0 z-[1001] flex transition-all duration-500">
                <div className={`w-full rounded-t-[44px] shadow-[0_-15px_50px_rgba(0,0,0,0.6)] border-t border-white/10 transition-all flex flex-col overflow-hidden ${((status === DriverStatus.GOING_TO_STORE || status === DriverStatus.GOING_TO_CUSTOMER) && !isMissionOverlayExpanded) ? 'p-4 pb-8' : 'p-6 pb-10'} ${cardBg}`}>
                  


                  {/* Original Print 3 style Compact Header */}
                  {((status === DriverStatus.GOING_TO_STORE || status === DriverStatus.GOING_TO_CUSTOMER) && !isMissionOverlayExpanded) ? (
                    /* Exact Screenshot Replica Mode */
                    <div onClick={() => setIsMissionOverlayExpanded(true)} className="flex flex-col items-center justify-center py-2 cursor-pointer active:scale-95 transition-all text-center">
                      <div className="w-12 h-1 bg-zinc-700/60 rounded-full mb-5" />
                      
                      <h3 className="text-white text-base font-bold mb-1">
                        {status === DriverStatus.GOING_TO_STORE ? 'Caminho da Loja' : 'Entrega em andamento'}
                      </h3>
                      
                      <div className="flex items-center justify-center space-x-2 text-[#FF6B00] text-sm font-bold">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B00]" />
                        <span>Chegada prevista: {navMetrics?.time || '-- min'}</span>
                      </div>
                    </div>
                  ) : (
                    /* Standard Expanded Mode */
                    <>
                      <div className="flex items-start justify-between mb-6 shrink-0 gap-4">
                        {/* Left Column: Status & Value */}
                        <div className="flex flex-col space-y-2">
                          <span className={`w-fit px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest italic ${status === DriverStatus.ARRIVED_AT_STORE || status === DriverStatus.PICKING_UP || status === DriverStatus.READY_FOR_PICKUP || status === DriverStatus.ARRIVED_AT_CUSTOMER ? 'bg-[#FFD700] text-black shadow-[0_4px_15px_rgba(255,215,0,0.2)]' : 'bg-[#FF6B00] text-white shadow-[0_4px_15px_rgba(255,107,0,0.3)]'}`}>
                            {getStatusLabel(status)}
                          </span>
                          <span className="text-[#FF6B00] text-[10px] font-black uppercase tracking-widest italic pl-1 drop-shadow-sm">
                            VALOR TOTAL: {formatCurrency(mission.deliveryValue || mission.earnings || 0)}
                          </span>
                        </div>

                        {/* Right Column: Unified Metrics & Buttons Row (Print 3 Style) */}
                        <div className={`flex items-center p-1 rounded-2xl ${innerBg} border border-white/5 shadow-2xl overflow-x-auto no-scrollbar`}>
                          {/* Nav Metrics (Time | Dist) */}
                          <div className="flex items-center px-4 space-x-4 border-r border-white/10 shrink-0">
                            <div className="flex items-center space-x-2">
                              <i className="far fa-clock text-zinc-400 text-xs"></i>
                              <span className="text-xs font-black text-white">{navMetrics?.time || '0 min'}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <i className="fas fa-road text-zinc-400 text-xs"></i>
                              <span className="text-xs font-black text-white">{navMetrics?.distance || '0.0 km'}</span>
                            </div>
                          </div>
                          
                          {/* Action Buttons with Text Labels (Print 3) */}
                          <div className="flex items-center p-1 space-x-1 shrink-0">
                            <button className="px-3 h-9 rounded-xl bg-white/5 flex items-center space-x-2 text-white/30 active:scale-95 transition-all">
                              <i className="fas fa-suitcase text-[10px]"></i>
                              <span className="text-[10px] font-black uppercase tracking-tighter">PEDIDO</span>
                            </button>
                            
                            <button onClick={() => setShowMissionMapPicker(!showMissionMapPicker)} className={`px-3 h-9 rounded-xl flex items-center space-x-2 transition-all active:scale-95 ${showMissionMapPicker ? 'bg-[#33CCFF] text-white shadow-[0_0_15px_rgba(51,204,255,0.4)]' : 'bg-white/5 text-white/40'}`}>
                              <i className="fas fa-location-arrow text-[10px]"></i>
                              <span className="text-[10px] font-black uppercase tracking-tighter">GPS</span>
                            </button>
                            
                            <button onClick={() => setShowDeliveryHelpModal(!showDeliveryHelpModal)} className={`px-3 h-9 rounded-xl flex items-center space-x-2 transition-all active:scale-95 ${showDeliveryHelpModal ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(255,107,0,0.5)]' : 'bg-[#FF6B00] text-white'}`}>
                              <i className="fas fa-circle-question text-[10px]"></i>
                              <span className="text-[10px] font-black uppercase tracking-tighter">AJUDA</span>
                            </button>

                            <button onClick={() => setShowSOSModal(true)} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-red-500/50 active:scale-95 transition-all">
                              <i className="fas fa-headset text-[10px]"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex-1 space-y-4 mb-6 pr-1 overflow-y-auto">
                    
                    {/* Map Picker Panel */}
                    {showMissionMapPicker && (
                      <div className={`p-4 rounded-[28px] border border-white/5 flex justify-center space-x-12 ${innerBg} animate-in zoom-in-95 duration-200`}>
                        <button onClick={() => openNavigation('waze')} className="flex flex-col items-center space-y-2 active:scale-90 transition-transform">
                          <div className="w-14 h-14 rounded-2xl bg-[#33CCFF]/10 flex items-center justify-center text-[#33CCFF]"><i className="fab fa-waze text-2xl"></i></div>
                          <span className="text-[10px] font-black text-[#33CCFF] uppercase">Waze</span>
                        </button>
                        <button onClick={() => openNavigation('google')} className="flex flex-col items-center space-y-2 active:scale-90 transition-transform">
                          <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500"><i className="fas fa-map-marked-alt text-2xl"></i></div>
                          <span className="text-[10px] font-black text-green-500 uppercase">Maps</span>
                        </button>
                      </div>
                    )}

                    {/* Help Center Panel (Print 3 Style) */}
                    {showDeliveryHelpModal && (
                      <div className={`p-5 rounded-[28px] border border-white/5 space-y-4 ${innerBg} animate-in fade-in slide-in-from-top-4 duration-300`}>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${textPrimary}`}>Central de Ajuda</h3>
                          <button onClick={() => { setShowDeliveryHelpModal(false); setActiveHelpOption(null); }} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"><i className="fas fa-times text-xs"></i></button>
                        </div>

                        {activeHelpOption === null ? (
                          <div className="grid grid-cols-2 gap-6">
                            <button
                              onClick={() => setActiveHelpOption('customer_not_found')}
                              className={`p-6 rounded-[32px] border flex flex-col items-center text-center space-y-4 active:scale-95 transition-all ${theme === 'dark' ? 'border-white/5 bg-white/5' : 'border-zinc-200 bg-white shadow-xl'}`}
                            >
                              <div className="w-14 h-14 rounded-full bg-[#FF6B00]/10 flex items-center justify-center text-[#FF6B00] shadow-2xl"><i className="fas fa-user-slash text-xl"></i></div>
                              <span className={`text-[11px] font-black uppercase tracking-tighter leading-tight ${textPrimary}`}>Cliente não localizado</span>
                            </button>
                            <button
                              onClick={() => setActiveHelpOption('talk_to_store')}
                              className={`p-6 rounded-[32px] border flex flex-col items-center text-center space-y-4 active:scale-95 transition-all ${theme === 'dark' ? 'border-white/5 bg-white/5' : 'border-zinc-200 bg-white shadow-xl'}`}
                            >
                              <div className="w-14 h-14 rounded-full bg-[#FFD700]/10 flex items-center justify-center text-[#FFD700] shadow-2xl"><i className="fas fa-store text-xl"></i></div>
                              <span className={`text-[11px] font-black uppercase tracking-tighter leading-tight ${textPrimary}`}>Falar com Lojista</span>
                            </button>
                          </div>
                        ) : activeHelpOption === 'customer_not_found' ? (
                          <div className="space-y-4 animate-in slide-in-from-right duration-300">
                            <p className={`${textMuted} text-[10px] font-bold uppercase`}>Mensagem p/ o cliente:</p>
                            <textarea
                              value={customerMessage}
                              onChange={(e) => setCustomerMessage(e.target.value)}
                              placeholder="Olá, estou em frente ao endereço..."
                              className="w-full h-24 rounded-2xl p-4 text-xs font-bold outline-none resize-none border border-white/10 bg-black/40 text-white focus:border-[#FF6B00] transition-colors"
                            />
                            <div className="flex space-x-3">
                              <button onClick={() => setActiveHelpOption(null)} className={`flex-1 h-12 rounded-2xl font-black text-[10px] uppercase ${textMuted} border border-white/5 active:scale-90 transition-transform`}>Voltar</button>
                              <button onClick={handleSendCustomerMessage} className="flex-[2] h-12 bg-[#FF6B00] rounded-2xl font-black text-white text-[10px] uppercase shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-transform">
                                <i className="fab fa-whatsapp text-sm"></i>
                                <span>Enviar Whats</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4 animate-in slide-in-from-right duration-300 text-center">
                            <p className={`${textMuted} text-[10px] font-bold uppercase`}>Contato Lojista:</p>
                            <p className={`text-2xl font-black ${textPrimary} tracking-tight`}>{mission.storePhone || '(11) 90000-0000'}</p>
                            <div className="flex space-x-3">
                              <button onClick={() => setActiveHelpOption(null)} className={`flex-1 h-12 rounded-2xl font-black text-[10px] uppercase ${textMuted} border border-white/5 active:scale-90 transition-transform`}>Voltar</button>
                              <button onClick={handleCallStore} className="flex-[2] h-12 bg-[#FFD700] rounded-2xl font-black text-black text-[10px] uppercase shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-transform">
                                <i className="fas fa-phone text-sm"></i>
                                <span>Ligar Agora</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mission Details Header (Print 3 Style) */}
                    <div className="px-1 flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-3xl font-black leading-tight italic tracking-tighter ${textPrimary} truncate mb-0.5`}>
                          {status.includes('STORE') || status === DriverStatus.PICKING_UP || status === DriverStatus.READY_FOR_PICKUP ? mission.storeName : mission.customerName}
                        </h3>
                        <p className={`${textMuted} text-xs font-bold leading-snug line-clamp-2 opacity-60`}>
                          {status.includes('STORE') || status === DriverStatus.PICKING_UP || status === DriverStatus.READY_FOR_PICKUP ? mission.storeAddress : mission.customerAddress}
                        </p>
                      </div>
                      <div className="bg-[#FF6B00] text-white px-3 py-1.5 rounded-2xl text-[10px] font-black italic shadow-lg shrink-0 ml-4 animate-pulse">
                        +2 Pedidos
                      </div>
                    </div>

                    {/* Pickup Phase Card (Print 3 Style Overhaul) */}
                    {(status === DriverStatus.ARRIVED_AT_STORE || status === DriverStatus.READY_FOR_PICKUP) && (
                      <div className={`p-6 rounded-[40px] border border-white/5 flex items-center space-x-6 transition-all duration-500 bg-[#1a0c06] shadow-[0_15px_35px_rgba(0,0,0,0.4)]`}>
                        <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center transition-colors bg-black/40 border border-white/5 shadow-inner`}>
                          <i className={`fas fa-utensils text-[#FF6B00] text-2xl`}></i>
                        </div>
                        <div className="flex-1 flex flex-col justify-center">
                          <h4 className={`text-sm font-black uppercase italic ${textPrimary} tracking-tight mb-0.5`}>
                            {isOrderReady || status === DriverStatus.READY_FOR_PICKUP ? 'Pedido Pronto' : 'Aguarde o Lojista'}
                          </h4>
                          <span className={`text-[10px] font-black uppercase ${textMuted} tracking-[0.2em] mb-2 opacity-50`}>ID: #{mission.displayId || mission.id.slice(-4).toUpperCase()}</span>
                          <div className="flex items-center space-x-2">
                             <span className="text-[#33CC33] font-black text-xl italic tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">{formatCurrency(mission.deliveryValue || mission.earnings || 0)}</span>
                             <span className="text-white/20 text-[8px]">•</span>
                             <span className={`text-[9px] font-black uppercase ${textMuted} tracking-widest opacity-80`}>{mission.paymentMethod || 'CARD'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Collection Code Phase (PICKING_UP) */}
                    {status === DriverStatus.PICKING_UP && (
                      <div className="relative overflow-hidden rounded-[32px] border-2 border-dashed border-[#FF6B00]/40 bg-[#FF6B00]/5 p-8 flex flex-col items-center text-center animate-in zoom-in duration-300">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF6B00] to-transparent opacity-50"></div>

                        <div className="mb-6">
                          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#FF6B00] mb-3">Código de Coleta</p>
                          <div className="flex items-center justify-center space-x-4">
                            <i className="fas fa-ticket text-4xl text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]"></i>
                            <span className={`text-7xl font-black italic tracking-tighter ${textPrimary} drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]`}>{mission.collectionCode}</span>
                          </div>
                        </div>

                        <div className="w-full h-px bg-white/10 mb-6"></div>

                        <div className="flex flex-col items-center">
                          <p className={`${textMuted} text-[10px] font-black uppercase tracking-[0.2em] mb-1`}>Cliente Final</p>
                          <h2 className={`text-3xl font-black ${textPrimary} line-clamp-1 italic`}>{mission.customerName}</h2>
                        </div>
                      </div>
                    )}

                    {/* Customer Code Phase (ARRIVED_AT_CUSTOMER) */}
                    {status === DriverStatus.ARRIVED_AT_CUSTOMER && (
                      <div className={`p-6 rounded-[32px] border transition-all ${isCodeValid() ? 'bg-green-500/10 border-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'bg-white/5 border-white/10'}`}>
                        <p className={`text-[10px] font-black uppercase text-center mb-5 tracking-[0.2em] ${isCodeValid() ? 'text-green-500' : textMuted}`}>
                          CÓDIGO DE ENTREGA (4 DÍGITOS):
                        </p>
                        <div className="flex justify-center space-x-3">
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
                              className={`w-14 h-18 rounded-2xl text-center text-3xl font-black transition-all outline-none border-2 shadow-inner ${isCodeValid() ? 'bg-green-500/20 border-green-500 text-green-500' : `${innerBg} border-white/10 text-white focus:border-[#FF6B00]`}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 w-full mb-2">
                    {/* Only show the action button if NOT navigating OR if within 500m proximity threshold */}
                    {(!((status === DriverStatus.GOING_TO_STORE || status === DriverStatus.GOING_TO_CUSTOMER) && (navMetrics?.distanceValue ?? 999) > 500)) && (
                      <button
                        onClick={handleMainAction}
                        disabled={(status === DriverStatus.ARRIVED_AT_CUSTOMER) && !isCodeValid()}
                        className={`w-full h-16 rounded-[24px] font-black text-white flex items-center justify-center space-x-3 transition-all active:scale-95 shadow-2xl relative overflow-hidden group animate-in fade-in zoom-in duration-300`}
                        style={{ 
                          backgroundColor: status === DriverStatus.ARRIVED_AT_STORE || status === DriverStatus.PICKING_UP || status === DriverStatus.READY_FOR_PICKUP || status === DriverStatus.ARRIVED_AT_CUSTOMER ? '#FFD700' : '#FF6B00',
                          color: status === DriverStatus.ARRIVED_AT_STORE || status === DriverStatus.PICKING_UP || status === DriverStatus.READY_FOR_PICKUP || status === DriverStatus.ARRIVED_AT_CUSTOMER ? '#000' : '#fff'
                        }}
                      >
                        <span className="uppercase tracking-widest text-sm italic">
                          {status === DriverStatus.GOING_TO_STORE ? 'Chegar na Loja' :
                            status === DriverStatus.ARRIVED_AT_STORE ? (isOrderReady || status === DriverStatus.READY_FOR_PICKUP ? 'Iniciar Coleta' : 'Aguardando Preparo...') :
                              (status === DriverStatus.PICKING_UP || status === DriverStatus.READY_FOR_PICKUP) ? 'Confirmar Coleta' :
                                status === DriverStatus.GOING_TO_CUSTOMER ? 'Chegar no Cliente' :
                                  'Finalizar Entrega'}
                        </span>
                        <i className={`fas ${(status === DriverStatus.ARRIVED_AT_CUSTOMER && isCodeValid()) || status === DriverStatus.PICKING_UP || status === DriverStatus.READY_FOR_PICKUP ? 'fa-check' : 'fa-chevron-right'} text-xs opacity-50 group-hover:translate-x-1 transition-transform`}></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {showLayersModal && (
              <div className="absolute inset-0 bg-black/80 z-[6000] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-sm animate-in fade-in duration-300">
                <div className={`w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] p-8 border-t border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-300 pb-12 ${cardBg}`}>
                  <div className="flex justify-between items-center mb-8">
                    <h2 className={`text-2xl font-black italic ${textPrimary}`}>Camadas do Mapa</h2>
                    <button onClick={() => setShowLayersModal(false)} className={`w-10 h-10 rounded-full flex items-center justify-center ${innerBg} ${textMuted} active:scale-90 transition-transform`}>
                      <i className="fas fa-times text-lg"></i>
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div onClick={() => { setMapMode(mapMode === 'satellite' ? 'standard' : 'satellite'); }} className={`p-5 rounded-3xl border transition-all active:scale-95 cursor-pointer ${mapMode === 'satellite' ? 'border-[#33CCFF] bg-[#33CCFF]/10' : 'border-white/5 bg-black/40'}`}>
                      <div className="flex items-center justify-between pointer-events-none">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${mapMode === 'satellite' ? 'bg-[#33CCFF] text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                            <i className="fas fa-globe"></i>
                          </div>
                          <div>
                            <h3 className={`font-black text-sm ${mapMode === 'satellite' ? 'text-[#33CCFF]' : 'text-white'}`}>Satélite</h3>
                            <p className={`text-[9px] font-bold ${textMuted}`}>Visão Aérea</p>
                          </div>
                        </div>
                        <div className={`w-11 h-6 rounded-full relative transition-colors ${mapMode === 'satellite' ? 'bg-[#33CCFF]' : 'bg-zinc-700'}`}>
                          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${mapMode === 'satellite' ? 'translate-x-5' : ''}`}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        );
      }
      case 'IDENTITY_VERIFICATION': {
        return (
          <div className="flex flex-col items-center justify-center h-full p-8 bg-[#0f0502]">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-8 border border-emerald-500/30">
              <i className="fas fa-face-viewfinder text-4xl text-emerald-500"></i>
            </div>
            <h2 className="text-2xl font-black text-white italic mb-4">Verificação de Identidade</h2>
            <p className="text-zinc-400 text-sm mb-10 max-w-xs text-center">Precisamos confirmar que você é o titular desta conta para garantir sua segurança.</p>
            <div className="w-full aspect-square max-w-sm rounded-[40px] border-4 border-[#FF6B00] bg-zinc-900 mb-10 relative overflow-hidden shadow-[0_0_50px_rgba(255,107,0,0.15)]">
               <div className="absolute inset-x-0 h-0.5 bg-[#FF6B00] animate-[scan_3s_ease-in-out_infinite] shadow-[0_0_15px_#FF6B00]"></div>
            </div>
            <button 
              onClick={() => {
                setStatus(DriverStatus.ONLINE);
                setCurrentScreen('HOME');
              }}
              className="w-full h-16 bg-[#FF6B00] rounded-[24px] font-black text-white hover:brightness-110 active:scale-95 transition-all shadow-xl uppercase tracking-widest"
            >
              INICIAR CAPTURA
            </button>
            <button onClick={() => setCurrentScreen('HOME')} className="mt-6 text-[#8b7d77] font-bold text-xs uppercase tracking-widest active:scale-90 transition-transform">Pular por enquanto</button>
          </div>
        );
      }
      case 'WALLET': {
        const filteredHistory = history.filter(item => item.weekId === activeWeekId);

        const weeklyEarningsTotal = filteredHistory.reduce((acc, item) => acc + (item.amount > 0 ? item.amount : 0), 0);
        const activeWeekLabel = MOCK_WEEKS.find(w => w.id === activeWeekId)?.range || 'Semana Atual';

        return (
          <div className={`h-full w-full p-6 overflow-y-auto pb-40 transition-colors duration-300 bg-[#0f0502]`}>
            <div className="flex items-center justify-between mb-8">
              <h1 className={`text-3xl font-black italic text-white tracking-tight`}>Meus Ganhos</h1>
              <div className="px-4 py-1 bg-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-full text-[10px] font-black uppercase text-[#FF6B00] tracking-wider">
                Versão 2.1
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className={`p-4 rounded-[28px] border chocolate-inner-card-v2 flex flex-col justify-center`}>
                <p className={`text-chocolate-muted text-[9px] font-black uppercase mb-1 tracking-widest`}>Ganhos da Semana</p>
                <p className={`text-[10px] font-bold text-chocolate-muted mb-2`}>{activeWeekLabel}</p>
                <p className={`text-xl font-black text-white`}>R$ {(weeklyEarningsTotal || 0).toFixed(2)}</p>
              </div>
              <div className={`p-4 rounded-[28px] border chocolate-inner-card-v2 flex flex-col justify-center`}>
                <p className={`text-chocolate-muted text-[9px] font-black uppercase mb-1 tracking-widest`}>Ganhos de Hoje</p>
                <p className="text-[10px] font-bold opacity-0 mb-2">Hoje</p>
                <p className={`text-xl font-black text-[#FF6B00] neon-orange-glow-text`}>R$ {(dailyEarnings || 0).toFixed(2)}</p>
              </div>
            </div>

            <div className={`rounded-[32px] p-8 border mb-8 chocolate-inner-card-v2 relative overflow-hidden bg-[#1a0c06]/80`}>
              <div className="absolute -right-4 -top-4 opacity-5"><i className="fas fa-wallet text-8xl text-[#FF6B00]"></i></div>
              <p className={`text-chocolate-muted font-bold uppercase text-[10px] tracking-widest mb-2 relative z-10`}>Saldo Disponível</p>
              <h2 className={`text-4xl font-black text-white mb-6 relative z-10 tracking-tighter`}>R$ {(balance || 0).toFixed(2)}</h2>

              <button disabled={balance <= 0} onClick={() => setCurrentScreen('WITHDRAWAL_REQUEST')} className={`w-full h-16 rounded-[24px] text-white font-black text-xs uppercase italic tracking-widest shadow-lg flex items-center justify-center space-x-2 transition-all relative z-10 btn-lava-accept ${balance <= 0 ? 'opacity-50 grayscale' : ''}`}>
                <i className="fas fa-hand-holding-dollar text-lg"></i>
                <span>Antecipar Repasse</span>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-black uppercase tracking-[0.2em] italic text-white`}>Extrato</h3>
              </div>

              <div className={`flex p-1 rounded-2xl mb-6 bg-black/40 border border-white/5`}>
                <button
                  onClick={() => setWalletTab('ENTRIES')}
                  className={`flex-1 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${walletTab === 'ENTRIES' ? 'bg-[#FF6B00] text-white shadow-lg' : 'text-chocolate-muted'}`}
                >
                  Lançamentos
                </button>
                <button
                  onClick={() => setWalletTab('PAYOUTS')}
                  className={`flex-1 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${walletTab === 'PAYOUTS' ? 'bg-[#FF6B00] text-white shadow-lg' : 'text-chocolate-muted'}`}
                >
                  Repasses
                </button>
              </div>

              <div className="space-y-4">
                {walletTab === 'ENTRIES' ? (
                  <>
                    <div className="flex items-center justify-between px-2 mb-2 relative">
                      <span className={`text-[10px] font-bold text-chocolate-muted uppercase`}>Resumo da Semana</span>

                      <div className="relative z-20">
                        <button
                          onClick={() => setShowWeekSelector(!showWeekSelector)}
                          className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all active:scale-95 border-white/10 bg-black/40`}
                        >
                          <i className="far fa-calendar text-xs text-[#FF6B00]"></i>
                          <span className={`text-[9px] font-black text-white`}>{activeWeekLabel}</span>
                          <i className={`fas fa-chevron-down text-[8px] text-chocolate-muted transition-transform ${showWeekSelector ? 'rotate-180' : ''}`}></i>
                        </button>

                        {showWeekSelector && (
                          <div className={`absolute right-0 top-full mt-2 w-48 rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 bg-[#1a0c06] z-50`}>
                            {MOCK_WEEKS.map(week => (
                              <button
                                key={week.id}
                                onClick={() => { setActiveWeekId(week.id); setShowWeekSelector(false); }}
                                className={`w-full text-left px-4 py-4 text-[10px] font-bold border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors ${activeWeekId === week.id ? 'text-[#FF6B00]' : 'text-white'}`}
                              >
                                {week.range}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {filteredHistory.length === 0 ? (
                      <div className={`py-12 text-center rounded-[32px] border border-dashed border-white/10 bg-white/5`}>
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 bg-black/40 text-chocolate-muted`}>
                          <i className="fas fa-receipt text-2xl"></i>
                        </div>
                        <p className={`text-xs font-bold text-chocolate-muted`}>Nenhum registro encontrado.</p>
                      </div>
                    ) : (
                      filteredHistory.map((item, index) => (
                        <div
                          key={index}
                          onClick={() => setSelectedTransaction(item)}
                          className={`p-4 rounded-[28px] border chocolate-list-item flex justify-between items-center transition-all cursor-pointer`}
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${item.amount > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                              <i className={`fas ${item.amount > 0 ? 'fa-arrow-down' : 'fa-arrow-up'} rotate-45`}></i>
                            </div>
                            <div>
                              <p className={`text-sm font-black text-white`}>{item.type}</p>
                              <p className={`text-[10px] font-bold text-chocolate-muted uppercase tracking-tighter`}>{item.date}, {item.time}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`font-black text-lg block ${item.amount > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {item.amount > 0 ? '+' : ''} R$ {Math.abs(item.amount).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-2">
                      <span className={`text-[10px] font-bold text-chocolate-muted uppercase`}>Histórico de Pagamentos</span>
                      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border border-white/10 bg-white/5`}>
                        <i className="fas fa-filter text-xs text-[#FF6B00]"></i>
                        <span className={`text-[9px] font-black text-white`}>Filtrar</span>
                      </div>
                    </div>
                    {payoutsList.length === 0 ? (
                      <div className={`py-12 text-center rounded-[32px] border border-dashed border-white/10 bg-white/5`}>
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 bg-black/40 text-chocolate-muted`}>
                          <i className="fas fa-file-invoice-dollar text-2xl"></i>
                        </div>
                        <p className={`text-xs font-bold text-chocolate-muted`}>Nenhum repasse realizado ainda.</p>
                      </div>
                    ) : (
                      payoutsList.map((payout) => (
                        <div key={payout.id} className={`p-4 rounded-[28px] border chocolate-inner-card-v2 flex justify-between items-center`}>
                          <div className="flex items-center space-x-4">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center bg-[#FFD700]/10 text-[#FFD700]`}>
                              <i className="fas fa-file-invoice-dollar text-lg"></i>
                            </div>
                            <div>
                              <p className={`text-sm font-black text-white`}>Repasse Semanal</p>
                              <p className={`text-[10px] font-bold text-chocolate-muted`}>{payout.period}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-black text-lg text-white`}>R$ {payout.amount.toFixed(2)}</p>
                            <span className="text-[8px] font-black text-emerald-500 uppercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full ml-auto inline-block">{payout.status}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      }
      case 'WITHDRAWAL_REQUEST': {
        return (
        <div className={`h-full w-full p-6 overflow-y-auto pb-40 transition-colors duration-300 bg-[#0f0502]`}>
          <div className="flex items-center space-x-4 mb-8">
            <button onClick={() => setCurrentScreen('WALLET')} className={`w-11 h-11 rounded-2xl flex items-center justify-center border chocolate-inner-card-v2`}>
              <i className="fas fa-chevron-left text-white"></i>
            </button>
            <h1 className={`text-2xl font-black italic text-white tracking-tight`}>Antecipar Ganhos</h1>
          </div>
          <div className={`rounded-[32px] p-6 border mb-6 chocolate-inner-card-v2 bg-[#1a0c06]/80 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 p-4 opacity-5"><i className="fas fa-building-columns text-6xl text-[#FF6B00]"></i></div>
            <p className={`text-chocolate-muted font-bold text-[9px] uppercase tracking-widest mb-3`}>Conta de Destino</p>
            <div className="flex items-center space-x-4 relative z-10">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-[#FF6B00] bg-[#FF6B00]/10 border border-[#FF6B00]/20`}>
                <i className="fas fa-bank text-xl"></i>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-black text-lg text-white truncate`}>{currentUser.bank.name}</h3>
                <p className={`text-chocolate-muted font-bold text-[10px] uppercase tracking-tighter`}>AG {currentUser.bank.agency} • CC {currentUser.bank.account}</p>
              </div>
              <div className="shrink-0">
                <i className="fas fa-check-circle text-emerald-500 text-xl"></i>
              </div>
            </div>
          </div>

          <div className={`rounded-[32px] p-8 border mb-8 chocolate-inner-card-v2 bg-black/20`}>
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <span className={`text-chocolate-muted font-bold text-xs uppercase tracking-widest`}>Saldo Disponível</span>
                <span className={`text-xl font-black text-white`}>R$ {balance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <span className={`text-chocolate-muted font-bold text-xs uppercase tracking-widest`}>Taxa de Antecipação</span>
                <div className="flex flex-col items-end">
                  <span className="text-emerald-500 font-black text-lg">GRÁTIS</span>
                  <span className="text-[8px] font-bold text-chocolate-muted uppercase">Incentivo Guepardo</span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className={`text-white font-black text-sm uppercase tracking-widest`}>Você Recebe</span>
                <span className="text-[#FFD700] font-black text-3xl italic tracking-tighter">R$ {Math.max(0, balance - ANTICIPATION_FEE).toFixed(2)}</span>
              </div>
            </div>
          </div>
          <button disabled={balance <= 0 || isAnticipating} onClick={handleAnticipateRequest} className={`w-full h-20 rounded-[32px] font-black text-white uppercase tracking-[0.1em] shadow-xl flex items-center justify-center space-x-3 transition-all btn-lava-accept ${balance <= 0 ? 'opacity-50 grayscale' : ''}`}>
            {isAnticipating ? <><i className="fas fa-circle-notch animate-spin"></i><span>Processando...</span></> : <><i className="fas fa-bolt text-xl"></i><span>Confirmar Antecipação</span></>}
          </button>
        </div>
      );
    }
      case 'ORDERS': {
        return (
          <div className={'h-full w-full p-6 overflow-y-auto pb-40 transition-colors duration-300 bg-[#0f0502]'}>
            <h1 className={'text-3xl font-black italic mb-2 text-white tracking-tight'}>Como podemos te ajudar?</h1>
            <p className="text-chocolate-muted font-bold text-xs uppercase tracking-widest mb-8">Central de Ajuda Guepardo</p>

            <div className="relative mb-10">
              <div className={'absolute left-5 top-1/2 -translate-y-1/2 text-[#FF6B00]'}>
                <i className="fas fa-search text-lg"></i>
              </div>
              <input
                type="text"
                placeholder="Digite sua dúvida aqui..."
                className={'w-full h-16 pl-14 pr-6 rounded-[24px] border border-white/10 outline-none font-bold text-sm transition-all bg-black/40 text-white placeholder:font-normal placeholder:text-zinc-600 focus:border-[#FF6B00]/50 focus:bg-black/60 shadow-xl'}
              />
            </div>

            <div className="mb-10">
              <h3 className={'text-chocolate-muted font-black uppercase text-[10px] tracking-[0.25em] mb-4 flex items-center gap-2'}>
                <i className="fas fa-star text-[#FFD700] text-[8px]"></i>
                <span>Perguntas Frequentes</span>
              </h3>
              <div className="space-y-3">
                {["Estou disponível e não recebo pedidos", "Quero alterar meu modal de entrega", "Não recebi o repasse"].map((item, index) => (
                  <button key={index} className={'w-full p-5 rounded-[24px] border chocolate-list-item flex justify-between items-center transition-all'}>
                    <span className={'text-xs font-black text-white'}>{item}</span>
                    <i className={'fas fa-chevron-right text-xs text-[#FF6B00]/40 group-active:text-[#FF6B00]'}></i>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <h3 className={'text-chocolate-muted font-black uppercase text-[10px] tracking-[0.25em] mb-4 flex items-center gap-2'}>
                <i className="fas fa-layer-group text-[#FF6B00] text-[8px]"></i>
                <span>Outros Assuntos</span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Entregas", icon: "fa-motorcycle", color: "#FF6B00" },
                  { label: "Cadastro", icon: "fa-id-card", color: "#33CCFF" },
                  { label: "Repasse", icon: "fa-hand-holding-dollar", color: "#00FF94" },
                  { label: "Guepardo", icon: "fa-paw", color: "#FFD700" }
                ].map((item, index) => (
                  <button key={index} className={'p-6 rounded-[28px] border chocolate-inner-card-v2 flex flex-col items-center space-y-3 transition-all bg-black/40 group'}>
                    <div className={'w-12 h-12 rounded-2xl flex items-center justify-center bg-black/60 border border-white/5 group-hover:scale-110 transition-transform'} style={{ color: item.color }}>
                      <i className={'fas ' + item.icon + ' text-xl'}></i>
                    </div>
                    <span className={'text-[10px] font-black uppercase tracking-widest text-white'}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      }
      case 'NOTIFICATIONS': {
        return (
          <div className={'h-full w-full p-6 overflow-y-auto pb-40 transition-colors duration-300 bg-[#0f0502]'}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <button onClick={() => setCurrentScreen('HOME')} className={'w-11 h-11 rounded-2xl flex items-center justify-center border chocolate-inner-card-v2'}>
                  <i className={'fas fa-chevron-left text-white'}></i>
                </button>
                <h1 className={'text-2xl font-black italic text-white tracking-tight'}>Avisos</h1>
              </div>
              <button
                onClick={markAllNotificationsRead}
                className={'text-[10px] font-black uppercase tracking-widest text-[#FF6B00] active:scale-95 transition-transform px-3 py-1 bg-[#FF6B00]/10 rounded-full'}
              >
                Limpar
              </button>
            </div>

            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-center opacity-40">
                <div className={'w-24 h-24 rounded-full flex items-center justify-center mb-6 bg-black/40 border border-white/5'}>
                  <i className="fas fa-bell-slash text-3xl text-[#FF6B00]"></i>
                </div>
                <p className={'text-sm font-black text-chocolate-muted uppercase tracking-[0.2em]'}>Silêncio na Savana</p>
                <p className="text-[10px] font-bold text-chocolate-muted mt-2">Sem novas notificações.</p>
              </div>
            ) : (
              <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                {notifications.map((notification) => {
                  const style = getNotificationIcon(notification.type);
                  return (
                    <div
                      key={notification.id}
                      className={'p-6 rounded-[32px] border relative transition-all duration-300 chocolate-list-item ' + (!notification.read ? 'border-[#FF6B00]/40 bg-[#FF6B00]/5' : '')}
                    >
                      <div className="flex items-start space-x-5 relative z-10">
                        <div className={'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ' + style.bg + ' ' + style.color}>
                          <i className={'fas ' + style.icon + ' text-xl'}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start pt-1">
                            <h3 className={'text-[15px] font-black text-white mb-1 truncate pr-6 tracking-tight'}>{notification.title}</h3>
                            {!notification.read && <div className="w-2.5 h-2.5 rounded-full bg-[#FF6B00] shrink-0 mt-2 shadow-[0_0_10px_#FF6B00]"></div>}
                          </div>
                          <p className={'text-xs leading-relaxed mb-3 line-clamp-2 text-chocolate-muted'}>{notification.body}</p>
                          <p className={'text-[9px] font-black uppercase tracking-[0.2em] opacity-60 text-white'}>{notification.date}</p>
                        </div>
                      </div>
                      <div className="absolute top-4 right-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                          className={'w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-red-500/20 active:scale-90 text-chocolate-muted hover:text-red-500'}
                        >
                          <i className="fas fa-trash-can text-xs"></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }
      case 'SETTINGS': {
        if (settingsView === 'MAIN') {
          return (
            <div className={`h-full w-full p-6 overflow-y-auto pb-40 transition-colors duration-300 bg-[#0f0502]`}>
              <h1 className={`text-4xl font-black italic mb-8 text-white tracking-tighter`}>Perfil</h1>
              
              <div className={`flex items-center space-x-5 mb-10 p-6 rounded-[32px] border chocolate-inner-card-v2 bg-[#1a0c06]`}>
                <div className="relative">
                  <div className="w-20 h-20 rounded-full p-1.5 border-2 border-[#FF6B00] shadow-[0_0_25px_rgba(255,107,0,0.3)] bg-black">
                    <img src={currentUser.avatar} onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }} className="w-full h-full object-cover rounded-full" alt="Perfil" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full border-4 border-[#1a0c06] flex items-center justify-center text-white text-[10px]">
                    <i className="fas fa-check"></i>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className={`text-2xl font-black text-white truncate tracking-tight`}>{currentUser.name || 'Entregador'}</h2>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`text-[#FFD700] text-[10px] font-black uppercase tracking-[0.2em]`}>Nível {currentUser.level}</span>
                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                    <span className="text-chocolate-muted text-[10px] font-bold uppercase tracking-widest leading-none pt-0.5">Top Parceiro</span>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <section>
                  <h3 className={`text-chocolate-muted font-black uppercase text-[10px] tracking-[0.25em] mb-4 flex items-center gap-2`}>
                    <i className="fas fa-user-circle text-[#FF6B00] text-[8px]"></i>
                    <span>Sua Conta</span>
                  </h3>
                  <div className="space-y-3">
                    {[
                      { id: 'PERSONAL', icon: 'fa-user', label: 'Dados Pessoais' },
                      { id: 'DOCUMENTS', icon: 'fa-id-card', label: 'Documentos' },
                      { id: 'BANK', icon: 'fa-building-columns', label: 'Dados Bancários' },
                      { id: 'EMERGENCY', icon: 'fa-heart-pulse', label: 'Contato de Emergência', color: '#ff4444' },
                    ].map((item) => (
                      <button key={item.id} onClick={() => setSettingsView(item.id as any)} className={`w-full p-5 rounded-[24px] border chocolate-list-item flex justify-between items-center transition-all`}>
                        <div className="flex items-center space-x-4">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center bg-black/40 border border-white/5 ${item.color ? '' : 'text-[#FF6B00]'}`} style={{ color: item.color }}>
                            <i className={`fas ${item.icon} text-lg`}></i>
                          </div>
                          <span className={`text-[13px] font-bold text-white`}>{item.label}</span>
                        </div>
                        <i className={`fas fa-chevron-right text-xs text-chocolate-muted`}></i>
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className={`text-chocolate-muted font-black uppercase text-[10px] tracking-[0.25em] mb-4 flex items-center gap-2`}>
                    <i className="fas fa-sliders text-[#FF6B00] text-[8px]"></i>
                    <span>Configurações do App</span>
                  </h3>
                  <div className="space-y-3">
                    <button onClick={() => setSettingsView('DELIVERY')} className={`w-full p-5 rounded-[24px] border chocolate-list-item flex justify-between items-center transition-all`}>
                      <div className="flex items-center space-x-4">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center bg-black/40 border border-white/5 text-[#FF6B00]`}><i className="fas fa-motorcycle text-lg"></i></div>
                        <div>
                          <p className={`text-[13px] font-bold text-white`}>Veículo e Região</p>
                          <p className={`text-[9px] font-black uppercase text-chocolate-muted mt-0.5 tracking-tighter`}>{selectedVehicle} • {currentUser.region}</p>
                        </div>
                      </div>
                      <i className={`fas fa-chevron-right text-xs text-chocolate-muted`}></i>
                    </button>

                    <button onClick={() => setSettingsView('SOUNDS')} className={`w-full p-5 rounded-[24px] border chocolate-list-item flex justify-between items-center transition-all`}>
                      <div className="flex items-center space-x-4">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center bg-black/40 border border-white/5 text-[#FF6B00]`}><i className="fas fa-volume-high text-lg"></i></div>
                        <div>
                          <p className={`text-[13px] font-bold text-white`}>Alertas Sonoros</p>
                          <p className={`text-[9px] font-black uppercase text-chocolate-muted mt-0.5 tracking-tighter`}>
                            {SOUND_OPTIONS.find(s => s.id === selectedSoundId)?.label || 'Padrão'}
                          </p>
                        </div>
                      </div>
                      <i className={`fas fa-chevron-right text-xs text-chocolate-muted`}></i>
                    </button>

                    <button onClick={() => setSettingsView('MAPS')} className={`w-full p-5 rounded-[24px] border chocolate-list-item flex justify-between items-center transition-all`}>
                      <div className="flex items-center space-x-4">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center bg-black/40 border border-white/5 text-[#FF6B00]`}><i className="fas fa-map-location-dot text-lg"></i></div>
                        <div>
                          <p className={`text-[13px] font-bold text-white`}>Navegador Padrão</p>
                          <p className={`text-[9px] font-black uppercase text-chocolate-muted mt-0.5 tracking-tighter`}>
                            {currentUser.preferredMap === 'internal' ? 'Guepardo Maps' : 
                             currentUser.preferredMap === 'google' ? 'Google Maps' : 
                             currentUser.preferredMap === 'waze' ? 'Waze' : 'Sempre perguntar'}
                          </p>
                        </div>
                      </div>
                      <i className={`fas fa-chevron-right text-xs text-chocolate-muted`}></i>
                    </button>
                  </div>
                </section>

                <section>
                  <h3 className={`text-chocolate-muted font-black uppercase text-[10px] tracking-[0.25em] mb-4 flex items-center gap-2`}>
                    <i className="fas fa-palette text-[#FF6B00] text-[8px]"></i>
                    <span>Aparência</span>
                  </h3>
                  <div className={`rounded-[28px] p-2 border border-white/5 bg-black/40 shadow-inner`}>
                    <div onClick={toggleTheme} className="p-4 flex items-center justify-between cursor-pointer active:scale-95 transition-transform">
                      <div className={`flex items-center space-x-3 font-bold text-sm text-white`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-[#33CCFF]/10 text-[#33CCFF]' : 'bg-[#FFD700]/10 text-[#FFD700]'}`}>
                          <i className={`fas ${theme === 'dark' ? 'fa-moon' : 'fa-sun'}`}></i>
                        </div>
                        <span className="text-[13px]">Modo {theme === 'dark' ? 'Escuro' : 'Claro'} (Premium Fixed)</span>
                      </div>
                      <div className={`w-12 h-6 rounded-full relative transition-colors bg-[#FF6B00]`}>
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform translate-x-6`}></div>
                      </div>
                    </div>
                  </div>
                </section>

                <button onClick={handleLogout} className="w-full h-16 rounded-[24px] border border-red-500/30 text-red-500 font-black uppercase tracking-[0.2em] flex items-center justify-center hover:bg-red-500/10 active:scale-95 transition-all mt-4 text-[11px] mb-8">
                  Sair da Conta
                </button>
              </div>
            </div>
          );
        } else {
          return (
            <div className={`h-full w-full p-6 overflow-y-auto pb-24 transition-colors duration-300 ${theme === 'dark' ? 'bg-black' : 'bg-zinc-50'}`}>
              <div className="flex items-center space-x-4 mb-8">
                <button onClick={() => setSettingsView('MAIN')} className={`w-10 h-10 rounded-xl flex items-center justify-center border ${cardBg}`}>
                  <i className={`fas fa-chevron-left ${textPrimary}`}></i>
                </button>
                <h1 className={`text-2xl font-black italic ${textPrimary}`}>
                  {settingsView === 'PERSONAL' && 'Dados Pessoais'}
                  {settingsView === 'DOCUMENTS' && 'Documentos'}
                  {settingsView === 'BANK' && 'Dados Bancários'}
                  {settingsView === 'EMERGENCY' && 'Emergência'}
                  {settingsView === 'DELIVERY' && 'Dados da Entrega'}
                  {settingsView === 'SOUNDS' && 'Escolha o Alerta'}
                  {settingsView === 'MAPS' && 'Navegador Padrão'}
                </h1>
              </div>

              {settingsView === 'PERSONAL' && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  <div className={`p-8 rounded-[32px] border chocolate-inner-card-v2 bg-[#1a0c06]`}>
                    <h3 className={`font-black text-xl mb-6 text-white italic tracking-tight flex items-center gap-3`}>
                      <i className="fas fa-id-card-clip text-[#FF6B00]"></i>
                      <span>Identidade</span>
                    </h3>
                    <div className="space-y-4">
                      {[
                        { label: 'Nome Completo', value: currentUser.name },
                        { label: 'CPF', value: currentUser.cpf },
                        { label: 'Telefone', value: currentUser.phone },
                        { label: 'E-mail', value: currentUser.email },
                        { label: 'Região Original', value: currentUser.region },
                      ].map((item, i) => (
                        <div key={i} className={`p-5 rounded-[24px] border border-white/5 bg-black/40`}>
                          <p className={`text-chocolate-muted text-[9px] font-black uppercase tracking-widest mb-1.5`}>{item.label}</p>
                          <p className={`text-sm font-black text-white`}>{item.value || '-'}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Formulário de Endereço Residencial */}
                  <div className={`p-6 rounded-[32px] border ${cardBg}`}>
                    <h3 className={`font-black text-lg mb-4 ${textPrimary}`}>Endereço Residencial</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={`${textMuted} text-[9px] font-black uppercase tracking-widest block mb-1`}>CEP</label>
                          <input type="text" readOnly={currentUser.verified} value={addressDetails.zip_code} onChange={e => setAddressDetails({ ...addressDetails, zip_code: e.target.value })} className={`w-full h-11 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border border-white/5 focus:border-[#FF6B00] text-sm font-bold ${currentUser.verified ? 'opacity-50' : ''}`} />
                        </div>
                        <div>
                          <label className={`${textMuted} text-[9px] font-black uppercase tracking-widest block mb-1`}>Número</label>
                          <input type="text" readOnly={currentUser.verified} value={addressDetails.number} onChange={e => setAddressDetails({ ...addressDetails, number: e.target.value })} className={`w-full h-11 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border border-white/5 focus:border-[#FF6B00] text-sm font-bold ${currentUser.verified ? 'opacity-50' : ''}`} />
                        </div>
                      </div>
                      
                      <div>
                        <label className={`${textMuted} text-[9px] font-black uppercase tracking-widest block mb-1`}>Logradouro (Rua/Av)</label>
                        <input type="text" readOnly={currentUser.verified} value={addressDetails.street} onChange={e => setAddressDetails({ ...addressDetails, street: e.target.value })} className={`w-full h-11 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border border-white/5 focus:border-[#FF6B00] text-sm font-bold ${currentUser.verified ? 'opacity-50' : ''}`} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={`${textMuted} text-[9px] font-black uppercase tracking-widest block mb-1`}>Bairro</label>
                          <input type="text" readOnly={currentUser.verified} value={addressDetails.district} onChange={e => setAddressDetails({ ...addressDetails, district: e.target.value })} className={`w-full h-11 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border border-white/5 focus:border-[#FF6B00] text-sm font-bold ${currentUser.verified ? 'opacity-50' : ''}`} />
                        </div>
                        <div>
                          <label className={`${textMuted} text-[9px] font-black uppercase tracking-widest block mb-1`}>Complemento</label>
                          <input type="text" readOnly={currentUser.verified} value={addressDetails.complement} onChange={e => setAddressDetails({ ...addressDetails, complement: e.target.value })} className={`w-full h-11 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border border-white/5 focus:border-[#FF6B00] text-sm font-bold ${currentUser.verified ? 'opacity-50' : ''}`} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={`${textMuted} text-[9px] font-black uppercase tracking-widest block mb-1`}>Cidade</label>
                          <input type="text" readOnly={currentUser.verified} value={addressDetails.city} onChange={e => setAddressDetails({ ...addressDetails, city: e.target.value })} className={`w-full h-11 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border border-white/5 focus:border-[#FF6B00] text-sm font-bold ${currentUser.verified ? 'opacity-50' : ''}`} />
                        </div>
                        <div>
                          <label className={`${textMuted} text-[9px] font-black uppercase tracking-widest block mb-1`}>Estado (SIGLA MAIÚSCULA)</label>
                          <input type="text" readOnly={currentUser.verified} value={addressDetails.state} onChange={e => setAddressDetails({ ...addressDetails, state: e.target.value })} className={`w-full h-11 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border border-white/5 focus:border-[#FF6B00] text-sm font-bold uppercase ${currentUser.verified ? 'opacity-50' : ''}`} maxLength={2} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {!currentUser.verified && (
                    <button 
                      onClick={async () => {
                        try {
                          if (!userId) {
                            alert('Erro: Usuário não identificado.');
                            return;
                          }
                          
                          await supabaseClient.upsertAddress(userId, {
                            zip_code: addressDetails.zip_code,
                            street: addressDetails.street,
                            number: addressDetails.number,
                            complement: addressDetails.complement,
                            district: addressDetails.district,
                            city: addressDetails.city,
                            state: addressDetails.state
                          });

                          alert('Dados e endereço salvos com sucesso!');
                          setSettingsView('MAIN');
                        } catch (err: any) {
                          console.error('Erro DETALHADO ao salvar endereco:', JSON.stringify(err, null, 2));
                          alert('Erro ao salvar endereço. Tente novamente.');
                        }
                      }} 
                      className="w-full h-16 mt-6 bg-[#FF6B00] rounded-2xl font-black text-white uppercase italic tracking-widest shadow-xl active:scale-95 transition-transform"
                    >
                      Salvar Alterações
                    </button>
                  )}
                  {currentUser.verified && (
                     <div className={`mt-6 p-4 rounded-2xl border border-[#FF6B00]/20 bg-[#FF6B00]/5 flex items-start space-x-3`}>
                        <i className="fas fa-lock text-[#FF6B00] mt-1"></i>
                        <p className={`text-[10px] font-bold leading-relaxed ${textMuted}`}>
                          Seus dados pessoais estão <span className="text-[#FF6B00]">congelados</span> por segurança. Para alterações, entre em contato com o suporte.
                        </p>
                     </div>
                  )}
                </div>
              )}

              {settingsView === 'DOCUMENTS' && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  <div className={`p-8 rounded-[32px] border chocolate-inner-card-v2 bg-[#1a0c06]`}>
                    <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
                      <span className={`text-chocolate-muted font-black uppercase text-[10px] tracking-widest`}>Seu documento atual</span>
                      <div className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-[9px] font-black uppercase shadow-[0_0_15px_rgba(34,197,94,0.1)]">Ativo</div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className={`text-chocolate-muted text-[9px] font-black uppercase tracking-widest mb-1`}>Documento</p>
                        <p className={`text-xl font-black text-white italic`}>CNH</p>
                      </div>
                      <div>
                        <p className={`text-chocolate-muted text-[9px] font-black uppercase tracking-widest mb-1`}>Categoria</p>
                        <p className={`text-xl font-black text-white italic`}>{currentUser.cnh.category}</p>
                      </div>
                      <div className="col-span-2">
                        <p className={`text-chocolate-muted text-[9px] font-black uppercase tracking-widest mb-1`}>Status da Validação</p>
                        <div className="flex items-center space-x-2">
                           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                           <p className={`text-base font-black text-green-500`}>Aprovado & Verificado</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {settingsView === 'BANK' && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  <div className={`p-8 rounded-[32px] border chocolate-inner-card-v2 bg-[#1a0c06]`}>
                    <h3 className={`font-black text-xl mb-6 text-white italic tracking-tight flex items-center gap-3`}>
                      <i className="fas fa-bank text-[#FF6B00]"></i>
                      <span>Recebimento</span>
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="p-4 rounded-[20px] bg-black/40 border border-white/5">
                        <label className={`text-chocolate-muted text-[9px] font-black uppercase tracking-widest block mb-1.5`}>Banco</label>
                        <input
                          type="text"
                          value={currentUser.bank.name}
                          onChange={e => setCurrentUser({ ...currentUser, bank: { ...currentUser.bank, name: e.target.value } })}
                          className={`w-full bg-transparent text-white outline-none text-sm font-black`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-[20px] bg-black/40 border border-white/5">
                          <label className={`text-chocolate-muted text-[9px] font-black uppercase tracking-widest block mb-1.5`}>Agência</label>
                          <input
                            type="text"
                            value={currentUser.bank.agency}
                            onChange={e => setCurrentUser({ ...currentUser, bank: { ...currentUser.bank, agency: e.target.value } })}
                            className={`w-full bg-transparent text-white outline-none text-sm font-black`}
                          />
                        </div>
                        <div className="p-4 rounded-[20px] bg-black/40 border border-white/5">
                          <label className={`text-chocolate-muted text-[9px] font-black uppercase tracking-widest block mb-1.5`}>Conta</label>
                          <input
                            type="text"
                            value={currentUser.bank.account}
                            onChange={e => setCurrentUser({ ...currentUser, bank: { ...currentUser.bank, account: e.target.value } })}
                            className={`w-full bg-transparent text-white outline-none text-sm font-black`}
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-[20px] bg-black/40 border border-white/5">
                        <label className={`text-chocolate-muted text-[9px] font-black uppercase tracking-widest block mb-1.5`}>Chave PIX</label>
                        <input
                          type="text"
                          value={currentUser.bank.pixKey}
                          onChange={e => setCurrentUser({ ...currentUser, bank: { ...currentUser.bank, pixKey: e.target.value } })}
                          placeholder="CPF, E-mail ou Celular"
                          className={`w-full bg-transparent text-white outline-none text-sm font-black placeholder:font-normal placeholder:text-zinc-600`}
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={async () => {
                      try {
                        if (!userId) {
                          alert('Erro: Usuário não identificado.');
                          return;
                        }
                        await supabaseClient.upsertBankAccount(userId, {
                          bank_name: currentUser.bank.name,
                          agency: currentUser.bank.agency,
                          account_number: currentUser.bank.account,
                          account_type: currentUser.bank.type,
                          pix_key: currentUser.bank.pixKey
                        });
                        alert('Dados bancários salvos com sucesso!');
                        setSettingsView('MAIN');
                      } catch (err) {
                        alert('Erro ao salvar dados bancários.');
                      }
                    }}
                    className="w-full h-16 mt-8 rounded-[24px] font-black text-white uppercase italic tracking-[0.2em] shadow-xl btn-lava-accept"
                  >
                    Salvar Dados Bancários
                  </button>
                </div>
              )}

              {settingsView === 'EMERGENCY' && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  <div className={`p-8 rounded-[32px] border chocolate-inner-card-v2 bg-[#1a0c06]`}>
                    <h3 className={`font-black text-xl mb-6 text-[#ff4444] italic tracking-tight flex items-center gap-3`}>
                      <i className="fas fa-heart-pulse"></i>
                      <span>Segurança</span>
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 rounded-[20px] bg-black/40 border border-white/5">
                        <label className={`text-chocolate-muted text-[9px] font-black uppercase tracking-widest block mb-1.5`}>Nome do Contato</label>
                        <input
                          type="text"
                          value={emergencyContact.name}
                          onChange={e => setEmergencyContact({ ...emergencyContact, name: e.target.value })}
                          className={`w-full bg-transparent text-white outline-none text-sm font-black`}
                        />
                      </div>
                      <div className="p-4 rounded-[20px] bg-black/40 border border-white/5">
                        <label className={`text-chocolate-muted text-[9px] font-black uppercase tracking-widest block mb-1.5`}>Telefone</label>
                        <input
                          type="tel"
                          value={emergencyContact.phone}
                          onChange={e => setEmergencyContact({ ...emergencyContact, phone: e.target.value })}
                          className={`w-full bg-transparent text-white outline-none text-sm font-black`}
                        />
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSettingsView('MAIN')} className="w-full h-16 rounded-[24px] font-black text-white uppercase italic tracking-[0.2em] shadow-xl btn-lava-accept">
                    Confirmar Segurança
                  </button>
                </div>
              )}

              {settingsView === 'DELIVERY' && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  <div className={`p-8 rounded-[32px] border chocolate-inner-card-v2 bg-[#1a0c06]`}>
                    <h3 className={`font-black text-xl mb-6 text-white italic tracking-tight flex items-center gap-3`}>
                      <i className="fas fa-motorcycle text-[#FF6B00]"></i>
                      <span>Operação</span>
                    </h3>
                    
                    <div className="space-y-6">
                      <div>
                        <p className={`text-chocolate-muted text-[10px] font-black uppercase tracking-[0.2em] mb-4`}>Veículo Ativo</p>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { id: 'moto', icon: 'fa-motorcycle', label: 'Moto' },
                            { id: 'bike', icon: 'fa-bicycle', label: 'Bike' },
                            { id: 'car', icon: 'fa-car', label: 'Carro' }
                          ].map((v) => (
                            <button
                              key={v.id}
                              onClick={() => setSelectedVehicle(v.id as any)}
                              className={`flex flex-col items-center justify-center p-4 rounded-[24px] border-2 transition-all active:scale-95 ${selectedVehicle === v.id ? 'border-[#FF6B00] bg-[#FF6B00]/10' : 'border-white/5 bg-black/40'}`}
                            >
                              <i className={`fas ${v.icon} text-2xl mb-2 ${selectedVehicle === v.id ? 'text-[#FF6B00]' : 'text-chocolate-muted'}`}></i>
                              <span className={`text-[9px] font-black uppercase ${selectedVehicle === v.id ? 'text-[#FF6B00]' : 'text-chocolate-muted'}`}>{v.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4 pt-6 border-t border-white/5">
                        <p className={`text-chocolate-muted text-[10px] font-black uppercase tracking-[0.2em] mb-2`}>Detalhes do Veículo</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-[20px] bg-black/40 border border-white/5">
                            <label className={`text-chocolate-muted text-[9px] font-black uppercase tracking-widest block mb-1.5`}>Modelo</label>
                            <input type="text" value={vehicleDetails.model} onChange={e => setVehicleDetails({ ...vehicleDetails, model: e.target.value })} className="w-full bg-transparent text-white outline-none text-sm font-black" />
                          </div>
                          <div className="p-4 rounded-[20px] bg-black/40 border border-white/5">
                            <label className={`text-chocolate-muted text-[9px] font-black uppercase tracking-widest block mb-1.5`}>Placa</label>
                            <input type="text" value={vehicleDetails.plate} onChange={e => setVehicleDetails({ ...vehicleDetails, plate: e.target.value })} className="w-full bg-transparent text-white outline-none text-sm font-black" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={async () => {
                      try {
                        if (!userId) return;
                        await supabaseClient.upsertVehicle(userId, vehicleDetails);
                        alert('Veículo atualizado!');
                        setSettingsView('MAIN');
                      } catch (err) {
                        alert('Erro ao salvar veículo.');
                      }
                    }}
                    className="w-full h-16 rounded-[24px] font-black text-white uppercase italic tracking-[0.2em] shadow-xl btn-lava-accept"
                  >
                    Salvar Alterações
                  </button>
                </div>
              )}

              {settingsView === 'SOUNDS' && (
                <div className="space-y-4 animate-in slide-in-from-right duration-300">
                  <div className={`p-8 rounded-[32px] border chocolate-inner-card-v2 bg-[#1a0c06]`}>
                    <h3 className={`font-black text-xl mb-6 text-white italic tracking-tight flex items-center gap-3`}>
                      <i className="fas fa-volume-high text-[#FF6B00]"></i>
                      <span>Alertas</span>
                    </h3>
                    <div className="space-y-3">
                      {SOUND_OPTIONS.map((sound) => (
                        <button 
                          key={sound.id}
                          onClick={() => {
                            setSelectedSoundId(sound.id);
                            const previewSound = new Howl({ src: [sound.url], volume: 0.6, html5: true });
                            previewSound.play();
                          }}
                          className={`w-full p-5 rounded-[24px] border transition-all flex items-center justify-between ${selectedSoundId === sound.id ? 'bg-[#FF6B00]/10 border-[#FF6B00] text-[#FF6B00]' : 'bg-black/40 border-white/5 text-chocolate-muted'}`}
                        >
                          <div className="flex items-center space-x-4">
                            <i className={`fas ${selectedSoundId === sound.id ? 'fa-circle-play' : 'fa-circle-stop'} text-xl`}></i>
                            <div>
                              <p className={`text-sm font-black ${selectedSoundId === sound.id ? 'text-white' : ''}`}>{sound.label}</p>
                              <p className="text-[9px] font-bold opacity-60">{sound.description}</p>
                            </div>
                          </div>
                          {selectedSoundId === sound.id && <i className="fas fa-check-circle"></i>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {settingsView === 'MAPS' && (
                <div className="space-y-4 animate-in slide-in-from-right duration-300">
                  <div className={`p-8 rounded-[32px] border chocolate-inner-card-v2 bg-[#1a0c06]`}>
                    <h3 className={`font-black text-xl mb-6 text-white italic tracking-tight flex items-center gap-3`}>
                      <i className="fas fa-map-location-dot text-[#FF6B00]"></i>
                      <span>Navegação</span>
                    </h3>
                    <div className="space-y-3">
                      {[
                        { id: 'internal', label: 'Guepardo Maps', icon: 'fa-location-crosshairs' },
                        { id: 'google', label: 'Google Maps', icon: 'fa-map' },
                        { id: 'waze', label: 'Waze', icon: 'fa-waze' },
                      ].map((map) => (
                        <button 
                          key={map.id}
                          onClick={() => setCurrentUser(prev => ({ ...prev, preferredMap: map.id as any }))}
                          className={`w-full p-5 rounded-[24px] border transition-all flex items-center justify-between ${currentUser.preferredMap === map.id ? 'border-[#FF6B00] bg-[#FF6B00]/5 text-[#FF6B00]' : 'bg-black/40 border-white/5 text-chocolate-muted'}`}
                        >
                          <div className="flex items-center space-x-4">
                            <i className={`fas ${map.id === 'waze' ? 'fab fa-waze' : map.icon} text-xl`}></i>
                            <span className={`text-sm font-black ${currentUser.preferredMap === map.id ? 'text-white' : ''}`}>{map.label}</span>
                          </div>
                          {currentUser.preferredMap === map.id && <div className="w-2.5 h-2.5 rounded-full bg-[#FF6B00] shadow-[0_0_10px_#FF6B00]"></div>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          );
        }
      }
      default: return null;
    }
  };


  // Show onboarding wizard if in progress
  if (onboardingScreen === 'CITY_SELECTION') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-0 sm:p-4 bg-transparent">
        <div className="w-full max-w-[480px] h-full sm:h-[90vh] sm:rounded-[40px] shadow-2xl overflow-hidden relative border border-white/5 bg-black/20 backdrop-blur-sm">
          <CitySelection
            onCitySelect={handleCitySelect}
            onBack={handleWizardCancel}
            theme={theme}
          />
        </div>
      </div>
    );
  }

  if (onboardingScreen === 'WIZARD') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-0 sm:p-4 bg-transparent">
        <div className="w-full max-w-[480px] h-full sm:h-[90vh] sm:rounded-[40px] shadow-2xl overflow-hidden relative border border-white/5 bg-black/20 backdrop-blur-sm">
          <WizardContainer
            onComplete={handleWizardComplete}
            onCancel={handleWizardCancel}
            initialCity={selectedCity}
            theme={theme}
          />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (currentUser.status === 'pending')) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-0 sm:p-4 bg-transparent">
        <div className="w-full max-w-[480px] h-full sm:h-[90vh] sm:rounded-[40px] shadow-2xl overflow-hidden relative border border-white/5 bg-black/20 backdrop-blur-sm">
          {isAuthenticated && currentUser.status === 'pending' ? (
            <div className="relative z-10 flex flex-col h-full overflow-y-auto px-6">
              {/* Header Logo equivalent for the pending screen when logged in */}
              <div className="flex flex-col items-center pt-14 pb-5 shrink-0">
                <img
                  src="/cheetah-icon.png"
                  alt="Guepardo Delivery"
                  className="w-56 object-contain"
                  style={{ filter: 'drop-shadow(0 16px 48px rgba(200,80,10,0.65)) drop-shadow(0 4px 12px rgba(0,0,0,0.7))' }}
                />
                <p className="mt-2 text-2xl font-black uppercase tracking-wider" style={{ color: 'white', textShadow: '0 2px 12px rgba(200,80,10,0.7)' }}>
                  Guepardo <span style={{ color: '#FF8C28' }}>Delivery</span>
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.6em] mt-0.5" style={{ color: 'rgba(255,190,80,0.6)' }}>
                  ENTREGADOR
                </p>
              </div>
              <div className="w-full flex items-center gap-3 mb-6 shrink-0">
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(255,140,40,0.35))' }} />
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF8C28', boxShadow: '0 0 8px 2px rgba(255,140,40,0.6)' }} />
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(255,140,40,0.35))' }} />
              </div>
              
              <div className="flex flex-col items-center justify-center py-5 text-center">
                <div className="w-24 h-24 bg-[#FF6B00]/10 rounded-full flex items-center justify-center mb-8 border border-[#FF6B00]/30 shadow-2xl shadow-orange-900/20">
                  <i className="fas fa-clock text-4xl text-[#FF6B00] animate-pulse"></i>
                </div>
                <h2 className="text-3xl font-black italic mb-4 text-white uppercase">Conta em Análise</h2>
                <p className="text-zinc-400 font-bold mb-10 uppercase text-xs tracking-[0.2em] leading-relaxed">
                  Estamos analisando seus documentos.<br/>
                  <span className="text-[#FF6B00]">Aguardando aprovação do APP Guepardo Central.</span>
                </p>
                
                <div className="w-full bg-[#1a0a05]/50 p-6 rounded-[32px] border border-[#FF6B00]/10 mb-10">
                  <p className="text-[#8b7d77] font-black text-[10px] uppercase mb-2">Status do Perfil</p>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                    <p className="text-lg font-black text-orange-500 italic uppercase">Pendente</p>
                  </div>
                </div>

                <button 
                  onClick={handleLogout} 
                  className="w-full h-16 bg-zinc-800 rounded-2xl font-black text-white uppercase italic tracking-widest shadow-xl active:scale-95 transition-transform"
                >
                  Sair da Conta
                </button>
              </div>
            </div>
          ) : renderAuthScreen()}
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen flex flex-col relative overflow-hidden transition-colors duration-300 bg-transparent ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
      <header className={`z-[1002] ${isNavigating ? 'hidden sm:flex' : 'flex'} flex-col items-center justify-between backdrop-blur-2xl border-b transition-all duration-300 ${theme === 'dark' ? 'bg-zinc-950/80 border-white/5' : 'bg-white/80 border-zinc-200'}`}>
        {(!(isNavigating && !isMissionOverlayExpanded)) && (
          <div className="w-full px-6 py-2 sm:py-4 flex items-center justify-between relative h-16 sm:h-20 animate-in fade-in duration-500">
            <div className="flex items-center justify-center">
              <div className="w-10 h-10 rounded-full p-0.5 border-2 border-[#FF6B00] shadow-lg shadow-orange-900/20">
                <img src={currentUser.avatar} onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }} alt="Perfil" className="w-full h-full rounded-full object-cover" />
              </div>
            </div>

            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <button onClick={toggleOnlineStatus} className={`h-10 px-6 rounded-full flex items-center space-x-3 transition-all duration-500 shadow-xl ${status === DriverStatus.ONLINE ? 'emerald-status-btn' : 'bg-zinc-800 border border-white/5'}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${status === DriverStatus.ONLINE ? 'emerald-glow-dot animate-pulse' : theme === 'dark' ? 'bg-zinc-600' : 'bg-zinc-400'}`}></div>
                <span className={`font-black text-[10px] uppercase tracking-widest ${status === DriverStatus.ONLINE ? 'text-white' : 'text-zinc-500'}`}>{status === DriverStatus.ONLINE ? 'Disponível' : 'Indisponível'}</span>
              </button>
            </div>

            <button
              onClick={handleOpenNotifications}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${cardBg} border shadow-lg relative`}
            >
              <div className="relative">
                <i className={`fas fa-bell text-lg ${textPrimary}`}></i>
                {unreadCount > 0 && !notificationsSeen && (
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-black flex items-center justify-center">
                    <span className="text-[9px] font-black text-white">{unreadCount}</span>
                  </div>
                )}
              </div>
            </button>
          </div>
        )}

        {(!(isNavigating && !isMissionOverlayExpanded)) && (
          <div className="w-full px-6 pb-4 flex justify-center animate-in fade-in duration-500">
            {!gpsEnabled && (
              <button
                onClick={handleActivateGPS}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl border active:scale-95 transition-all w-full justify-center ${theme === 'dark' ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200 shadow-sm'}`}
              >
                {isGpsLoading ? (
                  <i className="fas fa-circle-notch fa-spin text-red-500 text-[10px]"></i>
                ) : (
                  <i className="fas fa-satellite-dish text-red-500 text-[10px] animate-pulse"></i>
                )}
                <span className={`text-[9px] font-bold uppercase tracking-wide ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                  {isGpsLoading ? 'Ativando localização...' : 'Ative a localização por GPS p/ evitar restrições'}
                </span>
              </button>
            )}
          </div>
        )}
      </header>

      {showBatchAlert && (
        <div className="absolute top-24 left-6 right-6 z-[1005] animate-in slide-in-from-top duration-500">
          <div className="bg-orange-600/90 backdrop-blur-xl rounded-[28px] p-5 shadow-2xl border border-white/20 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                <i className="fas fa-route text-xl"></i>
              </div>
              <div>
                <p className="text-white text-[10px] font-black uppercase tracking-widest leading-none mb-1">Nova Missão na Rota!</p>
                <div className="flex items-center space-x-2">
                  <span className="text-white font-black text-lg">+ {formatCurrency(newBatchEarnings)}</span>
                  <div className="h-4 w-px bg-white/30"></div>
                  <span className="text-white/80 text-[10px] font-bold">Total: {formatCurrency(activeMissions.reduce((acc, m) => acc + m.earnings, 0))}</span>
                </div>
              </div>
            </div>
            <button onClick={() => setShowBatchAlert(false)} className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-white/50 active:scale-90 transition-transform">
              <i className="fas fa-times text-xs"></i>
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 relative overflow-hidden">{renderScreen()}</main>
      <footer className={`fixed bottom-0 left-0 right-0 z-[1001] ${isNavigating ? 'hidden' : 'block'}`}>
        <div className="max-w-[480px] mx-auto chocolate-nav-bar flex items-center justify-around h-20 sm:h-24 px-4 pb-2 sm:pb-4 rounded-t-[32px]">
          <button onClick={() => { playClick(); setCurrentScreen('HOME'); }} className={`flex flex-col items-center space-y-1 w-1/4 relative transition-all ${currentScreen === 'HOME' ? 'text-[#FF6B00]' : 'text-chocolate-muted'}`}>
            <div className={`w-10 h-1.5 bg-[#FF6B00] absolute -top-10 rounded-b-full transition-all shadow-[0_0_15px_#FF6B00] ${currentScreen === 'HOME' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div>
            <i className={`fas fa-compass text-lg sm:text-xl ${currentScreen === 'HOME' ? 'neon-orange-glow-text' : ''}`}></i>
            <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest">Mapa</span>
          </button>
          
          <button onClick={() => { playClick(); setCurrentScreen('WALLET'); }} className={`flex flex-col items-center space-y-1 w-1/4 relative transition-all ${currentScreen === 'WALLET' ? 'text-[#FF6B00]' : 'text-chocolate-muted'}`}>
            <div className={`w-10 h-1.5 bg-[#FF6B00] absolute -top-10 rounded-b-full transition-all shadow-[0_0_15px_#FF6B00] ${currentScreen === 'WALLET' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div>
            <i className={`fas fa-wallet text-lg sm:text-xl ${currentScreen === 'WALLET' ? 'neon-orange-glow-text' : ''}`}></i>
            <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest">Ganhos</span>
          </button>
          
          <button onClick={() => { playClick(); setCurrentScreen('ORDERS'); }} className={`flex flex-col items-center space-y-1 w-1/4 relative transition-all ${currentScreen === 'ORDERS' ? 'text-[#FF6B00]' : 'text-chocolate-muted'}`}>
            <div className={`w-10 h-1.5 bg-[#FF6B00] absolute -top-10 rounded-b-full transition-all shadow-[0_0_15px_#FF6B00] ${currentScreen === 'ORDERS' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div>
            <i className={`fas fa-question-circle text-lg sm:text-xl ${currentScreen === 'ORDERS' ? 'neon-orange-glow-text' : ''}`}></i>
            <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest">Ajuda</span>
          </button>
          
          <button onClick={() => { playClick(); setCurrentScreen('SETTINGS'); }} className={`flex flex-col items-center space-y-1 w-1/4 relative transition-all ${currentScreen === 'SETTINGS' ? 'text-[#FF6B00]' : 'text-chocolate-muted'}`}>
            <div className={`w-10 h-1.5 bg-[#FF6B00] absolute -top-10 rounded-b-full transition-all shadow-[0_0_15px_#FF6B00] ${currentScreen === 'SETTINGS' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div>
            <i className={`fas fa-user-gear text-lg sm:text-xl ${currentScreen === 'SETTINGS' ? 'neon-orange-glow-text' : ''}`}></i>
            <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest">Perfil</span>
          </button>
        </div>
      </footer>


      {showSOSModal && (
        <div className="absolute inset-0 bg-black/80 z-[6000] flex items-end justify-center backdrop-blur-xl animate-in fade-in duration-300">
          <div className={`w-full chocolate-bottom-panel rounded-t-[40px] p-6 pb-12 animate-in slide-in-from-bottom duration-500 shadow-2xl border-t border-[#FF6B00]/20`}>
            <div className="flex justify-between items-center mb-8 px-2">
              <div>
                <h2 className="text-2xl font-black italic text-white tracking-tight flex items-center gap-3">
                  <i className="fas fa-tower-broadcast text-[#FF6B00] animate-pulse"></i>
                  <span>Central SOS</span>
                </h2>
                <p className="text-chocolate-muted text-[10px] font-black uppercase tracking-[0.2em] mt-1">EMERGÊNCIA E SUPORTE</p>
              </div>
              <button 
                onClick={() => setShowSOSModal(false)} 
                className="w-11 h-11 rounded-full chocolate-inner-card-v2 flex items-center justify-center text-chocolate-primary active:scale-90 transition-transform"
              >
                <i className="fas fa-chevron-down"></i>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleSOSAction('police')}
                className="chocolate-inner-card-v2 border-red-500/20 p-6 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all group"
              >
                <div className="w-16 h-16 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center shadow-lg shadow-red-900/20 group-hover:scale-110 transition-transform">
                  <i className="fas fa-shield-halved text-2xl text-red-500"></i>
                </div>
                <div className="text-center">
                  <h3 className="text-white font-black text-lg">POLÍCIA</h3>
                  <p className="text-red-500 font-bold text-xs">Ligar 190</p>
                </div>
              </button>
              <button
                onClick={() => handleSOSAction('samu')}
                className="chocolate-inner-card-v2 border-red-500/20 p-6 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all group"
              >
                <div className="w-16 h-16 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center shadow-lg shadow-red-900/20 group-hover:scale-110 transition-transform">
                  <i className="fas fa-truck-medical text-2xl text-red-500"></i>
                </div>
                <div className="text-center">
                  <h3 className="text-white font-black text-lg">SAMU</h3>
                  <p className="text-red-500 font-bold text-xs">Ligar 192</p>
                </div>
              </button>
              <button
                onClick={() => handleSOSAction('share')}
                className="chocolate-inner-card-v2 p-6 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all group"
              >
                <div className="w-14 h-14 rounded-full bg-green-600/10 border border-green-500/20 flex items-center justify-center shadow-lg shadow-green-900/10 group-hover:scale-110 transition-transform">
                  <i className="fab fa-whatsapp text-2xl text-green-500"></i>
                </div>
                <div className="text-center">
                  <h3 className="text-white font-black text-xs uppercase italic tracking-tighter">Localização</h3>
                  <p className="text-chocolate-muted font-bold text-[10px]">Compartilhar</p>
                </div>
              </button>
              <button
                onClick={() => handleSOSAction('mechanic')}
                className="chocolate-inner-card-v2 p-6 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all group"
              >
                <div className="w-14 h-14 rounded-full bg-[#FF6B00]/10 border border-[#FF6B00]/20 flex items-center justify-center shadow-lg shadow-orange-900/10 group-hover:scale-110 transition-transform">
                  <i className="fas fa-wrench text-2xl text-[#FF6B00]"></i>
                </div>
                <div className="text-center">
                  <h3 className="text-white font-black text-sm uppercase italic tracking-tighter">Mecânico</h3>
                  <p className="text-chocolate-muted font-bold text-[10px]">Buscar Próximo</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {showPostDeliveryModal && (
        <div className="absolute inset-0 z-[7000] bg-[#0f0502] flex items-center justify-center overflow-hidden animate-in fade-in duration-700">
          {/* A Pata cortando a tela (Animated Background) */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="liquid-lava-path !w-full !left-0 !top-0 !bottom-0 !opacity-5 blur-3xl"></div>
          </div>

          {/* Conteúdo da Vitória */}
          <div className="relative z-10 w-full max-w-sm px-8 text-center flex flex-col items-center">
            {/* Guepardo Victory Logo (Moto) */}
            <div className="mb-8 relative transition-all animate-in zoom-in-125 duration-700 delay-300">
              <div className="absolute inset-0 rounded-full bg-[#FF6B00] blur-[100px] opacity-30 animate-pulse"></div>
              <img 
                src="/images/guepardo-victory.png" 
                className="w-56 h-auto relative z-10 drop-shadow-[0_0_30px_rgba(255,107,0,0.5)]" 
                alt="Guepardo Victory" 
              />
            </div>

            <div className="space-y-2 mb-10">
              <h2 className="text-[40px] font-black italic text-white tracking-tighter leading-tight uppercase transform -skew-x-12">
                MISSÃO<br/>CUMPRIDA!
              </h2>
              <p className="text-[#FF6B00] font-black italic text-xl tracking-widest uppercase opacity-80">Você é Feroz!</p>
            </div>

            {/* Valor da Corrida (Solid Card) */}
            <div className="w-full chocolate-inner-card-v2 p-10 mb-12 border-[#FF6B00]/30 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
              <p className="text-chocolate-muted font-black text-[10px] uppercase tracking-[0.3em] mb-4">Total Arrecadado</p>
              <p className="text-6xl font-black text-white italic drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                {formatCurrency(batchEarnings || 0)}
              </p>
            </div>

            <button 
              onClick={() => { playClick(); setShowPostDeliveryModal(false); }} 
              className="w-full h-20 btn-lava-accept flex items-center justify-center gap-4 rounded-[32px] text-white font-black text-xl uppercase italic tracking-widest heartbeat-pulse"
            >
              <i className="fas fa-fire-flame-curved"></i>
              Próxima Caça
            </button>
          </div>
        </div>
      )}
      {showSuccessAnticipation && (
        <div className="absolute inset-0 z-[6000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8">
          <div className="w-full max-w-xs text-center animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-[#FFD700] rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-yellow-900/40"><i className="fas fa-bolt text-4xl text-black"></i></div>
            <h2 className="text-3xl font-black italic mb-2 text-white">PIX ENVIADO!</h2>
            <p className="text-zinc-400 font-bold mb-8 uppercase text-xs tracking-widest text-center">O dinheiro chegará na sua conta em alguns minutos.</p>
            <button onClick={() => { setShowSuccessAnticipation(false); setCurrentScreen('WALLET'); }} className="w-full h-16 bg-[#FF6B00] rounded-2xl font-black text-white uppercase italic tracking-widest shadow-xl">Concluir</button>
          </div>
        </div>
      )}

      {showFiltersModal && (
        <div className="absolute inset-0 bg-black/80 z-[6000] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 border-t border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-500 pb-12 ${cardBg}`}>
            <div className="flex justify-between items-center mb-8">
              <h2 className={`text-2xl font-black italic ${textPrimary}`}>Filtros de Rota</h2>
              <button onClick={() => setShowFiltersModal(false)} className={`w-10 h-10 rounded-full flex items-center justify-center ${innerBg} ${textMuted}`}>
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>
            <div className="space-y-6">
              <div className={`p-5 rounded-[28px] border border-white/5 ${backHome ? 'bg-[#33CCFF]/10 border-[#33CCFF]/30' : innerBg}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${backHome ? 'bg-[#33CCFF] text-white' : 'bg-zinc-700/50 text-zinc-500'}`}>
                      <i className="fas fa-house-user"></i>
                    </div>
                    <div>
                      <h3 className={`text-sm font-black uppercase tracking-wide ${textPrimary}`}>Voltar p/ Casa</h3>
                      <p className={`text-[9px] font-bold ${textMuted}`}>Priorizar destino final</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={backHome} onChange={(e) => setBackHome(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#33CCFF]"></div>
                  </label>
                </div>
                {backHome && (
                  <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                    <input
                      type="text"
                      value={homeDestination}
                      onChange={(e) => setHomeDestination(e.target.value)}
                      placeholder="Digite seu endereço..."
                      className={`w-full h-12 rounded-xl px-4 text-xs font-bold outline-none border focus:border-[#33CCFF] ${theme === 'dark' ? 'bg-black text-white border-zinc-700' : 'bg-white text-black border-zinc-200'}`}
                    />
                  </div>
                )}
              </div>
              <div className={`p-5 rounded-[28px] border border-white/5 ${innerBg}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-xs font-black uppercase tracking-widest ${textMuted}`}>Raio de Entrega</h3>
                  <span className={`text-[#FF6B00] font-black text-lg`}>{maxDistance} km</span>
                </div>
                <input type="range" min="1" max="50" value={maxDistance} onChange={(e) => setMaxDistance(parseInt(e.target.value))} className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#FF6B00]" />
              </div>
              <div className={`p-5 rounded-[28px] border border-white/5 ${innerBg}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-xs font-black uppercase tracking-widest ${textMuted}`}>Valor Mínimo</h3>
                  <span className={`text-green-500 font-black text-lg`}>R$ {minPrice.toFixed(0)}</span>
                </div>
                <input type="range" min="0" max="30" step="5" value={minPrice} onChange={(e) => setMinPrice(parseInt(e.target.value))} className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-green-500" />
              </div>
            </div>
            <button onClick={() => setShowFiltersModal(false)} className="w-full h-16 mt-8 bg-[#FF6B00] rounded-2xl font-black text-white uppercase tracking-widest shadow-xl active:scale-95 transition-transform">
              Aplicar Filtros
            </button>
          </div>
        </div>
      )}

      {selectedTransaction && (
        <div className="absolute inset-0 z-[7000] bg-black/90 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-200">
          <div className={`w-full max-w-md h-[90%] sm:h-auto rounded-t-[40px] sm:rounded-[40px] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300 border-t border-white/10 shadow-2xl ${cardBg}`}>
            <div className="p-8 pb-4 flex justify-between items-start shrink-0">
              <div>
                <h2 className={`text-3xl font-black italic tracking-tighter ${textPrimary}`}>Detalhes</h2>
                <p className={`${textMuted} font-bold text-xs uppercase tracking-widest`}>{selectedTransaction.type}</p>
              </div>
              <button
                onClick={() => setSelectedTransaction(null)}
                className={`w-10 h-10 rounded-full flex items-center justify-center ${innerBg} ${textMuted} active:scale-90 transition-transform`}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 pt-0">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className={`text-4xl font-black text-green-500 italic tracking-tighter`}>+ {formatCurrency(selectedTransaction.amount)}</p>
                  <p className={`${textMuted} text-[10px] font-bold uppercase tracking-widest mt-1`}>
                    {selectedTransaction.date}, {selectedTransaction.time}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className={`p-4 rounded-[24px] border border-white/5 ${innerBg} flex flex-col items-center justify-center space-y-1`}>
                  <i className="far fa-clock text-[#FF6B00] mb-1"></i>
                  <span className={`text-xl font-black ${textPrimary}`}>{selectedTransaction.details?.duration || '15 min'}</span>
                  <span className={`text-[8px] font-black uppercase tracking-widest ${textMuted}`}>Em Rota</span>
                </div>
                <div className={`p-4 rounded-[24px] border border-white/5 ${innerBg} flex flex-col items-center justify-center space-y-1`}>
                  <i className="fas fa-map-marker-alt text-[#FFD700] mb-1"></i>
                  <span className={`text-xl font-black ${textPrimary}`}>{selectedTransaction.details?.stops || 2}</span>
                  <span className={`text-[8px] font-black uppercase tracking-widest ${textMuted}`}>Paradas</span>
                </div>
              </div>

              <div>
                <h3 className={`text-sm font-black uppercase tracking-[0.2em] italic mb-6 ${textPrimary}`}>Histórico da Rota</h3>
                <div className="relative pl-4 space-y-8 border-l-2 border-dashed border-zinc-700 ml-2">
                  {(selectedTransaction.details?.timeline || generateTimeline(selectedTransaction.time)).map((event: any, i: number) => (
                    <div key={i} className="relative pl-6">
                      <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-[#1E1E1E] ${i === 0 ? 'bg-green-500' : 'bg-zinc-600'}`}></div>
                      <div className="flex flex-col">
                        <span className={`text-xs font-black ${textPrimary}`}>{event.description}</span>
                        <span className={`text-[10px] font-bold ${textMuted}`}>{event.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={`p-6 border-t border-white/5 ${innerBg} flex gap-3`}>
              <button 
                onClick={() => handleOpenHistoricalChat(selectedTransaction)}
                className="flex-1 h-14 bg-white/10 rounded-2xl font-black text-white uppercase text-[10px] tracking-widest border border-white/10 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <i className="fas fa-comments text-sm text-[#FF6B00]"></i>
                Ver Chat
              </button>
              <button onClick={() => setSelectedTransaction(null)} className="flex-[2] h-14 bg-[#FF6B00] rounded-2xl font-black text-white uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">Fechar</button>
            </div>

          </div>
        </div>
      )}

      {status === DriverStatus.ALERTING && mission && (
        <div className="absolute inset-0 z-[8000] flex items-end justify-center pb-12 p-6 chocolate-lava-backdrop pointer-events-none overflow-hidden">
          
          {/* Background Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FF6B00]/10 rounded-full blur-[120px] pointer-events-none"></div>

          <div className={`w-full max-w-md chocolate-glass-card relative overflow-hidden flex flex-col pointer-events-auto`}>
            
            {/* Guepardo Watermark */}
            <div className="absolute inset-0 guepardo-watermark pointer-events-none opacity-[0.05]"></div>

            {/* Header: Neomorphic Price Display */}
            <div className="p-12 pb-6 text-center relative z-10">
              {(() => {
                const mToShow = activeMissions.length > 0 ? activeMissions : [mission];
                const totalE = mToShow.reduce((acc, m) => acc + (m?.earnings || 0), 0);
                const distToStore = mToShow[0]?.distanceToStore || 0;
                const totalDeliveryDist = mToShow.reduce((acc, m) => acc + (m?.deliveryDistance || 0), 0);
                const totalD = mToShow[0]?.totalDistance || (distToStore + totalDeliveryDist);
                const totalStops = mToShow.length;

                return (
                  <div className="flex flex-col items-center">
                    <div className="mb-8 relative">
                      {/* Sub-label */}
                      <span className="text-[10px] font-black uppercase text-[#FF6B00] tracking-[0.3em] mb-2 block opacity-70">Ganhos Estimados</span>
                      <h2 className="text-[72px] font-black neon-orange-glow-text leading-none tracking-tighter">
                         {formatCurrency(totalE)}
                      </h2>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="metric-badge-chocolate flex items-center space-x-2">
                        <i className="fas fa-motorcycle text-[#FF6B00] text-sm"></i>
                        <span className="text-sm font-black tracking-tight">{totalD.toFixed(2).replace('.', ',')} km</span>
                      </div>
                      <div className="metric-badge-chocolate flex items-center space-x-2">
                        <i className="fas fa-map-pin text-[#FF6B00] text-sm"></i>
                        <span className="text-sm font-black tracking-tight">{totalStops} {totalStops === 1 ? 'Parada' : 'Paradas'}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Route Lava Path Section */}
            <div className="px-12 py-6 relative flex-1">
              <div className="liquid-lava-path"></div>
              
              <div className="space-y-10">
                {/* Loja Origin */}
                <div className="flex items-start space-x-6 relative">
                  <div className="w-10 h-10 rounded-full bg-[#1a0a05] border-2 border-[#FF6B00] shadow-[0_0_15px_rgba(255,107,0,0.3)] flex items-center justify-center z-20 shrink-0">
                    <i className="fas fa-store text-[#FF6B00] text-xs"></i>
                  </div>
                  <div className="flex flex-col min-w-0 pt-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[14px] font-black text-white uppercase tracking-wider">{mission.storeName}</span>
                      <span className="text-[10px] font-bold text-[#FF6B00]/60 tracking-widest uppercase">Coleta</span>
                    </div>
                    <span className="text-xs text-zinc-400 font-medium leading-relaxed line-clamp-2 mt-1 italic">{mission.storeAddress}</span>
                  </div>
                </div>

                {/* Delivery Stops */}
                {(activeMissions.length > 0 ? activeMissions : [mission]).map((m, idx) => (
                  <div key={m.id} className="flex items-start space-x-6 relative">
                    <div className="w-10 h-10 rounded-full bg-[#1a0a05] border-2 border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.05)] flex items-center justify-center z-20 shrink-0 group-hover:border-[#FF6B00] transition-colors">
                      <i className="fas fa-map-marker-alt text-white/40 text-xs"></i>
                    </div>
                    <div className="flex flex-col min-w-0 pt-1">
                      <span className="text-[14px] font-black text-white uppercase tracking-wider">{idx + 1}ª Entrega</span>
                      <span className="text-xs text-zinc-400 font-medium leading-relaxed line-clamp-2 mt-1 italic">{m.customerAddress}</span>
                    </div>
                  </div>
                ))}

                {/* Return trip */}
                {mission.isReturnRequired && (
                  <div className="flex items-start space-x-6 relative">
                    <div className="w-10 h-10 rounded-full bg-[#0a0402] border-2 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] flex items-center justify-center z-20 shrink-0">
                      <i className="fas fa-undo-alt text-red-500 text-xs text-red-400"></i>
                    </div>
                    <div className="flex flex-col min-w-0 pt-1">
                      <span className="text-[14px] font-black text-red-400 uppercase tracking-wider">Retorno Obrigatório</span>
                      <span className="text-xs text-[#8b7d77] font-medium leading-relaxed line-clamp-2 mt-1 italic">Devolução na Loja</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Premium Interaction Footer */}
            <div className="p-12 pt-8 bg-black/40 border-t border-white/5 flex flex-col items-center relative z-20">
              
              {/* Luxury Circular Timer */}
              <div className="flex items-center justify-center space-x-12 mb-10">
                <div className="flex space-x-2 opacity-10 text-[#FF6B00]">
                  <i className="fas fa-chevron-left text-xs"></i>
                  <i className="fas fa-chevron-left text-xs"></i>
                </div>

                <div className="relative flex items-center justify-center circular-gauge-chocolate">
                  <svg width="100" height="100" viewBox="0 0 100 100" className="rotate-[-90deg]">
                    <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,107,0,0.05)" strokeWidth="4" />
                    <circle 
                      cx="50" cy="50" r="46" 
                      fill="none" 
                      stroke="#FF6B00" 
                      strokeWidth="4" 
                      strokeLinecap="round"
                      style={{ 
                        strokeDasharray: 289, 
                        strokeDashoffset: 289 - (alertCountdown / 30) * 289,
                        transition: 'stroke-dashoffset 1s linear'
                      }}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-black text-white tracking-tighter tabular-nums">{alertCountdown}</span>
                    <span className="text-[8px] font-black text-[#FF6B00] uppercase tracking-[0.25em] mt-[-3px]">Tempo</span>
                  </div>
                </div>

                <div className="flex space-x-2 opacity-10 text-[#FF6B00]">
                  <i className="fas fa-chevron-right text-xs"></i>
                  <i className="fas fa-chevron-right text-xs"></i>
                </div>
              </div>

              {/* Ultra Action Stack */}
              <button 
                onClick={handleAcceptMission}
                className="w-full h-22 btn-lava-accept heartbeat-pulse rounded-[32px] font-black text-2xl text-white uppercase tracking-[0.2em] active:scale-95 flex items-center justify-center space-x-4 mb-8"
              >
                <i className="fas fa-check-double text-2xl"></i>
                <span>Aceitar</span>
              </button>
              
              <button 
                onClick={handleRejectMission}
                className="text-zinc-600 font-black text-[11px] uppercase tracking-[0.3em] hover:text-red-500/80 transition-colors py-2 active:scale-90"
              >
                Ignorar Chamada
              </button>
            </div>

          </div>
        </div>
      )}




      {/* Splash Screen — exibido por 3s ao iniciar */}
      {showSplash && <SplashScreen />}

      {/* Modal de Chat Multilateral */}
      {showChatModal && (
        <ChatMultilateralModal 
          order={historicalOrder || mission}
          onClose={() => {
            setShowChatModal(false);
            setHistoricalOrder(null);
          }}
          currentUser={currentUser}
          initialTab={chatTab}
          theme={theme}
        />
      )}

    </div>
  );
};

export default App;
