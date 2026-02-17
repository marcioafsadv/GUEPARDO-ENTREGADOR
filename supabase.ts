import { createClient } from '@supabase/supabase-js';

// Supabase configuration with fallback values
const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';



export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============ AUTHENTICATION ============

export const signUp = async (email: string, password: string, userData: any) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: userData.name,
        cpf: userData.cpf,
        phone: userData.phone,
      }
    }
  });

  if (error) throw error;
  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// ============ PROFILES ============

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

export const updateProfile = async (userId: string, updates: any) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const createProfile = async (userId: string, profileData: any) => {
  const { data, error } = await supabase
    .from('profiles')
    .insert([{
      id: userId,
      ...profileData
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ============ BANK ACCOUNTS ============

export const getBankAccount = async (userId: string) => {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
};

export const upsertBankAccount = async (userId: string, bankData: any) => {
  const { data, error } = await supabase
    .from('bank_accounts')
    .upsert({
      user_id: userId,
      ...bankData
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ============ DRIVER LICENSES ============

export const getDriverLicense = async (userId: string) => {
  const { data, error } = await supabase
    .from('driver_licenses')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const upsertDriverLicense = async (userId: string, licenseData: any) => {
  const { data, error } = await supabase
    .from('driver_licenses')
    .upsert({
      user_id: userId,
      ...licenseData
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ============ DELIVERIES ============

export const createDelivery = async (deliveryData: any) => {
  const { data, error } = await supabase
    .from('deliveries')
    .insert([deliveryData])
    .select()
    .single();

  if (error) throw error;
  return data;
};


export const getDeliveries = async (userId: string) => {
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .eq('driver_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const subscribeToAvailableMissions = (
  onNewMission: (mission: any) => void,
  onMissionUnavailable: (missionId: string) => void
) => {
  return supabase
    .channel('public:deliveries:available')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'deliveries',
        filter: 'status=eq.pending'
      },
      (payload) => {
        onNewMission(payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'deliveries'
      },
      (payload) => {
        // If a delivery is no longer pending (accepted, cancelled, etc.), notify
        if (payload.new.status !== 'pending') {
          onMissionUnavailable(payload.new.id);
        }
      }
    )
    .subscribe();
};

export const subscribeToActiveMission = (
  missionId: string,
  onStatusChange: (status: string) => void
) => {
  return supabase
    .channel(`public:deliveries:${missionId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'deliveries',
        filter: `id=eq.${missionId}`
      },
      (payload) => {
        onStatusChange(payload.new.status);
      }
    )
    .subscribe();
};

export const acceptMission = async (missionId: string, driverId: string) => {
  const { data, error } = await supabase
    .from('deliveries')
    .update({
      status: 'accepted',
      driver_id: driverId,
      accepted_at: new Date().toISOString()
    })
    .eq('id', missionId)
    .eq('status', 'pending') // Ensure it's still pending
    .select()
    .single();


  if (error) throw error;
  return data;
};

export const completeMission = async (missionId: string, driverId: string) => {
  const { data, error } = await supabase
    .from('deliveries')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', missionId)
    .eq('driver_id', driverId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const rejectMission = async (missionId: string, driverId: string) => {
  // Optional: Log rejection or just ignore locally
  // For now, we might not need to update the DB if we just want to hide it locally
  // But if we want to prevent showing it again, we might need a 'rejected_deliveries' table or similar
  // Or just update status if that's the business logic (e.g. 'rejected' -> returns to pool? or 'cancelled'?)
  // For this MVP, we'll just log it.
  console.log(`Driver ${driverId} rejected mission ${missionId}`);
};


// ============ TRANSACTIONS ============

export const createTransaction = async (transactionData: any) => {
  const { data, error } = await supabase
    .from('transactions')
    .insert([transactionData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getTransactions = async (userId: string, weekId?: string) => {
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (weekId) {
    query = query.eq('week_id', weekId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
};

export const getBalance = async (userId: string) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId);

  if (error) throw error;

  const balance = data.reduce((acc, t) => acc + parseFloat(t.amount.toString()), 0);
  return balance;
};

// ============ NOTIFICATIONS ============

export const getNotifications = async (userId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const markNotificationAsRead = async (notificationId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const markAllNotificationsAsRead = async (userId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
    .select();

  if (error) throw error;
  return data;
};

export const deleteNotification = async (notificationId: string) => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) throw error;
};

// ============ DAILY STATS ============

export const getDailyStats = async (userId: string, date?: string) => {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('date', targetDate)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const upsertDailyStats = async (userId: string, stats: any, date?: string) => {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_stats')
    .upsert({
      user_id: userId,
      date: targetDate,
      ...stats
    }, {
      onConflict: 'user_id,date'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateDailyStats = async (userId: string, updates: any) => {
  const today = new Date().toISOString().split('T')[0];

  // Primeiro, tenta obter as estatísticas do dia
  const current = await getDailyStats(userId, today);

  const newStats = {
    accepted: (current?.accepted || 0) + (updates.accepted || 0),
    finished: (current?.finished || 0) + (updates.finished || 0),
    rejected: (current?.rejected || 0) + (updates.rejected || 0),
    earnings: (current?.earnings || 0) + (updates.earnings || 0),
  };

  return await upsertDailyStats(userId, newStats, today);
};

// ============================================
// ADDRESSES
// ============================================

export const createAddress = async (userId: string, addressData: any) => {
  const { data, error } = await supabase
    .from('addresses')
    .insert([{
      user_id: userId,
      ...addressData
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getAddress = async (userId: string) => {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const updateAddress = async (userId: string, addressData: any) => {
  const { data, error } = await supabase
    .from('addresses')
    .update(addressData)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const upsertAddress = async (userId: string, addressData: any) => {
  const { data, error } = await supabase
    .from('addresses')
    .upsert({
      user_id: userId,
      ...addressData
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ============================================
// VEHICLES
// ============================================

export const createVehicle = async (userId: string, vehicleData: any) => {
  const { data, error } = await supabase
    .from('vehicles')
    .insert([{
      user_id: userId,
      ...vehicleData
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getVehicle = async (userId: string) => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const updateVehicle = async (userId: string, vehicleData: any) => {
  const { data, error } = await supabase
    .from('vehicles')
    .update(vehicleData)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const upsertVehicle = async (userId: string, vehicleData: any) => {
  const { data, error } = await supabase
    .from('vehicles')
    .upsert({
      user_id: userId,
      ...vehicleData
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ============================================
// STORAGE - DOCUMENT UPLOADS
// ============================================

export const uploadDocument = async (
  userId: string,
  file: File,
  documentType: 'cnh_front' | 'cnh_back' | 'proof_residence' | 'crlv' | 'bike_photo'
): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${documentType}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('courier-documents')
    .upload(fileName, file, {
      upsert: true,
      contentType: file.type
    });

  if (error) throw error;

  // Return the public URL
  const { data: urlData } = supabase.storage
    .from('courier-documents')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
};

export const getDocumentUrl = async (userId: string, documentType: string): Promise<string | null> => {
  const { data, error } = await supabase.storage
    .from('courier-documents')
    .list(userId);

  if (error) throw error;

  const file = data.find(f => f.name.startsWith(documentType));
  if (!file) return null;

  const { data: urlData } = supabase.storage
    .from('courier-documents')
    .getPublicUrl(`${userId}/${file.name}`);

  return urlData.publicUrl;
};

export const deleteDocument = async (userId: string, documentType: string) => {
  const { data: files } = await supabase.storage
    .from('courier-documents')
    .list(userId);

  if (!files) return;

  const file = files.find(f => f.name.startsWith(documentType));
  if (!file) return;

  const { error } = await supabase.storage
    .from('courier-documents')
    .remove([`${userId}/${file.name}`]);

  if (error) throw error;
};

// ============================================
// CEP LOOKUP (ViaCEP API)
// ============================================

export interface CepData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export const lookupCEP = async (cep: string): Promise<CepData | null> => {
  const cleanCep = cep.replace(/\D/g, '');

  if (cleanCep.length !== 8) {
    throw new Error('CEP inválido');
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();

    if (data.erro) {
      throw new Error('CEP não encontrado');
    }

    return data;
  } catch (error) {
    console.error('Error fetching CEP:', error);
    throw error;
  }
};

// ============================================
// COMPLETE REGISTRATION SUBMISSION
// ============================================

export const submitCompleteRegistration = async (
  userId: string,
  registrationData: any
) => {
  try {
    // 1. Update/Create profile (Upsert to ensure it works even without auth trigger)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: registrationData.personal.fullName,
        birth_date: registrationData.personal.birthDate,
        cpf: registrationData.personal.cpf,
        phone: registrationData.personal.phone,
        gender: registrationData.personal.gender,
        pix_key: registrationData.personal.pixKey,
        avatar_url: registrationData.photoUrl,
        work_city: registrationData.workCity,
        status: 'pending',
        updated_at: new Date().toISOString()
      });

    if (profileError) throw profileError;

    // 2. Create address
    await upsertAddress(userId, {
      zip_code: registrationData.address.zipCode,
      street: registrationData.address.street,
      number: registrationData.address.number || 'S/N',
      complement: registrationData.address.complement,
      district: registrationData.address.district,
      city: registrationData.address.city,
      state: registrationData.address.state,
      reference: registrationData.address.reference
    });

    // 3. Create vehicle
    await upsertVehicle(userId, {
      cnh_number: registrationData.vehicle.cnhNumber,
      cnh_validity: registrationData.vehicle.cnhValidity,
      plate: registrationData.vehicle.plate,
      plate_state: registrationData.vehicle.plateState,
      plate_city: registrationData.vehicle.plateCity,
      model: registrationData.vehicle.model,
      year: registrationData.vehicle.year,
      color: registrationData.vehicle.color,
      renavam: registrationData.vehicle.renavam,
      is_owner: registrationData.vehicle.isOwner,
      cnh_front_url: registrationData.documentUrls.cnhFront,
      cnh_back_url: registrationData.documentUrls.cnhBack,
      crlv_url: registrationData.documentUrls.crlv,
      bike_photo_url: registrationData.documentUrls.bikePhoto
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error submitting registration:', error);
    // Enhanced error for debugging
    if (error.code || error.details || error.hint) {
      throw new Error(`DB Error: ${error.message} (Code: ${error.code}) - ${error.details || ''} ${error.hint || ''}`);
    }
    throw error;
  }
};
