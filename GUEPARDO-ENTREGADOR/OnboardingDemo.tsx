import React, { useState } from 'react';
import { OnboardingStep, PersonalData, AddressData, VehicleData, DocumentUpload, RegistrationData, City } from './types';

// Importar componentes de onboarding
import { TermsScreen } from './components/onboarding/TermsScreen';
import { LocationPermission } from './components/onboarding/LocationPermission';
import { CitySelector } from './components/onboarding/CitySelector';

// Importar componentes do wizard
import { Step1Personal } from './components/wizard/Step1Personal';
import { Step2Photo } from './components/wizard/Step2Photo';
import { Step3Address } from './components/wizard/Step3Address';
import { Step4Vehicle } from './components/wizard/Step4Vehicle';
import { Step5Documents } from './components/wizard/Step5Documents';
import { ReviewScreen } from './components/wizard/ReviewScreen';

import * as supabaseClient from './supabase';

const OnboardingDemo: React.FC = () => {
    const [theme] = useState<'dark' | 'light'>('dark');
    const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(OnboardingStep.TERMS);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Estado de dados de registro
    const [registrationData, setRegistrationData] = useState<RegistrationData>({
        workCity: '',
        personal: {
            fullName: '',
            birthDate: '',
            cpf: '',
            phone: '',
            email: '',
            password: '',
            confirmPassword: '',
            gender: '',
            pixKey: ''
        },
        photoUrl: '',
        address: {
            zipCode: '',
            street: '',
            number: '',
            complement: '',
            district: '',
            city: '',
            state: '',
            reference: '',
            hasNoNumber: false
        },
        vehicle: {
            cnhNumber: '',
            cnhValidity: '',
            plate: '',
            plateState: '',
            plateCity: '',
            model: '',
            year: 0,
            color: '',
            renavam: '',
            isOwner: true
        },
        documents: {
            cnhFront: null,
            cnhBack: null,
            proofOfResidence: null,
            crlv: null,
            bikePhoto: null
        }
    });

    // Handlers de navegação
    const handleTermsAccept = () => {
        setOnboardingStep(OnboardingStep.LOCATION_PERMISSION);
    };

    const handleLocationGranted = () => {
        setOnboardingStep(OnboardingStep.CITY_SELECTOR);
    };

    const handleCitySelected = (city: City) => {
        setRegistrationData(prev => ({ ...prev, workCity: city.displayName }));
        setOnboardingStep(OnboardingStep.WIZARD_STEP_1);
    };

    const goToWizardStep = (step: number) => {
        const stepMap: Record<number, OnboardingStep> = {
            1: OnboardingStep.WIZARD_STEP_1,
            2: OnboardingStep.WIZARD_STEP_2,
            3: OnboardingStep.WIZARD_STEP_3,
            4: OnboardingStep.WIZARD_STEP_4,
            5: OnboardingStep.WIZARD_STEP_5
        };
        setOnboardingStep(stepMap[step]);
    };

    const handleSubmitRegistration = async () => {
        setIsSubmitting(true);

        try {
            // 1. Criar conta de usuário
            const { user } = await supabaseClient.signUp(
                registrationData.personal.email,
                registrationData.personal.password,
                {
                    name: registrationData.personal.fullName,
                    cpf: registrationData.personal.cpf,
                    phone: registrationData.personal.phone
                }
            );

            if (!user) throw new Error('Falha ao criar usuário');

            // 2. Upload de documentos
            const documentUrls: any = {};

            if (registrationData.documents.cnhFront) {
                documentUrls.cnhFront = await supabaseClient.uploadDocument(
                    user.id,
                    registrationData.documents.cnhFront,
                    'cnh_front'
                );
            }

            if (registrationData.documents.cnhBack) {
                documentUrls.cnhBack = await supabaseClient.uploadDocument(
                    user.id,
                    registrationData.documents.cnhBack,
                    'cnh_back'
                );
            }

            if (registrationData.documents.proofOfResidence) {
                documentUrls.proofOfResidence = await supabaseClient.uploadDocument(
                    user.id,
                    registrationData.documents.proofOfResidence,
                    'proof_residence'
                );
            }

            if (registrationData.documents.crlv) {
                documentUrls.crlv = await supabaseClient.uploadDocument(
                    user.id,
                    registrationData.documents.crlv,
                    'crlv'
                );
            }

            if (registrationData.documents.bikePhoto) {
                documentUrls.bikePhoto = await supabaseClient.uploadDocument(
                    user.id,
                    registrationData.documents.bikePhoto,
                    'bike_photo'
                );
            }

            // 3. Upload de foto de perfil
            let avatarUrl = '';
            if (registrationData.photoUrl) {
                const response = await fetch(registrationData.photoUrl);
                const blob = await response.blob();
                const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
                avatarUrl = await supabaseClient.uploadDocument(user.id, file, 'profile_photo' as any);
            }

            // 4. Submeter registro completo
            await supabaseClient.submitCompleteRegistration(user.id, {
                ...registrationData,
                photoUrl: avatarUrl,
                documentUrls
            });

            // 5. Sucesso!
            alert('✅ Cadastro enviado com sucesso! Aguarde a aprovação.');
            console.log('Cadastro completo!', { user, documentUrls, avatarUrl });

        } catch (error: any) {
            console.error('Erro no registro:', error);
            alert('❌ Erro ao enviar cadastro: ' + (error.message || 'Tente novamente.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Renderizar tela apropriada baseada no passo
    switch (onboardingStep) {
        case OnboardingStep.TERMS:
            return (
                <TermsScreen
                    theme={theme}
                    onAccept={handleTermsAccept}
                    onBack={() => alert('Voltar para login')}
                />
            );

        case OnboardingStep.LOCATION_PERMISSION:
            return (
                <LocationPermission
                    theme={theme}
                    onPermissionGranted={handleLocationGranted}
                    onSkip={handleLocationGranted}
                />
            );

        case OnboardingStep.CITY_SELECTOR:
            return (
                <CitySelector
                    theme={theme}
                    onCitySelected={handleCitySelected}
                    onBack={() => setOnboardingStep(OnboardingStep.LOCATION_PERMISSION)}
                />
            );

        case OnboardingStep.WIZARD_STEP_1:
            return (
                <Step1Personal
                    theme={theme}
                    data={registrationData.personal}
                    onDataChange={(data) => setRegistrationData(prev => ({ ...prev, personal: data }))}
                    onNext={() => setOnboardingStep(OnboardingStep.WIZARD_STEP_2)}
                    onBack={() => setOnboardingStep(OnboardingStep.CITY_SELECTOR)}
                />
            );

        case OnboardingStep.WIZARD_STEP_2:
            return (
                <Step2Photo
                    theme={theme}
                    photoUrl={registrationData.photoUrl}
                    onPhotoCapture={(url) => setRegistrationData(prev => ({ ...prev, photoUrl: url }))}
                    onNext={() => setOnboardingStep(OnboardingStep.WIZARD_STEP_3)}
                    onBack={() => setOnboardingStep(OnboardingStep.WIZARD_STEP_1)}
                />
            );

        case OnboardingStep.WIZARD_STEP_3:
            return (
                <Step3Address
                    theme={theme}
                    data={registrationData.address}
                    onDataChange={(data) => setRegistrationData(prev => ({ ...prev, address: data }))}
                    onNext={() => setOnboardingStep(OnboardingStep.WIZARD_STEP_4)}
                    onBack={() => setOnboardingStep(OnboardingStep.WIZARD_STEP_2)}
                />
            );

        case OnboardingStep.WIZARD_STEP_4:
            return (
                <Step4Vehicle
                    theme={theme}
                    data={registrationData.vehicle}
                    onDataChange={(data) => setRegistrationData(prev => ({ ...prev, vehicle: data }))}
                    onNext={() => setOnboardingStep(OnboardingStep.WIZARD_STEP_5)}
                    onBack={() => setOnboardingStep(OnboardingStep.WIZARD_STEP_3)}
                />
            );

        case OnboardingStep.WIZARD_STEP_5:
            return (
                <Step5Documents
                    theme={theme}
                    data={registrationData.documents}
                    onDataChange={(data) => setRegistrationData(prev => ({ ...prev, documents: data }))}
                    onNext={() => setOnboardingStep(OnboardingStep.REVIEW)}
                    onBack={() => setOnboardingStep(OnboardingStep.WIZARD_STEP_4)}
                />
            );

        case OnboardingStep.REVIEW:
            return (
                <ReviewScreen
                    theme={theme}
                    data={registrationData}
                    onEdit={goToWizardStep}
                    onSubmit={handleSubmitRegistration}
                    onBack={() => setOnboardingStep(OnboardingStep.WIZARD_STEP_5)}
                    isSubmitting={isSubmitting}
                />
            );

        default:
            return <div>Erro: Passo desconhecido</div>;
    }
};

export default OnboardingDemo;
