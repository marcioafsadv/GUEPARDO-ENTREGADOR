
import React, { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { DriverStatus, DeliveryMission, Transaction, NotificationModel, NotificationType } from './types';
import { COLORS, calculateEarnings, MOCK_NOTIFICATIONS, DEFAULT_AVATAR } from './constants';
import { MapLeaflet } from './components/MapLeaflet';
import { SplashScreen } from './components/SplashScreen';
import { HoldToFillButton } from './components/HoldToFillButton';
import { Logo } from './components/Logo';
import * as supabaseClient from './supabase';
import WizardContainer, { WizardData } from './components/onboarding/WizardContainer';
import CitySelection from './components/onboarding/CitySelection';
import { processWizardRegistration } from './utils/wizardProcessor';


type Screen = 'HOME' | 'WALLET' | 'ORDERS' | 'SETTINGS' | 'WITHDRAWAL_REQUEST' | 'NOTIFICATIONS';
type SettingsView = 'MAIN' | 'PERSONAL' | 'DOCUMENTS' | 'BANK' | 'EMERGENCY' | 'DELIVERY' | 'SOUNDS';
type AuthScreen = 'LOGIN' | 'REGISTER' | 'RECOVERY' | 'VERIFICATION';
type OnboardingScreen = 'CITY_SELECTION' | 'WIZARD' | null;
type MapMode = 'standard' | 'satellite';

const SOUND_OPTIONS = [
  {
    id: 'cheetah',
    label: 'Rugido do Guepardo',
    description: 'Alerta exclusivo da marca',
    url: '/sounds/lion-roar.mp3',
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

const ANTICIPATION_FEE = 5.00;

// Helper para formatar data (dd MMM)
const formatDate = (date: Date) => {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
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

const App: React.FC = () => {
  // Splash Screen
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(t);
  }, []);

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
    }
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
  const [activeMissions, setActiveMissions] = useState<DeliveryMission[]>([]);
  const mission = React.useMemo(() => {
    if (activeMissions.length === 0) return null;

    // Priority: If we haven't picked up all orders, focus on the first one that needs pickup
    // In our simplified workflow, GOING_TO_STORE means we are heading to the store for ALL of them.
    // Once we are picking up, we focus on the first one.
    return activeMissions[0];
  }, [activeMissions]);

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
  const [showBalance, setShowBalance] = useState(true);
  const [reCenterTrigger, setReCenterTrigger] = useState(0);

  // Pre-geocoded coords for instant route switching (store → customer)
  const [preloadedCoords, setPreloadedCoords] = useState<{
    store: { lat: number; lng: number } | null;
    customer: { lat: number; lng: number } | null;
  }>({ store: null, customer: null });



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

  // Auth Inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerData, setRegisterData] = useState({ name: '', cpf: '', email: '', phone: '', password: '', confirmPassword: '' });

  const [recoveryMethod, setRecoveryMethod] = useState<'cpf' | 'email'>('cpf');
  const [recoveryInput, setRecoveryInput] = useState('');

  useEffect(() => {
    setTypedCode(['', '', '', '']);
  }, [status]);

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

  // Carregar dados do usuário quando autenticado
  useEffect(() => {
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
            }
          }));
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
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    if (isAuthenticated && userId) {
      loadUserData();
    }
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
    } else {
      if (!gpsEnabled) {
        handleActivateGPS();
      } else {
        setStatus(DriverStatus.ONLINE);
        setMission(null);
      }
    }
  };

  const getStatusLabel = (status: DriverStatus) => {
    switch (status) {
      case DriverStatus.GOING_TO_STORE: return 'INDO PARA COLETA';
      case DriverStatus.ARRIVED_AT_STORE: return isOrderReady ? 'PEDIDO PRONTO' : 'AGUARDANDO PEDIDO';
      case DriverStatus.PICKING_UP: return 'CONFIRMAÇÃO DE COLETA';
      case DriverStatus.GOING_TO_CUSTOMER: return 'INDO PARA O CLIENTE';
      case DriverStatus.ARRIVED_AT_CUSTOMER: return 'LOCAL DE ENTREGA';
      case DriverStatus.RETURNING: return 'RETORNANDO À LOJA';
      default: return status.replace(/_/g, ' ');
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
          // Throttle updates? For now, we update on every change Supabase can handle it, 
          // or we can debounce. React state might debounce a bit if we put it in state, 
          // but here we call DB directly.
          // Let's rely on the watchPosition frequency (usually moves only when distance changes significantly if configured)

          // To save DB writes, maybe we only write every 10s?
          // For MVP, direct write is fine for small scale.
          supabaseClient.updateProfile(userId, {
            current_lat: latitude,
            current_lng: longitude,
            last_location_update: new Date().toISOString()
          }).catch(e => console.error("Location update failed", e));
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

  useEffect(() => {
    let timer: any;
    if (status === DriverStatus.ARRIVED_AT_STORE) {
      setIsOrderReady(false);
      timer = setTimeout(() => {
        setIsOrderReady(true);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        // Status will be updated after code validation, not automatically
      }, 10000);
    } else {
      setIsOrderReady(false);
    }
    return () => clearTimeout(timer);
  }, [status]);

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

              // Transform to DeliveryMission format with safe defaults
              const dynamicMission: DeliveryMission = {
                id: firstPending.id,
                storeName: firstPending.store_name || 'Loja',
                storeAddress: firstPending.store_address || '',
                customerName: firstPending.customer_name || 'Cliente',
                customerAddress: firstPending.customer_address || '',
                customerPhoneSuffix: firstPending.customer_phone_suffix || '',
                items: Array.isArray(firstPending.items) ? firstPending.items : (firstPending.items?.items || []),
                collectionCode: firstPending.collection_code || '0000',
                distanceToStore: firstPending.distance_to_store || 1.5,
                deliveryDistance: firstPending.delivery_distance || 2.0,
                totalDistance: firstPending.total_distance || 3.5,
                earnings: parseFloat(firstPending.earnings || '0'),
                timeLimit: 25,
                storePhone: '', // Not in DB yet
                customerPhone: firstPending.customer_phone_suffix ? `+55${firstPending.customer_phone_suffix}` : '',
                status: firstPending.status || 'pending',
                displayId: !Array.isArray(firstPending.items) && firstPending.items?.displayId ? firstPending.items.displayId : undefined
              };

              setMission(dynamicMission);
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

          // Transform Supabase data to App's DeliveryMission format
          const dynamicMission: DeliveryMission = {
            id: newMissionPayload.id,
            storeName: newMissionPayload.store_name,
            storeAddress: newMissionPayload.store_address,
            customerName: newMissionPayload.customer_name,
            customerAddress: newMissionPayload.customer_address,
            customerPhoneSuffix: newMissionPayload.customer_phone_suffix,
            items: Array.isArray(newMissionPayload.items) ? newMissionPayload.items : (newMissionPayload.items?.items || []),
            collectionCode: newMissionPayload.collection_code || '0000',
            distanceToStore: newMissionPayload.distance_to_store || 1.5,
            deliveryDistance: newMissionPayload.delivery_distance || 2.0,
            totalDistance: newMissionPayload.total_distance || 3.5,
            earnings: parseFloat(newMissionPayload.earnings || '0'),
            timeLimit: 25,
            storePhone: newMissionPayload.store_phone || '',
            customerPhone: newMissionPayload.customer_phone_suffix ? `+55${newMissionPayload.customer_phone_suffix}` : '',
            status: newMissionPayload.status || 'pending',
            isReturnRequired: newMissionPayload.is_return_required || (newMissionPayload.items?.isReturnRequired) || false,
            displayId: !Array.isArray(newMissionPayload.items) && newMissionPayload.items?.displayId ? newMissionPayload.items.displayId : undefined,
            batch_id: newMissionPayload.batch_id
          };

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
                  const mappedBatch = batchMissions.map((d: any) => ({
                    id: d.id,
                    storeName: d.store_name || 'Loja',
                    storeAddress: d.store_address || '',
                    customerName: d.customer_name || 'Cliente',
                    customerAddress: d.customer_address || '',
                    customerPhoneSuffix: d.customer_phone_suffix || '',
                    items: d.items || [],
                    collectionCode: d.collection_code || '0000',
                    distanceToStore: d.distance_to_store || 1.5,
                    deliveryDistance: d.delivery_distance || 2.0,
                    totalDistance: d.total_distance || 3.5,
                    earnings: parseFloat(d.earnings || '0'),
                    timeLimit: 25,
                    status: d.status || 'pending',
                    isReturnRequired: d.is_return_required || (d.items?.isReturnRequired) || false,
                    displayId: d.items?.displayId || undefined,
                    batch_id: d.batch_id,
                    stopNumber: d.stop_number || 1
                  })).sort((a, b) => a.stopNumber - b.stopNumber);

                  setActiveMissions(mappedBatch);
                  setMission(mappedBatch[0]);
                  setStatus(DriverStatus.ALERTING);
                  setAlertCountdown(30);
                }
              });
          } else {
            setMission(dynamicMission);
            setActiveMissions([dynamicMission]);
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
  useEffect(() => {
    let pollingInterval: any;

    if (status !== DriverStatus.OFFLINE && userId && currentUser) {
      const checkForDeliveries = async () => {
        try {
          // 1. Check for orders DIRECTLY ASSIGNED to this driver (Batching)
          const { data: assignedOrders } = await supabaseClient.supabase
            .from('deliveries')
            .select('*')
            .eq('driver_id', userId)
            .in('status', ['pending', 'accepted', 'arrived_pickup', 'in_transit', 'arrived_at_customer']);

          if (assignedOrders && assignedOrders.length > 0) {
            // Filter out missions the driver has already rejected locally
            const filteredAssigned = assignedOrders.filter(d => !rejectedMissions.includes(String(d.id)));

            const syncMissions: DeliveryMission[] = filteredAssigned.map(d => ({
              id: d.id,
              storeName: d.store_name || 'Loja',
              storeAddress: d.store_address || '',
              customerName: d.customer_name || 'Cliente',
              customerAddress: d.customer_address || '',
              customerPhoneSuffix: d.customer_phone_suffix || '',
              items: d.items || [],
              collectionCode: d.collection_code || '0000',
              distanceToStore: d.distance_to_store || 1.5,
              deliveryDistance: d.delivery_distance || 2.0,
              totalDistance: d.total_distance || 3.5,
              earnings: parseFloat(d.earnings || '0'),
              timeLimit: 25,
              storePhone: '',
              customerPhone: d.customer_phone_suffix ? `+55${d.customer_phone_suffix}` : '',
              status: d.status || 'pending',
              isReturnRequired: d.is_return_required || (d.items?.isReturnRequired) || false,
              displayId: d.items?.displayId || undefined,
              batch_id: d.batch_id
            }));

            if (syncMissions.length > 0) {
              setActiveMissions(prev => {
                const prevIds = new Set(prev.map(m => m.id));
                const newOnly = syncMissions.filter(m => !prevIds.has(m.id));
                if (newOnly.length === 0) return prev;

                // Detect batching while already in route
                if ((status as any) !== DriverStatus.ONLINE && (status as any) !== DriverStatus.OFFLINE && (status as any) !== DriverStatus.ALERTING && newOnly.length > 0) {
                  const addedEarnings = newOnly.reduce((acc, m) => acc + m.earnings, 0);
                  setNewBatchEarnings(addedEarnings);
                  setShowBatchAlert(true);
                  setTimeout(() => setShowBatchAlert(false), 8000);
                }

                // If we were ONLINE and suddenly have missions, transition status
                if (status === DriverStatus.ONLINE && (prev.length === 0) && !mission) {
                  const firstNew = newOnly[0];
                  if (firstNew.status === 'pending') {
                    setMission(firstNew);
                    setStatus(DriverStatus.ALERTING);
                  } else {
                    setStatus(DriverStatus.GOING_TO_STORE);
                  }
                }

                return [...prev, ...newOnly];
              });
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
                  const batchItems = availablePending.filter(d => d.batch_id === firstPending.batch_id);
                  missionsToAlert = batchItems.map(d => ({
                    id: d.id,
                    storeName: d.store_name || 'Loja',
                    storeAddress: d.store_address || '',
                    customerName: d.customer_name || 'Cliente',
                    customerAddress: d.customer_address || '',
                    customerPhoneSuffix: d.customer_phone_suffix || '',
                    items: d.items || [],
                    collectionCode: d.collection_code || '0000',
                    distanceToStore: d.distance_to_store || 1.5,
                    deliveryDistance: d.delivery_distance || 2.0,
                    totalDistance: d.total_distance || 3.5,
                    earnings: parseFloat(d.earnings || '0'),
                    timeLimit: 25,
                    status: d.status || 'pending',
                    isReturnRequired: d.is_return_required || (d.items?.isReturnRequired) || false,
                    displayId: d.items?.displayId || undefined,
                    batch_id: d.batch_id,
                    stopNumber: d.stop_number || 1
                  })).sort((a, b) => a.stopNumber - b.stopNumber);
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
                    distanceToStore: firstPending.distance_to_store || 1.5,
                    deliveryDistance: firstPending.delivery_distance || 2.0,
                    totalDistance: firstPending.total_distance || 3.5,
                    earnings: parseFloat(firstPending.earnings || '0'),
                    timeLimit: 25,
                    status: firstPending.status || 'pending',
                    isReturnRequired: firstPending.is_return_required || (firstPending.items?.isReturnRequired) || false,
                    storePhone: '',
                    customerPhone: firstPending.customer_phone_suffix ? `+55${firstPending.customer_phone_suffix}` : ''
                  }];
                }

                setActiveMissions(missionsToAlert);
                setMission(missionsToAlert[0]);
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
  }, [status, activeMissions.length, currentUser, rejectedMissions, userId]);


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


  // MONITOR ACTIVE MISSION (ALERTING or IN_PROGRESS)
  useEffect(() => {
    let subscription: any;

    if (mission) {
      console.log(`👀 Monitoring active mission: ${mission.id} (Status: ${status})`);

      subscription = supabaseClient.subscribeToActiveMission(mission.id, (newStatus) => {
        console.log(`📢 Mission ${mission.id} status update: ${newStatus}`);

        // CASE 1: While alerting, if mission is taken by someone else or cancelled
        if (status === DriverStatus.ALERTING) {
          if (newStatus !== 'pending') {
            console.log("⚠️ Alerting mission is no longer pending. Removing alert.");
            setMission(null);
            setStatus(DriverStatus.ONLINE);
            setAlertCountdown(0);
            if (newStatus === 'cancelled') alert('O pedido foi cancelado pela loja.');
            else alert('Esta entrega acabou de ser aceita por outro entregador.');
          }
        }
        // CASE 2: While doing the delivery, if mission is cancelled
        else if (status !== DriverStatus.ONLINE && status !== DriverStatus.OFFLINE) {
          if (newStatus === 'cancelled') {
            console.log("⚠️ Active delivery cancelled by store.");
            alert('Pedido cancelado pelo lojista. Você não está mais em rota.');
            setMission(null);
            setStatus(DriverStatus.ONLINE);
            // Optionally redirect to home or stop navigation
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
  }, [mission, status]);



  const processDeliverySuccess = async () => {
    if (!mission || !userId) return;

    // Prevent duplicate processing
    const missionId = `Entrega #${mission.displayId || mission.id.slice(-4)}`;
    if (history.some(h => h.type === missionId)) return;

    try {
      // 1. Complete mission in Supabase
      console.log('🎯 Step 1: Completing mission in database...', { missionId: mission.id, userId });
      await supabaseClient.completeMission(mission.id, userId);
      console.log('✅ Step 1: Mission completed successfully');

      const earned = mission.earnings;

      // 2. Prepare transaction data
      const newTransaction: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        type: `Entrega #${mission.displayId || mission.id.slice(-4)}`,
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
      console.log('💰 Step 2: Creating transaction...', newTransaction);

      // Only send fields that exist in the database schema
      await supabaseClient.createTransaction({
        id: newTransaction.id,
        type: newTransaction.type,
        amount: newTransaction.amount,
        status: newTransaction.status,
        week_id: newTransaction.weekId, // Map to snake_case
        user_id: userId,
        details: newTransaction.details // Added details persistence
      });
      console.log('✅ Step 2: Transaction created successfully');

      console.log('📊 Step 3: Updating daily stats...', { userId, finished: 1, earnings: earned });
      await supabaseClient.updateDailyStats(userId, {
        finished: 1,
        earnings: earned
      });
      console.log('✅ Step 3: Daily stats updated successfully');

      // 4. Update local state
      setBalance(prev => prev + earned);
      setDailyEarnings(prev => prev + earned);
      setLastEarnings(earned);
      setDailyStats(prev => ({ ...prev, finished: prev.finished + 1 }));

      // Update activeMissions: Remove completed mission
      // IMPORTANT: Calculate remaining missions BEFORE state update to avoid side effects in setter
      const remaining = activeMissions.filter(m => m.id !== mission.id);
      setActiveMissions(remaining);

      if (remaining.length === 0) {
        setStatus(DriverStatus.ONLINE);


        setMission(null); // Clear mission when all done
        setShowPostDeliveryModal(true); // Show modal ONLY at the end
      } else {
        // AUTOMATIC SEQUENCING: 
        // If the next mission is from the SAME STORE, it means we already picked it up (Batch).
        // So we go directly to GOING_TO_CUSTOMER.
        const nextMission = remaining[0];

        // Ensure mission state updates immediately
        setMission(nextMission);

        if (nextMission && nextMission.storeName === mission.storeName) {
          setStatus(DriverStatus.GOING_TO_CUSTOMER);
          setShowPostDeliveryModal(false); // Do NOT show success modal for intermediate steps
        } else {
          // Different store? We need to go pick it up.
          setStatus(DriverStatus.GOING_TO_STORE);
          setShowPostDeliveryModal(false);
        }
      }
      setHistory(prev => [newTransaction, ...prev]);

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
    }
  };

  const handleFinishDelivery = () => {
    if (!mission) return;
    processDeliverySuccess();
  };


  const handleAnticipateRequest = () => {
    if (balance <= ANTICIPATION_FEE) return;
    setIsAnticipating(true);
    setTimeout(() => {
      const amountToWithdraw = balance;
      const fee = ANTICIPATION_FEE;
      setBalance(0);
      setIsAnticipating(false);
      setShowSuccessAnticipation(true);
      const newTransaction: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'Antecipação de Ganhos',
        amount: -(amountToWithdraw),
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        date: 'Hoje',
        weekId: 'current',
        status: 'COMPLETED'
      };
      const feeTransaction: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'Taxa de Antecipação',
        amount: -(fee),
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        date: 'Hoje',
        weekId: 'current',
        status: 'COMPLETED'
      };
      setHistory(prev => [newTransaction, feeTransaction, ...prev]);
    }, 2000);
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
    if (status === DriverStatus.ARRIVED_AT_CUSTOMER) {
      if (!mission) return false;
      const cleanedSuffix = String(mission.customerPhoneSuffix || '').replace(/\D/g, '').slice(-4);
      const codeStr = typedCode.join('');
      const isMatch = codeStr === cleanedSuffix;

      if (codeStr.length === 4 && !isMatch) {
        console.log("Validation mismatch:", { entered: codeStr, expected: cleanedSuffix, raw: mission.customerPhoneSuffix });
      }
      return isMatch;
    }
    return true;
  };

  const applyCpfMask = (value: string) => {
    let v = value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return v;
  };

  const cardBg = theme === 'dark' ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-200 shadow-sm';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-zinc-900';
  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const innerBg = theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100';
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
    try {
      const missionsToAccept = activeMissions.length > 0 ? activeMissions : (mission ? [mission] : []);
      console.log(`🎯 Attempting to accept ${missionsToAccept.length} missions in batch:`, missionsToAccept.map(m => m.id));

      await Promise.all(missionsToAccept.map(m => supabaseClient.acceptMission(m.id, userId)));
      console.log('✅ Missions accepted successfully');

      setDailyStats(s => ({ ...s, accepted: s.accepted + missionsToAccept.length }));
      setStatus(DriverStatus.GOING_TO_STORE);

      const targetMission = mission || missionsToAccept[0];
      if (!mission) setMission(targetMission);

      // Stop the sound immediately
      if (alertAudioRef.current) {
        console.log("🔇 Manual stop in handleAcceptMission");
        alertAudioRef.current.stop();
      }

      // Pre-geocode both addresses in parallel for instant route switching
      if (targetMission && (targetMission.storeAddress || targetMission.customerAddress)) {
        const [storeCoords, customerCoords] = await Promise.all([
          targetMission.storeAddress ? geocodeAddress(targetMission.storeAddress) : Promise.resolve(null),
          targetMission.customerAddress ? geocodeAddress(targetMission.customerAddress) : Promise.resolve(null),
        ]);
        console.log('📍 Pre-geocoded store:', storeCoords, '| customer:', customerCoords);
        setPreloadedCoords({ store: storeCoords, customer: customerCoords });
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
    else if (status === DriverStatus.ARRIVED_AT_STORE) setStatus(DriverStatus.PICKING_UP);
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
        } catch (error) {
          console.error('❌ Error updating delivery status:', error);
        }
      }
      setStatus(DriverStatus.GOING_TO_CUSTOMER);
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
      if (mission.isReturnRequired) {
        console.log('🔄 Return trip required. Redirecting to store...');
        try {
          await supabaseClient.supabase
            .from('deliveries')
            .update({ status: 'returning' })
            .eq('id', mission.id);
          setStatus(DriverStatus.RETURNING);
        } catch (error) {
          console.error('❌ Error updating to returning status:', error);
          // Fallback: finalize anyway if DB fails? No, better stay or show error.
          alert("Erro ao iniciar retorno. Verifique sua conexão.");
        }
      } else {
        handleFinishDelivery();
      }
    }
    else if (status === DriverStatus.RETURNING) {
      // In returning state, the driver has reached the store
      // But we wait for the Lojista to confirm.
      // However, we can also let the driver "claim" they arrived at store to notify lojista.
      alert("Aguardando confirmação do lojista para encerrar o pedido.");
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

      alert("Cadastro realizado com sucesso! Aguarde a aprovação do seu perfil.");
      setOnboardingScreen(null);
      setAuthScreen('LOGIN');
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
          <img src="/guepardo-loading.png" alt="" className="w-full h-auto object-contain" draggable={false} />
        </div>

        {/* ── Textura de grão sutil ── */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
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
                <button onClick={() => setAuthScreen('RECOVERY')} className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Esqueci minha senha
                </button>
                <button onClick={() => setOnboardingScreen('CITY_SELECTION')} className="text-xs font-bold" style={{ color: '#FF8C28', background: 'none', border: 'none', cursor: 'pointer' }}>
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


      case 'HOME':
        return (
          <div className="flex flex-col h-full relative overflow-hidden">
            <div className="flex-1 relative">
              <MapLeaflet
                key={mapCenterKey}
                status={status}
                theme={mapTheme}
                showRoute={(status !== DriverStatus.OFFLINE && status !== DriverStatus.ONLINE)}
                destinationAddress={
                  status === DriverStatus.ALERTING
                    ? mission?.customerAddress
                    : (status === DriverStatus.GOING_TO_STORE || status === DriverStatus.ARRIVED_AT_STORE || status === DriverStatus.PICKING_UP)
                      ? mission?.storeAddress
                      : (status === DriverStatus.GOING_TO_CUSTOMER || status === DriverStatus.ARRIVED_AT_CUSTOMER)
                        ? mission?.customerAddress
                        : null
                }
                pickupAddress={status === DriverStatus.ALERTING ? mission?.storeAddress : null}
                // Pass pre-geocoded coords for instant route switch (no geocoding delay)
                preloadedDestinationLat={
                  (status === DriverStatus.GOING_TO_STORE || status === DriverStatus.ARRIVED_AT_STORE || status === DriverStatus.PICKING_UP)
                    ? preloadedCoords.store?.lat
                    : (status === DriverStatus.GOING_TO_CUSTOMER || status === DriverStatus.ARRIVED_AT_CUSTOMER)
                      ? preloadedCoords.customer?.lat
                      : null
                }
                preloadedDestinationLng={
                  (status === DriverStatus.GOING_TO_STORE || status === DriverStatus.ARRIVED_AT_STORE || status === DriverStatus.PICKING_UP)
                    ? preloadedCoords.store?.lng
                    : (status === DriverStatus.GOING_TO_CUSTOMER || status === DriverStatus.ARRIVED_AT_CUSTOMER)
                      ? preloadedCoords.customer?.lng
                      : null
                }
                showHeatMap={showHeatMap}
                mapMode={mapMode}
                showTraffic={showTraffic}
                reCenterTrigger={reCenterTrigger}
              />

              <div className="absolute right-4 bottom-24 flex flex-col space-y-3 z-[1001]">
                <button
                  onClick={() => setShowFiltersModal(true)}
                  className={`w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center text-[#FF6B00] border active:scale-90 transition-transform relative ${cardBg}`}
                >
                  <i className="fas fa-sliders text-lg"></i>
                  {isFilterActive && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-black"></div>}
                </button>

                <button
                  onClick={() => setShowLayersModal(true)}
                  className={`w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center border active:scale-90 transition-transform ${cardBg} ${showHeatMap || showTraffic || mapMode === 'satellite' ? 'text-[#FF6B00] border-[#FF6B00]/30' : textMuted}`}
                >
                  <i className="fas fa-layer-group text-lg"></i>
                </button>

                <button onClick={() => setReCenterTrigger(t => t + 1)} className={`w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center text-[#FF6B00] border active:scale-90 transition-transform ${cardBg}`}>
                  <i className="fas fa-location-crosshairs text-lg"></i>
                </button>

                {/* Botão Dia/Noite */}
                <button
                  onClick={() => setMapTheme(t => t === 'dark' ? 'light' : 'dark')}
                  title={mapTheme === 'dark' ? 'Mudar para Dia' : 'Mudar para Noite'}
                  className={`w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center border active:scale-90 transition-all duration-300 ${cardBg} ${mapTheme === 'light' ? 'text-yellow-400 border-yellow-400/30' : 'text-blue-400 border-blue-400/30'
                    }`}
                >
                  <i className={`fas ${mapTheme === 'light' ? 'fa-sun' : 'fa-moon'} text-lg`}></i>
                </button>

                <button onClick={() => setShowSOSModal(true)} className={`w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center text-red-500 border active:scale-90 transition-transform ${cardBg}`}>
                  <i className="fas fa-shield-heart text-lg"></i>
                </button>
              </div>
            </div>

            {status !== DriverStatus.ALERTING && !mission && (
              <div className={`absolute bottom-0 left-0 right-0 z-[1001] transition-all duration-500 transform ${isResumoExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-4.5rem)]'}`}>
                <div className={`p-6 pb-24 rounded-t-[40px] shadow-[0_-15px_40px_rgba(0,0,0,0.3)] border-t transition-colors duration-300 ${cardBg}`}>
                  <div onClick={() => setIsResumoExpanded(!isResumoExpanded)} className="w-full py-2 cursor-pointer mb-2"><div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto opacity-30"></div></div>

                  <div className="mb-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <h3 className={`text-xl font-black ${textPrimary}`}>Seus Ganhos</h3>
                      <button onClick={() => setShowBalance(!showBalance)} className={`${textMuted} active:scale-90 transition-transform`}><i className={`fas ${showBalance ? 'fa-eye' : 'fa-eye-slash'}`}></i></button>
                    </div>
                    <button onClick={() => setCurrentScreen('WALLET')} className="text-[10px] font-black uppercase tracking-widest text-[#FF6B00] active:scale-95 transition-transform">Ver mais</button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-5 rounded-[28px] border flex flex-col justify-center ${innerBg} border-transparent`}>
                      <p className={`${textMuted} text-[9px] font-black uppercase mb-1`}>Ganhos Hoje</p>
                      <p className={`text-2xl font-black ${textPrimary}`}>{showBalance ? `R$ ${(dailyEarnings || 0).toFixed(2)}` : 'R$ ••••'}</p>
                    </div>
                    <div className={`p-5 rounded-[28px] border flex flex-col space-y-2 ${innerBg} border-transparent`}>
                      <div className="flex justify-between items-center pb-1 border-b border-white/5">
                        <span className={`${textMuted} text-[8px] font-black uppercase`}>Aceitas</span>
                        <span className={`font-black text-xs ${textPrimary}`}>{dailyStats.accepted}</span>
                      </div>
                      <div className="flex justify-between items-center pb-1 border-b border-white/5">
                        <span className={`${textMuted} text-[8px] font-black uppercase`}>Finalizadas</span>
                        <span className={`font-black text-xs text-green-500`}>{dailyStats.finished}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`${textMuted} text-[8px] font-black uppercase`}>Recusadas</span>
                        <span className={`font-black text-xs text-red-500`}>{dailyStats.rejected}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}



            {mission && status !== DriverStatus.ALERTING && (
              <div className="absolute bottom-0 left-0 right-0 z-[1001] flex">
                <div className={`rounded-t-[40px] p-5 shadow-2xl border-t pb-24 transition-colors w-full flex flex-col overflow-hidden ${cardBg}`}>

                  <div className="flex justify-between items-center mb-3 shrink-0">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter italic ${status === DriverStatus.ARRIVED_AT_STORE || status === DriverStatus.PICKING_UP || status === DriverStatus.ARRIVED_AT_CUSTOMER ? 'bg-[#FFD700] text-black' : 'bg-[#FF6B00] text-white'}`}>
                      {getStatusLabel(status)}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowOrderDetails(!showOrderDetails)}
                        className={`px-3 h-9 rounded-xl flex items-center space-x-2 font-black text-[9px] uppercase transition-all active:scale-95 ${showOrderDetails ? 'bg-[#FF6B00] text-white' : `${innerBg} ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-600'}`}`}
                      >
                        <i className="fas fa-shopping-bag text-[10px]"></i>
                        {/* <span>Detalhes</span> Optional text, user asked for "icon of the bag" but usually buttons have labels or just icon. The existing buttons have text. I will leave it icon-only or with text? The user said "ícone da bag anexa ao lado esquerdo do GPS". I'll keep consistency with other buttons if space permits, or just icon if tight. GPS button has text. I'll add text for consistency but maybe just icon if user stressed "icon". Let's try with text "Det" or just icon. Existing: GPS, AJUDA. Let's start with just the icon to save space as requested "ícone da bag". Actually, the GPS button has `<span>GPS</span>`. I'll add `<span>PEDIDO</span>` or similar? Or just empty? User said "ícone da bag". I will add the icon and maybe existing style. */}
                        <span>PEDIDO</span>
                      </button>
                      <button
                        onClick={() => setShowMissionMapPicker(!showMissionMapPicker)}
                        className={`px-3 h-9 rounded-xl flex items-center space-x-2 font-black text-[9px] uppercase transition-all active:scale-95 ${showMissionMapPicker ? 'bg-[#33CCFF] text-white' : `${innerBg} ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-600'}`}`}
                      >
                        <i className="fas fa-location-arrow text-[10px]"></i>
                        <span>GPS</span>
                      </button>
                      <button
                        onClick={() => setShowDeliveryHelpModal(!showDeliveryHelpModal)}
                        className={`px-3 h-9 rounded-xl flex items-center space-x-2 font-black text-[9px] uppercase transition-all active:scale-95 ${showDeliveryHelpModal ? 'bg-[#FF6B00] text-white' : `${innerBg} ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-600'}`}`}
                      >
                        <i className="fas fa-circle-question text-[10px]"></i>
                        <span>Ajuda</span>
                      </button>
                      <button onClick={() => setShowSOSModal(true)} className={`w-9 h-9 rounded-xl flex items-center justify-center text-red-500 ${innerBg}`}><i className="fas fa-headset text-xs"></i></button>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 mb-4 pr-1">
                    {showMissionMapPicker && (
                      <div className={`p-3 rounded-[20px] border border-white/5 flex justify-center space-x-8 ${innerBg}`}>
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

                    {showOrderDetails && (
                      <div className={`p-4 rounded-[20px] border border-white/5 space-y-4 ${innerBg} animate-in fade-in slide-in-from-top-2 mb-3`}>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`text-xs font-black uppercase tracking-widest ${textPrimary} flex items-center space-x-2`}>
                            <i className="fas fa-list-check text-[#FF6B00]"></i>
                            <span>Detalhes da Missão</span>
                          </h3>
                          <button onClick={() => setShowOrderDetails(false)} className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                            <i className="fas fa-times text-[10px]"></i>
                          </button>
                        </div>

                        <div className="space-y-3">
                          {/* Store Details */}
                          <div className={`p-3 rounded-xl border border-white/5 ${innerBg}`}>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted} mb-1`}>Retirar em</p>
                            <p className={`text-sm font-black ${textPrimary} truncate`}>{mission?.storeName}</p>
                            <p className={`text-xs font-bold ${textMuted} truncate`}>{mission?.storeAddress?.split(',')[0]}</p>
                            <div className="flex items-center space-x-4 mt-2 pt-2 border-t border-white/5">
                              <div>
                                <p className={`text-[9px] font-black uppercase tracking-widest ${textMuted}`}>Itens</p>
                                <p className={`text-sm font-black ${textPrimary}`}>{mission?.items?.length && mission.items.length > 1 ? mission.items.length : '1'}</p>
                              </div>
                              <div>
                                <p className={`text-[9px] font-black uppercase tracking-widest ${textMuted}`}>Total</p>
                                <p className={`text-sm font-black ${textPrimary}`}>{activeMissions.filter(m => m.storeName === mission?.storeName).length} Pedidos</p>
                              </div>
                              <div>
                                <p className={`text-[9px] font-black uppercase tracking-widest ${textMuted}`}>Pedido</p>
                                <p className={`text-sm font-black ${textPrimary}`}>#{mission?.displayId || mission?.id?.slice(-4)}</p>
                              </div>
                              <div>
                                <p className={`text-[9px] font-black uppercase tracking-widest ${textMuted}`}>Código</p>
                                <p className={`text-sm font-black text-[#FF6B00]`}>{mission?.collectionCode}</p>
                              </div>
                            </div>
                          </div>

                          {/* Customer Details - LOOP for Batch */}
                          {activeMissions.filter(m => m.storeName === mission?.storeName).map((batchMission, idx) => (
                            <div key={batchMission.id} className={`p-3 rounded-xl border border-white/5 ${innerBg}`}>
                              <div className="flex justify-between items-center mb-1">
                                <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Entregar para ({idx + 1})</p>
                                <span className="text-[10px] font-mono text-zinc-500">#{batchMission.displayId || batchMission.id.slice(-4)}</span>
                              </div>
                              <p className={`text-sm font-black ${textPrimary} truncate`}>{batchMission.customerName}</p>
                              <div className="flex items-center space-x-4 mt-2 pt-2 border-t border-white/5">
                                <div>
                                  <p className={`text-[9px] font-black uppercase tracking-widest ${textMuted}`}>Itens</p>
                                  <p className={`text-sm font-black ${textPrimary}`}>{batchMission.items?.length > 1 ? batchMission.items.length : '1'}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {showDeliveryHelpModal && (
                      <div className={`p-4 rounded-[20px] border border-white/5 space-y-3 ${innerBg} animate-in fade-in slide-in-from-top-2 mb-3`}>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`text-xs font-black uppercase tracking-widest ${textPrimary}`}>Central de Ajuda</h3>
                          <button onClick={() => { setShowDeliveryHelpModal(false); setActiveHelpOption(null); }} className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400"><i className="fas fa-times text-[10px]"></i></button>
                        </div>

                        {activeHelpOption === null ? (
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => setActiveHelpOption('customer_not_found')}
                              className={`p-3 rounded-xl border flex flex-col items-center text-center space-y-2 active:scale-95 transition-all ${theme === 'dark' ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-200 bg-white'}`}
                            >
                              <div className="w-10 h-10 rounded-full bg-[#FF6B00]/10 flex items-center justify-center text-[#FF6B00]"><i className="fas fa-user-slash"></i></div>
                              <span className={`text-[10px] font-bold ${textPrimary}`}>Cliente não localizado</span>
                            </button>
                            <button
                              onClick={() => setActiveHelpOption('talk_to_store')}
                              className={`p-3 rounded-xl border flex flex-col items-center text-center space-y-2 active:scale-95 transition-all ${theme === 'dark' ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-200 bg-white'}`}
                            >
                              <div className="w-10 h-10 rounded-full bg-[#FFD700]/10 flex items-center justify-center text-[#FFD700]"><i className="fas fa-store"></i></div>
                              <span className={`text-[10px] font-bold ${textPrimary}`}>Falar com Lojista</span>
                            </button>
                          </div>
                        ) : activeHelpOption === 'customer_not_found' ? (
                          <div className="space-y-3 animate-in slide-in-from-right">
                            <p className={`${textMuted} text-[10px]`}>Envie uma mensagem direta para o cliente:</p>
                            <textarea
                              value={customerMessage}
                              onChange={(e) => setCustomerMessage(e.target.value)}
                              placeholder="Olá, estou em frente ao endereço mas não encontrei ninguém..."
                              className={`w-full h-20 rounded-xl p-3 text-xs outline-none resize-none border focus:border-[#FF6B00] ${theme === 'dark' ? 'bg-black text-white border-zinc-700' : 'bg-white text-black border-zinc-300'}`}
                            />
                            <div className="flex space-x-2">
                              <button onClick={() => setActiveHelpOption(null)} className={`flex-1 h-10 rounded-xl font-bold text-xs uppercase ${textMuted} border border-transparent hover:border-zinc-700`}>Voltar</button>
                              <button onClick={handleSendCustomerMessage} className="flex-[2] h-10 bg-[#FF6B00] rounded-xl font-black text-white text-xs uppercase shadow-lg flex items-center justify-center space-x-2">
                                <i className="fab fa-whatsapp"></i>
                                <span>Enviar Mensagem</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3 animate-in slide-in-from-right text-center">
                            <p className={`${textMuted} text-[10px]`}>Número do Lojista:</p>
                            <p className={`text-xl font-black ${textPrimary} mb-2`}>{mission.storePhone}</p>
                            <div className="flex space-x-2">
                              <button onClick={() => setActiveHelpOption(null)} className={`flex-1 h-10 rounded-xl font-bold text-xs uppercase ${textMuted} border border-transparent hover:border-zinc-700`}>Voltar</button>
                              <button onClick={handleCallStore} className="flex-[2] h-10 bg-[#FFD700] rounded-xl font-black text-black text-xs uppercase shadow-lg flex items-center justify-center space-x-2">
                                <i className="fas fa-phone"></i>
                                <span>Ligar Agora</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="px-1 flex justify-between items-start">
                      <div>
                        <h3 className={`text-lg font-black leading-tight ${textPrimary}`}>
                          {status.includes('STORE') || status === DriverStatus.PICKING_UP ? mission?.storeName : mission?.customerName}
                        </h3>
                        <p className={`${textMuted} text-[11px] mt-0.5 leading-snug line-clamp-2`}>
                          {status.includes('STORE') || status === DriverStatus.PICKING_UP ? mission?.storeAddress : mission?.customerAddress}
                        </p>
                      </div>
                      {activeMissions.length > 1 && (
                        <div className="bg-[#FF6B00] text-white text-[10px] font-black px-2 py-1 rounded-lg animate-bounce">
                          +{activeMissions.length - 1} Pedidos
                        </div>
                      )}
                    </div>

                    {status === DriverStatus.ARRIVED_AT_STORE && (
                      <div className={`p-4 rounded-[24px] border border-dashed flex items-center space-x-4 transition-all duration-500 ${isOrderReady ? 'bg-[#FFD700]/10 border-[#FFD700]/40' : `${theme === 'dark' ? 'bg-zinc-800/30 border-zinc-700' : 'bg-zinc-100 border-zinc-300'}`}`}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isOrderReady ? 'bg-[#FFD700]/20' : 'bg-[#FF6B00]/10'}`}>
                          <i className={`fas ${isOrderReady ? 'fa-check-double text-[#FFD700] blink-soft' : 'fa-utensils text-[#FF6B00] animate-pulse'} text-xl`}></i>
                        </div>
                        <div className="flex-1">
                          <h4 className={`text-xs font-black uppercase italic ${textPrimary}`}>
                            {isOrderReady ? 'Retire no Balcão' : 'Aguarde o Lojista'}
                          </h4>
                          <p className={`${textMuted} text-[9px] font-bold uppercase tracking-widest mt-0.5`}>ID: #{mission?.displayId || mission?.id?.slice(-4)}</p>
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
                            <span className={`text-6xl font-black italic tracking-tighter ${textPrimary}`}>{mission?.collectionCode}</span>
                          </div>
                        </div>

                        <div className="w-full h-px bg-[#FF6B00]/20 mb-4"></div>

                        <div className="flex flex-col items-center">
                          <p className={`${textMuted} text-[9px] font-black uppercase tracking-widest mb-1`}>Cliente</p>
                          <h2 className={`text-2xl font-black ${textPrimary} line-clamp-1`}>{mission?.customerName}</h2>
                        </div>
                      </div>
                    )}

                    {status === DriverStatus.ARRIVED_AT_CUSTOMER && (
                      <div className={`p-4 rounded-[24px] border mb-4 transition-all ${isCodeValid() ? 'bg-green-500/10 border-green-500/40' : 'bg-white/5 border-white/5'}`}>
                        <p className={`text-[9px] font-black uppercase text-center mb-3 tracking-widest ${isCodeValid() ? 'text-green-500' : textMuted}`}>
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
                              className={`w-11 h-14 rounded-xl text-center text-2xl font-black transition-all outline-none border-2 ${isCodeValid() ? 'bg-green-500/20 border-green-500 text-green-500' : `${innerBg} border-white/10 text-white focus:border-[#FF6B00]`}`}
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
                                status === DriverStatus.RETURNING ? 'Aguardando Lojista (Retorno)' :
                                  'Segure p/ Finalizar Entrega'
                      }
                      disabled={((status === DriverStatus.ARRIVED_AT_CUSTOMER) && !isCodeValid()) || status === DriverStatus.RETURNING}
                      color={status === DriverStatus.ARRIVED_AT_STORE || status === DriverStatus.PICKING_UP || status === DriverStatus.ARRIVED_AT_CUSTOMER || status === DriverStatus.RETURNING ? '#FFD700' : '#FF6B00'}
                      icon={(status === DriverStatus.ARRIVED_AT_CUSTOMER && isCodeValid()) || status === DriverStatus.PICKING_UP ? 'fa-check' : 'fa-chevron-right'}
                      fillDuration={1500}
                    />
                  </div>
                </div>
              </div>
            )
            }

            {
              showLayersModal && (
                <div className="absolute inset-0 bg-black/80 z-[6000] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-sm animate-in fade-in duration-300">
                  <div className={`w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] p-8 border-t border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-300 pb-12 ${cardBg}`}>
                    <div className="flex justify-between items-center mb-8">
                      <h2 className={`text-2xl font-black italic ${textPrimary}`}>Camadas do Mapa</h2>
                      <button onClick={() => setShowLayersModal(false)} className={`w-10 h-10 rounded-full flex items-center justify-center ${innerBg} ${textMuted} active:scale-90 transition-transform`}>
                        <i className="fas fa-times text-lg"></i>
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className={`p-5 rounded-[28px] border border-white/5 flex items-center justify-between cursor-pointer transition-colors ${showHeatMap ? 'bg-[#FF6B00]/10 border-[#FF6B00]/30' : innerBg}`} onClick={() => setShowHeatMap(!showHeatMap)}>
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${showHeatMap ? 'bg-[#FF6B00] text-white' : 'bg-zinc-700/50 text-zinc-500'}`}>
                            <i className="fas fa-fire"></i>
                          </div>
                          <div>
                            <h3 className={`text-sm font-black uppercase tracking-wide ${textPrimary}`}>Zonas de Alta Demanda</h3>
                            <p className={`text-[9px] font-bold ${textMuted}`}>Visualizar Heatmap</p>
                          </div>
                        </div>
                        <div className={`w-11 h-6 rounded-full relative transition-colors ${showHeatMap ? 'bg-[#FF6B00]' : 'bg-zinc-700'}`}>
                          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${showHeatMap ? 'translate-x-5' : ''}`}></div>
                        </div>
                      </div>

                      <div className={`p-5 rounded-[28px] border border-white/5 flex items-center justify-between cursor-pointer transition-colors ${showTraffic ? 'bg-red-500/10 border-red-500/30' : innerBg}`} onClick={() => setShowTraffic(!showTraffic)}>
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${showTraffic ? 'bg-red-500 text-white' : 'bg-zinc-700/50 text-zinc-500'}`}>
                            <i className="fas fa-traffic-light"></i>
                          </div>
                          <div>
                            <h3 className={`text-sm font-black uppercase tracking-wide ${textPrimary}`}>Trânsito em Tempo Real</h3>
                            <p className={`text-[9px] font-bold ${textMuted}`}>Camada de Tráfego</p>
                          </div>
                        </div>
                        <div className={`w-11 h-6 rounded-full relative transition-colors ${showTraffic ? 'bg-red-500' : 'bg-zinc-700'}`}>
                          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${showTraffic ? 'translate-x-5' : ''}`}></div>
                        </div>
                      </div>

                      <div className={`p-5 rounded-[28px] border border-white/5 flex items-center justify-between cursor-pointer transition-colors ${mapMode === 'satellite' ? 'bg-[#33CCFF]/10 border-[#33CCFF]/30' : innerBg}`} onClick={() => setMapMode(prev => prev === 'standard' ? 'satellite' : 'standard')}>
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mapMode === 'satellite' ? 'bg-[#33CCFF] text-white' : 'bg-zinc-700/50 text-zinc-500'}`}>
                            <i className="fas fa-satellite"></i>
                          </div>
                          <div>
                            <h3 className={`text-sm font-black uppercase tracking-wide ${textPrimary}`}>Modo Satélite</h3>
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
              )
            }
          </div >
        );


      case 'WALLET':
        const filteredHistory = history.filter(item => item.weekId === activeWeekId);

        const weeklyEarningsTotal = filteredHistory.reduce((acc, item) => acc + (item.amount > 0 ? item.amount : 0), 0);
        const activeWeekLabel = MOCK_WEEKS.find(w => w.id === activeWeekId)?.range || 'Semana Atual';

        return (
          <div className={`h-full w-full p-6 overflow-y-auto pb-24 transition-colors duration-300 ${theme === 'dark' ? 'bg-black' : 'bg-zinc-50'}`}>
            <div className="flex items-center justify-between mb-8">
              <h1 className={`text-3xl font-black italic ${textPrimary}`}>Meus Ganhos</h1>
              <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-[10px] font-black uppercase text-blue-500 tracking-wider">
                Versão 2.1
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className={`p-4 rounded-[28px] border flex flex-col justify-center ${cardBg}`}>
                <p className={`${textMuted} text-[9px] font-black uppercase mb-1 tracking-widest`}>Ganhos da Semana</p>
                <p className={`text-[10px] font-bold ${textMuted} mb-2`}>{activeWeekLabel}</p>
                <p className={`text-xl font-black ${textPrimary}`}>R$ {(weeklyEarningsTotal || 0).toFixed(2)}</p>
              </div>
              <div className={`p-4 rounded-[28px] border flex flex-col justify-center ${cardBg}`}>
                <p className={`${textMuted} text-[9px] font-black uppercase mb-1 tracking-widest`}>Ganhos de Hoje</p>
                <p className="text-[10px] font-bold opacity-0 mb-2">Hoje</p>
                <p className={`text-xl font-black ${textPrimary}`}>R$ {(dailyEarnings || 0).toFixed(2)}</p>
              </div>
            </div>

            <div className={`rounded-[32px] p-8 border mb-8 ${cardBg} relative overflow-hidden`}>
              <div className="absolute -right-4 -top-4 opacity-10"><i className="fas fa-wallet text-8xl text-[#FF6B00]"></i></div>
              <p className={`${textMuted} font-bold uppercase text-[10px] tracking-widest mb-2 relative z-10`}>Saldo Disponível</p>
              <h2 className={`text-4xl font-black ${textPrimary} mb-6 relative z-10`}>R$ {(balance || 0).toFixed(2)}</h2>

              <button disabled={balance <= 0} onClick={() => setCurrentScreen('WITHDRAWAL_REQUEST')} className={`w-full h-14 rounded-2xl text-white font-black text-xs uppercase italic tracking-widest shadow-lg flex items-center justify-center space-x-2 transition-all relative z-10 ${balance <= 0 ? 'bg-zinc-700 opacity-50' : 'bg-[#FF6B00] shadow-orange-900/30 active:scale-95'}`}>
                <i className="fas fa-hand-holding-dollar text-lg"></i>
                <span>Antecipar Repasse</span>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-black uppercase tracking-[0.2em] italic ${textPrimary}`}>Extrato</h3>
              </div>

              <div className={`flex p-1 rounded-2xl mb-6 ${innerBg}`}>
                <button
                  onClick={() => setWalletTab('ENTRIES')}
                  className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${walletTab === 'ENTRIES' ? 'bg-[#FF6B00] text-white shadow-lg' : `${textMuted}`}`}
                >
                  Lançamentos
                </button>
                <button
                  onClick={() => setWalletTab('PAYOUTS')}
                  className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${walletTab === 'PAYOUTS' ? 'bg-[#FF6B00] text-white shadow-lg' : `${textMuted}`}`}
                >
                  Repasses
                </button>
              </div>

              <div className="space-y-4">
                {walletTab === 'ENTRIES' ? (
                  <>
                    <div className="flex items-center justify-between px-2 mb-2 relative">
                      <span className={`text-[10px] font-bold ${textMuted} uppercase`}>Resumo da Semana</span>

                      <div className="relative z-20">
                        <button
                          onClick={() => setShowWeekSelector(!showWeekSelector)}
                          className={`flex items-center space-x-2 px-3 py-1 rounded-full border transition-all active:scale-95 ${showWeekSelector ? 'border-[#FF6B00] text-[#FF6B00] bg-[#FF6B00]/10' : `${theme === 'dark' ? 'border-white/10 bg-zinc-900' : 'border-zinc-200 bg-white'}`}`}
                        >
                          <i className="far fa-calendar text-xs"></i>
                          <span className={`text-[9px] font-black ${showWeekSelector ? 'text-[#FF6B00]' : textPrimary}`}>{activeWeekLabel}</span>
                          <i className={`fas fa-chevron-down text-[8px] transition-transform ${showWeekSelector ? 'rotate-180' : ''}`}></i>
                        </button>

                        {showWeekSelector && (
                          <div className={`absolute right-0 top-full mt-2 w-48 rounded-2xl border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${cardBg}`}>
                            {MOCK_WEEKS.map(week => (
                              <button
                                key={week.id}
                                onClick={() => { setActiveWeekId(week.id); setShowWeekSelector(false); }}
                                className={`w-full text-left px-4 py-3 text-[10px] font-bold border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors ${activeWeekId === week.id ? 'text-[#FF6B00]' : textPrimary}`}
                              >
                                {week.range}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {filteredHistory.length === 0 ? (
                      <div className={`py-12 text-center rounded-[32px] border border-dashed ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-300'}`}>
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${innerBg} text-zinc-500`}>
                          <i className="fas fa-receipt text-2xl"></i>
                        </div>
                        <p className={`text-xs font-bold ${textMuted}`}>Nenhum registro encontrado.</p>
                      </div>
                    ) : (
                      filteredHistory.map((item, index) => (
                        <div
                          key={index}
                          onClick={() => setSelectedTransaction(item)}
                          className={`p-4 rounded-[24px] border flex justify-between items-center transition-all active:scale-[0.98] cursor-pointer ${cardBg} hover:border-[#FF6B00]/30`}
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.amount > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                              <i className={`fas ${item.amount > 0 ? 'fa-arrow-down' : 'fa-arrow-up'} rotate-45`}></i>
                            </div>
                            <div>
                              <p className={`text-xs font-black ${textPrimary}`}>{item.type}</p>
                              <p className={`text-[9px] font-bold ${textMuted}`}>{item.date}, {item.time} • Concluído</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`font-black text-sm block ${item.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
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
                      <span className={`text-[10px] font-bold ${textMuted} uppercase`}>Histórico de Pagamentos</span>
                      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${theme === 'dark' ? 'border-white/10 bg-zinc-900' : 'border-zinc-200 bg-white'}`}>
                        <i className="fas fa-filter text-xs text-[#FF6B00]"></i>
                        <span className={`text-[9px] font-black ${textPrimary}`}>Filtrar Data</span>
                      </div>
                    </div>
                    {payoutsList.length === 0 ? (
                      <div className={`py-12 text-center rounded-[32px] border border-dashed ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-300'}`}>
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${innerBg} text-zinc-500`}>
                          <i className="fas fa-file-invoice-dollar text-2xl"></i>
                        </div>
                        <p className={`text-xs font-bold ${textMuted}`}>Nenhum repasse realizado ainda.</p>
                      </div>
                    ) : (
                      payoutsList.map((payout) => (
                        <div key={payout.id} className={`p-4 rounded-[24px] border flex justify-between items-center ${cardBg}`}>
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-[#FFD700]/10 text-[#FFD700]`}>
                              <i className="fas fa-file-invoice-dollar"></i>
                            </div>
                            <div>
                              <p className={`text-xs font-black ${textPrimary}`}>Repasse Semanal</p>
                              <p className={`text-[9px] font-bold ${textMuted}`}>{payout.period}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-black text-sm ${textPrimary}`}>R$ {payout.amount.toFixed(2)}</p>
                            <span className="text-[8px] font-bold text-green-500 uppercase bg-green-500/10 px-1.5 py-0.5 rounded ml-auto inline-block">{payout.status}</span>
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
      case 'WITHDRAWAL_REQUEST': return (
        <div className={`h-full w-full p-6 overflow-y-auto pb-24 transition-colors duration-300 ${theme === 'dark' ? 'bg-black' : 'bg-zinc-50'}`}>
          <div className="flex items-center space-x-4 mb-8">
            <button onClick={() => setCurrentScreen('WALLET')} className={`w-10 h-10 rounded-xl flex items-center justify-center border ${cardBg}`}>
              <i className={`fas fa-chevron-left ${textPrimary}`}></i>
            </button>
            <h1 className={`text-2xl font-black italic ${textPrimary}`}>Antecipar Ganhos</h1>
          </div>
          <div className={`rounded-[32px] p-6 border mb-6 ${cardBg} relative overflow-hidden`}>
            <div className="absolute top-0 right-0 p-4 opacity-10"><i className="fas fa-building-columns text-6xl text-[#FF6B00]"></i></div>
            <p className={`${textMuted} font-bold text-[9px] uppercase tracking-widest mb-3`}>Conta de Destino</p>
            <div className="flex items-center space-x-4 relative z-10">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-[#FF6B00] bg-[#FF6B00]/10`}>
                <i className="fas fa-bank text-xl"></i>
              </div>
              <div>
                <h3 className={`font-black text-lg ${textPrimary}`}>{currentUser.bank.name}</h3>
                <p className={`${textMuted} font-bold text-[10px] uppercase`}>AG {currentUser.bank.agency} • CC {currentUser.bank.account}</p>
              </div>
              <div className="ml-auto">
                <i className="fas fa-check-circle text-green-500 text-xl"></i>
              </div>
            </div>
          </div>

          <div className={`rounded-[32px] p-8 border mb-8 ${cardBg}`}>
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <span className={`${textMuted} font-bold text-xs uppercase tracking-widest`}>Saldo Disponível</span>
                <span className={`text-xl font-black ${textPrimary}`}>R$ {balance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <span className={`${textMuted} font-bold text-xs uppercase tracking-widest`}>Taxa de Antecipação</span>
                <span className="text-red-500 font-black text-xl">- R$ {ANTICIPATION_FEE.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className={`${textPrimary} font-black text-sm uppercase tracking-widest`}>Você Recebe</span>
                <span className="text-[#FFD700] font-black text-3xl italic">R$ {Math.max(0, balance - ANTICIPATION_FEE).toFixed(2)}</span>
              </div>
            </div>
          </div>
          <button disabled={balance <= ANTICIPATION_FEE || isAnticipating} onClick={handleAnticipateRequest} className={`w-full h-20 rounded-[28px] font-black text-white uppercase tracking-widest shadow-xl flex items-center justify-center space-x-3 transition-all ${balance <= ANTICIPATION_FEE ? 'bg-zinc-700 opacity-50' : 'bg-[#FF6B00] active:scale-95'}`}>
            {isAnticipating ? <><i className="fas fa-circle-notch animate-spin"></i><span>Processando...</span></> : <><i className="fas fa-bolt"></i><span>Confirmar Antecipação</span></>}
          </button>
        </div>
      );
      case 'ORDERS': return (
        <div className={`h-full w-full p-6 overflow-y-auto pb-24 transition-colors duration-300 ${theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
          <h1 className={`text-2xl font-black italic mb-2 ${textPrimary}`}>Como podemos te ajudar?</h1>
          <div className="relative mb-8 mt-4">
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${textMuted}`}>
              <i className="fas fa-search"></i>
            </div>
            <input
              type="text"
              placeholder="digite sua dúvida"
              className={`w-full h-14 pl-12 pr-4 rounded-2xl border outline-none font-bold text-sm transition-all ${cardBg} ${textPrimary} placeholder:font-normal placeholder:text-zinc-500 focus:border-[#FF6B00]`}
            />
          </div>

          <div className="mb-8">
            <h3 className={`${textMuted} font-black uppercase text-[10px] tracking-[0.2em] mb-4`}>Perguntas Frequentes</h3>
            <div className="space-y-3">
              {["Estou disponível e não recebo pedidos", "Quero alterar meu modal de entrega", "Não recebi o repasse"].map((item, index) => (
                <button key={index} className={`w-full p-4 rounded-2xl border flex justify-between items-center active:scale-[0.98] transition-all ${cardBg}`}>
                  <span className={`text-xs font-bold ${textPrimary}`}>{item}</span>
                  <i className={`fas fa-chevron-right text-xs ${textMuted}`}></i>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className={`${textMuted} font-black uppercase text-[10px] tracking-[0.2em] mb-4`}>Outros Assuntos</h3>
            <div className="space-y-3">
              {[
                { label: "Fazendo entregas", icon: "fa-motorcycle" },
                { label: "Cadastro", icon: "fa-id-card" },
                { label: "Repasse", icon: "fa-hand-holding-dollar" },
                { label: "Outros", icon: "fa-ellipsis" }
              ].map((item, index) => (
                <button key={index} className={`w-full p-4 rounded-2xl border flex items-center space-x-4 active:scale-[0.98] transition-all ${cardBg}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${innerBg} text-[#FF6B00]`}>
                    <i className={`fas ${item.icon}`}></i>
                  </div>
                  <span className={`text-xs font-bold flex-1 text-left ${textPrimary}`}>{item.label}</span>
                  <i className={`fas fa-chevron-right text-xs ${textMuted}`}></i>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
      case 'NOTIFICATIONS': return (
        <div className={`h-full w-full p-6 overflow-y-auto pb-24 transition-colors duration-300 ${theme === 'dark' ? 'bg-black' : 'bg-zinc-50'}`}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button onClick={() => setCurrentScreen('HOME')} className={`w-10 h-10 rounded-xl flex items-center justify-center border ${cardBg}`}>
                <i className={`fas fa-chevron-left ${textPrimary}`}></i>
              </button>
              <h1 className={`text-2xl font-black italic ${textPrimary}`}>Avisos</h1>
            </div>
            <button
              onClick={markAllNotificationsRead}
              className={`text-[10px] font-black uppercase tracking-widest text-[#FF6B00] active:scale-95 transition-transform`}
            >
              Marcar todas como lidas
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center opacity-50">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${innerBg}`}>
                <i className="fas fa-bell-slash text-2xl text-zinc-500"></i>
              </div>
              <p className={`text-sm font-bold ${textMuted}`}>Você não tem notificações no momento.</p>
            </div>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              {notifications.map((notification) => {
                const style = getNotificationIcon(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={`p-5 rounded-[28px] border relative transition-all duration-300 group ${cardBg} ${!notification.read ? 'border-[#FF6B00]/30 bg-[#FF6B00]/5' : ''}`}
                  >
                    <div className="flex items-start space-x-4 relative z-10">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${style.bg} ${style.color}`}>
                        <i className={`fas ${style.icon} text-lg`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h3 className={`text-sm font-black ${textPrimary} mb-1 truncate pr-2`}>{notification.title}</h3>
                          {!notification.read && <div className="w-2 h-2 rounded-full bg-[#FF6B00] shrink-0 mt-1.5"></div>}
                        </div>
                        <p className={`text-xs leading-relaxed mb-2 line-clamp-2 ${textMuted}`}>{notification.body}</p>
                        <p className={`text-[9px] font-bold uppercase tracking-widest opacity-60 ${textPrimary}`}>{notification.date}</p>
                      </div>
                    </div>
                    <div className="absolute top-4 right-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-red-500/10 active:scale-90 ${textMuted} hover:text-red-500`}
                      >
                        <i className="fas fa-trash text-xs"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
      case 'SETTINGS':
        if (settingsView === 'MAIN') {
          return (
            <div className={`h-full w-full p-6 overflow-y-auto pb-24 transition-colors duration-300 ${theme === 'dark' ? 'bg-black' : 'bg-zinc-50'}`}>
              <h1 className={`text-3xl font-black italic mb-8 ${textPrimary}`}>Ajustes</h1>
              <div className={`flex items-center space-x-4 mb-10 p-6 rounded-[32px] border ${cardBg}`}>
                <div className="w-16 h-16 rounded-3xl p-1 border-2 border-[#FF6B00]">
                  <img src={currentUser.avatar} onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }} className="w-full h-full object-cover rounded-2xl" alt="Perfil" />
                </div>
                <div>
                  <h2 className={`text-xl font-black ${textPrimary}`}>{currentUser.name || 'Entregador'}</h2>
                  <p className={`${textMuted} text-xs font-bold uppercase tracking-widest`}>Nível: {currentUser.level}</p>
                </div>
              </div>

              <div className="space-y-8">
                <section>
                  <h3 className={`${textMuted} font-black uppercase text-[10px] tracking-[0.2em] mb-4`}>Sua Conta</h3>
                  <div className="space-y-3">
                    <button onClick={() => setSettingsView('PERSONAL')} className={`w-full p-4 rounded-[24px] border flex justify-between items-center active:scale-[0.98] transition-all ${theme === 'dark' ? cardBg : 'bg-zinc-200 border-zinc-300'}`}>
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${innerBg} text-[#FF6B00]`}><i className="fas fa-user"></i></div>
                        <span className={`text-sm font-bold ${textPrimary}`}>Dados Pessoais</span>
                      </div>
                      <i className={`fas fa-chevron-right text-xs ${textMuted}`}></i>
                    </button>
                    <button onClick={() => setSettingsView('DOCUMENTS')} className={`w-full p-4 rounded-[24px] border flex justify-between items-center active:scale-[0.98] transition-all ${theme === 'dark' ? cardBg : 'bg-zinc-200 border-zinc-300'}`}>
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${innerBg} text-[#FF6B00]`}><i className="fas fa-id-card"></i></div>
                        <span className={`text-sm font-bold ${textPrimary}`}>Documentos</span>
                      </div>
                      <i className={`fas fa-chevron-right text-xs ${textMuted}`}></i>
                    </button>
                    <button onClick={() => setSettingsView('BANK')} className={`w-full p-4 rounded-[24px] border flex justify-between items-center active:scale-[0.98] transition-all ${theme === 'dark' ? cardBg : 'bg-zinc-200 border-zinc-300'}`}>
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${innerBg} text-[#FF6B00]`}><i className="fas fa-building-columns"></i></div>
                        <span className={`text-sm font-bold ${textPrimary}`}>Dados Bancários</span>
                      </div>
                      <i className={`fas fa-chevron-right text-xs ${textMuted}`}></i>
                    </button>
                    <button onClick={() => setSettingsView('EMERGENCY')} className={`w-full p-4 rounded-[24px] border flex justify-between items-center active:scale-[0.98] transition-all ${theme === 'dark' ? cardBg : 'bg-zinc-200 border-zinc-300'}`}>
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${innerBg} text-red-500`}><i className="fas fa-heart-pulse"></i></div>
                        <span className={`text-sm font-bold ${textPrimary}`}>Contato de Emergência</span>
                      </div>
                      <i className={`fas fa-chevron-right text-xs ${textMuted}`}></i>
                    </button>
                  </div>
                </section>

                <section>
                  <h3 className={`${textMuted} font-black uppercase text-[10px] tracking-[0.2em] mb-4`}>Configurações do App</h3>
                  <button onClick={() => setSettingsView('DELIVERY')} className={`w-full p-4 rounded-[24px] border flex justify-between items-center active:scale-[0.98] transition-all mb-3 ${theme === 'dark' ? cardBg : 'bg-zinc-200 border-zinc-300'}`}>
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${innerBg} text-[#FF6B00]`}><i className="fas fa-motorcycle"></i></div>
                      <div>
                        <p className={`text-sm font-bold ${textPrimary}`}>Veículo e Região</p>
                        <p className={`text-[9px] font-bold uppercase ${textMuted} mt-0.5`}>{selectedVehicle} • {currentUser.region}</p>
                      </div>
                    </div>
                    <i className={`fas fa-chevron-right text-xs ${textMuted}`}></i>
                  </button>

                  <button onClick={() => setSettingsView('SOUNDS')} className={`w-full p-4 rounded-[24px] border flex justify-between items-center active:scale-[0.98] transition-all ${theme === 'dark' ? cardBg : 'bg-zinc-200 border-zinc-300'}`}>
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${innerBg} text-[#FF6B00]`}><i className="fas fa-volume-high"></i></div>
                      <div>
                        <p className={`text-sm font-bold ${textPrimary}`}>Alertas Sonoros</p>
                        <p className={`text-[9px] font-bold uppercase ${textMuted} mt-0.5`}>
                          {SOUND_OPTIONS.find(s => s.id === selectedSoundId)?.label || 'Padrão'}
                        </p>
                      </div>
                    </div>
                    <i className={`fas fa-chevron-right text-xs ${textMuted}`}></i>
                  </button>
                </section>

                <section>
                  <h3 className={`${textMuted} font-black uppercase text-[10px] tracking-[0.2em] mb-4`}>Aparência</h3>
                  <div className={`rounded-[32px] p-2 border ${theme === 'dark' ? cardBg : 'bg-orange-50 border-orange-200'}`}>
                    <div onClick={toggleTheme} className="p-4 flex items-center justify-between cursor-pointer">
                      <div className={`flex items-center space-x-3 font-bold text-sm ${textPrimary}`}>
                        <i className={`fas ${theme === 'dark' ? 'fa-moon text-[#33CCFF]' : 'fa-sun text-[#FFD700]'}`}></i>
                        <span>Modo {theme === 'dark' ? 'Escuro' : 'Claro'}</span>
                      </div>
                    </div>
                  </div>
                </section>

                <button onClick={async () => {
                  try {
                    await supabaseClient.signOut();
                    setIsAuthenticated(false);
                    setUserId(null);
                    setAuthScreen('LOGIN');
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
                      }
                    });
                    setBalance(0);
                    setDailyEarnings(0);
                    setDailyStats({ accepted: 0, finished: 0, rejected: 0, onlineTime: 0, earnings: 0 });
                    setHistory([]);
                  } catch (error) {
                    console.error('Logout error:', error);
                  }
                }} className="w-full h-14 rounded-2xl border border-red-500/30 text-red-500 font-black uppercase tracking-widest flex items-center justify-center hover:bg-red-500/10 transition-colors mt-4">
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
                </h1>
              </div>

              {settingsView === 'PERSONAL' && (
                <div className="space-y-4 animate-in slide-in-from-right duration-300">
                  {[
                    { label: 'Nome Completo', value: currentUser.name },
                    { label: 'CPF', value: currentUser.cpf },
                    { label: 'Telefone', value: currentUser.phone },
                    { label: 'E-mail', value: currentUser.email },
                    { label: 'Região', value: currentUser.region },
                  ].map((item, i) => (
                    <div key={i} className={`p-4 rounded-[24px] border ${cardBg}`}>
                      <p className={`${textMuted} text-[9px] font-black uppercase tracking-widest mb-1`}>{item.label}</p>
                      <p className={`text-sm font-bold ${textPrimary}`}>{item.value || '-'}</p>
                    </div>
                  ))}
                </div>
              )}

              {settingsView === 'DOCUMENTS' && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  <div className={`p-6 rounded-[32px] border ${cardBg}`}>
                    <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
                      <span className={`${textMuted} font-black uppercase text-[10px] tracking-widest`}>Seu documento atual</span>
                      <div className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-[9px] font-black uppercase">Ativo</div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className={`${textMuted} text-[9px] font-black uppercase tracking-widest mb-1`}>Documento</p>
                        <p className={`text-xl font-black ${textPrimary}`}>CNH</p>
                      </div>
                      <div>
                        <p className={`${textMuted} text-[9px] font-black uppercase tracking-widest mb-1`}>Categoria</p>
                        <p className={`text-xl font-black ${textPrimary}`}>{currentUser.cnh.category}</p>
                      </div>
                      <div className="col-span-2">
                        <p className={`${textMuted} text-[9px] font-black uppercase tracking-widest mb-1`}>Status</p>
                        <p className={`text-xl font-black ${textPrimary}`}>Validado</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {settingsView === 'BANK' && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  <div className={`rounded-[32px] p-6 border ${cardBg}`}>
                    <p className={`${textMuted} font-black uppercase text-[10px] tracking-widest mb-4 border-b border-white/5 pb-2`}>Seus dados Bancários</p>
                    <div className="flex items-center space-x-4 mb-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${innerBg} text-[#FF6B00]`}><i className="fas fa-bank"></i></div>
                      <div>
                        <p className={`text-lg font-black ${textPrimary}`}>{currentUser.bank.name}</p>
                        <p className={`text-[10px] font-bold ${textMuted}`}>{currentUser.bank.type}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className={`${textMuted} text-[9px] font-black uppercase tracking-widest`}>Agência</p>
                        <p className={`text-sm font-bold ${textPrimary}`}>{currentUser.bank.agency}</p>
                      </div>
                      <div>
                        <p className={`${textMuted} text-[9px] font-black uppercase tracking-widest`}>Conta</p>
                        <p className={`text-sm font-bold ${textPrimary}`}>{currentUser.bank.account}</p>
                      </div>
                      <div className="col-span-2">
                        <p className={`${textMuted} text-[9px] font-black uppercase tracking-widest`}>Chave PIX</p>
                        <p className={`text-sm font-bold ${textPrimary}`}>{currentUser.bank.pixKey || 'Não cadastrada'}</p>
                      </div>
                    </div>
                  </div>
                  <button className="w-full h-16 bg-[#FF6B00] rounded-2xl font-black text-white uppercase italic tracking-widest shadow-xl active:scale-95 transition-transform">
                    Cadastrar Dados Bancários
                  </button>
                </div>
              )}

              {settingsView === 'EMERGENCY' && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  <div className={`p-6 rounded-[32px] border ${cardBg}`}>
                    <p className={`${textMuted} text-[10px] font-bold leading-relaxed mb-6`}>Avisaremos essa pessoa caso você precise de ajuda com algum imprevisto durante suas rotas.</p>

                    <div className="space-y-4">
                      <div>
                        <label className={`${textMuted} text-[9px] font-black uppercase tracking-widest block mb-2`}>Nome</label>
                        <input
                          type="text"
                          value={emergencyContact.name}
                          onChange={e => setEmergencyContact({ ...emergencyContact, name: e.target.value })}
                          placeholder="Nome do contato"
                          className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border border-white/5 focus:border-[#FF6B00] text-sm font-bold`}
                        />
                      </div>
                      <div>
                        <label className={`${textMuted} text-[9px] font-black uppercase tracking-widest block mb-2`}>Telefone</label>
                        <input
                          type="tel"
                          value={emergencyContact.phone}
                          onChange={e => setEmergencyContact({ ...emergencyContact, phone: e.target.value })}
                          placeholder="(00) 00000-0000"
                          className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border border-white/5 focus:border-[#FF6B00] text-sm font-bold`}
                        />
                      </div>
                      <div>
                        <label className={`${textMuted} text-[9px] font-black uppercase tracking-widest block mb-2`}>Grau de Parentesco</label>
                        <input
                          type="text"
                          value={emergencyContact.relation}
                          onChange={e => setEmergencyContact({ ...emergencyContact, relation: e.target.value })}
                          placeholder="Ex: Mãe, Irmão, Cônjuge"
                          className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border border-white/5 focus:border-[#FF6B00] text-sm font-bold`}
                        />
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/5 flex items-center space-x-3 cursor-pointer" onClick={() => setEmergencyContact({ ...emergencyContact, isBeneficiary: !emergencyContact.isBeneficiary })}>
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${emergencyContact.isBeneficiary ? 'bg-[#FF6B00] border-[#FF6B00]' : 'border-zinc-500'}`}>
                        {emergencyContact.isBeneficiary && <i className="fas fa-check text-white text-xs"></i>}
                      </div>
                      <span className={`text-xs font-bold ${textPrimary}`}>Definir como Beneficiário do Seguro</span>
                    </div>
                  </div>
                  <button onClick={() => setSettingsView('MAIN')} className="w-full h-16 bg-[#FF6B00] rounded-2xl font-black text-white uppercase italic tracking-widest shadow-xl active:scale-95 transition-transform">
                    Confirmar Informações
                  </button>
                </div>
              )}

              {settingsView === 'DELIVERY' && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  <div className={`p-6 rounded-[32px] border ${cardBg}`}>
                    <p className={`${textMuted} font-black uppercase text-[10px] tracking-widest mb-6`}>Veículo Utilizado</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'car', icon: 'fa-car', label: 'Carro' },
                        { id: 'moto', icon: 'fa-motorcycle', label: 'Moto' },
                        { id: 'bike', icon: 'fa-bicycle', label: 'Bike' }
                      ].map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVehicle(v.id as any)}
                          className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all active:scale-95 ${selectedVehicle === v.id ? 'border-[#FF6B00] bg-[#FF6B00]/10' : `border-transparent ${innerBg}`}`}
                        >
                          <i className={`fas ${v.icon} text-2xl mb-2 ${selectedVehicle === v.id ? 'text-[#FF6B00]' : textMuted}`}></i>
                          <span className={`text-[10px] font-black uppercase ${selectedVehicle === v.id ? 'text-[#FF6B00]' : textMuted}`}>{v.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`p-6 rounded-[32px] border ${cardBg}`}>
                    <p className={`${textMuted} font-black uppercase text-[10px] tracking-widest mb-4`}>Região de Atuação</p>
                    <div className={`flex items-center justify-between p-4 rounded-xl border border-white/5 ${innerBg}`}>
                      <span className={`text-sm font-bold ${textPrimary}`}>{currentUser.region}</span>
                      <span className="text-[10px] font-black text-[#FF6B00] uppercase">Alterar</span>
                    </div>
                  </div>

                  <button onClick={() => setSettingsView('MAIN')} className="w-full h-16 bg-[#FF6B00] rounded-2xl font-black text-white uppercase italic tracking-widest shadow-xl active:scale-95 transition-transform">
                    Salvar Alterações
                  </button>
                </div>
              )}

              {settingsView === 'SOUNDS' && (
                <div className="space-y-4 animate-in slide-in-from-right duration-300">
                  {SOUND_OPTIONS.map((sound) => (
                    <div
                      key={sound.id}
                      onClick={() => {
                        setSelectedSoundId(sound.id);
                        const previewSound = new Howl({
                          src: [sound.url],
                          volume: 0.6,
                          html5: true
                        });
                        previewSound.play();
                      }}
                      className={`p-5 rounded-[32px] border-2 cursor-pointer transition-all active:scale-[0.98] relative overflow-hidden group ${selectedSoundId === sound.id
                        ? 'border-[#FF6B00] bg-[#FF6B00]/10 shadow-lg shadow-orange-900/20'
                        : `border-transparent ${cardBg}`
                        }`}
                    >
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center space-x-5">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-colors ${selectedSoundId === sound.id ? 'bg-[#FF6B00] text-white shadow-md' : `${innerBg} ${textMuted}`}`}>
                            <i className={`fas ${sound.icon}`}></i>
                          </div>
                          <div>
                            <h3 className={`text-base font-black ${selectedSoundId === sound.id ? 'text-[#FF6B00]' : textPrimary}`}>{sound.label}</h3>
                            <p className={`text-[10px] font-bold mt-1 ${textMuted}`}>{sound.description}</p>
                          </div>
                        </div>

                        {selectedSoundId === sound.id && (
                          <div className="w-8 h-8 rounded-full bg-[#FF6B00] flex items-center justify-center animate-in zoom-in duration-300">
                            <i className="fas fa-check text-white text-sm"></i>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className={`mt-8 p-6 rounded-[24px] border border-dashed flex items-start space-x-3 ${theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-100 border-zinc-300'}`}>
                    <i className="fas fa-circle-info text-[#FF6B00] mt-1"></i>
                    <p className={`text-xs font-bold leading-relaxed ${textMuted}`}>
                      <span className="text-[#FF6B00]">Dica Pro:</span> O "Rugido do Guepardo" foi desenhado para ser audível mesmo com o capacete fechado e ruído de trânsito intenso.
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-0 sm:p-4 bg-transparent">
        <div className="w-full max-w-[480px] h-full sm:h-[90vh] sm:rounded-[40px] shadow-2xl overflow-hidden relative border border-white/5 bg-black/20 backdrop-blur-sm">
          {renderAuthScreen()}
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen flex flex-col relative overflow-hidden transition-colors duration-300 bg-transparent ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
      <header className={`z-[1002] flex flex-col items-center justify-between backdrop-blur-2xl border-b transition-colors duration-300 ${theme === 'dark' ? 'bg-zinc-950/80 border-white/5' : 'bg-white/80 border-zinc-200'}`}>
        <div className="w-full px-6 py-4 flex items-center justify-between relative h-20">
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 rounded-full p-0.5 border-2 border-[#FF6B00] shadow-lg shadow-orange-900/20">
              <img src={currentUser.avatar} onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }} alt="Perfil" className="w-full h-full rounded-full object-cover" />
            </div>
          </div>

          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <button onClick={toggleOnlineStatus} className={`h-10 px-6 rounded-full flex items-center space-x-3 transition-all duration-500 shadow-xl ${status === DriverStatus.ONLINE ? 'bg-green-500 ring-4 ring-green-500/20' : innerBg}`}>
              <div className={`w-2 h-2 rounded-full ${status === DriverStatus.ONLINE ? 'bg-white animate-pulse' : theme === 'dark' ? 'bg-zinc-500' : 'bg-zinc-400'}`}></div>
              <span className={`font-black text-[10px] uppercase tracking-widest ${status === DriverStatus.ONLINE ? 'text-white' : textMuted}`}>{status === DriverStatus.ONLINE ? 'Disponível' : 'Indisponível'}</span>
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

        <div className="w-full px-6 pb-4 flex justify-center">
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
                  <span className="text-white font-black text-lg">+ R$ {newBatchEarnings.toFixed(2)}</span>
                  <div className="h-4 w-px bg-white/30"></div>
                  <span className="text-white/80 text-[10px] font-bold">Total: R$ {activeMissions.reduce((acc, m) => acc + m.earnings, 0).toFixed(2)}</span>
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
      <nav className={`h-24 border-t flex items-center justify-around z-[1002] safe-area-bottom transition-colors duration-300 ${theme === 'dark' ? 'bg-zinc-950 border-white/5' : 'bg-white border-zinc-200'}`}>
        <button onClick={() => setCurrentScreen('HOME')} className={`flex flex-col items-center space-y-1 w-1/4 relative ${currentScreen === 'HOME' ? 'text-[#FF6B00]' : textMuted}`}><div className={`w-10 h-1 bg-[#FF6B00] absolute -top-10 rounded-b-full transition-all ${currentScreen === 'HOME' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div><i className="fas fa-compass text-xl"></i><span className="text-[8px] font-black uppercase tracking-widest">Mapa</span></button>
        <button onClick={() => setCurrentScreen('WALLET')} className={`flex flex-col items-center space-y-1 w-1/4 relative ${currentScreen === 'WALLET' ? 'text-[#FF6B00]' : textMuted}`}><div className={`w-10 h-1 bg-[#FF6B00] absolute -top-10 rounded-b-full transition-all ${currentScreen === 'WALLET' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div><i className="fas fa-wallet text-xl"></i><span className="text-[8px] font-black uppercase tracking-widest">Ganhos</span></button>
        <button onClick={() => setCurrentScreen('ORDERS')} className={`flex flex-col items-center space-y-1 w-1/4 relative ${currentScreen === 'ORDERS' ? 'text-[#FF6B00]' : textMuted}`}><div className={`w-10 h-1 bg-[#FF6B00] absolute -top-10 rounded-b-full transition-all ${currentScreen === 'ORDERS' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div><i className="fas fa-circle-question text-xl"></i><span className="text-[8px] font-black uppercase tracking-widest">Ajuda</span></button>
        <button onClick={() => setCurrentScreen('SETTINGS')} className={`flex flex-col items-center space-y-1 w-1/4 relative ${currentScreen === 'SETTINGS' ? 'text-[#FF6B00]' : textMuted}`}><div className={`w-10 h-1 bg-[#FF6B00] absolute -top-10 rounded-b-full transition-all ${currentScreen === 'SETTINGS' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div><i className="fas fa-user-gear text-xl"></i><span className="text-[8px] font-black uppercase tracking-widest">Perfil</span></button>
      </nav>


      {showSOSModal && (
        <div className="absolute inset-0 bg-black/80 z-[6000] flex items-end justify-center backdrop-blur-xl animate-in fade-in duration-300">
          <div className={`w-full bg-[#1E1E1E] rounded-t-[40px] p-6 pb-12 animate-in slide-in-from-bottom duration-500 shadow-2xl border-t border-white/10`}>
            <div className="flex justify-between items-center mb-6 px-2">
              <div>
                <h2 className="text-2xl font-black italic text-white tracking-tight">Central de Emergência</h2>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Você precisa de ajuda imediata?</p>
              </div>
              <button onClick={() => setShowSOSModal(false)} className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 active:scale-90 transition-transform">
                <i className="fas fa-chevron-down"></i>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleSOSAction('police')}
                className="bg-red-900/20 border border-red-500/30 p-6 rounded-[32px] flex flex-col items-center justify-center space-y-3 active:scale-95 transition-transform group"
              >
                <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/50 group-hover:scale-110 transition-transform">
                  <i className="fas fa-shield-halved text-2xl text-white"></i>
                </div>
                <div className="text-center">
                  <h3 className="text-white font-black text-lg">POLÍCIA</h3>
                  <p className="text-red-400 font-bold text-sm">Ligar 190</p>
                </div>
              </button>
              <button
                onClick={() => handleSOSAction('samu')}
                className="bg-red-900/20 border border-red-500/30 p-6 rounded-[32px] flex flex-col items-center justify-center space-y-3 active:scale-95 transition-transform group"
              >
                <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/50 group-hover:scale-110 transition-transform">
                  <i className="fas fa-truck-medical text-2xl text-white"></i>
                </div>
                <div className="text-center">
                  <h3 className="text-white font-black text-lg">SAMU</h3>
                  <p className="text-red-400 font-bold text-sm">Ligar 192</p>
                </div>
              </button>
              <button
                onClick={() => handleSOSAction('share')}
                className="bg-zinc-800/50 border border-white/5 p-6 rounded-[32px] flex flex-col items-center justify-center space-y-3 active:scale-95 transition-transform group"
              >
                <div className="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center shadow-lg shadow-green-900/30 group-hover:scale-110 transition-transform">
                  <i className="fab fa-whatsapp text-2xl text-white"></i>
                </div>
                <div className="text-center">
                  <h3 className="text-white font-black text-sm uppercase">Compartilhar</h3>
                  <p className="text-zinc-500 font-bold text-[10px]">Enviar Localização</p>
                </div>
              </button>
              <button
                onClick={() => handleSOSAction('mechanic')}
                className="bg-zinc-800/50 border border-white/5 p-6 rounded-[32px] flex flex-col items-center justify-center space-y-3 active:scale-95 transition-transform group"
              >
                <div className="w-14 h-14 rounded-full bg-[#FF6B00] flex items-center justify-center shadow-lg shadow-orange-900/30 group-hover:scale-110 transition-transform">
                  <i className="fas fa-wrench text-2xl text-white"></i>
                </div>
                <div className="text-center">
                  <h3 className="text-white font-black text-sm uppercase">Mecânico</h3>
                  <p className="text-zinc-500 font-bold text-[10px]">Buscar Próximo</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {showPostDeliveryModal && (
        <div className="absolute inset-0 z-[6000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8">
          <div className="w-full max-w-xs text-center animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-900/40"><i className="fas fa-check text-4xl text-white"></i></div>
            <h2 className="text-3xl font-black italic mb-2 text-white">MUITO BEM!</h2>
            <p className="text-zinc-400 font-bold mb-8 uppercase text-xs tracking-widest">Entrega concluída com sucesso</p>
            <div className="bg-zinc-900 p-6 rounded-[32px] border border-white/5 mb-10"><p className="text-zinc-500 font-black text-[10px] uppercase mb-1">Você ganhou</p><p className="text-4xl font-black text-white italic">R$ {(lastEarnings || 0).toFixed(2)}</p></div>
            <button onClick={() => { setShowPostDeliveryModal(false); }} className="w-full h-16 bg-[#FF6B00] rounded-2xl font-black text-white uppercase italic tracking-widest shadow-xl">Continuar</button>
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
                  <p className={`text-4xl font-black text-green-500 italic tracking-tighter`}>+ R$ {selectedTransaction.amount.toFixed(2)}</p>
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

            <div className={`p-6 border-t border-white/5 ${innerBg}`}>
              <button onClick={() => setSelectedTransaction(null)} className="w-full h-14 bg-[#FF6B00] rounded-2xl font-black text-white uppercase text-xs tracking-widest shadow-xl">Fechar Detalhes</button>
            </div>

          </div>
        </div>
      )}

      {status === DriverStatus.ALERTING && mission && (
        <div className="absolute inset-0 z-[8000] flex items-end p-6 pointer-events-none animate-in slide-in-from-bottom duration-500">
          <div className={`w-full rounded-[40px] p-8 border-t-8 border-[#FF6B00] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] pulse-orange relative overflow-hidden transition-all duration-300 max-h-[90%] flex flex-col pointer-events-auto ${cardBg}`}>
            <div className="absolute top-8 right-12 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full border-4 border-[#FF6B00] flex items-center justify-center shrink-0">
                <span className={`text-xl font-black ${textPrimary}`}>{alertCountdown}</span>
              </div>
            </div>
            <div className="flex justify-between items-start mb-6 shrink-0">
              <div className="flex-1">
                {(() => {
                  const mToShow = activeMissions.length > 0 ? activeMissions : [mission];
                  const totalE = mToShow.reduce((acc, m) => acc + (m?.earnings || 0), 0);
                  const totalD = mToShow.reduce((acc, m) => acc + (m?.totalDistance || 0), 0);
                  const isB = mToShow.length > 1;

                  return (
                    <>
                      <div className="flex items-center space-x-3">
                        <h2 className={`text-4xl font-black italic ${textPrimary}`}>R$ {totalE.toFixed(2)}</h2>
                        <div className="bg-[#FF6B00] text-white px-2 py-1 rounded-lg text-[10px] font-black italic">
                          {totalD.toFixed(1)} KM TOTAL
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className={`${textMuted} font-black uppercase text-[10px] tracking-widest`}>Logística:</span>
                        <span className={`text-[10px] font-bold ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-600'}`}>
                          {isB ? `${mToShow.length} entregas em lote` : `${mission?.distanceToStore?.toFixed(1)}km até loja + ${mission?.deliveryDistance?.toFixed(1)}km entrega`}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="flex-1 space-y-4 mb-8">
              <div className={`flex items-center space-x-3 ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${innerBg}`}>
                  <i className="fas fa-store text-[#FF6B00]"></i>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase text-zinc-500 leading-none mb-1">Coleta</span>
                  <span className="text-sm font-bold truncate">{mission.storeName}</span>
                </div>
              </div>
              <div className={`flex items-center space-x-3 ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${innerBg}`}>
                  <i className="fas fa-location-dot text-[#FFD700]"></i>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase text-zinc-500 leading-none mb-1">Entrega</span>
                  <span className="text-sm font-bold truncate">
                    {activeMissions.length > 1 ? `${activeMissions.length} destinos diferentes` : mission.customerAddress}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex space-x-4 shrink-0">
              <button onClick={handleRejectMission} className={`flex-1 h-16 rounded-2xl font-bold uppercase text-xs ${innerBg} ${textMuted}`}>Recusar</button>
              <button onClick={handleAcceptMission} className="flex-[2] h-16 bg-[#FF6B00] rounded-2xl font-black text-white uppercase text-xs shadow-xl active:scale-95 transition-transform">ACEITAR</button>
            </div>
          </div>
        </div>
      )}

      {/* Splash Screen — exibido por 3s ao iniciar */}
      {showSplash && <SplashScreen />}

    </div>
  );
};

export default App;
