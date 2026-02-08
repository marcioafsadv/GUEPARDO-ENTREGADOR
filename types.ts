
export enum DriverStatus {
  OFFLINE = 'OFFLINE',
  ONLINE = 'ONLINE',
  ALERTING = 'ALERTING',
  GOING_TO_STORE = 'GOING_TO_STORE',
  ARRIVED_AT_STORE = 'ARRIVED_AT_STORE',
  PICKING_UP = 'PICKING_UP',
  GOING_TO_CUSTOMER = 'GOING_TO_CUSTOMER',
  ARRIVED_AT_CUSTOMER = 'ARRIVED_AT_CUSTOMER'
}

export interface DeliveryMission {
  id: string;
  storeName: string;
  storeAddress: string;
  customerName: string;
  customerAddress: string;
  customerPhoneSuffix: string;
  distanceToStore: number; // Km até a loja
  deliveryDistance: number; // Km da loja ao cliente (Base da taxa)
  totalDistance: number;
  earnings: number;
  timeLimit: number;
  collectionCode: string;
  items: string[];
  storePhone: string;
  customerPhone: string;
}

export interface DailySummary {
  totalEarnings: number;
  completedDeliveries: number;
  onlineHours: number;
}

export interface TimelineEvent {
  time: string;
  description: string;
  status: 'done' | 'pending';
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  time: string;
  date: string; // Adicionado para filtro
  weekId: string; // Adicionado para filtro
  status: 'COMPLETED' | 'PENDING';
  details?: {
    duration: string;
    stops: number;
    timeline: TimelineEvent[];
  };
}

export enum NotificationType {
  FINANCIAL = 'FINANCIAL',
  URGENT = 'URGENT',
  PROMOTION = 'PROMOTION',
  SYSTEM = 'SYSTEM'
}

export interface NotificationModel {
  id: string;
  title: string;
  body: string;
  date: string;
  type: NotificationType;
  read: boolean;
}

// ============================================
// ONBOARDING & REGISTRATION TYPES
// ============================================

export enum OnboardingStep {
  TERMS = 'TERMS',
  LOCATION_PERMISSION = 'LOCATION_PERMISSION',
  CITY_SELECTOR = 'CITY_SELECTOR',
  WIZARD_STEP_1 = 'WIZARD_STEP_1',
  WIZARD_STEP_2 = 'WIZARD_STEP_2',
  WIZARD_STEP_3 = 'WIZARD_STEP_3',
  WIZARD_STEP_4 = 'WIZARD_STEP_4',
  WIZARD_STEP_5 = 'WIZARD_STEP_5',
  REVIEW = 'REVIEW'
}

export interface PersonalData {
  fullName: string;
  birthDate: string;
  cpf: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  gender: string;
  pixKey: string;
}

export interface AddressData {
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  reference: string;
  hasNoNumber: boolean;
}

export interface VehicleData {
  cnhNumber: string;
  cnhValidity: string;
  plate: string;
  plateState: string;
  plateCity: string;
  model: string;
  year: number;
  color: string;
  renavam: string;
  isOwner: boolean;
}

export interface DocumentUpload {
  cnhFront: File | null;
  cnhBack: File | null;
  proofOfResidence: File | null;
  crlv: File | null;
  bikePhoto: File | null;
}

export interface RegistrationData {
  workCity: string;
  personal: PersonalData;
  photoUrl: string;
  address: AddressData;
  vehicle: VehicleData;
  documents: DocumentUpload;
}

export interface City {
  id: string;
  name: string;
  state: string;
  displayName: string;
}
