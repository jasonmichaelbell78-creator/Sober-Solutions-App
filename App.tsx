import React, { useState, useEffect } from 'react';
import { House, Client, ViewState, AdminTab, IntakeForm, CheckInType, CheckInLog, DrugTestLog, DischargeRecord, Chore, ChoreCompletion, Note } from './types';
import { MOCK_HOUSES, MOCK_CLIENTS, ADMIN_PASSWORD } from './constants';
import { generateDailyReport, analyzeIntakeRisk } from './services/geminiService';
import {
  subscribeToHouses,
  subscribeToClients,
  createClient,
  updateClient,
  setClient,
  setHouse,
  getHouses,
  initializeHouses,
  initializeClients,
  isHousesCollectionEmpty,
  isClientsCollectionEmpty,
  addCheckInLog,
  subscribeToChores,
  createChore,
  updateChore,
  deleteChore,
  addChoreCompletion,
  getSettings,
  updateSettings
} from './services/firestoreService';
import { getRandomBackground, Background } from './backgrounds';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { useToast, ToastContainer } from './components/Toast';
import { Loading, LoadingOverlay } from './components/Loading';
import { ConfirmDialog } from './components/ConfirmDialog';
import {
  Home,
  UserPlus,
  Users,
  MapPin,
  CheckCircle,
  Activity,
  LogOut,
  BedDouble,
  ClipboardCheck,
  BrainCircuit,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Pencil,
  Save,
  X,
  BookOpen,
  Filter,
  Building,
  AlertCircle,
  FileText,
  FlaskConical,
  History,
  DoorOpen,
  Calendar,
  Lock,
  Key,
  User,
  Eye,
  FileCheck,
  Download,
  Loader2,
  Search,
  BarChart3,
  PackageOpen,
  ListChecks,
  Moon,
  Sun,
  ScrollText
} from 'lucide-react';

// --- Constants ---

const INITIAL_INTAKE_STATE: IntakeForm = {
  targetHouseId: '',
  firstName: '', lastName: '', age: '', dob: '', phone: '', email: '',
  dlNumber: '', dlState: '', dlExpiration: '',
  emergencyName: '', emergencyPhone: '', emergencyAddress: '',
  doctorName: '', doctorPhone: '', doctorAddress: '', allergies: '',
  hasOverdosed: false, overdoseCount: '', overdoseDates: '',
  hasAttemptedSuicide: false, suicideCount: '', suicideDates: '',
  hasFelony: false, felonyExplanation: '',
  isSexOffender: false,
  hasAssaultCharges: false, assaultExplanation: '',
  isSpecializedCourt: false, specializedCourtName: '',
  onParoleProbation: false, paroleExplanation: '', paroleOfficerName: '', paroleOfficerPhone: '',
  hasPendingCharges: false, pendingChargesExplanation: '',
  comments: '',
  medications: [],
  agreementCommunity: false,
  signatureCommunity: '',
  agreementLiability: false,
  agreementCovid: false,
  agreementProperty: false,
  signatureFinal: '',
  soberDate: '',
  submissionDate: new Date().toISOString().split('T')[0]
};

// --- Styles ---
// Added text-base to prevent iOS zoom on focus
const INPUT_CLASS = "w-full p-3 text-base border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none disabled:bg-stone-100 disabled:text-stone-500 transition-all bg-stone-50/50";
const ERROR_INPUT_CLASS = "w-full p-3 text-base border border-red-300 bg-red-50 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none transition-all";

// --- Helper Functions ---

const calculateAge = (dob: string): string => {
  if (!dob) return '';
  const birthDate = new Date(dob);
  const today = new Date();
  if (isNaN(birthDate.getTime())) return '';
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age < 0 ? '0' : age.toString();
};

// --- Helper Components ---

