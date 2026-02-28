import { supabase, uploadDocument, createProfile, submitCompleteRegistration } from '../supabase';
import type { WizardData } from '../components/onboarding/WizardContainer';

/**
 * Helper function to convert base64 data URL to File object
 */
const dataURLtoFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};

/**
 * Process complete courier registration wizard
 */
export const processWizardRegistration = async (wizardData: WizardData): Promise<void> => {
    try {
        // 1. Create user account with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: wizardData.email,
            password: wizardData.password,
            options: {
                data: {
                    full_name: wizardData.fullName,
                    cpf: wizardData.cpf,
                    phone: wizardData.phone,
                }
            }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Failed to create user');

        const userId = authData.user.id;

        // 2. Upload avatar photo
        let avatarUrl = '';
        if (wizardData.photoUrl) {
            const photoFile = dataURLtoFile(wizardData.photoUrl, 'avatar.jpg');
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('courier-documents')
                .upload(`${userId}/avatar.jpg`, photoFile, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('courier-documents')
                .getPublicUrl(`${userId}/avatar.jpg`);

            avatarUrl = urlData.publicUrl;
        }

        // 3. Upload documents
        const documentUrls: Record<string, string> = {};

        if (wizardData.cnhFrontUrl) {
            const file = dataURLtoFile(wizardData.cnhFrontUrl, 'cnh_front.jpg');
            documentUrls.cnhFront = await uploadDocument(userId, file, 'cnh_front');
        }

        if (wizardData.cnhBackUrl) {
            const file = dataURLtoFile(wizardData.cnhBackUrl, 'cnh_back.jpg');
            documentUrls.cnhBack = await uploadDocument(userId, file, 'cnh_back');
        }

        if (wizardData.crlvUrl) {
            const file = dataURLtoFile(wizardData.crlvUrl, 'crlv.jpg');
            documentUrls.crlv = await uploadDocument(userId, file, 'crlv');
        }

        if (wizardData.bikePhotoUrl) {
            const file = dataURLtoFile(wizardData.bikePhotoUrl, 'bike_photo.jpg');
            documentUrls.bikePhoto = await uploadDocument(userId, file, 'bike_photo');
        }

        if (wizardData.proofOfResidenceUrl) {
            const file = dataURLtoFile(wizardData.proofOfResidenceUrl, 'proof_residence.jpg');
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('courier-documents')
                .upload(`${userId}/proof_residence.jpg`, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('courier-documents')
                .getPublicUrl(`${userId}/proof_residence.jpg`);

            documentUrls.proofResidence = urlData.publicUrl;
        }

        // 4. Create profile and related data
        const registrationData = {
            personal: {
                fullName: wizardData.fullName,
                birthDate: wizardData.birthDate,
                cpf: wizardData.cpf.replace(/\D/g, ''),
                phone: wizardData.phone.replace(/\D/g, ''),
                gender: wizardData.gender,
                pixKey: wizardData.pixKey,
            },
            photoUrl: avatarUrl,
            workCity: wizardData.workCity,
            address: {
                zipCode: wizardData.zipCode.replace(/\D/g, ''),
                street: wizardData.street,
                number: wizardData.hasNoNumber ? 'S/N' : wizardData.number,
                complement: wizardData.complement,
                reference: wizardData.reference,
                district: wizardData.district,
                city: wizardData.city,
                state: wizardData.state,
            },
            vehicle: {
                cnhNumber: wizardData.cnhNumber.replace(/\D/g, ''),
                cnhValidity: wizardData.cnhValidity,
                plate: wizardData.plate.toUpperCase(),
                plateState: wizardData.plateState.toUpperCase(),
                plateCity: wizardData.plateCity,
                model: wizardData.model,
                year: parseInt(wizardData.year),
                color: wizardData.color,
                renavam: wizardData.renavam.replace(/\D/g, ''),
                isOwner: wizardData.isOwner,
            },
            documentUrls,
        };

        await submitCompleteRegistration(userId, registrationData);

        console.log('✅ Registration completed successfully!');
    } catch (error: any) {
        console.error('❌ Error processing registration:', error);

        // Translate common Supabase errors
        if (error.message?.includes('User already registered')) {
            throw new Error('Este e-mail já está cadastrado. Por favor, faça login.');
        }

        throw error;
    }
};
