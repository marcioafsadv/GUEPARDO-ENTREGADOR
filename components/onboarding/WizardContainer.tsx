import React, { useState } from 'react';
import ProgressBar from '../common/ProgressBar';
import Step1PersonalData from './steps/Step1PersonalData';
import Step2BankData from './steps/Step2BankData';
import Step3Photo from './steps/Step2Photo';
import Step4Address from './steps/Step3Address';
import Step5Vehicle from './steps/Step4Vehicle';
import Step6Documents from './steps/Step5Documents';

export interface WizardData {
    // Step 1: Personal Data
    fullName: string;
    birthDate: string;
    cpf: string;
    phone: string;
    email: string;
    gender: string;
    password: string;
    confirmPassword: string;
    workCity: string;

    // Step 2: Bank Data
    bankName: string;
    bankAgency: string;
    bankAccount: string;
    bankAccountType: string;
    pixKey: string;

    // Step 3: Photo
    photoUrl: string | null;
    photoFile: File | null;

    // Step 4: Address
    zipCode: string;
    street: string;
    number: string;
    hasNoNumber: boolean;
    complement: string;
    reference: string;
    district: string;
    city: string;
    state: string;

    // Step 5: Vehicle
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

    // Step 6: Documents
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
        password: '',
        confirmPassword: '',
        workCity: initialCity,
        bankName: '',
        bankAgency: '',
        bankAccount: '',
        bankAccountType: '',
        pixKey: '',
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

    const totalSteps = 6;

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
        <div className={`h-full w-full flex flex-col p-4 sm:p-6 bg-transparent overflow-hidden`}>
            {/* Header with progress */}
            <div className="w-full mb-4 sm:mb-6 shrink-0">
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
            <div className={`flex-1 w-full rounded-3xl border p-5 sm:p-8 ${cardBg} flex flex-col overflow-hidden relative`}>
                {currentStep === 1 && (
                    <Step1PersonalData
                        data={{
                            fullName: wizardData.fullName,
                            birthDate: wizardData.birthDate,
                            cpf: wizardData.cpf,
                            phone: wizardData.phone,
                            email: wizardData.email,
                            gender: wizardData.gender,
                            password: wizardData.password,
                            confirmPassword: wizardData.confirmPassword,
                        }}
                        onUpdate={updateData}
                        onNext={handleNext}
                        theme={theme}
                    />
                )}
                {currentStep === 2 && (
                    <Step2BankData
                        data={{
                            bankName: wizardData.bankName,
                            agency: wizardData.bankAgency,
                            accountNumber: wizardData.bankAccount,
                            accountType: wizardData.bankAccountType,
                            pixKey: wizardData.pixKey,
                        }}
                        onUpdate={(updates: any) => {
                            const mapped: any = {};
                            if (updates.agency !== undefined) mapped.bankAgency = updates.agency;
                            if (updates.accountNumber !== undefined) mapped.bankAccount = updates.accountNumber;
                            if (updates.accountType !== undefined) mapped.bankAccountType = updates.accountType;
                            if (updates.bankName !== undefined) mapped.bankName = updates.bankName;
                            if (updates.pixKey !== undefined) mapped.pixKey = updates.pixKey;
                            updateData(mapped);
                        }}
                        onNext={handleNext}
                        theme={theme}
                    />
                )}
                {currentStep === 3 && (
                    <Step3Photo
                        data={{
                            photoUrl: wizardData.photoUrl,
                            photoFile: wizardData.photoFile,
                        }}
                        onUpdate={updateData}
                        onNext={handleNext}
                        theme={theme}
                    />
                )}
                {currentStep === 4 && (
                    <Step4Address
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
                {currentStep === 5 && (
                    <Step5Vehicle
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
                {currentStep === 6 && (
                    <Step6Documents
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
            {currentStep > 1 && currentStep < 6 && (
                <div className="w-full mt-4 sm:mt-6 shrink-0">
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