const Radio = ({ checked, onChange, label, disabled }: { checked: boolean, onChange: () => void, label: string, disabled?: boolean }) => (
  <label className={`inline-flex items-center ${disabled ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}>
    <input type="radio" checked={checked} onChange={onChange} disabled={disabled} className="mr-2 w-5 h-5 text-primary focus:ring-primary" /> 
    <span className="text-stone-700">{label}</span>
  </label>
);

const LegalCheck = ({ readOnly, label, value, onChange, details, onDetailsChange, placeholder, noDetails }: any) => (
  <div className="border-b border-stone-100 pb-4">
      <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-stone-700">{label}</span>
          <div className="space-x-4">
              <Radio label="Yes" checked={value} onChange={() => onChange(true)} disabled={readOnly} />
              <Radio label="No" checked={!value} onChange={() => onChange(false)} disabled={readOnly} />
          </div>
      </div>
      {value && !noDetails && (
          <textarea 
            className={INPUT_CLASS} 
            rows={2} 
            placeholder={placeholder} 
            value={details || ''} 
            onChange={(e) => onDetailsChange(e.target.value)} 
            disabled={readOnly} 
          />
      )}
  </div>
);

const AgreementSection = ({ readOnly, title, description, checked, onChange, fullText }: any) => {
  const [showModal, setShowModal] = useState(false);
  const [hasRead, setHasRead] = useState(false);

  return (
    <>
      <div className={`border rounded-2xl p-6 transition-colors ${checked ? 'bg-primary/5 border-primary/20' : 'bg-stone-50 border-stone-200'}`}>
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            className="mt-1.5 w-6 h-6 text-primary rounded focus:ring-primary accent-primary"
            checked={checked}
            onChange={e => onChange(e.target.checked)}
            disabled={readOnly || !hasRead}
            required
            title={!hasRead ? "You must read the full waiver text first" : ""}
          />
          <div className="flex-1">
            <h4 className="font-bold text-stone-800 text-lg">{title} <span className="text-secondary text-xs font-normal ml-2">* Required</span></h4>
            <p className="text-stone-600 mt-2 leading-relaxed">{description}</p>
            {!readOnly && !hasRead && (
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="mt-4 flex items-center gap-2 text-primary hover:text-primary/80 font-semibold text-sm transition-colors"
              >
                <Eye className="w-4 h-4" />
                Read Full Waiver Text (Required)
              </button>
            )}
            {hasRead && (
              <p className="mt-3 text-green-600 text-sm flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                You have read this waiver
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Waiver Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-stone-100 bg-stone-50 flex justify-between items-center">
              <h3 className="font-bold text-xl text-stone-800">{title}</h3>
              <button onClick={() => setShowModal(false)}>
                <X className="w-6 h-6 text-stone-400 hover:text-stone-600" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto flex-1">
              <div className="prose prose-stone max-w-none">
                {fullText}
              </div>
            </div>
            <div className="px-8 py-6 border-t border-stone-100 bg-stone-50 flex justify-between items-center">
              <p className="text-sm text-stone-600">Please read the entire document before acknowledging</p>
              <Button
                onClick={() => {
                  setHasRead(true);
                  setShowModal(false);
                }}
                variant="primary"
              >
                <FileCheck className="w-4 h-4 mr-2" />
                I Have Read This
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// --- Sub-Components ---

const LoginModal = ({
  isOpen,
  onClose,
  type,
  clients,
  onUpdateClient,
  onLoginSuccess
}: {
  isOpen: boolean,
  onClose: () => void,
  type: 'ADMIN' | 'RESIDENT',
  clients: Client[],
  onUpdateClient: (client: Client) => Promise<void>,
  onLoginSuccess: (user?: Client) => void
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'IDENTIFY' | 'AUTH' | 'CREATE'>('IDENTIFY');
  const [error, setError] = useState('');
  const [foundClient, setFoundClient] = useState<Client | null>(null);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setFoundClient(null);
      setStep('IDENTIFY');
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  const handleAdminLogin = async () => {
    try {
      const settings = await getSettings();
      const correctPassword = settings.adminPassword || ADMIN_PASSWORD;
      if (password === correctPassword) {
        onLoginSuccess();
      } else {
        setError("Incorrect password.");
      }
    } catch (error) {
      console.error('Error checking password:', error);
      // Fallback to default if Firebase fails
      if (password === ADMIN_PASSWORD) {
        onLoginSuccess();
      } else {
        setError("Incorrect password.");
      }
    }
  };

  const handleResidentIdentify = () => {
    const client = clients.find(c => c.email.toLowerCase() === email.toLowerCase().trim());
    
    if (!client) {
      setError("Email not found. Please use the email provided during intake.");
      return;
    }

    if (client.status !== 'active' && client.status !== 'alumni') {
        setError("Account is not active. Please contact the House Manager.");
        return;
    }

    setFoundClient(client);
    setError('');
    
    if (client.password) {
      setStep('AUTH');
    } else {
      setStep('CREATE');
    }
  };

  const handleResidentAuth = () => {
    if (foundClient && foundClient.password === password) {
      onLoginSuccess(foundClient);
    } else {
      setError("Incorrect password.");
    }
  };

  const handleCreatePassword = async () => {
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (foundClient) {
      const updatedClient = { ...foundClient, password: newPassword };
      await onUpdateClient(updatedClient);
      onLoginSuccess(updatedClient);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#3c4a3e]/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-8 py-6 border-b border-stone-100 bg-stone-50 flex justify-between items-center">
          <h3 className="font-bold text-xl text-stone-800">{type === 'ADMIN' ? 'Manager Access' : 'Resident Portal'}</h3>
          <button onClick={onClose}><X className="w-6 h-6 text-stone-400 hover:text-secondary"/></button>
        </div>
        
        <div className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-secondary text-sm p-4 rounded-2xl flex items-start gap-2 border border-red-100">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0"/>
              {error}
            </div>
          )}

          {type === 'ADMIN' && (
            <>
              <div>
                <label className="label">Password</label>
                <input 
                  type="password" 
                  className={INPUT_CLASS} 
                  autoFocus 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                />
              </div>
              <Button className="w-full" onClick={handleAdminLogin}>Access Dashboard</Button>
            </>
          )}

          {type === 'RESIDENT' && step === 'IDENTIFY' && (
            <>
              <div>
                <label className="label">Email Address</label>
                <input 
                  type="email" 
                  className={INPUT_CLASS} 
                  autoFocus 
                  placeholder="Enter your email..."
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleResidentIdentify()}
                />
              </div>
              <Button className="w-full" onClick={handleResidentIdentify}>Continue</Button>
            </>
          )}

          {type === 'RESIDENT' && step === 'AUTH' && (
            <>
              <div className="text-center mb-4">
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3 text-primary font-bold text-2xl border-4 border-white shadow-lg">
                  {foundClient?.firstName[0]}{foundClient?.lastName[0]}
                </div>
                <p className="font-bold text-stone-800 text-lg">Welcome back, {foundClient?.firstName}</p>
              </div>
              <div>
                <label className="label">Password</label>
                <input 
                  type="password" 
                  className={INPUT_CLASS} 
                  autoFocus 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleResidentAuth()}
                />
              </div>
              <Button className="w-full" onClick={handleResidentAuth}>Login</Button>
              <button className="w-full text-center text-sm text-stone-400 mt-4 hover:text-primary transition-colors" onClick={() => setStep('IDENTIFY')}>Not you? Switch account</button>
            </>
          )}

          {type === 'RESIDENT' && step === 'CREATE' && (
             <>
                <div className="bg-primary/10 p-4 rounded-2xl text-primary text-sm mb-2">
                  <p className="font-bold">First time login?</p>
                  <p>Please create a secure password for your account.</p>
                </div>
                <div>
                  <label className="label">Create Password</label>
                  <input 
                    type="password" 
                    className={INPUT_CLASS} 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Confirm Password</label>
                  <input 
                    type="password" 
                    className={INPUT_CLASS} 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreatePassword()}
                  />
                </div>
                <Button className="w-full" onClick={handleCreatePassword}>Create Account & Login</Button>
             </>
          )}
        </div>
      </div>
    </div>
  );
};

const ClientCard: React.FC<{ client: Client; onClick: (c: Client) => void }> = ({ client, onClick }) => (
    <Card className="group hover:shadow-lg transition-all cursor-pointer hover:border-primary/30">
    <div onClick={() => onClick(client)}>
        <div className="flex items-start justify-between">
            <div>
                <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                    {client.firstName} {client.lastName}
                    <span className={`text-xs px-3 py-1 rounded-full font-bold ${client.status === 'active' ? 'bg-green-100 text-green-800' : client.status === 'discharged' ? 'bg-red-100 text-red-800' : 'bg-stone-100 text-stone-600'}`}>{client.status.toUpperCase()}</span>
                </h3>
                <div className="mt-3 text-sm text-stone-600 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    <p><span className="font-medium text-stone-400">Sober Date:</span> {client.soberDate}</p>
                    <p><span className="font-medium text-stone-400">Phone:</span> {client.phone}</p>
                </div>
            </div>
            <div className="flex flex-col items-end gap-2">
                <div className="bg-stone-50 p-2 rounded-full group-hover:bg-primary group-hover:text-white transition-all duration-300">
                     <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-white" />
                </div>
            </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-stone-100">
            <h4 className="text-xs font-bold text-stone-400 uppercase mb-3 tracking-wider">Recent Check-Ins</h4>
            <div className="space-y-2">
                {client.checkInLogs.slice(0, 2).map(log => (
                    <div key={log.id} className="text-xs flex items-center justify-between text-stone-600 bg-stone-50 p-2 rounded-xl">
                        <span className="flex items-center gap-2">
                            {log.type === CheckInType.HOUSE ? <Home className="w-3.5 h-3.5 text-primary"/> : <MapPin className="w-3.5 h-3.5 text-secondary"/>}
                            <span className="font-medium">{log.locationName || 'Unknown'}</span>
                        </span>
                        <span className="text-stone-400">{new Date(log.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</span>
                    </div>
                ))}
                {client.checkInLogs.length === 0 && <span className="text-xs text-stone-400 italic pl-1">No activity recorded yet.</span>}
            </div>
        </div>
    </div>
 </Card>
);

const LandingPage = ({ onNavigate, onRequestLogin, background }: { onNavigate: (view: ViewState) => void, onRequestLogin: (type: 'ADMIN' | 'RESIDENT') => void, background: Background }) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: background.gradient }}>
    <div className="max-w-md w-full space-y-8 text-center">
      <div className="bg-white/95 backdrop-blur-sm p-10 rounded-[2.5rem] shadow-2xl border border-white/50">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
            <Home className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-bold text-primary mb-3 tracking-tight">Sober Solutions</h1>
        <p className="text-stone-500 mb-2 text-lg">Community. Recovery. Purpose.</p>
        <p className="text-xs text-stone-400 italic mb-8">{background.theme}</p>
        
        <div className="space-y-4">
          <Button onClick={() => onNavigate('INTAKE')} className="w-full justify-between group py-4" variant="outline">
            <span>New Resident Application</span>
            <UserPlus className="w-5 h-5 text-stone-300 group-hover:text-primary" />
          </Button>
          
          <Button onClick={() => onRequestLogin('ADMIN')} className="w-full justify-between group py-4" variant="primary">
            <span>House Manager Login</span>
            <Activity size={20} color="white" />
          </Button>
          
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-stone-200"></span></div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest"><span className="bg-white px-4 text-stone-400 font-bold">Current Residents</span></div>
          </div>

          <Button onClick={() => onRequestLogin('RESIDENT')} className="w-full justify-between group py-4" variant="secondary">
            <span>Resident Login</span>
            <User className="w-5 h-5" />
          </Button>
        </div>
      </div>
      <p className="text-xs text-stone-400">Demo Passwords - Admin: 'admin' | Resident: 'password' or create new</p>
    </div>
  </div>
);

interface IntakeFormViewProps {
  readOnly?: boolean;
  initialData?: Client | null;
  houses: House[];
  onSubmit?: (data: IntakeForm) => Promise<void>;
  onCancel?: () => void;
}

const IntakeFormView = ({ readOnly = false, initialData = null, houses, onSubmit, onCancel }: IntakeFormViewProps) => {
  const [data, setData] = useState<IntakeForm>(initialData || INITIAL_INTAKE_STATE);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const totalSteps = 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      setIsSubmitting(true);
      await onSubmit(data);
      setIsSubmitting(false);
    }
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, totalSteps));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handleChange = (field: keyof IntakeForm, value: any) => {
    let updates: Partial<IntakeForm> = { [field]: value };
    
    // Auto-calculate age if DOB changes
    if (field === 'dob') {
      updates.age = calculateAge(value);
    }

    setData(prev => ({ ...prev, ...updates }));
  };

  // Strict validation for Step 2
  const isStep2Valid = data.agreementCommunity && data.signatureCommunity.trim() !== '';

  // Strict validation for Step 3
  const isStep3Valid = 
    data.targetHouseId && 
    data.firstName.trim() !== '' && 
    data.lastName.trim() !== '' && 
    data.dob && 
    data.phone.trim() !== '' && 
    data.emergencyName.trim() !== '' && 
    data.emergencyPhone.trim() !== '';

  // Strict validation for Step 5 (Checkbox agreements)
  const isStep5Valid = 
    data.agreementLiability && 
    data.agreementCovid && 
    data.agreementProperty && 
    data.agreementCommunity &&
    data.signatureFinal.trim() !== '';

  return (
    <div className={`bg-cream ${readOnly ? '' : 'min-h-screen p-4 lg:p-8'}`}>
      <div className={`max-w-3xl mx-auto ${readOnly ? 'w-full max-w-none' : ''}`}>
        {!readOnly && (
            <div className="flex justify-between items-center mb-6">
                <Button onClick={onCancel} variant="outline" size="sm" className="text-sm">&larr; Home</Button>
                <div className="text-sm font-bold text-primary uppercase tracking-wider">Step {step} of {totalSteps}</div>
            </div>
        )}
        
        {readOnly && (
             <div className="flex justify-between items-center mb-4 px-4 py-2 bg-stone-100 rounded-xl border border-stone-200 sticky top-0 z-10">
                <span className="font-bold text-stone-700">Viewing Application</span>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={prevStep} disabled={step === 1}><ChevronLeft className="w-4 h-4"/></Button>
                    <span className="text-sm self-center font-medium text-stone-500">Page {step}/{totalSteps}</span>
                    <Button size="sm" variant="outline" onClick={nextStep} disabled={step === totalSteps}><ChevronRight className="w-4 h-4"/></Button>
                </div>
             </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* STEP 1: INTRO */}
            {step === 1 && (
                <Card title="Sober Solutions Community">
                    <div className="prose prose-stone max-w-none space-y-6 text-justify leading-loose text-stone-600">
                        <p className="first-letter:text-4xl first-letter:font-bold first-letter:text-primary first-letter:mr-2 first-letter:float-left">Living in a Sober environment is a chance to cultivate new positive relationships with people that are on the same journey toward Recovery. Many battling dependences on drugs and alcohol find themselves isolated and alone. During the Recovery process, individuals can develop connections and bonds with other residents as they continue to grow and heal in Recovery.</p>
                        <p>There is Power in being a member of a Community, all striving to improve themselves. Sober Living is one important way to build a network of people you can rely on to sustain a life of Recovery. Free from alcohol and illicit drug use, we are centered on peer support and connections that promote sustained recovery from substance use.</p>
                        <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 my-6">
                           <p className="font-bold text-primary mb-3">Application Instructions:</p>
                           <ul className="list-disc list-inside text-sm text-stone-700 space-y-1">
                               <li>Please fill out all fields truthfully.</li>
                               <li>You <strong>must</strong> select a House Preference.</li>
                               <li>Emergency contact information is mandatory.</li>
                               <li>All agreements at the end must be checked to submit.</li>
                           </ul>
                        </div>
                        <p>Love and Tolerance is the backbone of Sober Solutions. We offer Hope, along with Solutions, to living life on a day-to-day basis. Our goal is to provide a safe and clean Sober living environment. We will help you transition between leaving inpatient or outpatient treatment and how to return to a Real Life with Purpose.</p>
                    </div>
                    {!readOnly && <div className="mt-10 flex justify-end">
                        <Button type="button" onClick={nextStep} className="px-8">Continue to Agreements <ChevronRight className="w-4 h-4 ml-2"/></Button>
                    </div>}
                </Card>
            )}

            {/* STEP 2: AGREEMENTS */}
            {step === 2 && (
                <Card title="Community Agreement">
                    <div className="space-y-4 text-sm text-stone-800">
                        <ol className="list-decimal pl-5 space-y-4 marker:text-primary marker:font-bold">
                            <li>I agree to attend at least 5 Recovery based meetings per week, and I have recovery-based materials.</li>
                            <li>I commit to be working on my recovery and actively involved in the recovery community.</li>
                            <li>I agree to being home at 11pm during the week and 12am on the weekend.</li>
                            <li>I understand there will be no overnight passes for the 1st 30 days, special circumstances can be discussed with the staff and community. Overnights may be taken after the first 30 days with 48hr written notice and approval.</li>
                            <li>I understand no visitors will be allowed on premises without prior approval.</li>
                            <li>I agree to see the house manager at least 1 time per week to discuss my recovery and community experience.</li>
                            <li>Secrets keep people sick. Safety and structure are here to protect the community, support others and to respect rules. Sober Solutions focuses on being a community-based environment.</li>
                            <li>I understand “House Meetings” on premises are held 1 time per week, I agree to attend this meeting.</li>
                            <li>I commit to be employed, a student, a volunteer, or looking for theses. I agree to inform staff of changes in these activities or commitments.</li>
                            <li>I understand there are certain types of employment that are not recommended in Recovery. I agree to discuss with the house manager prior to accepting employment.</li>
                            <li>I agree to keep my room neat, with bed made. I understand no one is allowed in another resident’s room without permission. I commit to daily and weekend chores as part of my commitment to recovery while living in the community.</li>
                            <li>Community Room checks happen daily. I agree to be responsible for my own space and helping the community maintain the entire home.</li>
                            <li>For safety and respect reasons, I understand that there will be no threats or any violence in the community and no smoking or vapes inside the house, including bedrooms.</li>
                            <li>I understand that appropriate measures can occur if chores are not done, the grounds are not cared for, rooms are not kept clean, or general attitudes are not in line with the community’s etiquette.</li>
                            <li>I understand that bikes and other modes of transportation should be put in appropriate locations. The security of these is my responsibility.</li>
                            <li>I understand the sharing of clothing, personal property, the loaning of money, borrowing vehicles, including bikes is not appropriate.</li>
                            <li>In case of emergency, I understand to notify the house manager then call 911.</li>
                            <li>I understand Sober Solutions does not discriminate against any medically assisted treatment, and we support all pathways to recovery.</li>
                            <li>I understand random drug screens can happen at any time, if a question arises, I am able to get a confirmation test at my expense.</li>
                            <li>I understand and agree to rent being paid every Friday and I agree to keep current. Refunds can be given with a two-week notice but if you must leave or no notice is given there will not be any refund.</li>
                        </ol>
                        
                        <div className="bg-accent/10 p-6 rounded-2xl border border-accent/20 mt-8 text-stone-800 italic leading-relaxed">
                            To insure a healthy, happy, drug and alcohol-free recovery environment, please do your part and use common sense when it comes to either doing or not doing something that may affect you or the community. I have read and understand the community agreements and I agree to abide by them.
                        </div>

                        <div className="mt-8 pt-6 border-t border-stone-200">
                             <label className="flex items-center gap-3 mb-6 font-bold text-primary cursor-pointer hover:bg-primary/5 p-2 rounded-lg transition-colors">
                                <input type="checkbox" className="w-6 h-6 rounded text-primary focus:ring-primary accent-primary" checked={data.agreementCommunity} onChange={e => handleChange('agreementCommunity', e.target.checked)} disabled={readOnly} required />
                                I Agree to the Community Rules (1-20) <span className="text-secondary ml-1">*</span>
                             </label>
                             <div>
                                <label className="label">Resident's Signature (Type Full Name)</label>
                                <input 
                                  required 
                                  placeholder="Full Name" 
                                  className={INPUT_CLASS}
                                  value={data.signatureCommunity} 
                                  onChange={(e) => handleChange('signatureCommunity', e.target.value)} 
                                  disabled={readOnly}
                                />
                                <p className="text-xs text-stone-400 mt-2">Date: {data.submissionDate}</p>
                             </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* STEP 3: QUESTIONNAIRE */}
            {step === 3 && (
                <Card title="Resident Questionnaire">
                    <div className="bg-orange-50 p-6 mb-8 border border-orange-100 rounded-2xl">
                       <label className="label text-lg font-bold text-orange-900">House Preference <span className="text-secondary">*</span></label>
                       <p className="text-xs text-orange-800/70 mb-4">You must select which location you are applying for.</p>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {houses.map(h => (
                              <label key={h.id} className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${data.targetHouseId === h.id ? 'bg-white border-primary shadow-md' : 'bg-white/50 border-stone-200 hover:border-primary/50'}`}>
                                 <input 
                                    type="radio" 
                                    name="housePreference" 
                                    value={h.id} 
                                    checked={data.targetHouseId === h.id} 
                                    onChange={(e) => handleChange('targetHouseId', e.target.value)}
                                    disabled={readOnly}
                                    required
                                    className="w-5 h-5 text-primary focus:ring-primary mr-4"
                                 />
                                 <div>
                                     <span className="font-bold text-stone-800 block text-lg">{h.name}</span>
                                     <span className="text-xs text-stone-500 block mt-1">{h.address}</span>
                                 </div>
                              </label>
                          ))}
                       </div>
                    </div>

                    <h4 className="section-header">Personal Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div><label className="label">First Name <span className="text-secondary">*</span></label><input className={INPUT_CLASS} required value={data.firstName} onChange={(e) => handleChange('firstName', e.target.value)} disabled={readOnly} /></div>
                        <div><label className="label">Last Name <span className="text-secondary">*</span></label><input className={INPUT_CLASS} required value={data.lastName} onChange={(e) => handleChange('lastName', e.target.value)} disabled={readOnly} /></div>
                        <div><label className="label">DOB <span className="text-secondary">*</span></label><input className={INPUT_CLASS} type="date" required value={data.dob} onChange={(e) => handleChange('dob', e.target.value)} disabled={readOnly} /></div>
                        
                        {/* Automated Age Field */}
                        <div>
                            <label className="label">Age (Auto-calculated)</label>
                            <input 
                                className={`${INPUT_CLASS} bg-stone-100 text-stone-500 font-mono`} 
                                type="text" 
                                readOnly 
                                value={data.age} 
                                disabled 
                                placeholder="Select DOB"
                            />
                        </div>
                        
                        <div><label className="label">Cell Phone <span className="text-secondary">*</span></label><input className={INPUT_CLASS} type="tel" required value={data.phone} onChange={(e) => handleChange('phone', e.target.value)} disabled={readOnly} /></div>
                        <div><label className="label">Email</label><input className={INPUT_CLASS} type="email" value={data.email} onChange={(e) => handleChange('email', e.target.value)} disabled={readOnly} /></div>
                        <div><label className="label">License #</label><input className={INPUT_CLASS} value={data.dlNumber} onChange={(e) => handleChange('dlNumber', e.target.value)} disabled={readOnly} /></div>
                        <div><label className="label">State</label><input className={INPUT_CLASS} value={data.dlState} onChange={(e) => handleChange('dlState', e.target.value)} disabled={readOnly} /></div>
                        <div><label className="label">Sober Date</label><input className={INPUT_CLASS} type="date" value={data.soberDate} onChange={(e) => handleChange('soberDate', e.target.value)} disabled={readOnly} /></div>
                    </div>

                    <h4 className="section-header">Emergency Contact & Medical</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                         <div><label className="label">Emergency Contact Name <span className="text-secondary">*</span></label><input className={INPUT_CLASS} required value={data.emergencyName} onChange={(e) => handleChange('emergencyName', e.target.value)} disabled={readOnly} /></div>
                         <div><label className="label">Phone <span className="text-secondary">*</span></label><input className={INPUT_CLASS} type="tel" required value={data.emergencyPhone} onChange={(e) => handleChange('emergencyPhone', e.target.value)} disabled={readOnly} /></div>
                         <div className="md:col-span-2"><label className="label">Address</label><input className={INPUT_CLASS} value={data.emergencyAddress} onChange={(e) => handleChange('emergencyAddress', e.target.value)} disabled={readOnly} /></div>
                         <div><label className="label">Doctor Name</label><input className={INPUT_CLASS} value={data.doctorName} onChange={(e) => handleChange('doctorName', e.target.value)} disabled={readOnly} /></div>
                         <div><label className="label">Doctor Phone</label><input className={INPUT_CLASS} value={data.doctorPhone} onChange={(e) => handleChange('doctorPhone', e.target.value)} disabled={readOnly} /></div>
                         <div className="md:col-span-2"><label className="label">Allergies</label><textarea className={INPUT_CLASS} rows={2} value={data.allergies} onChange={(e) => handleChange('allergies', e.target.value)} disabled={readOnly} /></div>
                    </div>

                    <h4 className="section-header">History</h4>
                    <div className="space-y-6">
                         <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-stone-700">Have you ever overdosed?</span>
                                <div className="space-x-4">
                                    <Radio label="Yes" checked={data.hasOverdosed} onChange={() => handleChange('hasOverdosed', true)} disabled={readOnly} />
                                    <Radio label="No" checked={!data.hasOverdosed} onChange={() => handleChange('hasOverdosed', false)} disabled={readOnly} />
                                </div>
                            </div>
                            {data.hasOverdosed && <div className="mt-4 grid grid-cols-2 gap-4"><input className={INPUT_CLASS} placeholder="# times" value={data.overdoseCount} onChange={(e) => handleChange('overdoseCount', e.target.value)} disabled={readOnly} /><input className={INPUT_CLASS} placeholder="Dates" value={data.overdoseDates} onChange={(e) => handleChange('overdoseDates', e.target.value)} disabled={readOnly} /></div>}
                         </div>

                         <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-stone-700">Have you ever attempted suicide?</span>
                                <div className="space-x-4">
                                    <Radio label="Yes" checked={data.hasAttemptedSuicide} onChange={() => handleChange('hasAttemptedSuicide', true)} disabled={readOnly} />
                                    <Radio label="No" checked={!data.hasAttemptedSuicide} onChange={() => handleChange('hasAttemptedSuicide', false)} disabled={readOnly} />
                                </div>
                            </div>
                            {data.hasAttemptedSuicide && <div className="mt-4 grid grid-cols-2 gap-4"><input className={INPUT_CLASS} placeholder="# times" value={data.suicideCount} onChange={(e) => handleChange('suicideCount', e.target.value)} disabled={readOnly} /><input className={INPUT_CLASS} placeholder="Dates" value={data.suicideDates} onChange={(e) => handleChange('suicideDates', e.target.value)} disabled={readOnly} /></div>}
                         </div>
                    </div>

                    <h4 className="section-header mt-8">Legal History</h4>
                    <div className="space-y-4">
                        <LegalCheck readOnly={readOnly} label="Any felony convictions?" value={data.hasFelony} onChange={(v: boolean) => handleChange('hasFelony', v)} details={data.felonyExplanation} onDetailsChange={(v: string) => handleChange('felonyExplanation', v)} placeholder="Explain..." />
                        <LegalCheck readOnly={readOnly} label="Are you a sex offender?" value={data.isSexOffender} onChange={(v: boolean) => handleChange('isSexOffender', v)} details="" onDetailsChange={() => {}} placeholder="" noDetails />
                        <LegalCheck readOnly={readOnly} label="Any assault charges?" value={data.hasAssaultCharges} onChange={(v: boolean) => handleChange('hasAssaultCharges', v)} details={data.assaultExplanation} onDetailsChange={(v: string) => handleChange('assaultExplanation', v)} placeholder="Explain..." />
                        <LegalCheck readOnly={readOnly} label="Specialized court? (DUI, Drug, etc)" value={data.isSpecializedCourt} onChange={(v: boolean) => handleChange('isSpecializedCourt', v)} details={data.specializedCourtName} onDetailsChange={(v: string) => handleChange('specializedCourtName', v)} placeholder="Which court?" />
                        <LegalCheck readOnly={readOnly} label="On parole or probation?" value={data.onParoleProbation} onChange={(v: boolean) => handleChange('onParoleProbation', v)} details={data.paroleExplanation} onDetailsChange={(v: string) => handleChange('paroleExplanation', v)} placeholder="Charges/Location" />
                         {data.onParoleProbation && (
                             <div className="grid grid-cols-2 gap-4 pl-4">
                                 <input className={INPUT_CLASS} placeholder="PO Name" value={data.paroleOfficerName} onChange={(e) => handleChange('paroleOfficerName', e.target.value)} disabled={readOnly} />
                                 <input className={INPUT_CLASS} placeholder="PO Phone" value={data.paroleOfficerPhone} onChange={(e) => handleChange('paroleOfficerPhone', e.target.value)} disabled={readOnly} />
                             </div>
                         )}
                         <LegalCheck readOnly={readOnly} label="Any pending charges?" value={data.hasPendingCharges} onChange={(v: boolean) => handleChange('hasPendingCharges', v)} details={data.pendingChargesExplanation} onDetailsChange={(v: string) => handleChange('pendingChargesExplanation', v)} placeholder="What and where?" />
                    </div>
                </Card>
            )}

            {/* STEP 4: MEDICATIONS */}
            {step === 4 && (
                <Card title="Medication/Screening Policy">
                     <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 text-stone-800 text-sm mb-8 leading-relaxed">
                        <p className="font-bold mb-2 text-amber-800">Drug Screening Policy:</p>
                        <p className="mb-4">Resident agrees to submit to observed drug screening and/or breathalyzer within a reasonable period upon request. Resident agrees not to leave premises until completion of the screening.</p>
                        
                        <p className="font-bold mb-2 text-amber-800">Medication Storage Process:</p>
                        <p>Prescription narcotic medications are not permitted. You may not consume anything nor bring anything to property that contains alcohol. All other prescriptions, except for narcotics, are only allowed if they are prescribed to you by a doctor and are taken as prescribed.</p>
                     </div>

                     <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                            <h4 className="font-bold text-stone-700 text-lg">Current Medications (Include OTC)</h4>
                            {!readOnly && (
                                <Button
                                    type="button"
                                    onClick={() => setData({...data, medications: [...data.medications, { name: '', dose: '', doctor: '', contact: '', reason: '' }]})}
                                    size="lg"
                                    variant="primary"
                                    className="w-full sm:w-auto shrink-0"
                                >
                                    <Plus size={20} color="white" /> Add Medication
                                </Button>
                            )}
                        </div>
                        
                        {data.medications.length === 0 && (
                            <p className="text-stone-400 italic text-center py-8 border-2 border-dashed border-stone-200 rounded-2xl">No medications listed.</p>
                        )}

                        {data.medications.map((med, idx) => (
                            <div key={idx} className="bg-stone-50 p-6 rounded-2xl border border-stone-200 relative grid grid-cols-1 md:grid-cols-5 gap-4 shadow-sm">
                                {!readOnly && (
                                    <button type="button" onClick={() => {
                                        const newMeds = [...data.medications];
                                        newMeds.splice(idx, 1);
                                        setData({...data, medications: newMeds});
                                    }} className="absolute top-2 right-2 text-stone-400 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
                                )}
                                <div><label className="text-xs font-bold text-stone-400 uppercase mb-1 block">Medication</label><input className={INPUT_CLASS} value={med.name} onChange={(e) => {const m = [...data.medications]; m[idx].name = e.target.value; setData({...data, medications: m})}} disabled={readOnly} /></div>
                                <div><label className="text-xs font-bold text-stone-400 uppercase mb-1 block">Dose</label><input className={INPUT_CLASS} value={med.dose} onChange={(e) => {const m = [...data.medications]; m[idx].dose = e.target.value; setData({...data, medications: m})}} disabled={readOnly} /></div>
                                <div><label className="text-xs font-bold text-stone-400 uppercase mb-1 block">Doctor</label><input className={INPUT_CLASS} value={med.doctor} onChange={(e) => {const m = [...data.medications]; m[idx].doctor = e.target.value; setData({...data, medications: m})}} disabled={readOnly} /></div>
                                <div><label className="text-xs font-bold text-stone-400 uppercase mb-1 block">Contact</label><input className={INPUT_CLASS} value={med.contact} onChange={(e) => {const m = [...data.medications]; m[idx].contact = e.target.value; setData({...data, medications: m})}} disabled={readOnly} /></div>
                                <div><label className="text-xs font-bold text-stone-400 uppercase mb-1 block">Reason</label><input className={INPUT_CLASS} value={med.reason} onChange={(e) => {const m = [...data.medications]; m[idx].reason = e.target.value; setData({...data, medications: m})}} disabled={readOnly} /></div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* STEP 5: FINAL */}
            {step === 5 && (
                <Card title="Community Understanding & Waivers">
                    <div className="space-y-6">
                        <AgreementSection
                            readOnly={readOnly}
                            title="Disclaimer and Liability Waiver"
                            description="Guests are not tenants. Sober Solutions is not responsible for damage to person or property. I waive all claims against Sober Solutions."
                            checked={data.agreementLiability}
                            onChange={(v: boolean) => handleChange('agreementLiability', v)}
                            fullText={
                              <div className="space-y-4 text-stone-700 leading-relaxed">
                                <h4 className="font-bold text-lg">Disclaimer and Liability Waiver</h4>
                                <p>By signing this agreement, I acknowledge and agree to the following:</p>
                                <ol className="list-decimal pl-6 space-y-3">
                                  <li>I understand that I am a <strong>guest</strong> at Sober Solutions properties and am <strong>not a tenant</strong>. I have no tenancy rights and this is not a rental agreement.</li>
                                  <li>Sober Solutions, its owners, operators, employees, and agents are <strong>not responsible</strong> for any damage, loss, injury, or death to person or property that may occur while I am on the premises.</li>
                                  <li>I <strong>waive all claims</strong> against Sober Solutions for any injuries, damages, or losses I may sustain, whether caused by negligence or otherwise.</li>
                                  <li>I understand that Sober Solutions does not provide medical, therapeutic, or counseling services, and is not responsible for my physical or mental health.</li>
                                  <li>I agree to hold Sober Solutions harmless from any liability arising from my stay at the property.</li>
                                  <li>This waiver is binding upon my heirs, next of kin, executors, and personal representatives.</li>
                                </ol>
                                <p className="text-sm text-stone-500 italic mt-6">By clicking "I Have Read This" and checking the agreement box, I acknowledge that I have read, understood, and agree to all terms in this waiver.</p>
                              </div>
                            }
                        />

                         <AgreementSection
                            readOnly={readOnly}
                            title="COVID-19 Waiver"
                            description="I acknowledge the contagious nature of COVID-19 and assume the risk of exposure. I release Sober Solutions from liability related to COVID-19."
                            checked={data.agreementCovid}
                            onChange={(v: boolean) => handleChange('agreementCovid', v)}
                            fullText={
                              <div className="space-y-4 text-stone-700 leading-relaxed">
                                <h4 className="font-bold text-lg">COVID-19 Acknowledgement and Waiver</h4>
                                <p>By signing this agreement, I acknowledge and agree to the following:</p>
                                <ol className="list-decimal pl-6 space-y-3">
                                  <li>I acknowledge that COVID-19 is an extremely contagious disease and I understand the risk of exposure to COVID-19 by staying at Sober Solutions properties.</li>
                                  <li>I understand that the risk of becoming exposed to or infected by COVID-19 at Sober Solutions may result from the actions, omissions, or negligence of myself and others, including but not limited to, facility staff and other guests.</li>
                                  <li>I <strong>voluntarily assume all risks</strong> related to exposure to COVID-19, and I agree that Sober Solutions is not responsible if I contract COVID-19.</li>
                                  <li>I agree to follow all health and safety guidelines established by Sober Solutions and local health authorities regarding COVID-19 prevention.</li>
                                  <li>I understand that if I exhibit symptoms of COVID-19 or test positive, I may be required to leave the property immediately.</li>
                                  <li>I <strong>release and hold harmless</strong> Sober Solutions, its owners, employees, and agents from any liability, claims, or damages arising from COVID-19 exposure or infection.</li>
                                </ol>
                                <p className="text-sm text-stone-500 italic mt-6">By clicking "I Have Read This" and checking the agreement box, I acknowledge that I have read, understood, and agree to all terms in this waiver.</p>
                              </div>
                            }
                        />

                        <AgreementSection
                            readOnly={readOnly}
                            title="Property Agreement"
                            description="I agree to indemnify Sober Solutions against claims arising from my actions. I am responsible for my property."
                            checked={data.agreementProperty}
                            onChange={(v: boolean) => handleChange('agreementProperty', v)}
                            fullText={
                              <div className="space-y-4 text-stone-700 leading-relaxed">
                                <h4 className="font-bold text-lg">Property Responsibility Agreement</h4>
                                <p>By signing this agreement, I acknowledge and agree to the following:</p>
                                <ol className="list-decimal pl-6 space-y-3">
                                  <li>I agree to <strong>indemnify and hold harmless</strong> Sober Solutions against any and all claims, demands, or causes of action arising from my actions or negligence while on the property.</li>
                                  <li>I am solely responsible for all of my <strong>personal property</strong> brought onto Sober Solutions premises, including but not limited to clothing, electronics, vehicles, medications, and valuables.</li>
                                  <li>Sober Solutions is <strong>not responsible</strong> for any lost, stolen, damaged, or destroyed personal property.</li>
                                  <li>I agree not to bring any prohibited items onto the property, including but not limited to: alcohol, illegal drugs, weapons, or any items that violate house rules.</li>
                                  <li>I understand that I am financially responsible for any damage I cause to Sober Solutions property, furnishings, or equipment, whether intentional or accidental.</li>
                                  <li>I agree to leave the property in the same condition as when I arrived, normal wear and tear excepted.</li>
                                  <li>I understand that Sober Solutions reserves the right to search my belongings and living space for prohibited items at any time.</li>
                                  <li>If I damage property or cause harm to others due to my actions, I agree to accept full financial and legal responsibility.</li>
                                </ol>
                                <p className="text-sm text-stone-500 italic mt-6">By clicking "I Have Read This" and checking the agreement box, I acknowledge that I have read, understood, and agree to all terms in this agreement.</p>
                              </div>
                            }
                        />

                        <div className="pt-8 border-t border-stone-200">
                            <label className="label font-bold text-lg mb-2">Final Electronic Signature (Type Full Name) <span className="text-secondary">*</span></label>
                            <input 
                                className={`${INPUT_CLASS} font-mono text-xl py-4`} 
                                value={data.signatureFinal}
                                onChange={(e) => handleChange('signatureFinal', e.target.value)}
                                placeholder="Full Name"
                                required
                                disabled={readOnly}
                            />
                            <p className="text-sm text-stone-400 mt-2">By signing above, I agree to all terms in this application.</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* NAVIGATION */}
            {!readOnly && (
                <div className="flex justify-between pt-8">
                    {step > 1 ? (
                        <Button type="button" variant="outline" onClick={prevStep}><ChevronLeft className="w-4 h-4 mr-2" /> Previous</Button>
                    ) : <div></div>}

                    {step < totalSteps ? (
                        <Button 
                           type="button" 
                           onClick={nextStep}
                           disabled={(step === 2 && !isStep2Valid) || (step === 3 && !isStep3Valid)}
                           className="px-8"
                        >
                           Next <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <Button 
                           type="submit" 
                           isLoading={isSubmitting} 
                           disabled={!isStep5Valid}
                           className="px-8"
                        >
                           Submit Application <ClipboardCheck className="w-4 h-4 ml-2" />
                        </Button>
                    )}
                </div>
            )}
        </form>
      </div>
    </div>
  );
};

const ClientDetailView = ({ client, houses, onClose, onUpdateClient, onUpdateHouses, onDischarge, toast }: {
  client: Client,
  houses: House[],
  onClose: () => void,
  onUpdateClient: (c: Client) => void,
  onUpdateHouses: (houses: House[]) => Promise<void>,
  onDischarge: (c: Client, record: DischargeRecord) => void,
  toast: ReturnType<typeof useToast>
}) => {
  const [tab, setTab] = useState<'INFO' | 'MEDS' | 'UA' | 'LOGS' | 'NOTES' | 'DISCHARGE'>('INFO');
  const [newUa, setNewUa] = useState<Partial<DrugTestLog>>({ type: 'Instant', result: 'Negative', notes: '' });
  const [dischargeForm, setDischargeForm] = useState<Partial<DischargeRecord>>({
    type: 'Successful Completion',
    reason: '',
    notes: '',
    forwardingAddress: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [resetPassword, setResetPassword] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferHouseId, setTransferHouseId] = useState<string>(client.assignedHouseId || houses[0]?.id || '');
  const [transferBedId, setTransferBedId] = useState<string>('');
  const [newNote, setNewNote] = useState<Partial<Note>>({ content: '', category: 'General' });
  const [editingName, setEditingName] = useState(false);
  const [editedFirstName, setEditedFirstName] = useState(client.firstName);
  const [editedLastName, setEditedLastName] = useState(client.lastName);
  const [showDischargeConfirm, setShowDischargeConfirm] = useState(false);
  const [showRemoveBedConfirm, setShowRemoveBedConfirm] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleAddUA = () => {
    if (!newUa.type || !newUa.result) return;
    const log: DrugTestLog = {
      id: `ua-${Date.now()}`,
      date: new Date().toISOString(),
      type: newUa.type,
      result: newUa.result,
      notes: newUa.notes || '',
      performedBy: 'Admin'
    };
    const updatedClient = {
      ...client,
      drugTestLogs: [log, ...(client.drugTestLogs || [])]
    };
    onUpdateClient(updatedClient);
    setNewUa({ type: 'Instant', result: 'Negative', notes: '' });
  };

  const handleDischargeSubmit = () => {
    if (!dischargeForm.date || !dischargeForm.type) return;
    setShowDischargeConfirm(true);
  };

  const handleDischargeConfirm = () => {
    const record = dischargeForm as DischargeRecord;
    onDischarge(client, record);
    setShowDischargeConfirm(false);
  };

  const handlePasswordReset = () => {
    if (resetPassword.length < 6) {
      toast.warning("Password must be at least 6 characters");
      return;
    }
    const updatedClient = {
      ...client,
      password: resetPassword
    };
    onUpdateClient(updatedClient);
    setResetPassword('');
    setShowReset(false);
    toast.success("Password updated successfully.");
  };

  const handleTransferBed = async () => {
    if (!transferBedId) {
      toast.warning("Please select a bed");
      return;
    }

    setIsTransferring(true);
    try {
      // 1. Update ALL houses in one operation: clear old bed everywhere and assign new bed
      const updatedHouses = houses.map(h => {
        if (h.id === transferHouseId) {
          // This is the new house - assign to bed
          return {
            ...h,
            rooms: h.rooms.map(r => ({
              ...r,
              beds: r.beds.map(b => {
                // Clear if this resident was here, or assign if this is the target bed
                if (b.occupantId === client.id) return { ...b, occupantId: null };
                if (b.id === transferBedId) return { ...b, occupantId: client.id };
                return b;
              })
            }))
          };
        } else {
          // Other houses - just clear this resident from any beds
          return {
            ...h,
            rooms: h.rooms.map(r => ({
              ...r,
              beds: r.beds.map(b =>
                b.occupantId === client.id ? { ...b, occupantId: null } : b
              )
            }))
          };
        }
      });

      // 2. Update client record - PRESERVE ALL FIELDS
      const updatedClient: Client = {
        // Explicitly preserve all client data
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
        password: client.password,
        dateOfBirth: client.dateOfBirth,
        emergencyContact: client.emergencyContact,
        emergencyPhone: client.emergencyPhone,
        submissionDate: client.submissionDate,
        targetHouseId: client.targetHouseId,
        status: client.status,
        drugTestLogs: client.drugTestLogs || [],
        dischargeRecord: client.dischargeRecord,
        notes: client.notes || [],
        checkInLogs: client.checkInLogs || [],
        // Update only these fields
        assignedHouseId: transferHouseId,
        assignedBedId: transferBedId
      };

      console.log('Transferring resident:', {
        name: `${client.firstName} ${client.lastName}`,
        from: { house: client.assignedHouseId, bed: client.assignedBedId },
        to: { house: transferHouseId, bed: transferBedId },
        preservedFields: Object.keys(updatedClient)
      });

      // 3. Save to Firebase
      await onUpdateHouses(updatedHouses);
      await onUpdateClient(updatedClient);

      // 4. Close modal and show success
      setShowTransfer(false);
      setTransferBedId('');
      toast.success(`${client.firstName} successfully ${client.assignedBedId ? 'transferred to' : 'assigned to'} new bed!`);

      // 5. Close the client detail modal to force refresh
      onClose();
    } catch (error) {
      console.error('Error transferring bed:', error);
      toast.error('Error transferring bed. Please try again.');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleRemoveBed = async () => {
    setIsRemoving(true);
    try {
      // Clear bed assignment
      const updatedHouses = houses.map(h => ({
        ...h,
        rooms: h.rooms.map(r => ({
          ...r,
          beds: r.beds.map(b =>
            b.occupantId === client.id ? { ...b, occupantId: null } : b
          )
        }))
      }));
      const updatedClient = { ...client, assignedBedId: null, assignedHouseId: null };
      await onUpdateHouses(updatedHouses);
      await onUpdateClient(updatedClient);
      setShowTransfer(false);
      setShowRemoveBedConfirm(false);
      toast.success('Resident removed from bed successfully');
      onClose(); // Close detail modal to force refresh
    } catch (error) {
      console.error('Error removing from bed:', error);
      toast.error('Error removing from bed. Please try again.');
      setShowRemoveBedConfirm(false);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleAddNote = () => {
    if (!newNote.content || newNote.content.trim() === '') {
      toast.warning('Please enter note content');
      return;
    }
    const note: Note = {
      id: `note-${Date.now()}`,
      date: new Date().toISOString(),
      author: 'Admin',
      content: newNote.content,
      category: newNote.category || 'General'
    };
    const updatedClient = {
      ...client,
      notes: [note, ...(client.notes || [])]
    };
    onUpdateClient(updatedClient);
    setNewNote({ content: '', category: 'General' });
    toast.success('Note added successfully');
  };

  const handleSaveName = () => {
    if (!editedFirstName.trim() || !editedLastName.trim()) {
      toast.warning('Both first and last name are required');
      return;
    }
    const updatedClient = {
      ...client,
      firstName: editedFirstName.trim(),
      lastName: editedLastName.trim()
    };
    onUpdateClient(updatedClient);
    setEditingName(false);
  };

  const handleDownloadFile = () => {
    const house = houses.find(h => h.id === client.assignedHouseId);
    const fileContent = `
RESIDENT FILE - ${client.firstName} ${client.lastName}
Generated: ${new Date().toLocaleString()}
===============================================

PERSONAL INFORMATION
Name: ${client.firstName} ${client.lastName}
Date of Birth: ${client.dob}
Age: ${client.age}
Phone: ${client.phone}
Email: ${client.email}
Status: ${client.status.toUpperCase()}
Sober Date: ${client.soberDate}
Submission Date: ${client.submissionDate}

HOUSING INFORMATION
Assigned House: ${house?.name || 'Unassigned'}
House Address: ${house?.address || 'N/A'}

DRIVER'S LICENSE
Number: ${client.dlNumber}
State: ${client.dlState}
Expiration: ${client.dlExpiration}

EMERGENCY CONTACT
Name: ${client.emergencyName}
Phone: ${client.emergencyPhone}
Address: ${client.emergencyAddress}

MEDICAL INFORMATION
Primary Doctor: ${client.doctorName}
Doctor Phone: ${client.doctorPhone}
Doctor Address: ${client.doctorAddress}
Allergies: ${client.allergies || 'None reported'}

MEDICATIONS
${client.medications && client.medications.length > 0 ? client.medications.map((med, i) => `
${i + 1}. ${med.name}
   Dose: ${med.dose}
   Doctor: ${med.doctor}
   Contact: ${med.contact}
   Reason: ${med.reason}
`).join('\n') : 'None reported'}

MEDICAL HISTORY
Overdose History: ${client.hasOverdosed ? `Yes (${client.overdoseCount} times on ${client.overdoseDates})` : 'No'}
Suicide Attempts: ${client.hasAttemptedSuicide ? `Yes (${client.suicideCount} times on ${client.suicideDates})` : 'No'}

LEGAL INFORMATION
Felony: ${client.hasFelony ? `Yes - ${client.felonyExplanation}` : 'No'}
Sex Offender: ${client.isSexOffender ? 'Yes' : 'No'}
Assault Charges: ${client.hasAssaultCharges ? `Yes - ${client.assaultExplanation}` : 'No'}
Specialized Court: ${client.isSpecializedCourt ? `Yes - ${client.specializedCourtName}` : 'No'}
Parole/Probation: ${client.onParoleProbation ? `Yes - ${client.paroleExplanation}\nOfficer: ${client.paroleOfficerName} (${client.paroleOfficerPhone})` : 'No'}
Pending Charges: ${client.hasPendingCharges ? `Yes - ${client.pendingChargesExplanation}` : 'No'}

DRUG TEST HISTORY (${client.drugTestLogs?.length || 0} tests)
${client.drugTestLogs && client.drugTestLogs.length > 0 ? client.drugTestLogs.map((log, i) => `
${i + 1}. ${new Date(log.date).toLocaleDateString()}
   Result: ${log.result}
   Type: ${log.type}
   Performed By: ${log.performedBy}
   Notes: ${log.notes || 'None'}
`).join('\n') : 'No drug tests recorded'}

CHECK-IN HISTORY (${client.checkInLogs?.length || 0} check-ins)
${client.checkInLogs && client.checkInLogs.length > 0 ? client.checkInLogs.map((log, i) => `
${i + 1}. ${new Date(log.timestamp).toLocaleString()}
   Location: ${log.locationName}
   Type: ${log.type}
   Comment: ${log.comment}
`).join('\n') : 'No check-ins recorded'}

NOTES & LOG (${client.notes?.length || 0} notes)
${client.notes && client.notes.length > 0 ? client.notes.map((note, i) => `
${i + 1}. [${note.category}] ${new Date(note.date).toLocaleString()}
   By: ${note.author}
   ${note.content}
`).join('\n') : 'No notes recorded'}

${client.dischargeRecord ? `
DISCHARGE INFORMATION
Date: ${client.dischargeRecord.date}
Type: ${client.dischargeRecord.type}
Reason: ${client.dischargeRecord.reason}
Notes: ${client.dischargeRecord.notes}
Forwarding Address: ${client.dischargeRecord.forwardingAddress}
` : ''}

ADDITIONAL COMMENTS
${client.comments || 'None'}

===============================================
End of Resident File
    `.trim();

    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${client.firstName}_${client.lastName}_ResidentFile_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#3c4a3e]/60 flex items-center justify-center p-4 backdrop-blur-sm">
       <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">

          {/* Header */}
          <div className="bg-stone-50 p-8 border-b border-stone-200 flex justify-between items-start">
             <div className="flex-1">
                {editingName ? (
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="text"
                      className="border border-stone-300 rounded-lg px-3 py-2 text-xl font-bold"
                      value={editedFirstName}
                      onChange={e => setEditedFirstName(e.target.value)}
                      placeholder="First Name"
                    />
                    <input
                      type="text"
                      className="border border-stone-300 rounded-lg px-3 py-2 text-xl font-bold"
                      value={editedLastName}
                      onChange={e => setEditedLastName(e.target.value)}
                      placeholder="Last Name"
                    />
                    <button onClick={handleSaveName} className="text-green-600 hover:bg-green-50 p-2 rounded-lg">
                      <Save className="w-5 h-5"/>
                    </button>
                    <button onClick={() => { setEditingName(false); setEditedFirstName(client.firstName); setEditedLastName(client.lastName); }} className="text-stone-400 hover:bg-stone-100 p-2 rounded-lg">
                      <X className="w-5 h-5"/>
                    </button>
                  </div>
                ) : (
                  <h2 className="text-3xl font-bold text-stone-800 flex items-center gap-3 group">
                     <span>{client.firstName} {client.lastName}</span>
                     <button onClick={() => setEditingName(true)} className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-primary p-1 rounded transition-all">
                       <Pencil className="w-5 h-5"/>
                     </button>
                     <span className={`text-sm px-3 py-1 rounded-full font-bold tracking-wide ${client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-stone-200 text-stone-600'}`}>
                       {client.status.toUpperCase()}
                     </span>
                  </h2>
                )}
                <p className="text-stone-500 mt-2 flex items-center gap-4">
                   <span className="font-medium bg-white px-2 py-1 rounded border border-stone-200">House: {houses.find(h => h.id === client.assignedHouseId)?.name || 'Unassigned'}</span>
                   <span className="bg-white px-2 py-1 rounded border border-stone-200">Sober Date: {client.soberDate}</span>
                </p>
             </div>
             <div className="flex gap-2">
               <button onClick={handleDownloadFile} className="text-stone-400 hover:text-primary p-2 rounded-full hover:bg-stone-100 transition-colors" title="Download Resident File">
                 <Download className="w-5 h-5"/>
               </button>
               <button onClick={onClose} className="text-stone-400 hover:text-secondary p-2 rounded-full hover:bg-stone-100 transition-colors"><X className="w-6 h-6"/></button>
             </div>
          </div>

          {/* Navigation */}
          <div className="flex border-b border-stone-200 bg-white px-2 md:px-4 overflow-x-auto min-h-[56px]" style={{scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch'}}>
              <button onClick={() => setTab('INFO')} className={`px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold border-b-4 transition-all flex items-center gap-1 md:gap-2 whitespace-nowrap flex-shrink-0 ${tab === 'INFO' ? 'border-primary text-primary' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
                 <FileText className="w-4 h-4"/> Info
              </button>
              <button onClick={() => setTab('MEDS')} className={`px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold border-b-4 transition-all flex items-center gap-1 md:gap-2 whitespace-nowrap flex-shrink-0 ${tab === 'MEDS' ? 'border-primary text-primary' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
                 <Plus className="w-4 h-4"/> Meds
              </button>
              <button onClick={() => setTab('UA')} className={`px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold border-b-4 transition-all flex items-center gap-1 md:gap-2 whitespace-nowrap flex-shrink-0 ${tab === 'UA' ? 'border-primary text-primary' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
                 <FlaskConical className="w-4 h-4"/> Tests
              </button>
              <button onClick={() => setTab('LOGS')} className={`px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold border-b-4 transition-all flex items-center gap-1 md:gap-2 whitespace-nowrap flex-shrink-0 ${tab === 'LOGS' ? 'border-primary text-primary' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
                 <History className="w-4 h-4"/> Logs
              </button>
              <button onClick={() => setTab('NOTES')} className={`px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold border-b-4 transition-all flex items-center gap-1 md:gap-2 whitespace-nowrap flex-shrink-0 ${tab === 'NOTES' ? 'border-primary text-primary' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
                 <FileText className="w-4 h-4"/> Notes
              </button>
              {client.status === 'active' && (
                <button onClick={() => setTab('DISCHARGE')} className={`px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold border-b-4 transition-all flex items-center gap-1 md:gap-2 whitespace-nowrap flex-shrink-0 ${tab === 'DISCHARGE' ? 'border-red-500 text-red-600' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
                   <DoorOpen className="w-4 h-4"/> Discharge
                </button>
              )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-stone-50/50 p-8">
              
              {tab === 'INFO' && (
                 <>
                   <IntakeFormView readOnly={true} initialData={client} houses={houses} />

                   {/* Bed Assignment Section */}
                   {client.status === 'active' && (
                      <div className="max-w-3xl mx-auto mt-8 pt-8 border-t border-stone-200">
                         <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                            <h3 className="font-bold text-stone-800 mb-4 flex items-center gap-2">
                               <BedDouble className="w-5 h-5 text-stone-400"/> Bed Assignment
                            </h3>
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                               <div className="flex-1">
                                  {client.assignedBedId && client.assignedHouseId ? (
                                    <>
                                      <p className="text-sm font-medium text-stone-700">
                                         Current Assignment: <span className="text-primary font-bold">
                                            {houses.find(h => h.id === client.assignedHouseId)?.name || 'Unknown House'}
                                            {' - '}
                                            {houses.find(h => h.id === client.assignedHouseId)?.rooms
                                               .flatMap(r => r.beds)
                                               .find(b => b.id === client.assignedBedId)?.number || 'Unknown Bed'}
                                         </span>
                                      </p>
                                      <p className="text-xs text-stone-500 mt-1">Transfer resident to a different bed or house</p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="text-sm font-medium text-amber-700">
                                         No bed assigned
                                      </p>
                                      <p className="text-xs text-stone-500 mt-1">Click button to assign this resident to a bed</p>
                                    </>
                                  )}
                               </div>
                               <Button size="sm" variant="secondary" onClick={() => {
                                  setTransferHouseId(client.assignedHouseId || houses[0]?.id);
                                  setShowTransfer(true);
                               }} className="w-full md:w-auto">
                                  <BedDouble className="w-4 h-4 mr-1" />
                                  {client.assignedBedId ? 'Transfer Bed' : 'Assign Bed'}
                               </Button>
                            </div>
                         </div>
                      </div>
                   )}

                   {/* Account Management Section */}
                   <div className="max-w-3xl mx-auto mt-8 pt-8 border-t border-stone-200">
                      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                          <h3 className="font-bold text-stone-800 mb-4 flex items-center gap-2">
                            <Lock className="w-5 h-5 text-stone-400"/> Account Access
                          </h3>
                          <div className="flex justify-between items-center">
                             <div>
                                <p className="text-sm font-medium text-stone-700">Password Status: <span className={client.password ? "text-green-600" : "text-amber-600"}>{client.password ? "Set" : "Not Set"}</span></p>
                                <p className="text-xs text-stone-500 mt-1">Residents use their email and password to access the portal.</p>
                             </div>
                             {!showReset ? (
                                <Button size="sm" variant="outline" onClick={() => setShowReset(true)}>Reset Password</Button>
                             ) : (
                                <div className="flex items-center gap-2 bg-stone-50 p-2 rounded-lg">
                                    <input 
                                      type="text" 
                                      placeholder="New Password" 
                                      className="border border-stone-200 rounded px-3 py-1.5 text-sm w-40 focus:ring-2 focus:ring-primary focus:outline-none"
                                      value={resetPassword}
                                      onChange={(e) => setResetPassword(e.target.value)}
                                    />
                                    <Button size="sm" onClick={handlePasswordReset}>Save</Button>
                                    <button onClick={() => { setShowReset(false); setResetPassword(''); }} className="text-stone-400 hover:text-stone-600"><X className="w-4 h-4"/></button>
                                </div>
                             )}
                          </div>
                      </div>
                   </div>
                 </>
              )}

              {tab === 'MEDS' && (
                 <div className="max-w-3xl mx-auto space-y-6">
                    <Card title="Medication Management">
                       <div className="space-y-4">
                          <div className="flex justify-between items-center mb-4">
                             <h4 className="font-bold text-stone-700">Current Medications</h4>
                             {client.status === 'active' && (
                                <Button
                                   size="sm"
                                   variant="secondary"
                                   onClick={() => {
                                      const updatedClient = {
                                         ...client,
                                         medications: [...(client.medications || []), { name: '', dose: '', doctor: '', contact: '', reason: '' }]
                                      };
                                      onUpdateClient(updatedClient);
                                   }}
                                >
                                   <Plus size={16} color="white" /> Add Medication
                                </Button>
                             )}
                          </div>

                          {(client.medications || []).length === 0 && (
                             <p className="text-stone-400 italic text-center py-8 border-2 border-dashed border-stone-200 rounded-2xl">No medications listed.</p>
                          )}

                          {(client.medications || []).map((med, idx) => (
                             <div key={idx} className="bg-stone-50 p-4 rounded-xl border border-stone-200 relative">
                                {client.status === 'active' && (
                                   <button
                                      onClick={() => {
                                         const updatedMeds = [...client.medications];
                                         updatedMeds.splice(idx, 1);
                                         onUpdateClient({...client, medications: updatedMeds});
                                      }}
                                      className="absolute top-4 right-4 text-red-400 hover:text-red-600"
                                   >
                                      <Trash2 className="w-4 h-4" />
                                   </button>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   <div>
                                      <label className="label">Medication Name</label>
                                      <input
                                         className={INPUT_CLASS}
                                         value={med.name}
                                         onChange={(e) => {
                                            const updatedMeds = [...client.medications];
                                            updatedMeds[idx].name = e.target.value;
                                            onUpdateClient({...client, medications: updatedMeds});
                                         }}
                                         disabled={client.status !== 'active'}
                                      />
                                   </div>
                                   <div>
                                      <label className="label">Dosage</label>
                                      <input
                                         className={INPUT_CLASS}
                                         value={med.dose}
                                         onChange={(e) => {
                                            const updatedMeds = [...client.medications];
                                            updatedMeds[idx].dose = e.target.value;
                                            onUpdateClient({...client, medications: updatedMeds});
                                         }}
                                         disabled={client.status !== 'active'}
                                      />
                                   </div>
                                   <div>
                                      <label className="label">Prescribing Doctor</label>
                                      <input
                                         className={INPUT_CLASS}
                                         value={med.doctor}
                                         onChange={(e) => {
                                            const updatedMeds = [...client.medications];
                                            updatedMeds[idx].doctor = e.target.value;
                                            onUpdateClient({...client, medications: updatedMeds});
                                         }}
                                         disabled={client.status !== 'active'}
                                      />
                                   </div>
                                   <div>
                                      <label className="label">Doctor Contact</label>
                                      <input
                                         className={INPUT_CLASS}
                                         value={med.contact}
                                         onChange={(e) => {
                                            const updatedMeds = [...client.medications];
                                            updatedMeds[idx].contact = e.target.value;
                                            onUpdateClient({...client, medications: updatedMeds});
                                         }}
                                         disabled={client.status !== 'active'}
                                      />
                                   </div>
                                   <div className="md:col-span-2">
                                      <label className="label">Reason for Medication</label>
                                      <input
                                         className={INPUT_CLASS}
                                         value={med.reason}
                                         onChange={(e) => {
                                            const updatedMeds = [...client.medications];
                                            updatedMeds[idx].reason = e.target.value;
                                            onUpdateClient({...client, medications: updatedMeds});
                                         }}
                                         disabled={client.status !== 'active'}
                                      />
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>
                    </Card>
                 </div>
              )}

              {tab === 'UA' && (
                 <div className="max-w-3xl mx-auto space-y-8">
                    {client.status === 'active' && (
                        <Card title="Log New Screen">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                               <div>
                                   <label className="label">Type</label>
                                   <select className={INPUT_CLASS} value={newUa.type} onChange={e => setNewUa({...newUa, type: e.target.value as any})}>
                                       <option value="Instant">Instant Cup</option>
                                       <option value="Lab">Lab Test</option>
                                       <option value="Breathalyzer">Breathalyzer</option>
                                   </select>
                               </div>
                               <div>
                                   <label className="label">Result</label>
                                   <select className={INPUT_CLASS} value={newUa.result} onChange={e => setNewUa({...newUa, result: e.target.value as any})}>
                                       <option value="Negative">Negative (Pass)</option>
                                       <option value="Positive">Positive (Fail)</option>
                                   </select>
                               </div>
                               <div className="md:col-span-2">
                                   <label className="label">Notes</label>
                                   <input className={INPUT_CLASS} placeholder="Substances detected, levels, etc." value={newUa.notes} onChange={e => setNewUa({...newUa, notes: e.target.value})} />
                               </div>
                           </div>
                           <div className="flex justify-end">
                               <Button onClick={handleAddUA} disabled={!newUa.result}>Save Record</Button>
                           </div>
                        </Card>
                    )}

                    <div className="space-y-4">
                        <h3 className="font-bold text-stone-700 flex items-center gap-2 text-lg"><FlaskConical className="w-5 h-5"/> History</h3>
                        {(client.drugTestLogs || []).length === 0 && <p className="text-stone-400 italic p-4 border border-dashed border-stone-200 rounded-xl text-center">No screens recorded.</p>}
                        {(client.drugTestLogs || []).map(log => (
                             <div key={log.id} className="bg-white p-5 rounded-2xl border border-stone-200 flex justify-between items-center shadow-sm">
                                 <div className="flex items-center gap-4">
                                     <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-inner ${log.result === 'Negative' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                         {log.result === 'Negative' ? <CheckCircle className="w-6 h-6"/> : <AlertCircle className="w-6 h-6"/>}
                                     </div>
                                     <div>
                                         <p className="font-bold text-stone-800 text-lg">{log.type} - {log.result}</p>
                                         <p className="text-sm text-stone-500">{new Date(log.date).toLocaleString()} by {log.performedBy}</p>
                                         {log.notes && <p className="text-sm text-stone-600 mt-2 bg-stone-50 p-2 rounded-lg">"{log.notes}"</p>}
                                     </div>
                                 </div>
                             </div>
                        ))}
                    </div>
                 </div>
              )}

              {tab === 'LOGS' && (
                 <div className="max-w-3xl mx-auto">
                    <h3 className="font-bold text-stone-700 mb-6 flex items-center gap-2 text-lg"><History className="w-5 h-5"/> Check-In History</h3>
                    <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 shadow-sm overflow-hidden">
                        {client.checkInLogs.length === 0 && <div className="p-8 text-center text-stone-400 italic">No check-ins found.</div>}
                        {client.checkInLogs.map(log => (
                             <div key={log.id} className="p-5 hover:bg-stone-50 transition-colors">
                                 <div className="flex justify-between items-start">
                                     <div className="flex gap-4">
                                         <div className={`mt-1 p-2 rounded-xl ${log.type === CheckInType.HOUSE ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                                             {log.type === CheckInType.HOUSE ? <Home className="w-5 h-5"/> : <MapPin className="w-5 h-5"/>}
                                         </div>
                                         <div>
                                             <p className="font-bold text-stone-800 text-lg">{log.locationName || 'Unknown Location'}</p>
                                             <p className="text-xs text-stone-400 font-medium uppercase tracking-wide">{new Date(log.timestamp).toLocaleString()}</p>
                                             <p className="text-stone-600 mt-2 leading-relaxed">{log.comment}</p>
                                         </div>
                                     </div>
                                     <div className="text-right">
                                         <a
                                            href={`https://www.google.com/maps?q=${log.location.lat},${log.location.lng}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-mono text-primary hover:text-primary/80 bg-stone-100 px-2 py-1 rounded border border-stone-200 inline-flex items-center gap-1 transition-colors hover:bg-primary/10"
                                         >
                                            <MapPin className="w-3 h-3" />
                                            {log.location.lat.toFixed(4)}, {log.location.lng.toFixed(4)}
                                         </a>
                                     </div>
                                 </div>
                             </div>
                        ))}
                    </div>
                 </div>
              )}

              {tab === 'NOTES' && (
                 <div className="max-w-3xl mx-auto space-y-6">
                    <h3 className="font-bold text-stone-700 mb-6 flex items-center gap-2 text-lg"><FileText className="w-5 h-5"/> Notes & Log</h3>

                    {/* Add New Note Form */}
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                      <h4 className="font-bold text-stone-700 mb-4">Add New Note</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-stone-700 mb-2">Category</label>
                          <select
                            className={INPUT_CLASS}
                            value={newNote.category}
                            onChange={e => setNewNote({...newNote, category: e.target.value as Note['category']})}
                          >
                            <option value="General">General</option>
                            <option value="Medical">Medical</option>
                            <option value="Behavioral">Behavioral</option>
                            <option value="Progress">Progress</option>
                            <option value="Incident">Incident</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-stone-700 mb-2">Note Content</label>
                          <textarea
                            rows={4}
                            className={INPUT_CLASS}
                            value={newNote.content}
                            onChange={e => setNewNote({...newNote, content: e.target.value})}
                            placeholder="Enter detailed notes about this resident..."
                          />
                        </div>
                        <Button onClick={handleAddNote}>
                          <Plus className="w-4 h-4" /> Add Note
                        </Button>
                      </div>
                    </div>

                    {/* Notes List */}
                    <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 shadow-sm overflow-hidden">
                      {(!client.notes || client.notes.length === 0) && (
                        <div className="p-8 text-center text-stone-400 italic">No notes found.</div>
                      )}
                      {(client.notes || []).map(note => (
                        <div key={note.id} className="p-5 hover:bg-stone-50 transition-colors">
                          <div className="flex justify-between items-start mb-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              note.category === 'Medical' ? 'bg-blue-100 text-blue-800' :
                              note.category === 'Behavioral' ? 'bg-orange-100 text-orange-800' :
                              note.category === 'Progress' ? 'bg-green-100 text-green-800' :
                              note.category === 'Incident' ? 'bg-red-100 text-red-800' :
                              'bg-stone-100 text-stone-800'
                            }`}>
                              {note.category}
                            </span>
                            <div className="text-right">
                              <p className="text-xs text-stone-400 font-medium uppercase tracking-wide">
                                {new Date(note.date).toLocaleString()}
                              </p>
                              <p className="text-xs text-stone-500 mt-1">
                                by {note.author}
                              </p>
                            </div>
                          </div>
                          <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">
                            {note.content}
                          </p>
                        </div>
                      ))}
                    </div>
                 </div>
              )}

              {tab === 'DISCHARGE' && (
                 <div className="max-w-2xl mx-auto">
                    <Card title="Process Discharge / Exit" className="border-secondary/30 shadow-secondary/5">
                        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-secondary text-sm mb-8">
                            <div className="flex gap-3">
                                <AlertCircle className="w-6 h-6 flex-shrink-0"/>
                                <p className="leading-relaxed">This action will remove the resident from their current bed assignment and mark their status as "Discharged" or "Alumni". This action keeps historical data but removes them from active counts.</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="label">Discharge Date</label>
                                <input type="date" className={INPUT_CLASS} value={dischargeForm.date} onChange={e => setDischargeForm({...dischargeForm, date: e.target.value})} />
                            </div>
                            
                            <div>
                                <label className="label">Exit Type</label>
                                <select className={INPUT_CLASS} value={dischargeForm.type} onChange={e => setDischargeForm({...dischargeForm, type: e.target.value as any})}>
                                    <option value="Successful Completion">Successful Completion (Alumni)</option>
                                    <option value="Voluntary">Voluntary Exit</option>
                                    <option value="Involuntary">Involuntary (Rule Violation)</option>
                                    <option value="Medical">Medical / Higher Level of Care</option>
                                    <option value="Transfer">Transfer to other housing</option>
                                </select>
                            </div>

                            <div>
                                <label className="label">Forwarding Address</label>
                                <input className={INPUT_CLASS} placeholder="Where are they going?" value={dischargeForm.forwardingAddress} onChange={e => setDischargeForm({...dischargeForm, forwardingAddress: e.target.value})} />
                            </div>

                            <div>
                                <label className="label">Reason / Notes</label>
                                <textarea rows={3} className={INPUT_CLASS} placeholder="Detailed reason for discharge..." value={dischargeForm.notes} onChange={e => setDischargeForm({...dischargeForm, notes: e.target.value})} />
                            </div>

                            <div className="pt-6 border-t border-stone-100 flex justify-end">
                                <Button variant="danger" onClick={handleDischargeSubmit}>
                                  <DoorOpen size={16} color="white" />
                                  Finalize Discharge
                                </Button>
                            </div>
                        </div>
                    </Card>
                 </div>
              )}
          </div>
       </div>

       {/* Transfer Bed Modal */}
       {showTransfer && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                <div className="p-6 border-b border-stone-200 flex justify-between items-center">
                   <h3 className="font-bold text-xl text-stone-800">{client.assignedBedId ? 'Transfer Bed' : 'Assign Bed'}</h3>
                   <button onClick={() => setShowTransfer(false)}>
                      <X className="w-6 h-6 text-stone-400 hover:text-stone-600"/>
                   </button>
                </div>
                <div className="p-6 space-y-6">
                   <p className="text-stone-600">
                      {client.assignedBedId ? 'Transfer' : 'Assign'} <strong>{client.firstName} {client.lastName}</strong> to a {client.assignedBedId ? 'new ' : ''}bed assignment.
                   </p>

                   {/* House Selection */}
                   <div>
                      <label className="label">Select House</label>
                      <select
                         className={INPUT_CLASS}
                         value={transferHouseId}
                         onChange={(e) => {
                            setTransferHouseId(e.target.value);
                            setTransferBedId('');
                         }}
                      >
                         {houses.map(h => (
                            <option key={h.id} value={h.id}>{h.name}</option>
                         ))}
                      </select>
                   </div>

                   {/* Bed Selection */}
                   <div>
                      <label className="label">Select Bed</label>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                         {houses.find(h => h.id === transferHouseId)?.rooms.map(room => (
                            <div key={room.id} className="border border-stone-200 rounded-lg p-3">
                               <p className="font-bold text-sm text-stone-600 mb-2">{room.name}</p>
                               <div className="grid grid-cols-4 gap-2">
                                  {room.beds.map(bed => {
                                     const isOccupied = bed.occupantId && bed.occupantId !== client.id;
                                     const isCurrent = bed.id === client.assignedBedId && transferHouseId === client.assignedHouseId;
                                     return (
                                        <button
                                           key={bed.id}
                                           onClick={() => !isOccupied && setTransferBedId(bed.id)}
                                           disabled={isOccupied}
                                           className={`p-2 rounded border text-sm font-bold transition-all ${
                                              transferBedId === bed.id
                                                 ? 'border-primary bg-primary text-white'
                                                 : isCurrent
                                                 ? 'border-amber-400 bg-amber-50 text-amber-700'
                                                 : isOccupied
                                                 ? 'border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed'
                                                 : 'border-stone-300 hover:border-primary hover:bg-primary/10'
                                           }`}
                                        >
                                           {bed.number}
                                           {isCurrent && ' (Current)'}
                                        </button>
                                     );
                                  })}
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>

                   <div className="flex gap-3 pt-4">
                      <Button variant="outline" onClick={() => setShowTransfer(false)} className="flex-1">
                         Cancel
                      </Button>
                      {client.assignedBedId && (
                        <Button
                          variant="secondary"
                          onClick={() => setShowRemoveBedConfirm(true)}
                          disabled={isRemoving || isTransferring}
                          className="flex-1"
                        >
                          {isRemoving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              Removing...
                            </>
                          ) : (
                            'Remove from Bed'
                          )}
                        </Button>
                      )}
                      <Button
                         variant="primary"
                         onClick={handleTransferBed}
                         disabled={isTransferring || isRemoving || !transferBedId || (transferBedId === client.assignedBedId && transferHouseId === client.assignedHouseId)}
                         className="flex-1"
                      >
                         {isTransferring ? (
                           <>
                             <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                             {client.assignedBedId ? 'Transferring...' : 'Assigning...'}
                           </>
                         ) : (
                           <>
                             <BedDouble className="w-4 h-4 mr-1" />
                             Confirm {client.assignedBedId ? 'Transfer' : 'Assignment'}
                           </>
                         )}
                      </Button>
                   </div>
                </div>
             </div>
          </div>
       )}

       {/* Confirmation Dialogs */}
       <ConfirmDialog
         isOpen={showDischargeConfirm}
         title="Discharge Resident"
         message="Are you sure you want to discharge this resident? This will remove them from their bed."
         confirmText="Discharge"
         cancelText="Cancel"
         onConfirm={handleDischargeConfirm}
         onCancel={() => setShowDischargeConfirm(false)}
         variant="danger"
       />

       <ConfirmDialog
         isOpen={showRemoveBedConfirm}
         title="Remove from Bed"
         message={`Remove ${client.firstName} ${client.lastName} from their current bed?`}
         confirmText="Remove"
         cancelText="Cancel"
         onConfirm={handleRemoveBed}
         onCancel={() => setShowRemoveBedConfirm(false)}
         variant="warning"
       />
    </div>
  );
};

const AdminDashboard = ({
  houses,
  clients,
  chores,
  onNavigate,
  onUpdateHouses,
  onUpdateClient,
  toast
}: {
  houses: House[],
  clients: Client[],
  chores: Chore[],
  onNavigate: (v: ViewState) => void,
  onUpdateHouses: (houses: House[]) => Promise<void>,
  onUpdateClient: (client: Client) => Promise<void>,
  toast: ReturnType<typeof useToast>
}) => {
  const [tab, setTab] = useState<AdminTab>('HOUSES');
  const [viewingClient, setViewingClient] = useState<Client | null>(null); // Updated to generic viewing client
  const [editingItem, setEditingItem] = useState<{ type: 'room' | 'bed', houseId: string, roomId: string, bedId?: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [aiReport, setAiReport] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Admission State
  const [admittingClient, setAdmittingClient] = useState<Client | null>(null);
  const [admissionHouseId, setAdmissionHouseId] = useState<string>('');
  const [selectionDetails, setSelectionDetails] = useState<{houseId: string, roomId: string, bedId: string} | null>(null);

  // Chore State
  const [showChoreForm, setShowChoreForm] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [choreForm, setChoreForm] = useState({
    title: '',
    description: '',
    assignedTo: [] as string[],
    recurring: false,
    recurrenceType: 1, // Days interval (1-7)
    reminderTime: '18:00',
    houseId: ''
  });
  const [deleteChoreId, setDeleteChoreId] = useState<string | null>(null);

  // Loading States
  const [isAdmitting, setIsAdmitting] = useState(false);
  const [isDischarging, setIsDischarging] = useState(false);
  const [isSavingChore, setIsSavingChore] = useState(false);
  const [isDeletingChore, setIsDeletingChore] = useState(false);

  // Settings State
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Search/Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'discharged'>('all');

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  // New House Context Logic
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  
  // If no house is selected, show house selection screen
  if (!selectedHouseId) {
      return (
          <div className="min-h-screen bg-cream flex items-center justify-center p-4">
              <div className="max-w-2xl w-full">
                  <h2 className="text-3xl font-bold text-primary dark:text-primary mb-2 text-center tracking-tight">Manager Dashboard</h2>
                  <p className="text-stone-500 dark:text-stone-400 text-center mb-8 text-lg">Select a property to manage or view Headquarters.</p>

                  {/* Quick Stats Widgets */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    <div className="bg-white dark:bg-stone-800 rounded-2xl p-4 border border-stone-200 dark:border-stone-700 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-primary" />
                        <p className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Active</p>
                      </div>
                      <p className="text-2xl font-bold text-primary dark:text-primary">{clients.filter(c => c.status === 'active').length}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-500 mt-1">Residents</p>
                    </div>

                    <div className="bg-white dark:bg-stone-800 rounded-2xl p-4 border border-stone-200 dark:border-stone-700 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <ClipboardCheck className="w-4 h-4 text-amber-600" />
                        <p className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Pending</p>
                      </div>
                      <p className="text-2xl font-bold text-amber-600">{clients.filter(c => c.status === 'pending').length}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-500 mt-1">Applications</p>
                    </div>

                    <div className="bg-white dark:bg-stone-800 rounded-2xl p-4 border border-stone-200 dark:border-stone-700 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Home className="w-4 h-4 text-green-600" />
                        <p className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Houses</p>
                      </div>
                      <p className="text-2xl font-bold text-green-600">{houses.length}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-500 mt-1">Properties</p>
                    </div>

                    <div className="bg-white dark:bg-stone-800 rounded-2xl p-4 border border-stone-200 dark:border-stone-700 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-blue-600" />
                        <p className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Occupancy</p>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        {houses.reduce((acc, h) => acc + h.rooms.reduce((racc, r) => racc + r.beds.length, 0), 0) > 0
                          ? Math.round((clients.filter(c => c.status === 'active' && c.assignedBedId).length / houses.reduce((acc, h) => acc + h.rooms.reduce((racc, r) => racc + r.beds.length, 0), 0)) * 100)
                          : 0}%
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-500 mt-1">Capacity</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <button 
                         onClick={() => setSelectedHouseId('ALL')}
                         className="p-8 bg-white border border-stone-200 rounded-3xl shadow-sm hover:shadow-lg hover:border-primary transition-all text-left group"
                       >
                           <div className="flex items-center gap-4 mb-3">
                               <div className="bg-stone-100 p-4 rounded-2xl group-hover:bg-primary group-hover:text-white transition-colors text-stone-600"><Building className="w-8 h-8" /></div>
                               <h3 className="font-bold text-2xl text-stone-800">Headquarters</h3>
                           </div>
                           <p className="text-stone-500 text-sm leading-relaxed">View aggregate data for all houses, occupancy reports, and full client roster.</p>
                       </button>

                       {houses.map(h => (
                           <button 
                             key={h.id}
                             onClick={() => setSelectedHouseId(h.id)}
                             className="p-8 bg-white border border-stone-200 rounded-3xl shadow-sm hover:shadow-lg hover:border-primary transition-all text-left group"
                           >
                               <div className="flex items-center gap-4 mb-3">
                                   <div className="bg-primary/10 p-4 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-colors"><Home className="w-8 h-8" /></div>
                                   <h3 className="font-bold text-2xl text-stone-800">{h.name}</h3>
                               </div>
                               <p className="text-stone-500 text-sm leading-relaxed">{h.address}</p>
                           </button>
                       ))}
                  </div>
                  <div className="mt-12 text-center">
                      <Button variant="outline" onClick={() => onNavigate('LANDING')} className="px-8">Exit to Landing</Button>
                  </div>
              </div>
          </div>
      )
  }

  const handleSaveEdit = () => {
    if (!editingItem) return;
    const updatedHouses = houses.map(h => {
      if (h.id !== editingItem.houseId) return h;
      return {
        ...h,
        rooms: h.rooms.map(r => {
          if (r.id !== editingItem.roomId) return r;
          if (editingItem.type === 'room') return { ...r, name: editValue };
          if (editingItem.type === 'bed' && editingItem.bedId) {
            return { ...r, beds: r.beds.map(b => b.id === editingItem.bedId ? { ...b, number: editValue } : b) };
          }
          return r;
        })
      };
    });
    onUpdateHouses(updatedHouses);
    setEditingItem(null);
  };

  const handleConfirmAdmission = async () => {
    if (!admittingClient || !selectionDetails) return;

    setIsAdmitting(true);
    try {
      // 1. Clear any existing bed assignment for this resident (prevent duplication)
      let housesAfterClear = houses.map(h => ({
        ...h,
        rooms: h.rooms.map(r => ({
          ...r,
          beds: r.beds.map(b =>
            b.occupantId === admittingClient.id
              ? { ...b, occupantId: null }
              : b
          )
        }))
      }));

      // 2. Now assign to new bed
      const updatedHouses = housesAfterClear.map(h => {
          if (h.id !== selectionDetails.houseId) return h;
          return {
              ...h,
              rooms: h.rooms.map(r => {
                  if (r.id !== selectionDetails.roomId) return r;
                  return {
                      ...r,
                      beds: r.beds.map(b => {
                          if (b.id !== selectionDetails.bedId) return b;
                          return { ...b, occupantId: admittingClient.id };
                      })
                  };
              })
          };
      });

      // 3. Update Client (Set Status & Assignment) - PRESERVE ALL FIELDS
      const updatedClient: Client = {
          // Explicitly preserve all client data
          id: admittingClient.id,
          firstName: admittingClient.firstName,
          lastName: admittingClient.lastName,
          email: admittingClient.email,
          phone: admittingClient.phone,
          password: admittingClient.password,
          dateOfBirth: admittingClient.dateOfBirth,
          emergencyContact: admittingClient.emergencyContact,
          emergencyPhone: admittingClient.emergencyPhone,
          submissionDate: admittingClient.submissionDate,
          targetHouseId: admittingClient.targetHouseId,
          drugTestLogs: admittingClient.drugTestLogs || [],
          notes: admittingClient.notes || [],
          checkInLogs: admittingClient.checkInLogs || [],
          // Update these fields
          status: 'active' as const,
          assignedHouseId: selectionDetails.houseId,
          assignedBedId: selectionDetails.bedId,
          dischargeRecord: undefined
      };

      console.log('Admitting resident:', {
          name: `${admittingClient.firstName} ${admittingClient.lastName}`,
          to: { house: selectionDetails.houseId, bed: selectionDetails.bedId },
          preservedFields: Object.keys(updatedClient)
      });

      // 4. Save to Firebase (await both operations)
      try {
        await onUpdateHouses(updatedHouses);
      } catch (houseError) {
        console.error('Error updating houses:', houseError);
        throw new Error('Failed to update house assignments');
      }

      try {
        await onUpdateClient(updatedClient);
      } catch (clientError) {
        console.error('Error updating client:', clientError);
        throw new Error('Failed to update resident status');
      }

      // 5. Wait a moment for Firebase to propagate changes
      await new Promise(resolve => setTimeout(resolve, 500));

      // 6. Show success message
      toast.success(`${admittingClient.firstName} ${admittingClient.lastName} has been successfully admitted and assigned to the bed!`);

      // 7. Close modal only after successful save and wait
      setAdmittingClient(null);
      setSelectionDetails(null);
    } catch (error) {
      console.error('Error admitting resident:', error);
      toast.error(error instanceof Error ? error.message : 'Error admitting resident. Please try again.');
    } finally {
      setIsAdmitting(false);
    }
  };

  const handleUpdateClient = (updatedClient: Client) => {
    onUpdateClient(updatedClient);
    setViewingClient(updatedClient); // Keep modal updated
  };

  const handleDischargeClient = async (client: Client, record: DischargeRecord) => {
    setIsDischarging(true);
    try {
      // 1. Remove resident from ALL beds across ALL houses (fixes duplication bug)
      const updatedHouses = houses.map(h => ({
        ...h,
        rooms: h.rooms.map(r => ({
          ...r,
          beds: r.beds.map(b =>
            b.occupantId === client.id
              ? { ...b, occupantId: null }
              : b
          )
        }))
      }));

      // 2. Update all affected houses in Firestore
      const affectedHouses = updatedHouses.filter((h, idx) => {
        // Check if this house has any different beds than the original
        const originalHouse = houses[idx];
        return JSON.stringify(h) !== JSON.stringify(originalHouse);
      });

      await Promise.all(affectedHouses.map(house => setHouse(house)));

      // 3. Now Update Client - discharge status and clear bed assignment
      const updatedClient: Client = {
        ...client,
        status: record.type === 'Successful Completion' ? 'alumni' : 'discharged',
        assignedBedId: null,
        assignedHouseId: null,
        dischargeRecord: record
      };

      await updateClient(client.id, updatedClient);
      toast.success(`${client.firstName} ${client.lastName} has been discharged successfully.`);
      setViewingClient(null); // Close modal
    } catch (error) {
      console.error('Error discharging client:', error);
      toast.error('Error discharging resident. Please try again.');
    } finally {
      setIsDischarging(false);
    }
  };

  const handleDeleteChore = async () => {
    if (!deleteChoreId) return;

    setIsDeletingChore(true);
    try {
      await deleteChore(deleteChoreId);
      toast.success('Chore deleted successfully');
      setDeleteChoreId(null);
    } catch (error) {
      console.error('Error deleting chore:', error);
      toast.error('Error deleting chore. Please try again.');
      setDeleteChoreId(null);
    } finally {
      setIsDeletingChore(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    const targetHouses = selectedHouseId === 'ALL' ? houses : houses.filter(h => h.id === selectedHouseId);
    const targetClients = selectedHouseId === 'ALL' ? clients : clients.filter(c => c.assignedHouseId === selectedHouseId);
    
    const report = await generateDailyReport(targetHouses, targetClients);
    setAiReport(report);
    setIsGeneratingReport(false);
  };

  // Strict Filtering based on context
  const filteredHouses = selectedHouseId === 'ALL' ? houses : houses.filter(h => h.id === selectedHouseId);
  
  const filteredClients = clients.filter(c => {
    // House filtering
    const matchesHouse = selectedHouseId === 'ALL'
      ? true
      : c.assignedHouseId === selectedHouseId || (!c.assignedHouseId && c.targetHouseId === selectedHouseId);

    // Search filtering
    const matchesSearch = searchTerm === ''
      ? true
      : `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filtering
    const matchesStatus = statusFilter === 'all'
      ? true
      : (statusFilter === 'discharged'
          ? (c.status === 'discharged' || c.status === 'alumni')
          : c.status === statusFilter);

    return matchesHouse && matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-cream dark:bg-stone-950 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="w-72 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-700 hidden md:flex flex-col shadow-sm z-20 sticky top-0 h-screen">
        <div className="p-8 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl font-bold text-primary dark:text-primary tracking-tight">Manager</h2>
            <Button size="sm" variant="outline" onClick={() => setSelectedHouseId(null)} className="px-3 py-1 h-auto text-xs rounded-lg">Switch</Button>
          </div>
          <div className="px-4 py-3 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
              <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Current Context</p>
              <p className="font-bold text-stone-800 dark:text-stone-100 truncate text-lg">{selectedHouseId === 'ALL' ? 'Headquarters' : houses.find(h => h.id === selectedHouseId)?.name}</p>
          </div>
        </div>
        <nav className="flex-1 px-6 space-y-3 pt-8">
          <button onClick={() => setTab('HOUSES')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${tab === 'HOUSES' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'}`}>
            <Home className="w-5 h-5" /> House Register
          </button>
          <button onClick={() => setTab('CLIENTS')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${tab === 'CLIENTS' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'}`}>
            <Users className="w-5 h-5" /> Residents
          </button>
          <button onClick={() => setTab('CHORES')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${tab === 'CHORES' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'}`}>
            <ClipboardCheck className="w-5 h-5" /> Chores
          </button>
          <button onClick={() => setTab('AI_REPORT')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${tab === 'AI_REPORT' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'}`}>
            <BrainCircuit className="w-5 h-5" /> AI Shift Report
          </button>
          <button onClick={() => setTab('SETTINGS')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${tab === 'SETTINGS' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'}`}>
            <Key className="w-5 h-5" /> Settings
          </button>

          {/* Desktop-Only Advanced Tools Section */}
          <div className="pt-6 mt-6 border-t border-stone-200">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 px-2">Advanced Tools</p>
            <button onClick={() => setTab('BULK_OPERATIONS')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${tab === 'BULK_OPERATIONS' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'}`}>
              <ListChecks className="w-5 h-5" /> Bulk Operations
            </button>
            <button onClick={() => setTab('ANALYTICS')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all mt-2 ${tab === 'ANALYTICS' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'}`}>
              <BarChart3 className="w-5 h-5" /> Analytics & Reports
            </button>
            <button onClick={() => setTab('EXPORT')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all mt-2 ${tab === 'EXPORT' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'}`}>
              <PackageOpen className="w-5 h-5" /> Export Data
            </button>
            <button onClick={() => setTab('ACTIVITY_LOG')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all mt-2 ${tab === 'ACTIVITY_LOG' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100'}`}>
              <ScrollText className="w-5 h-5" /> Activity Log
            </button>
          </div>
        </nav>
        <div className="p-6 border-t border-stone-100">
          <Button variant="outline" onClick={() => onNavigate('LANDING')} className="w-full justify-start text-stone-500 border-stone-200 hover:bg-red-50 hover:text-red-500 hover:border-red-100">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main Content & Mobile Layout */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-cream dark:bg-stone-950 relative">

        {/* Mobile Header */}
        <div className="md:hidden bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 p-4 flex justify-between items-center shadow-sm z-20 shrink-0">
            <div>
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Manager View</span>
                <h2 className="font-bold text-xl text-primary truncate max-w-[200px]">
                    {selectedHouseId === 'ALL' ? 'Headquarters' : houses.find(h => h.id === selectedHouseId)?.name}
                </h2>
            </div>
            <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedHouseId(null)}>Switch</Button>
                <Button size="sm" variant="danger" onClick={() => onNavigate('LANDING')} className="px-2"><LogOut className="w-4 h-4"/></Button>
            </div>
        </div>

        {/* Modal for Admission */}
        {admittingClient && (
            <div className="fixed inset-0 z-50 bg-[#3c4a3e]/60 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                    <div className="px-8 py-6 border-b border-stone-100 bg-stone-50 flex justify-between items-center">
                        <h3 className="font-bold text-xl text-stone-800">Admit Resident</h3>
                        <button onClick={() => setAdmittingClient(null)}><X className="w-6 h-6 text-stone-400 hover:text-stone-600"/></button>
                    </div>
                    <div className="p-8">
                        <p className="mb-6 text-stone-600 leading-relaxed">
                            Assign a bed for <strong className="text-stone-900">{admittingClient.firstName} {admittingClient.lastName}</strong>.
                            <br/>
                            <span className="text-sm text-stone-400 font-medium">Target Preference: {houses.find(h => h.id === admittingClient.targetHouseId)?.name || 'None'}</span>
                        </p>

                        <div className="mb-6">
                            <label className="label">Select House</label>
                            <select 
                                className={INPUT_CLASS}
                                value={admissionHouseId} 
                                onChange={(e) => {
                                    setAdmissionHouseId(e.target.value);
                                    setSelectionDetails(null); // Reset bed selection
                                }}
                            >
                                {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-3 max-h-60 overflow-y-auto border border-stone-200 rounded-2xl p-4 bg-stone-50">
                            {houses.find(h => h.id === admissionHouseId)?.rooms.map(room => {
                                const emptyBeds = room.beds.filter(b => !b.occupantId);
                                if (emptyBeds.length === 0) return null;
                                return (
                                    <div key={room.id} className="mb-4">
                                        <div className="text-xs font-bold text-stone-400 uppercase mb-2 px-2 tracking-wider">{room.name}</div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {emptyBeds.map(bed => (
                                                <button
                                                    key={bed.id}
                                                    onClick={() => setSelectionDetails({ houseId: admissionHouseId, roomId: room.id, bedId: bed.id })}
                                                    className={`p-3 rounded-xl border text-sm font-bold transition-all ${selectionDetails?.bedId === bed.id ? 'bg-primary text-white border-primary shadow-md' : 'bg-white border-stone-200 hover:border-primary/50 text-stone-600'}`}
                                                >
                                                    Bed {bed.number}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                            {/* Check if house is full */}
                            {houses.find(h => h.id === admissionHouseId)?.rooms.every(r => r.beds.every(b => b.occupantId)) && (
                                <p className="text-center text-stone-400 py-4 italic">No beds available in this house.</p>
                            )}
                        </div>

                        <div className="mt-8 flex justify-end gap-4">
                            <Button variant="outline" onClick={() => setAdmittingClient(null)} disabled={isAdmitting}>Cancel</Button>
                            <Button onClick={handleConfirmAdmission} disabled={isAdmitting || !selectionDetails}>
                              {isAdmitting ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Admitting...
                                </>
                              ) : (
                                'Confirm Admission'
                              )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Modal for Viewing Client Details (The new comprehensive screen) */}
        {viewingClient && (
             <ClientDetailView
                client={viewingClient}
                houses={houses}
                onClose={() => setViewingClient(null)}
                onUpdateClient={handleUpdateClient}
                onUpdateHouses={onUpdateHouses}
                onDischarge={handleDischargeClient}
                toast={toast}
             />
        )}

        <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-10 md:pb-10 scroll-smooth">

        {tab === 'HOUSES' && (
          <div className="space-y-8">
             <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-stone-800 tracking-tight">House Registers</h2>
            </div>
            {filteredHouses.map(house => (
              <Card key={house.id} className="mb-8">
                <div className="flex flex-col lg:flex-row gap-8">
                  <img src={house.image} alt={house.name} className="w-full lg:w-64 h-48 object-cover rounded-2xl shadow-sm" />
                  <div className="flex-1">
                    <div className="mb-6">
                        <h3 className="text-2xl font-bold text-stone-800 mb-1">{house.name}</h3>
                        <p className="text-stone-500 text-sm flex items-center gap-2"><MapPin className="w-4 h-4"/> {house.address}</p>
                    </div>
                    
                    <div className="grid gap-4">
                      {house.rooms.map(room => (
                        <div key={room.id} className="border border-stone-200 rounded-2xl p-5 bg-stone-50/50">
                          <div className="flex items-center justify-between mb-4">
                             <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm text-primary"><BedDouble className="w-4 h-4" /></div> 
                                {editingItem?.type === 'room' && editingItem.roomId === room.id ? (
                                    <div className="flex items-center gap-2">
                                        <input 
                                            autoFocus 
                                            className="border rounded px-2 py-1 text-sm" 
                                            value={editValue} 
                                            onChange={e => setEditValue(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleSaveEdit()} 
                                        />
                                        <button onClick={handleSaveEdit} className="text-green-600 hover:bg-green-50 p-1 rounded"><Save className="w-4 h-4"/></button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { setEditingItem({ type: 'room', houseId: house.id, roomId: room.id }); setEditValue(room.name); }}>
                                        <h4 className="font-bold text-stone-700">{room.name}</h4>
                                        <Pencil className="w-3 h-3 text-stone-300 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"/>
                                    </div>
                                )}
                             </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {room.beds.map(bed => {
                              const occupant = clients.find(c => c.id === bed.occupantId);
                              return (
                                <div key={bed.id} className={`p-4 rounded-xl border text-sm transition-all ${occupant ? 'bg-white border-primary/30 shadow-sm' : 'bg-stone-50 border-stone-200 border-dashed'}`}>
                                  <div className="flex justify-between items-start mb-2">
                                     {editingItem?.type === 'bed' && editingItem.bedId === bed.id ? (
                                         <div className="flex items-center gap-1">
                                             <input 
                                                autoFocus 
                                                className="w-16 border rounded px-1 py-0.5 text-xs" 
                                                value={editValue} 
                                                onChange={e => setEditValue(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                                             />
                                             <button onClick={handleSaveEdit} className="text-green-600"><Save className="w-3 h-3"/></button>
                                         </div>
                                     ) : (
                                         <div className="flex items-center gap-2 group cursor-pointer" onClick={(e) => { e.stopPropagation(); setEditingItem({ type: 'bed', houseId: house.id, roomId: room.id, bedId: bed.id }); setEditValue(bed.number); }}>
                                             <span className="text-sm font-bold text-stone-500 bg-stone-100 px-2.5 py-1 rounded">{bed.number}</span>
                                             <Pencil className="w-3 h-3 text-stone-300 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"/>
                                         </div>
                                     )}
                                  </div>
                                  {occupant ? (
                                    <div className="mt-2 font-bold text-primary text-lg truncate cursor-pointer hover:underline flex items-center gap-2" onClick={() => setViewingClient(occupant)}>
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0"></div>
                                        {occupant.firstName} {occupant.lastName}
                                    </div>
                                  ) : (
                                    <div className="mt-2 text-sm text-stone-400 italic">Vacant</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === 'CLIENTS' && (
          <div className="space-y-8">
             <div className="flex justify-between items-center">
                 <h2 className="text-3xl font-bold text-stone-800 tracking-tight">Resident Directory</h2>
                 {selectedHouseId !== 'ALL' && <span className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-bold">{houses.find(h => h.id === selectedHouseId)?.name}</span>}
             </div>

             {/* Search and Filter Bar */}
             <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
               <div className="flex flex-col sm:flex-row gap-3">
                 <div className="flex-1 relative">
                   <Search className="w-5 h-5 text-stone-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                   <input
                     type="text"
                     placeholder="Search by name, email, or phone..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                   />
                   {searchTerm && (
                     <button
                       onClick={() => setSearchTerm('')}
                       className="absolute right-3 top-1/2 transform -translate-y-1/2 text-stone-400 hover:text-stone-600"
                     >
                       <X className="w-4 h-4" />
                     </button>
                   )}
                 </div>
                 <div className="flex gap-2">
                   <select
                     value={statusFilter}
                     onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                     className="px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium text-stone-700 bg-white"
                   >
                     <option value="all">All Statuses</option>
                     <option value="pending">Pending</option>
                     <option value="active">Active</option>
                     <option value="discharged">Discharged</option>
                   </select>
                   {(searchTerm || statusFilter !== 'all') && (
                     <button
                       onClick={() => {
                         setSearchTerm('');
                         setStatusFilter('all');
                       }}
                       className="px-4 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-800 hover:bg-stone-50 rounded-lg transition-colors"
                     >
                       Clear
                     </button>
                   )}
                 </div>
               </div>
               {(searchTerm || statusFilter !== 'all') && (
                 <div className="mt-3 pt-3 border-t border-stone-100">
                   <p className="text-sm text-stone-600">
                     Found <span className="font-bold text-primary">{filteredClients.length}</span> resident{filteredClients.length !== 1 ? 's' : ''}
                     {searchTerm && <span> matching "<span className="font-medium">{searchTerm}</span>"</span>}
                     {statusFilter !== 'all' && <span> with status <span className="font-medium">{statusFilter}</span></span>}
                   </p>
                 </div>
               )}
             </div>

             {/* SEPARATED BY HOUSE CONTEXT */}
             <div className="space-y-10">
                {/* Pending Applications Section */}
                <div>
                   <h3 className="text-lg font-bold text-stone-500 border-b border-stone-200 pb-3 mb-6 flex items-center"><ClipboardCheck className="w-5 h-5 mr-2"/> Pending Applications</h3>
                   <div className="grid gap-4">
                      {filteredClients.filter(c => c.status === 'pending').length === 0 && <p className="text-stone-400 text-sm italic p-4 bg-stone-50 rounded-xl border border-dashed border-stone-200">No pending applications found for this context.</p>}
                      {filteredClients.filter(c => c.status === 'pending').map(client => (
                         <Card key={client.id} className="border-l-[6px] border-l-amber-400">
                             <div className="flex justify-between items-center">
                                 <div>
                                    <h4 className="font-bold text-xl text-stone-800 flex items-center gap-2">
                                      {client.firstName} {client.lastName}
                                      <span className="text-xs px-3 py-1 rounded-full font-bold bg-amber-100 text-amber-800">PENDING APPROVAL</span>
                                    </h4>
                                    <p className="text-sm text-stone-500 mt-1">Applied: {client.submissionDate}</p>
                                    <p className="text-sm text-stone-500">Target: <span className="font-medium text-stone-700">{houses.find(h => h.id === client.targetHouseId)?.name || 'Unknown'}</span></p>
                                 </div>
                                 <div className="flex flex-wrap gap-2 sm:gap-3">
                                    <Button size="sm" variant="primary" onClick={() => {
                                      const updatedClient = { ...client, status: 'active' as const };
                                      onUpdateClient(updatedClient);
                                    }}>
                                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setViewingClient(client)}>Review</Button>
                                 </div>
                             </div>
                         </Card>
                      ))}
                   </div>
                </div>

                {/* Unassigned (Approved but not admitted) Section */}
                <div>
                   <h3 className="text-lg font-bold text-stone-500 border-b border-stone-200 pb-3 mb-6 flex items-center"><Users className="w-5 h-5 mr-2"/> Approved - Awaiting Admission</h3>
                   <div className="grid gap-4">
                      {filteredClients.filter(c => !c.assignedHouseId && c.status === 'active').length === 0 && <p className="text-stone-400 text-sm italic p-4 bg-stone-50 rounded-xl border border-dashed border-stone-200">No approved residents awaiting admission.</p>}
                      {filteredClients.filter(c => !c.assignedHouseId && c.status === 'active').map(client => (
                         <Card key={client.id} className="border-l-[6px] border-l-green-400">
                             <div className="flex justify-between items-center">
                                 <div>
                                    <h4 className="font-bold text-xl text-stone-800 flex items-center gap-2">
                                      {client.firstName} {client.lastName}
                                      <span className="text-xs px-3 py-1 rounded-full font-bold bg-green-100 text-green-800">APPROVED</span>
                                    </h4>
                                    <p className="text-sm text-stone-500 mt-1">Applied: {client.submissionDate}</p>
                                    <p className="text-sm text-stone-500">Target: <span className="font-medium text-stone-700">{houses.find(h => h.id === client.targetHouseId)?.name || 'Unknown'}</span></p>
                                 </div>
                                 <div className="flex flex-wrap gap-2 sm:gap-3">
                                    <Button size="sm" variant="secondary" onClick={() => { setAdmittingClient(client); setAdmissionHouseId(client.targetHouseId || houses[0].id); }}>
                                      <UserPlus size={16} strokeWidth={2.5} absoluteStrokeWidth className="mr-1" />
                                      Admit to House
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setViewingClient(client)}>Review</Button>
                                 </div>
                             </div>
                         </Card>
                      ))}
                   </div>
                </div>

                {/* Active Residents - If ALL is selected, group by House explicitly */}
                {selectedHouseId === 'ALL' ? (
                    houses.map(house => {
                        const houseClients = clients.filter(c => c.assignedHouseId === house.id && c.status === 'active');
                        if (houseClients.length === 0) return null;
                        return (
                            <div key={house.id}>
                                <h3 className="text-lg font-bold text-stone-500 border-b border-stone-200 pb-3 mb-6 flex items-center mt-8"><Home className="w-5 h-5 mr-2"/> {house.name} Residents</h3>
                                <div className="grid gap-4">
                                    {houseClients.map(client => (
                                        <ClientCard key={client.id} client={client} onClick={setViewingClient} />
                                    ))}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    /* Single House View */
                    <div>
                        <h3 className="text-lg font-bold text-stone-500 border-b border-stone-200 pb-3 mb-6 flex items-center mt-8"><Home className="w-5 h-5 mr-2"/> Active Residents</h3>
                        <div className="grid gap-4">
                             {filteredClients.filter(c => c.assignedHouseId && c.status === 'active').length === 0 && <p className="text-stone-400 text-sm italic">No active residents assigned.</p>}
                             {filteredClients.filter(c => c.assignedHouseId && c.status === 'active').map(client => (
                                 <ClientCard key={client.id} client={client} onClick={setViewingClient} />
                             ))}
                        </div>
                    </div>
                )}

                {/* Former Residents Section */}
                <div className="mt-12">
                   <h3 className="text-lg font-bold text-stone-500 border-b border-stone-200 pb-3 mb-6 flex items-center">
                      <History className="w-5 h-5 mr-2"/> Former Residents
                   </h3>
                   <div className="grid gap-4">
                      {filteredClients.filter(c => c.status === 'discharged' || c.status === 'alumni').length === 0 ? (
                         <p className="text-stone-400 text-sm italic p-4 bg-stone-50 rounded-xl border border-dashed border-stone-200">No former residents.</p>
                      ) : (
                         filteredClients.filter(c => c.status === 'discharged' || c.status === 'alumni').map(client => (
                            <Card key={client.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setViewingClient(client)}>
                               <div className="flex justify-between items-center">
                                  <div>
                                     <h4 className="font-bold text-lg text-stone-800">
                                        {client.firstName} {client.lastName}
                                        <span className={`ml-3 text-xs px-3 py-1 rounded-full font-bold ${client.status === 'alumni' ? 'bg-green-100 text-green-800' : 'bg-stone-200 text-stone-600'}`}>
                                           {client.status === 'alumni' ? 'ALUMNI' : 'DISCHARGED'}
                                        </span>
                                     </h4>
                                     <p className="text-sm text-stone-500 mt-1">
                                        Discharge Date: {client.dischargeRecord?.date ? new Date(client.dischargeRecord.date).toLocaleDateString() : 'Unknown'}
                                     </p>
                                     <p className="text-sm text-stone-500">
                                        Type: {client.dischargeRecord?.type || 'Unknown'}
                                     </p>
                                     {client.dischargeRecord?.forwardingAddress && (
                                        <p className="text-sm text-stone-500">
                                           Forwarding: {client.dischargeRecord.forwardingAddress}
                                        </p>
                                     )}
                                  </div>
                                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setViewingClient(client); }}>
                                     View Details
                                  </Button>
                               </div>
                            </Card>
                         ))
                      )}
                   </div>
                </div>
             </div>
          </div>
        )}

        {tab === 'CHORES' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <h2 className="text-3xl font-bold text-stone-800 tracking-tight">Chore Management</h2>
              <Button onClick={() => {
                setShowChoreForm(true);
                setEditingChore(null);
                setChoreForm({
                  title: '',
                  description: '',
                  assignedTo: [],
                  recurring: false,
                  recurrenceType: 1,
                  reminderTime: '18:00',
                  houseId: selectedHouseId === 'ALL' ? '' : selectedHouseId
                });
              }}>
                <Plus size={16} color="white" /> Create Chore
              </Button>
            </div>

            {/* Chore List */}
            <div className="grid gap-4">
              {chores.length === 0 ? (
                <Card>
                  <div className="text-center py-12">
                    <ClipboardCheck className="w-16 h-16 text-stone-300 mx-auto mb-4" />
                    <h3 className="font-bold text-lg text-stone-700 mb-2">No Chores Yet</h3>
                    <p className="text-stone-500 mb-6">Create your first chore to get started</p>
                    <Button onClick={() => setShowChoreForm(true)}>
                      <Plus className="w-4 h-4 mr-2" /> Create First Chore
                    </Button>
                  </div>
                </Card>
              ) : (
                chores
                  .filter(chore => selectedHouseId === 'ALL' || !chore.houseId || chore.houseId === selectedHouseId)
                  .map(chore => {
                    const assignedResidents = clients.filter(c => chore.assignedTo.includes(c.id));
                    const isOverdue = chore.status === 'overdue';
                    const isCompleted = chore.status === 'completed';

                    return (
                      <Card key={chore.id}>
                        <div className="p-6">
                          <div className="flex justify-between items-start gap-4 mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-bold text-xl text-stone-800">{chore.title}</h3>
                                {isCompleted && (
                                  <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                                    Completed
                                  </span>
                                )}
                                {isOverdue && (
                                  <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">
                                    Overdue
                                  </span>
                                )}
                                {chore.recurring && (
                                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                                    Recurring (every {chore.recurrenceType || 1} day{(chore.recurrenceType || 1) !== 1 ? 's' : ''})
                                  </span>
                                )}
                              </div>
                              <p className="text-stone-600 mb-3">{chore.description}</p>

                              <div className="flex flex-wrap gap-4 text-sm">
                                <div className="flex items-center gap-2 text-stone-500">
                                  <Users className="w-4 h-4" />
                                  <span className="font-medium">Assigned:</span>
                                  {assignedResidents.length > 0 ? (
                                    <span>{assignedResidents.map(r => `${r.firstName} ${r.lastName}`).join(', ')}</span>
                                  ) : (
                                    <span className="italic">Unassigned</span>
                                  )}
                                </div>
                                {chore.reminderTime && (
                                  <div className="flex items-center gap-2 text-stone-500">
                                    <Calendar className="w-4 h-4" />
                                    <span>Reminder: {chore.reminderTime}</span>
                                  </div>
                                )}
                                {chore.houseId && (
                                  <div className="flex items-center gap-2 text-stone-500">
                                    <Home className="w-4 h-4" />
                                    <span>{houses.find(h => h.id === chore.houseId)?.name || 'Unknown House'}</span>
                                  </div>
                                )}
                              </div>

                              {chore.completions && chore.completions.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-stone-200">
                                  <p className="text-xs font-bold text-stone-500 uppercase mb-2">Recent Completions</p>
                                  <div className="space-y-2">
                                    {chore.completions.slice(-3).reverse().map(completion => {
                                      const completedBy = clients.find(c => c.id === completion.completedBy);
                                      return (
                                        <div key={completion.id} className="text-sm text-stone-600 flex items-center gap-2">
                                          <CheckCircle className="w-4 h-4 text-green-500" />
                                          <span>{completedBy ? `${completedBy.firstName} ${completedBy.lastName}` : 'Unknown'}</span>
                                          <span className="text-stone-400">•</span>
                                          <span className="text-stone-400">{new Date(completion.completedAt).toLocaleDateString()}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingChore(chore);
                                  setChoreForm({
                                    title: chore.title,
                                    description: chore.description,
                                    assignedTo: chore.assignedTo,
                                    recurring: chore.recurring,
                                    recurrenceType: chore.recurrenceType || 1,
                                    reminderTime: chore.reminderTime || '18:00',
                                    houseId: chore.houseId || ''
                                  });
                                  setShowChoreForm(true);
                                }}
                                className="p-2 text-stone-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteChoreId(chore.id)}
                                className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })
              )}
            </div>
          </div>
        )}

        {/* Chore Creation/Edit Modal */}
        {showChoreForm && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-stone-200 flex justify-between items-center sticky top-0 bg-white">
                <h3 className="font-bold text-xl text-stone-800">
                  {editingChore ? 'Edit Chore' : 'Create New Chore'}
                </h3>
                <button onClick={() => setShowChoreForm(false)} className="text-stone-400 hover:text-stone-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Chore Title *</label>
                  <input
                    type="text"
                    className={INPUT_CLASS}
                    value={choreForm.title}
                    onChange={e => setChoreForm({...choreForm, title: e.target.value})}
                    placeholder="e.g., Clean Kitchen, Mow Lawn"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Description *</label>
                  <textarea
                    rows={3}
                    className={INPUT_CLASS}
                    value={choreForm.description}
                    onChange={e => setChoreForm({...choreForm, description: e.target.value})}
                    placeholder="Provide detailed instructions for this chore..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Assign to Residents</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-stone-200 rounded-xl p-4">
                    {clients.filter(c => c.status === 'active').length === 0 ? (
                      <p className="text-stone-400 italic text-sm">No active residents to assign</p>
                    ) : (
                      clients
                        .filter(c => c.status === 'active')
                        .filter(c => selectedHouseId === 'ALL' || c.assignedHouseId === selectedHouseId)
                        .map(client => (
                          <label key={client.id} className="flex items-center gap-3 p-2 hover:bg-stone-50 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              checked={choreForm.assignedTo.includes(client.id)}
                              onChange={e => {
                                if (e.target.checked) {
                                  setChoreForm({...choreForm, assignedTo: [...choreForm.assignedTo, client.id]});
                                } else {
                                  setChoreForm({...choreForm, assignedTo: choreForm.assignedTo.filter(id => id !== client.id)});
                                }
                              }}
                              className="w-4 h-4 text-primary"
                            />
                            <span className="text-sm font-medium text-stone-700">
                              {client.firstName} {client.lastName}
                            </span>
                            <span className="text-xs text-stone-400">
                              ({houses.find(h => h.id === client.assignedHouseId)?.name})
                            </span>
                          </label>
                        ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={choreForm.recurring}
                      onChange={e => setChoreForm({...choreForm, recurring: e.target.checked})}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm font-bold text-stone-700">Recurring Chore</span>
                  </label>
                  <p className="text-xs text-stone-500 mt-1 ml-7">Chore will repeat until reassigned</p>
                </div>

                {choreForm.recurring && (
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">Repeat Interval</label>
                    <select
                      className={INPUT_CLASS}
                      value={choreForm.recurrenceType}
                      onChange={e => setChoreForm({...choreForm, recurrenceType: parseInt(e.target.value)})}
                    >
                      <option value="1">Every Day</option>
                      <option value="2">Every 2 Days</option>
                      <option value="3">Every 3 Days</option>
                      <option value="4">Every 4 Days</option>
                      <option value="5">Every 5 Days</option>
                      <option value="6">Every 6 Days</option>
                      <option value="7">Every 7 Days (Weekly)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Reminder Time</label>
                  <input
                    type="time"
                    className={INPUT_CLASS}
                    value={choreForm.reminderTime}
                    onChange={e => setChoreForm({...choreForm, reminderTime: e.target.value})}
                  />
                  <p className="text-xs text-stone-500 mt-1">Residents will be notified at this time</p>
                </div>

                {selectedHouseId === 'ALL' && (
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">Specific House (Optional)</label>
                    <select
                      className={INPUT_CLASS}
                      value={choreForm.houseId}
                      onChange={e => setChoreForm({...choreForm, houseId: e.target.value})}
                    >
                      <option value="">All Houses</option>
                      {houses.map(house => (
                        <option key={house.id} value={house.id}>{house.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-stone-200 flex justify-end gap-3 sticky bottom-0 bg-white">
                <Button variant="outline" onClick={() => setShowChoreForm(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!choreForm.title || !choreForm.description) {
                      toast.warning('Please fill in all required fields');
                      return;
                    }

                    setIsSavingChore(true);
                    try {
                      const choreData: Chore = {
                        id: editingChore?.id || `chore_${Date.now()}`,
                        title: choreForm.title,
                        description: choreForm.description,
                        assignedTo: choreForm.assignedTo,
                        createdBy: 'Admin',
                        createdAt: editingChore?.createdAt || new Date().toISOString(),
                        recurring: choreForm.recurring,
                        reminderTime: choreForm.reminderTime,
                        completions: editingChore?.completions || [],
                        status: 'pending',
                        ...(choreForm.recurring && choreForm.recurrenceType && { recurrenceType: choreForm.recurrenceType }),
                        ...(choreForm.houseId && { houseId: choreForm.houseId })
                      };

                      if (editingChore) {
                        await updateChore(editingChore.id, choreData);
                      } else {
                        await createChore(choreData);
                      }

                      toast.success(`Chore ${editingChore ? 'updated' : 'created'} successfully`);
                      setShowChoreForm(false);
                      setEditingChore(null);
                    } catch (error) {
                      console.error('Error saving chore:', error);
                      toast.error('Error saving chore. Please try again.');
                    } finally {
                      setIsSavingChore(false);
                    }
                  }}
                  disabled={isSavingChore}
                >
                  {isSavingChore ? (
                    <>
                      <Loader2 size={16} color="white" className="animate-spin" />
                      {editingChore ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Save size={16} color="white" />
                      {editingChore ? 'Update Chore' : 'Create Chore'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {tab === 'AI_REPORT' && (
          <div className="space-y-8 h-full flex flex-col">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-stone-800 tracking-tight">AI Shift Report</h2>
                <Button onClick={handleGenerateReport} isLoading={isGeneratingReport}>
                   <BrainCircuit className="w-4 h-4 mr-2" /> Generate Report ({selectedHouseId === 'ALL' ? 'All' : houses.find(h => h.id === selectedHouseId)?.name})
                </Button>
            </div>
            <Card className="flex-1 min-h-[400px]">
                {aiReport ? (
                    <div className="prose prose-stone prose-lg max-w-none whitespace-pre-line text-stone-700 leading-loose">
                        {String(aiReport)}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-stone-400">
                        <div className="bg-stone-50 p-8 rounded-full mb-4">
                           <ClipboardCheck className="w-16 h-16 opacity-50" />
                        </div>
                        <p className="text-lg">Click "Generate Report" to analyze daily logs and occupancy.</p>
                    </div>
                )}
            </Card>
          </div>
        )}

        {tab === 'SETTINGS' && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-stone-800 tracking-tight">Settings</h2>

            {/* Change Admin Password */}
            <Card title="Change Admin Password" className="max-w-2xl">
              <div className="space-y-4">
                <p className="text-sm text-stone-600">
                  Update the admin password used to access the dashboard. The new password will take effect immediately.
                </p>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">New Password</label>
                  <input
                    type="password"
                    className={INPUT_CLASS}
                    value={newAdminPassword}
                    onChange={e => setNewAdminPassword(e.target.value)}
                    placeholder="Enter new password (minimum 6 characters)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    className={INPUT_CLASS}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                  />
                </div>
                <Button onClick={async () => {
                  if (newAdminPassword.length < 6) {
                    toast.warning('Password must be at least 6 characters');
                    return;
                  }
                  if (newAdminPassword !== confirmPassword) {
                    toast.warning('Passwords do not match');
                    return;
                  }
                  try {
                    // Store new password in Firebase (syncs across all devices)
                    await updateSettings({ adminPassword: newAdminPassword });
                    toast.success('Admin password updated successfully! This will now sync across all devices.');
                    setNewAdminPassword('');
                    setConfirmPassword('');
                  } catch (error) {
                    console.error('Error updating password:', error);
                    toast.error('Error updating password. Please try again.');
                  }
                }}>
                  <Key className="w-4 h-4 mr-2" /> Update Password
                </Button>
              </div>
            </Card>

            {/* Dark Mode Toggle */}
            <Card title="Appearance" className="max-w-2xl">
              <div className="space-y-4">
                <p className="text-sm text-stone-600">
                  Choose between light and dark theme for the admin dashboard.
                </p>
                <div className="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    {darkMode ? (
                      <Moon className="w-5 h-5 text-primary" />
                    ) : (
                      <Sun className="w-5 h-5 text-accent" />
                    )}
                    <div>
                      <p className="font-bold text-stone-800 dark:text-stone-100">
                        {darkMode ? 'Dark Mode' : 'Light Mode'}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        {darkMode ? 'Easier on the eyes at night' : 'Better visibility in daylight'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      darkMode ? 'bg-primary' : 'bg-stone-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        darkMode ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* BULK OPERATIONS TAB - Desktop Only */}
        {tab === 'BULK_OPERATIONS' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-stone-800 tracking-tight">Bulk Operations</h2>
                <p className="text-stone-600 mt-1">Perform actions on multiple residents at once</p>
              </div>
              <span className="px-3 py-1.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">DESKTOP ONLY</span>
            </div>

            <Card>
              <div className="text-center py-12">
                <ListChecks className="w-16 h-16 text-stone-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-stone-700 mb-2">Bulk Operations Coming Soon</h3>
                <p className="text-stone-500 max-w-md mx-auto">
                  Select multiple residents and perform batch actions like approvals, discharges, transfers, and status updates.
                </p>
                <div className="mt-6 text-left max-w-2xl mx-auto bg-stone-50 rounded-xl p-6">
                  <p className="font-bold text-stone-700 mb-3">Planned Features:</p>
                  <ul className="space-y-2 text-sm text-stone-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Bulk approve pending applications</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Batch discharge residents with notes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Transfer multiple residents between houses</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Mass update resident statuses</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Send notifications to selected residents</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ANALYTICS TAB - Desktop Only */}
        {tab === 'ANALYTICS' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-stone-800 tracking-tight">Analytics & Reports</h2>
                <p className="text-stone-600 mt-1">Detailed insights and statistics</p>
              </div>
              <span className="px-3 py-1.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">DESKTOP ONLY</span>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-stone-600 mb-1">Total Residents</p>
                    <p className="text-3xl font-bold text-primary">{clients.filter(c => c.status === 'active').length}</p>
                  </div>
                  <Users className="w-12 h-12 text-primary/20" />
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-amber-100/50 to-amber-50/30 border-amber-200/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-stone-600 mb-1">Pending Applications</p>
                    <p className="text-3xl font-bold text-amber-600">{clients.filter(c => c.status === 'pending').length}</p>
                  </div>
                  <ClipboardCheck className="w-12 h-12 text-amber-600/20" />
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-green-100/50 to-green-50/30 border-green-200/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-stone-600 mb-1">Total Houses</p>
                    <p className="text-3xl font-bold text-green-600">{houses.length}</p>
                  </div>
                  <Home className="w-12 h-12 text-green-600/20" />
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-blue-100/50 to-blue-50/30 border-blue-200/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-stone-600 mb-1">Occupancy Rate</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {Math.round((clients.filter(c => c.status === 'active' && c.assignedBedId).length / houses.reduce((acc, h) => acc + h.rooms.reduce((racc, r) => racc + r.beds.length, 0), 0)) * 100)}%
                    </p>
                  </div>
                  <BarChart3 className="w-12 h-12 text-blue-600/20" />
                </div>
              </Card>
            </div>

            {/* House Occupancy Breakdown */}
            <Card title="House Occupancy Breakdown">
              <div className="space-y-4">
                {houses.map(house => {
                  const totalBeds = house.rooms.reduce((acc, r) => acc + r.beds.length, 0);
                  const occupiedBeds = house.rooms.reduce((acc, r) => acc + r.beds.filter(b => b.occupantId).length, 0);
                  const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

                  return (
                    <div key={house.id} className="border-b border-stone-100 last:border-0 pb-4 last:pb-0">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-stone-800">{house.name}</h4>
                        <span className="text-sm text-stone-600">{occupiedBeds}/{totalBeds} beds occupied</span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-500"
                          style={{ width: `${occupancyRate}%` }}
                        />
                      </div>
                      <p className="text-xs text-stone-500 mt-1">{Math.round(occupancyRate)}% capacity</p>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Status Breakdown */}
            <Card title="Resident Status Distribution">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-2xl font-bold text-amber-600">{clients.filter(c => c.status === 'pending').length}</p>
                  <p className="text-sm text-stone-600 mt-1">Pending</p>
                </div>
                <div className="text-center p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <p className="text-2xl font-bold text-primary">{clients.filter(c => c.status === 'active').length}</p>
                  <p className="text-sm text-stone-600 mt-1">Active</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
                  <p className="text-2xl font-bold text-green-600">{clients.filter(c => c.status === 'alumni').length}</p>
                  <p className="text-sm text-stone-600 mt-1">Alumni</p>
                </div>
                <div className="text-center p-4 bg-stone-50 rounded-xl border border-stone-200">
                  <p className="text-2xl font-bold text-stone-600">{clients.filter(c => c.status === 'discharged').length}</p>
                  <p className="text-sm text-stone-600 mt-1">Discharged</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* EXPORT TAB - Desktop Only */}
        {tab === 'EXPORT' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-stone-800 tracking-tight">Export Data</h2>
                <p className="text-stone-600 mt-1">Download your data for backups or external use</p>
              </div>
              <span className="px-3 py-1.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">DESKTOP ONLY</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-stone-800 mb-1">Export Residents</h3>
                    <p className="text-sm text-stone-600 mb-4">
                      Download all resident data including applications, active, and discharged residents.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => {
                        const dataStr = JSON.stringify(clients, null, 2);
                        const dataBlob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(dataBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `residents-${new Date().toISOString().split('T')[0]}.json`;
                        link.click();
                        toast.success('Residents data exported successfully!');
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" /> Export JSON
                    </Button>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <Home className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-stone-800 mb-1">Export Houses</h3>
                    <p className="text-sm text-stone-600 mb-4">
                      Download house configuration including rooms, beds, and occupancy data.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const dataStr = JSON.stringify(houses, null, 2);
                        const dataBlob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(dataBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `houses-${new Date().toISOString().split('T')[0]}.json`;
                        link.click();
                        toast.success('Houses data exported successfully!');
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" /> Export JSON
                    </Button>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <ClipboardCheck className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-stone-800 mb-1">Export Chores</h3>
                    <p className="text-sm text-stone-600 mb-4">
                      Download all chore assignments and completion history.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const dataStr = JSON.stringify(chores, null, 2);
                        const dataBlob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(dataBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `chores-${new Date().toISOString().split('T')[0]}.json`;
                        link.click();
                        toast.success('Chores data exported successfully!');
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" /> Export JSON
                    </Button>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <PackageOpen className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-stone-800 mb-1">Full Database Export</h3>
                    <p className="text-sm text-stone-600 mb-4">
                      Download complete database backup including all data.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const fullData = {
                          exportDate: new Date().toISOString(),
                          residents: clients,
                          houses: houses,
                          chores: chores
                        };
                        const dataStr = JSON.stringify(fullData, null, 2);
                        const dataBlob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(dataBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `full-backup-${new Date().toISOString().split('T')[0]}.json`;
                        link.click();
                        toast.success('Full database backup exported successfully!');
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" /> Export All Data
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            <Card>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-blue-900 mb-1">About Exported Data</p>
                    <p className="text-sm text-blue-800">
                      Exported files are in JSON format and contain sensitive information. Store them securely and never share them publicly.
                      You can use these exports for backups, data analysis, or migrating to other systems.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
        </div>

        {/* ACTIVITY LOG TAB - Desktop Only */}
        {tab === 'ACTIVITY_LOG' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-stone-800 dark:text-stone-100 tracking-tight">Activity Log</h2>
                <p className="text-stone-600 dark:text-stone-400 mt-1">Track all administrative actions</p>
              </div>
              <span className="px-3 py-1.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">DESKTOP ONLY</span>
            </div>

            <Card>
              <div className="text-center py-12">
                <ScrollText className="w-16 h-16 text-stone-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-stone-700 dark:text-stone-300 mb-2">Activity Log Coming Soon</h3>
                <p className="text-stone-500 dark:text-stone-400 max-w-md mx-auto">
                  Track all administrative actions including resident approvals, discharges, transfers, and system changes.
                </p>
                <div className="mt-6 text-left max-w-2xl mx-auto bg-stone-50 dark:bg-stone-800 rounded-xl p-6">
                  <p className="font-bold text-stone-700 dark:text-stone-300 mb-3">What Will Be Logged:</p>
                  <ul className="space-y-2 text-sm text-stone-600 dark:text-stone-400">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Resident approvals and admissions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Discharges and status changes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Bed and house transfers</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Resident deletions and updates</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Settings and configuration changes</span>
                    </li>
                  </ul>
                  <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-700">
                    <p className="text-xs text-stone-500 dark:text-stone-500">
                      <strong>Note:</strong> All actions are logged with timestamps and marked as performed by "admin" for simplicity.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Mobile Bottom Nav - Visible only on Mobile */}
        <div className="md:hidden bg-white border-t border-stone-200 p-2 pb-6 flex justify-around items-center z-20 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button onClick={() => setTab('HOUSES')} className={`flex flex-col items-center p-2 rounded-xl transition-all w-16 ${tab === 'HOUSES' ? 'text-primary bg-primary/10' : 'text-stone-400'}`}>
                <Home className="w-6 h-6" />
                <span className="text-[10px] font-bold mt-1">Houses</span>
            </button>
            <button onClick={() => setTab('CLIENTS')} className={`flex flex-col items-center p-2 rounded-xl transition-all w-16 ${tab === 'CLIENTS' ? 'text-primary bg-primary/10' : 'text-stone-400'}`}>
                <Users className="w-6 h-6" />
                <span className="text-[10px] font-bold mt-1">Residents</span>
            </button>
            <button onClick={() => setTab('CHORES')} className={`flex flex-col items-center p-2 rounded-xl transition-all w-16 ${tab === 'CHORES' ? 'text-primary bg-primary/10' : 'text-stone-400'}`}>
                <ClipboardCheck className="w-6 h-6" />
                <span className="text-[10px] font-bold mt-1">Chores</span>
            </button>
            <button onClick={() => setTab('AI_REPORT')} className={`flex flex-col items-center p-2 rounded-xl transition-all w-16 ${tab === 'AI_REPORT' ? 'text-primary bg-primary/10' : 'text-stone-400'}`}>
                <BrainCircuit className="w-6 h-6" />
                <span className="text-[10px] font-bold mt-1">Report</span>
            </button>
        </div>
      </main>

      {/* Confirmation Dialog for Chore Deletion */}
      <ConfirmDialog
        isOpen={deleteChoreId !== null}
        title="Delete Chore"
        message="Are you sure you want to delete this chore? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteChore}
        onCancel={() => setDeleteChoreId(null)}
        variant="danger"
      />
    </div>
  );
};

const ClientPortal = ({
  currentUser,
  chores,
  onNavigate,
  onCheckIn,
  onUpdateClient
}: {
  currentUser: Client,
  chores: Chore[],
  onNavigate: (v: ViewState) => void,
  onCheckIn: (log: CheckInLog) => void,
  onUpdateClient: (c: Client) => void
}) => {
  const [checkInModal, setCheckInModal] = useState<{ open: boolean, type: CheckInType | null }>({ open: false, type: null });
  const [checkInData, setCheckInData] = useState({ locationName: '', comment: '' });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Password Change State
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [newPass, setNewPass] = useState('');

  // Chore Completion State
  const [completingChore, setCompletingChore] = useState<Chore | null>(null);
  const [choreCompletionNotes, setChoreCompletionNotes] = useState('');
  const [chorePhoto, setChorePhoto] = useState<File | null>(null);

  const initiateCheckIn = (type: CheckInType) => {
    setCheckInData({ locationName: '', comment: '' });
    setErrorMsg(null);
    setCheckInModal({ open: true, type });
  };

  const confirmCheckIn = async () => {
    if (!checkInModal.type) return;
    
    setGpsLoading(true);
    setErrorMsg(null);

    try {
      // defined helper for promise-based geolocation
      const getPosition = (options?: PositionOptions): Promise<GeolocationPosition> => {
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by this browser."));
            return;
          }
          navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });
      };

      let position: GeolocationPosition;

      try {
        // 1. Try High Accuracy (GPS) - Preferred for validation
        // Increased timeout to 15s for better GPS lock
        position = await getPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0 // Don't use cached location
        });
      } catch (err: any) {
        // 2. Fallback to Low Accuracy (WiFi/Cell Tower) - Better indoors, less battery
        // Only if error is Timeout (3) or Unavailable (2).
        // If Permission Denied (1), we stop immediately.
        if (err.code === 2 || err.code === 3) {
          console.warn("High accuracy GPS failed, attempting low accuracy fallback...");
          position = await getPosition({
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 0
          });
        } else {
          throw err;
        }
      }

      // Check GPS accuracy
      const accuracy = position.coords.accuracy;
      console.log(`GPS Accuracy: ${accuracy.toFixed(1)} meters`);

      // Detect if mobile or desktop based on touch capability and screen size
      const isMobile = 'ontouchstart' in window && window.innerWidth < 768;
      const maxAccuracy = isMobile ? 200 : 10000; // Mobile: 200m, Desktop: 10km

      if (accuracy > maxAccuracy) {
        throw new Error(`⚠️ GPS accuracy is ${accuracy.toFixed(0)} meters. ${isMobile ? 'Please wait for better signal or move to an area with clear sky view.' : 'Desktop location accuracy is limited. Please ensure you are in the correct location.'}`);
      }

      // Show warning if accuracy is poor but acceptable
      if (accuracy > 100 && isMobile) {
        console.warn(`GPS accuracy is ${accuracy.toFixed(0)} meters - location may not be precise`);
      }

      const newLog: CheckInLog = {
        id: `l${Date.now()}`,
        clientId: currentUser.id,
        type: checkInModal.type as CheckInType,
        timestamp: Date.now(),
        location: {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        },
        locationName: checkInData.locationName || 'Unknown Location',
        comment: checkInData.comment
      };

      onCheckIn(newLog);
      setGpsLoading(false);
      setCheckInModal({ open: false, type: null });

    } catch (error: any) {
      console.error("Check-In Failed:", error);
      setGpsLoading(false);
      
      let message = "Unable to retrieve location.";
      if (error.code === 1) { // PERMISSION_DENIED
        message = "❌ Permission Denied. You MUST allow location access to check in. Please check your browser settings.";
      } else if (error.code === 2) { // POSITION_UNAVAILABLE
        message = "⚠️ Location Unavailable. Please check your GPS signal or move to an area with better reception.";
      } else if (error.code === 3) { // TIMEOUT
        message = "⏱️ Location Timeout. The signal is weak. Please try again.";
      } else if (error.message) {
        message = error.message;
      }
      
      setErrorMsg(message);
    }
  };

  const handleChangePassword = () => {
     if(newPass.length < 6) {
         toast.warning("Password must be at least 6 characters long.");
         return;
     }
     onUpdateClient({ ...currentUser, password: newPass });
     setNewPass('');
     setIsChangePassOpen(false);
     toast.success("Password updated successfully.");
  };

  const handleCompleteChore = async () => {
    if (!completingChore) return;

    try {
      // Create completion record
      const completion: ChoreCompletion = {
        id: `completion_${Date.now()}`,
        completedAt: new Date().toISOString(),
        completedBy: currentUser.id,
        ...(choreCompletionNotes && { notes: choreCompletionNotes })
        // photoUrl is optional and omitted if not present
      };

      // Add completion to chore
      await addChoreCompletion(completingChore.id, completion);

      // Reset state
      setCompletingChore(null);
      setChoreCompletionNotes('');
      setChorePhoto(null);

      toast.success('Chore marked as complete!');
    } catch (error) {
      console.error('Error completing chore:', error);
      toast.error('Error completing chore. Please try again.');
    }
  };

  return (
      <div className="min-h-screen bg-cream pb-20">
        {/* Change Password Modal */}
        {isChangePassOpen && (
            <div className="fixed inset-0 z-50 bg-[#3c4a3e]/60 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
                     <h3 className="text-xl font-bold text-stone-800 mb-6">Change Password</h3>
                     <div className="space-y-6">
                        <div>
                             <label className="label">New Password</label>
                             <input 
                                type="password"
                                className={INPUT_CLASS} 
                                value={newPass}
                                onChange={(e) => setNewPass(e.target.value)}
                                autoFocus
                             />
                        </div>
                        <div className="flex gap-3">
                             <Button variant="outline" onClick={() => setIsChangePassOpen(false)} className="flex-1">Cancel</Button>
                             <Button onClick={handleChangePassword} className="flex-1">Save</Button>
                        </div>
                     </div>
                </div>
            </div>
        )}

        {/* Chore Completion Modal */}
        {completingChore && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold text-stone-800 mb-6">Complete Chore</h3>

              <div className="space-y-6">
                <div>
                  <p className="text-sm font-bold text-stone-700 mb-2">Chore</p>
                  <p className="text-lg font-bold text-primary">{completingChore.title}</p>
                  <p className="text-sm text-stone-600 mt-1">{completingChore.description}</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Notes (Optional)</label>
                  <textarea
                    rows={3}
                    className={INPUT_CLASS}
                    placeholder="Add any notes about completing this chore..."
                    value={choreCompletionNotes}
                    onChange={e => setChoreCompletionNotes(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Photo Proof (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    className={INPUT_CLASS}
                    onChange={e => setChorePhoto(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-stone-500 mt-1">Upload a photo showing the completed work</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCompletingChore(null);
                      setChoreCompletionNotes('');
                      setChorePhoto(null);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCompleteChore} className="flex-1">
                    <CheckCircle size={16} color="white" />
                    Mark Complete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Check In Modal */}
        {checkInModal.open && (
             <div className="fixed inset-0 z-50 bg-[#3c4a3e]/60 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
                    <h3 className="text-xl font-bold text-stone-800 mb-6">Confirm Check-In</h3>

                    {/* Location Services Info */}
                    <div className="bg-blue-50 text-blue-900 p-4 rounded-2xl text-sm mb-6 flex items-start gap-2 border border-blue-100">
                       <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-600" />
                       <div className="flex-1">
                          <p className="font-bold mb-1">Location Services Required</p>
                          <p className="text-xs text-blue-700">This check-in will request your GPS location for verification. Please allow location access when prompted.</p>
                       </div>
                    </div>

                    {errorMsg && (
                        <div className="bg-red-50 text-secondary p-4 rounded-2xl text-sm mb-6 flex items-start gap-2 border border-red-100">
                            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <span className="flex-1">{errorMsg}</span>
                        </div>
                    )}

                    <div className="space-y-6">
                        <div>
                            <label className="label">Location Name</label>
                            <input 
                                className={INPUT_CLASS}
                                autoFocus
                                placeholder={checkInModal.type === CheckInType.HOUSE ? "e.g. Home" : "e.g. AA Meeting Downtown"} 
                                value={checkInData.locationName}
                                onChange={(e) => setCheckInData({...checkInData, locationName: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="label">Comment / Status</label>
                            <textarea 
                                className={INPUT_CLASS}
                                placeholder="e.g. Just arrived, meeting with sponsor..." 
                                rows={2}
                                value={checkInData.comment}
                                onChange={(e) => setCheckInData({...checkInData, comment: e.target.value})}
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button onClick={() => setCheckInModal({open: false, type: null})} variant="outline" className="flex-1">Cancel</Button>
                            <Button 
                                onClick={confirmCheckIn} 
                                disabled={!checkInData.locationName || gpsLoading} 
                                isLoading={gpsLoading} 
                                className="flex-1"
                            >
                                {gpsLoading ? 'Locating...' : 'Confirm'}
                            </Button>
                        </div>
                    </div>
                </div>
             </div>
        )}

        <div className="bg-primary text-white p-8 rounded-b-[3rem] shadow-xl">
           <div className="flex justify-between items-start mb-6">
             <div>
                <h1 className="text-3xl font-bold">Welcome, {currentUser.firstName}</h1>
                <p className="opacity-90 text-sm font-medium tracking-wide">One day at a time.</p>
             </div>
             <div className="flex gap-3">
                 <button onClick={() => setIsChangePassOpen(true)} className="bg-white/10 p-3 rounded-full hover:bg-white/20 transition-colors">
                    <Lock className="w-6 h-6" />
                 </button>
                 <button onClick={() => onNavigate('LANDING')} className="bg-white/10 p-3 rounded-full hover:bg-white/20 transition-colors">
                    <LogOut className="w-6 h-6" />
                 </button>
             </div>
           </div>
           <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-md border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-accent" />
                  <span className="font-bold text-sm uppercase tracking-wider text-white/80">Current Status</span>
              </div>
              <p className="text-3xl font-bold">{currentUser.status === 'active' ? 'Active Resident' : currentUser.status === 'alumni' ? 'Alumni' : 'Discharged'}</p>
           </div>
        </div>

        <div className="p-6 -mt-8 relative z-10">
          <div className="grid grid-cols-2 gap-6 mb-8">
            <button 
                onClick={() => initiateCheckIn(CheckInType.HOUSE)}
                disabled={currentUser.status !== 'active'}
                className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 flex flex-col items-center justify-center gap-4 hover:border-primary hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <Home className="w-8 h-8" />
                </div>
                <span className="font-bold text-stone-700 text-lg">House Check-In</span>
            </button>

            <button 
                 onClick={() => initiateCheckIn(CheckInType.MEETING)}
                 disabled={currentUser.status !== 'active'}
                 className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 flex flex-col items-center justify-center gap-4 hover:border-secondary hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-white transition-colors">
                    <MapPin className="w-8 h-8" />
                </div>
                <span className="font-bold text-stone-700 text-lg">Meeting Check-In</span>
            </button>
          </div>

          {/* My Chores Section */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-stone-800 mb-4 px-2">My Chores</h3>
            {chores.filter(c => c.assignedTo.includes(currentUser.id)).length === 0 ? (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 text-center">
                <ClipboardCheck className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-500 italic">No chores assigned yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {chores
                  .filter(c => c.assignedTo.includes(currentUser.id))
                  .map(chore => {
                    const isCompleted = chore.status === 'completed';
                    const isOverdue = chore.status === 'overdue';
                    const lastCompletion = chore.completions && chore.completions.length > 0
                      ? chore.completions[chore.completions.length - 1]
                      : null;

                    return (
                      <div key={chore.id} className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-bold text-lg text-stone-800">{chore.title}</h4>
                              {isCompleted && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                                  Complete
                                </span>
                              )}
                              {isOverdue && (
                                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">
                                  Overdue
                                </span>
                              )}
                              {chore.recurring && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                                  Recurring
                                </span>
                              )}
                            </div>
                            <p className="text-stone-600 text-sm mb-3">{chore.description}</p>

                            {chore.reminderTime && (
                              <div className="flex items-center gap-2 text-xs text-stone-500 mb-2">
                                <Calendar className="w-4 h-4" />
                                <span>Reminder at {chore.reminderTime}</span>
                              </div>
                            )}

                            {lastCompletion && (
                              <div className="flex items-center gap-2 text-xs text-stone-500">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>Last completed {new Date(lastCompletion.completedAt).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>

                          <Button
                            size="sm"
                            onClick={() => {
                              setCompletingChore(chore);
                              setChoreCompletionNotes('');
                              setChorePhoto(null);
                            }}
                            disabled={currentUser.status !== 'active'}
                          >
                            <CheckCircle size={16} color="white" />
                            Mark Complete
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* All Chores Section (View Only) */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-stone-800 mb-4 px-2">All House Chores</h3>
            {chores.filter(c => c.houseId === currentUser.assignedHouseId || (!c.houseId && currentUser.assignedHouseId)).length === 0 ? (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 text-center">
                <ClipboardCheck className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-500 italic">No chores in your house yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chores
                  .filter(c => c.houseId === currentUser.assignedHouseId || (!c.houseId && currentUser.assignedHouseId))
                  .map(chore => {
                    const isMyChore = chore.assignedTo.includes(currentUser.id);
                    return (
                      <div key={chore.id} className={`bg-white p-4 rounded-2xl border ${isMyChore ? 'border-primary/30 bg-primary/5' : 'border-stone-200'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isMyChore ? 'bg-primary/20 text-primary' : 'bg-stone-100 text-stone-400'}`}>
                            <ClipboardCheck className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-sm text-stone-800">{chore.title}</h5>
                            <p className="text-xs text-stone-500 mt-1">
                              {chore.assignedTo.length} {chore.assignedTo.length === 1 ? 'person' : 'people'} assigned
                              {isMyChore && <span className="text-primary font-bold"> • You're assigned!</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <h3 className="text-xl font-bold text-stone-800 mb-4 px-2">Recent Activity</h3>
          <div className="space-y-4">
            {currentUser.checkInLogs.length === 0 ? (
                <div className="text-center p-10 text-stone-400 italic border border-dashed border-stone-200 rounded-3xl">No check-ins yet.</div>
            ) : (
                currentUser.checkInLogs.slice(0, 10).map(log => (
                    <div key={log.id} className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${log.type === CheckInType.HOUSE ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                            {log.type === CheckInType.HOUSE ? <Home className="w-6 h-6"/> : <Users className="w-6 h-6"/>}
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-stone-800 text-lg">{log.locationName}</p>
                            <p className="text-xs text-stone-500 font-bold uppercase tracking-wide">{new Date(log.timestamp).toLocaleString()}</p>
                            {log.comment && <p className="text-sm text-stone-600 mt-1 leading-relaxed">"{log.comment}"</p>}
                        </div>
                    </div>
                ))
            )}
          </div>
        </div>
      </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [view, setView] = useState<ViewState>('LANDING');
  const [houses, setHouses] = useState<House[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [currentUser, setCurrentUser] = useState<Client | null>(null);
  const [authModal, setAuthModal] = useState<{ open: boolean, type: 'ADMIN' | 'RESIDENT' }>({ open: false, type: 'ADMIN' });
  const [isInitializing, setIsInitializing] = useState(true);
  const [background, setBackground] = useState<Background>(getRandomBackground());

  // Toast notification system
  const toast = useToast();

  // --- Firebase Initialization & Real-time Listeners ---

  useEffect(() => {
    let unsubscribeHouses: (() => void) | undefined;
    let unsubscribeClients: (() => void) | undefined;
    let unsubscribeChores: (() => void) | undefined;

    const initializeFirebase = async () => {
      try {
        console.log('🔥 Firebase initialization starting...');

        // Check if houses collection is empty (first-time setup)
        const housesEmpty = await isHousesCollectionEmpty();
        console.log(`📦 Houses collection empty: ${housesEmpty}`);

        if (housesEmpty) {
          console.log('🏠 First-time setup: Initializing houses in Firestore...');
          await initializeHouses(MOCK_HOUSES);
          console.log('✅ Houses initialized successfully');
        }

        // DISABLED: Auto-population of mock residents
        // The following code was disabled to prevent fake residents from being created
        // If you need to re-enable it for testing, uncomment the block below
        /*
        // Check if clients collection is empty (first-time setup)
        const clientsEmpty = await isClientsCollectionEmpty();
        console.log(`👥 Clients collection empty: ${clientsEmpty}`);

        if (clientsEmpty) {
          console.log('👤 First-time setup: Initializing clients in Firestore...');
          console.log(`📝 Initializing ${MOCK_CLIENTS.length} mock residents...`);
          await initializeClients(MOCK_CLIENTS);
          console.log('✅ Clients initialized successfully');

          // Auto-assign mock residents to available beds
          console.log('🛏️ Auto-assigning residents to beds...');
          const currentHouses = await getHouses();
          for (const house of currentHouses) {
            const houseResidents = MOCK_CLIENTS.filter(c => c.assignedHouseId === house.id && c.status === 'active');
            let bedIndex = 0;
            const updatedRooms = house.rooms.map(room => ({
              ...room,
              beds: room.beds.map(bed => {
                if (bedIndex < houseResidents.length) {
                  const resident = houseResidents[bedIndex];
                  bedIndex++;
                  // Update client with bed assignment
                  updateClient(resident.id, { assignedBedId: bed.id }).catch(console.error);
                  return { ...bed, occupantId: resident.id };
                }
                return bed;
              })
            }));
            await setHouse({ ...house, rooms: updatedRooms });
          }
          console.log(`✅ Assigned ${MOCK_CLIENTS.filter(c => c.status === 'active').length} residents to beds`);
        } else {
          console.log('ℹ️ Clients collection already has data, skipping initialization');
        }
        */
        console.log('ℹ️ Mock resident auto-population is disabled');

        // Set up real-time listeners with error handling
        console.log('👂 Setting up real-time listeners...');
        unsubscribeHouses = subscribeToHouses(
          (housesData) => {
            console.log(`📊 Received ${housesData.length} houses from Firestore`);
            setHouses(housesData);
          },
          (error) => {
            console.error('Houses listener error:', error);
            toast.error('Connection to houses data lost. Please refresh the page.');
          }
        );

        unsubscribeClients = subscribeToClients(
          (clientsData) => {
            console.log(`📊 Received ${clientsData.length} clients from Firestore`);
            setClients(clientsData);

            // Update currentUser if they're in the updated clients
            // Use functional form to avoid stale closure
            setCurrentUser((prevUser) => {
              if (!prevUser) return prevUser;
              const updatedCurrentUser = clientsData.find(c => c.id === prevUser.id);
              return updatedCurrentUser || prevUser;
            });
          },
          (error) => {
            console.error('Clients listener error:', error);
            toast.error('Connection to residents data lost. Please refresh the page.');
          }
        );

        unsubscribeChores = subscribeToChores(
          (choresData) => {
            console.log(`📊 Received ${choresData.length} chores from Firestore`);
            setChores(choresData);
          },
          (error) => {
            console.error('Chores listener error:', error);
            toast.error('Connection to chores data lost. Please refresh the page.');
          }
        );

        console.log('✅ Firebase initialization complete');
        setIsInitializing(false);
      } catch (error) {
        console.error('Error initializing Firebase:', error);
        // Fallback to mock data if Firebase fails
        setHouses(MOCK_HOUSES);
        setClients([]); // Don't populate with mock residents
        setIsInitializing(false);
      }
    };

    initializeFirebase();

    // Cleanup listeners on unmount
    return () => {
      if (unsubscribeHouses) unsubscribeHouses();
      if (unsubscribeClients) unsubscribeClients();
      if (unsubscribeChores) unsubscribeChores();
    };
  }, []);

  // Show loading screen while initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Home className="w-8 h-8 text-primary" />
          </div>
          <p className="text-stone-600 font-medium">Loading Sober Solutions...</p>
        </div>
      </div>
    );
  }

  // --- Handlers ---

  const handleIntakeSubmit = async (intakeData: IntakeForm) => {
    try {
      // Optional: AI Analysis
      await analyzeIntakeRisk(JSON.stringify(intakeData));

      const newClient: Client = {
        ...intakeData,
        id: `c${Date.now()}`,
        status: 'pending', // New applications start as pending and must be approved by admin
        assignedBedId: null,
        assignedHouseId: null, // Intentionally null until manager assigns them, but they have a targetHouseId
        checkInLogs: [],
        drugTestLogs: []
      };

      // Save to Firebase - real-time listener will update local state
      await createClient(newClient);
      toast.success("Application submitted successfully! An admin will review your application.");
      setView('LANDING');
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error("Error submitting application. Please try again.");
    }
  };

  // Update houses logic (for renaming)
  const handleUpdateHouses = async (updatedHouses: House[]) => {
    try {
      // Save all updated houses to Firebase
      await Promise.all(updatedHouses.map(house => setHouse(house)));
      // Real-time listener will update local state
    } catch (error) {
      console.error('Error updating houses:', error);
    }
  };

  // Handle resident check-in logic
  const handleCheckIn = async (log: CheckInLog) => {
    if (!currentUser) return;

    try {
      const updatedClient = {
        ...currentUser,
        checkInLogs: [log, ...currentUser.checkInLogs]
      };

      // Save to Firebase - real-time listener will update local state
      await setClient(updatedClient);
      toast.success("Check-in recorded successfully!");
    } catch (error) {
      console.error('Error recording check-in:', error);
      toast.error("Error recording check-in. Please try again.");
    }
  };

  const handleClientUpdate = async (updatedClient: Client) => {
    try {
      // Save to Firebase - real-time listener will update local state
      await setClient(updatedClient);
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error("Error updating resident. Please try again.");
    }
  };

  const handleLoginSuccess = (user?: Client) => {
    setAuthModal({ open: false, type: 'ADMIN' });
    // Change background on each login for variety and inspiration
    setBackground(getRandomBackground());
    if (user) {
      setCurrentUser(user);
      setView('CLIENT_PORTAL');
    } else {
      setView('ADMIN_DASHBOARD');
    }
  };

  return (
    <div className="font-sans text-stone-900 selection:bg-primary/30">
      <style>{`
        .label { display: block; font-size: 0.875rem; font-weight: 600; color: #57534E; margin-bottom: 0.375rem; }
        .section-header { font-weight: 700; color: #588157; font-size: 1.125rem; margin-bottom: 1.5rem; border-bottom: 2px solid #F5F5F4; padding-bottom: 0.75rem; }
        .prose p { margin-bottom: 1.25em; }
      `}</style>
      
      <LoginModal
        isOpen={authModal.open}
        type={authModal.type}
        onClose={() => setAuthModal({ ...authModal, open: false })}
        clients={clients}
        onUpdateClient={handleClientUpdate}
        onLoginSuccess={handleLoginSuccess}
      />

      {view === 'LANDING' && (
        <LandingPage
          onNavigate={setView}
          onRequestLogin={(type) => setAuthModal({ open: true, type })}
          background={background}
        />
      )}

      {view === 'INTAKE' && (
        <IntakeFormView 
           houses={houses}
           onSubmit={handleIntakeSubmit} 
           onCancel={() => setView('LANDING')} 
        />
      )}

      {view === 'ADMIN_DASHBOARD' && (
        <AdminDashboard
           houses={houses}
           clients={clients}
           chores={chores}
           onNavigate={setView}
           onUpdateHouses={handleUpdateHouses}
           onUpdateClient={handleClientUpdate}
           toast={toast}
        />
      )}

      {view === 'CLIENT_PORTAL' && currentUser && (
        <ClientPortal
           currentUser={currentUser}
           chores={chores}
           onNavigate={setView}
           onCheckIn={handleCheckIn}
           onUpdateClient={handleClientUpdate}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toast.toasts} onClose={toast.closeToast} />
    </div>
  );
}