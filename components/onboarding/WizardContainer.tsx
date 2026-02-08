import React, { useState } from 'react';
import ProgressBar from '../common/ProgressBar';
import Step1PersonalData from './steps/Step1PersonalData';
import Step2Photo from './steps/Step2Photo';
import Step3Address from './steps/Step3Address';
import Step4Vehicle from './steps/Step4Vehicle';
import Step5Documents from './steps/Step5Documents';

export interface WizardData {
    // Step 1: Personal Data
    fullName: string;
    birthDate: string;
    cpf: string;
    phone: string;
    email: string;
    gender: string;
    pixKey: string;
    password: string;
    confirmPassword: string;
    workCity: string;

    // Step 2: Photo
    photoUrl: string | null;
    photoFile: File | null;

    // Step 3: Address
    zipCode: string;
    street: string;
    number: string;
    hasNoNumber: boolean;
    complement: string;
    reference: string;
    district: string;
    city: string;
    state: string;

    // Step 4: Vehicle
    cnhNumber: string;
    cnhValidity: string;
    plate: string;
    plateState: string;
    plateCity: string;
    model: string;
    year: string;
    color: string;
    renavam: string;
    isOwner: boolean;

    // Step 5: Documents
    cnhFrontUrl: string | null;
    cnhBackUrl: string | null;
    crlvUrl: string | null;
    bikePhotoUrl: string | null;
    proofOfResidenceUrl: string | null;
}

interface WizardContainerProps {
    onComplete: (data: WizardData) => Promise<void>;
    onCancel: () => void;
    initialCity?: string;
    theme?: 'dark' | 'light';
}

const WizardContainer: React.FC<WizardContainerProps> = ({ onComplete, onCancel, initialCity = '', theme = 'dark' }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [wizardData, setWizardData] = useState<WizardData>({
        fullName: '',
        birthDate: '',
        cpf: '',
        phone: '',
        email: '',
        gender: '',
        pixKey: '',
        password: '',
        confirmPassword: '',
        workCity: initialCity,
        photoUrl: null,
        photoFile: null,
        zipCode: '',
        street: '',
        number: '',
        hasNoNumber: false,
        complement: '',
        reference: '',
        district: '',
        city: '',
        state: '',
        cnhNumber: '',
        cnhValidity: '',
        plate: '',
        plateState: '',
        plateCity: '',
        model: '',
        year: '',
        color: '',
        renavam: '',
        isOwner: true,
        cnhFrontUrl: null,
        cnhBackUrl: null,
        crlvUrl: null,
        bikePhotoUrl: null,
        proofOfResidenceUrl: null,
    });

    const totalSteps = 5;

    const updateData = (updates: Partial<WizardData>) => {
        setWizardData(prev => ({ ...prev, ...updates }));
    };

    const handleNext = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        await onComplete(wizardData);
    };

    const cardBg = theme === 'dark' ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-200';
    const textPrimary = theme === 'dark' ? 'text-white' : 'text-zinc-900';

    return (
        <div className={`min-h-screen w-screen flex flex-col p-6 ${theme === 'dark' ? 'bg-black' : 'bg-zinc-50'}`}>
            {/* Header with progress */}
            <div className="w-full max-w-2xl mx-auto mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className={`text-2xl font-black italic ${textPrimary}`}>
                        Cadastro de Entregador
                    </h1>
                    <button
                        onClick={onCancel}
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600'} hover:scale-105 transition-transform`}
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <ProgressBar currentStep={currentStep} totalSteps={totalSteps} theme={theme} />
            </div>

            {/* Step content */}
            <div className={`flex-1 w-full max-w-2xl mx-auto rounded-3xl border p-8 ${cardBg}`}>
                {currentStep === 1 && (
                    <Step1PersonalData
                        data={{
                            fullName: wizardData.fullName,
                            birthDate: wizardData.birthDate,
                            cpf: wizardData.cpf,
                            phone: wizardData.phone,
                            email: wizardData.email,
                            gender: wizardData.gender,
                            pixKey: wizardData.pixKey,
                            password: wizardData.password,
                            confirmPassword: wizardData.confirmPassword,
                        }}
                        onUpdate={updateData}
                        onNext={handleNext}
                        theme={theme}
                    />
                )}
                {currentStep === 2 && (
                    <Step2Photo
                        data={{
                            photoUrl: wizardData.photoUrl,
                            photoFile: wizardData.photoFile,
                        }}
                        onUpdate={updateData}
                        onNext={handleNext}
                        theme={theme}
                    />
                )}
                {currentStep === 3 && (
                    <Step3Address
                        data={{
                            zipCode: wizardData.zipCode,
                            street: wizardData.street,
                            number: wizardData.number,
                            hasNoNumber: wizardData.hasNoNumber,
                            complement: wizardData.complement,
                            reference: wizardData.reference,
                            district: wizardData.district,
                            city: wizardData.city,
                            state: wizardData.state,
                        }}
                        onUpdate={updateData}
                        onNext={handleNext}
                        theme={theme}
                    />
                )}
                {currentStep === 4 && (
                    <Step4Vehicle
                        data={{
                            cnhNumber: wizardData.cnhNumber,
                            cnhValidity: wizardData.cnhValidity,
                            plate: wizardData.plate,
                            plateState: wizardData.plateState,
                            plateCity: wizardData.plateCity,
                            model: wizardData.model,
                            year: wizardData.year,
                            color: wizardData.color,
                            renavam: wizardData.renavam,
                            isOwner: wizardData.isOwner,
                        }}
                        onUpdate={updateData}
                        onNext={handleNext}
                        theme={theme}
                    />
                )}
                {currentStep === 5 && (
                    <Step5Documents
                        data={{
                            cnhFrontUrl: wizardData.cnhFrontUrl,
                            cnhBackUrl: wizardData.cnhBackUrl,
                            crlvUrl: wizardData.crlvUrl,
                            bikePhotoUrl: wizardData.bikePhotoUrl,
                            proofOfResidenceUrl: wizardData.proofOfResidenceUrl,
                        }}
                        onUpdate={updateData}
                        onNext={handleSubmit}
                        theme={theme}
                    />
                )}
            </div>

            {/* Navigation buttons */}
            {currentStep > 1 && currentStep < 5 && (
                <div className="w-full max-w-2xl mx-auto mt-6">
                    <button
                        onClick={handleBack}
                        className={`w-full h-14 rounded-2xl font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-900'} hover:scale-105 transition-transform`}
                    >
                        <i className="fas fa-chevron-left mr-2"></i>
                        Voltar
                    </button>
                </div>
            )}
        </div>
    );
};

export default WizardContainer;
export type { WizardData };
