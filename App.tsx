import React, { useState, useEffect } from 'react';
import { House, Client, ViewState, AdminTab, IntakeForm, CheckInType, CheckInLog, DrugTestLog, DischargeRecord } from './types';
import { MOCK_HOUSES, MOCK_CLIENTS, ADMIN_PASSWORD } from './constants';
import { generateDailyReport, analyzeIntakeRisk } from './services/geminiService';
import { Button } from './components/Button';
import { Card } from './components/Card';
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
  Key
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

const AgreementSection = ({ readOnly, title, description, checked, onChange }: any) => (
  <div className={`border rounded-2xl p-6 transition-colors ${checked ? 'bg-primary/5 border-primary/20' : 'bg-stone-50 border-stone-200'}`}>
      <div className="flex items-start gap-4">
          <input 
            type="checkbox" 
            className="mt-1.5 w-6 h-6 text-primary rounded focus:ring-primary accent-primary" 
            checked={checked} 
            onChange={e => onChange(e.target.checked)} 
            disabled={readOnly} 
            required
          />
          <div>
              <h4 className="font-bold text-stone-800 text-lg">{title} <span className="text-secondary text-xs font-normal ml-2">* Required</span></h4>
              <p className="text-stone-600 mt-2 leading-relaxed">{description}</p>
          </div>
      </div>
  </div>
);

// --- Sub-Components ---

const LoginModal = ({ 
  isOpen, 
  onClose, 
  type, 
  clients, 
  setClients, 
  onLoginSuccess 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  type: 'ADMIN' | 'RESIDENT', 
  clients: Client[], 
  setClients: (c: Client[]) => void, 
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

  const handleAdminLogin = () => {
    if (password === ADMIN_PASSWORD) {
      onLoginSuccess();
    } else {
      setError("Incorrect password.");
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

  const handleCreatePassword = () => {
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
      const updatedList = clients.map(c => c.id === foundClient.id ? updatedClient : c);
      setClients(updatedList);
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

const LandingPage = ({ onNavigate, onRequestLogin }: { onNavigate: (view: ViewState) => void, onRequestLogin: (type: 'ADMIN' | 'RESIDENT') => void }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFCF8] p-4">
    <div className="max-w-md w-full space-y-8 text-center">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-stone-100">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
            <Home className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-bold text-primary mb-3 tracking-tight">Sober Solutions</h1>
        <p className="text-stone-500 mb-10 text-lg">Community. Recovery. Purpose.</p>
        
        <div className="space-y-4">
          <Button onClick={() => onNavigate('INTAKE')} className="w-full justify-between group py-4" variant="outline">
            <span>New Resident Application</span>
            <UserPlus className="w-5 h-5 text-stone-300 group-hover:text-primary" />
          </Button>
          
          <Button onClick={() => onRequestLogin('ADMIN')} className="w-full justify-between group py-4" variant="primary">
            <span>House Manager Login</span>
            <Activity className="w-5 h-5 text-primary-200 group-hover:text-white" />
          </Button>
          
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-stone-200"></span></div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest"><span className="bg-white px-4 text-stone-400 font-bold">Current Residents</span></div>
          </div>

          <Button onClick={() => onRequestLogin('RESIDENT')} className="w-full justify-between group py-4" variant="secondary">
            <span>Resident Login</span>
            <CheckCircle className="w-5 h-5 text-red-200 group-hover:text-white" />
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
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-stone-700 text-lg">Current Medications (Include OTC)</h4>
                            {!readOnly && (
                                <Button type="button" onClick={() => setData({...data, medications: [...data.medications, { name: '', dose: '', doctor: '', contact: '', reason: '' }]})} size="sm" variant="secondary">
                                    <Plus className="w-4 h-4 mr-1" /> Add Med
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
                        />

                         <AgreementSection 
                            readOnly={readOnly}
                            title="COVID-19 Waiver"
                            description="I acknowledge the contagious nature of COVID-19 and assume the risk of exposure. I release Sober Solutions from liability related to COVID-19."
                            checked={data.agreementCovid}
                            onChange={(v: boolean) => handleChange('agreementCovid', v)}
                        />

                        <AgreementSection 
                            readOnly={readOnly}
                            title="Property Agreement"
                            description="I agree to indemnify Sober Solutions against claims arising from my actions. I am responsible for my property."
                            checked={data.agreementProperty}
                            onChange={(v: boolean) => handleChange('agreementProperty', v)}
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

const ClientDetailView = ({ client, houses, onClose, onUpdateClient, onDischarge }: { client: Client, houses: House[], onClose: () => void, onUpdateClient: (c: Client) => void, onDischarge: (c: Client, record: DischargeRecord) => void }) => {
  const [tab, setTab] = useState<'INFO' | 'UA' | 'LOGS' | 'DISCHARGE'>('INFO');
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
    const record = dischargeForm as DischargeRecord;
    
    if (window.confirm("Are you sure you want to discharge this resident? This will remove them from their bed.")) {
       onDischarge(client, record);
    }
  };

  const handlePasswordReset = () => {
    if (resetPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }
    const updatedClient = {
      ...client,
      password: resetPassword
    };
    onUpdateClient(updatedClient);
    setResetPassword('');
    setShowReset(false);
    alert("Password updated successfully.");
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#3c4a3e]/60 flex items-center justify-center p-4 backdrop-blur-sm">
       <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="bg-stone-50 p-8 border-b border-stone-200 flex justify-between items-start">
             <div>
                <h2 className="text-3xl font-bold text-stone-800 flex items-center gap-3">
                   {client.firstName} {client.lastName}
                   <span className={`text-sm px-3 py-1 rounded-full font-bold tracking-wide ${client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-stone-200 text-stone-600'}`}>
                     {client.status.toUpperCase()}
                   </span>
                </h2>
                <p className="text-stone-500 mt-2 flex items-center gap-4">
                   <span className="font-medium bg-white px-2 py-1 rounded border border-stone-200">House: {houses.find(h => h.id === client.assignedHouseId)?.name || 'Unassigned'}</span>
                   <span className="bg-white px-2 py-1 rounded border border-stone-200">Sober Date: {client.soberDate}</span>
                </p>
             </div>
             <button onClick={onClose} className="text-stone-400 hover:text-secondary p-2 rounded-full hover:bg-stone-100 transition-colors"><X className="w-6 h-6"/></button>
          </div>

          {/* Navigation */}
          <div className="flex border-b border-stone-200 bg-white px-4 overflow-x-auto">
              <button onClick={() => setTab('INFO')} className={`px-6 py-4 text-sm font-bold border-b-4 transition-all flex items-center gap-2 whitespace-nowrap ${tab === 'INFO' ? 'border-primary text-primary' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
                 <FileText className="w-4 h-4"/> Info Packet
              </button>
              <button onClick={() => setTab('UA')} className={`px-6 py-4 text-sm font-bold border-b-4 transition-all flex items-center gap-2 whitespace-nowrap ${tab === 'UA' ? 'border-primary text-primary' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
                 <FlaskConical className="w-4 h-4"/> Drug Screens
              </button>
              <button onClick={() => setTab('LOGS')} className={`px-6 py-4 text-sm font-bold border-b-4 transition-all flex items-center gap-2 whitespace-nowrap ${tab === 'LOGS' ? 'border-primary text-primary' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
                 <History className="w-4 h-4"/> Check-In Logs
              </button>
              {client.status === 'active' && (
                <button onClick={() => setTab('DISCHARGE')} className={`px-6 py-4 text-sm font-bold border-b-4 transition-all flex items-center gap-2 whitespace-nowrap ${tab === 'DISCHARGE' ? 'border-red-500 text-red-600' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
                   <DoorOpen className="w-4 h-4"/> Exit / Discharge
                </button>
              )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-stone-50/50 p-8">
              
              {tab === 'INFO' && (
                 <>
                   <IntakeFormView readOnly={true} initialData={client} houses={houses} />
                   
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
                                         <span className="text-xs font-mono text-stone-400 bg-stone-100 px-2 py-1 rounded border border-stone-200">{log.location.lat.toFixed(4)}, {log.location.lng.toFixed(4)}</span>
                                     </div>
                                 </div>
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
                                <Button variant="danger" onClick={handleDischargeSubmit}>Finalize Discharge</Button>
                            </div>
                        </div>
                    </Card>
                 </div>
              )}
          </div>
       </div>
    </div>
  );
};

const AdminDashboard = ({ 
  houses, 
  setHouses, 
  clients, 
  setClients,
  onNavigate, 
  onUpdateHouses 
}: { 
  houses: House[], 
  setHouses: (h: House[]) => void, 
  clients: Client[], 
  setClients: (c: Client[]) => void,
  onNavigate: (v: ViewState) => void,
  onUpdateHouses: (houses: House[]) => void
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

  // New House Context Logic
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  
  // If no house is selected, show house selection screen
  if (!selectedHouseId) {
      return (
          <div className="min-h-screen bg-cream flex items-center justify-center p-4">
              <div className="max-w-2xl w-full">
                  <h2 className="text-3xl font-bold text-primary mb-2 text-center tracking-tight">Manager Dashboard</h2>
                  <p className="text-stone-500 text-center mb-10 text-lg">Select a property to manage or view Headquarters.</p>
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

  const handleConfirmAdmission = () => {
    if (!admittingClient || !selectionDetails) return;
    
    // 1. Update Houses (Set Occupant)
    const updatedHouses = houses.map(h => {
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

    // 2. Update Clients (Set Status & Assignment)
    const updatedClients = clients.map(c => {
        if (c.id !== admittingClient.id) return c;
        return {
            ...c,
            status: 'active' as const,
            assignedHouseId: selectionDetails.houseId,
            assignedBedId: selectionDetails.bedId,
            drugTestLogs: [],
            dischargeRecord: undefined
        };
    });

    onUpdateHouses(updatedHouses);
    setClients(updatedClients);
    setAdmittingClient(null);
    setSelectionDetails(null);
  };

  const handleUpdateClient = (updatedClient: Client) => {
    setClients(clients.map(c => c.id === updatedClient.id ? updatedClient : c));
    setViewingClient(updatedClient); // Keep modal updated
  };

  const handleDischargeClient = (client: Client, record: DischargeRecord) => {
    // 1. Update Client
    const updatedClient: Client = {
        ...client,
        status: record.type === 'Successful Completion' ? 'alumni' : 'discharged',
        assignedBedId: null,
        assignedHouseId: null,
        dischargeRecord: record
    };
    
    const newClientList = clients.map(c => c.id === client.id ? updatedClient : c);
    setClients(newClientList);

    // 2. Update Bed (Remove occupant)
    if (client.assignedHouseId && client.assignedBedId) {
        const updatedHouses = houses.map(h => {
            if (h.id !== client.assignedHouseId) return h;
            return {
                ...h,
                rooms: h.rooms.map(r => {
                    return {
                        ...r,
                        beds: r.beds.map(b => {
                            if (b.id !== client.assignedBedId) return b;
                            return { ...b, occupantId: null };
                        })
                    };
                })
            };
        });
        onUpdateHouses(updatedHouses);
    }
    setViewingClient(null); // Close modal
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
    if (selectedHouseId === 'ALL') return true;
    // Show if assigned to house OR if unassigned but targetHouseId is this house
    return c.assignedHouseId === selectedHouseId || (!c.assignedHouseId && c.targetHouseId === selectedHouseId);
  });

  return (
    <div className="min-h-screen bg-cream flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="w-72 bg-white border-r border-stone-200 hidden md:flex flex-col shadow-sm z-20 sticky top-0 h-screen">
        <div className="p-8 border-b border-stone-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl font-bold text-primary tracking-tight">Manager</h2>
            <Button size="sm" variant="outline" onClick={() => setSelectedHouseId(null)} className="px-3 py-1 h-auto text-xs rounded-lg">Switch</Button>
          </div>
          <div className="px-4 py-3 bg-stone-50 rounded-xl border border-stone-200">
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Current Context</p>
              <p className="font-bold text-stone-800 truncate text-lg">{selectedHouseId === 'ALL' ? 'Headquarters' : houses.find(h => h.id === selectedHouseId)?.name}</p>
          </div>
        </div>
        <nav className="flex-1 px-6 space-y-3 pt-8">
          <button onClick={() => setTab('HOUSES')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${tab === 'HOUSES' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'}`}>
            <Home className="w-5 h-5" /> House Register
          </button>
          <button onClick={() => setTab('CLIENTS')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${tab === 'CLIENTS' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'}`}>
            <Users className="w-5 h-5" /> Residents
          </button>
          <button onClick={() => setTab('AI_REPORT')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${tab === 'AI_REPORT' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'}`}>
            <BrainCircuit className="w-5 h-5" /> AI Shift Report
          </button>
        </nav>
        <div className="p-6 border-t border-stone-100">
          <Button variant="outline" onClick={() => onNavigate('LANDING')} className="w-full justify-start text-stone-500 border-stone-200 hover:bg-red-50 hover:text-red-500 hover:border-red-100">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main Content & Mobile Layout */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-cream relative">
        
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-stone-200 p-4 flex justify-between items-center shadow-sm z-20 shrink-0">
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
                            <Button variant="outline" onClick={() => setAdmittingClient(null)}>Cancel</Button>
                            <Button onClick={handleConfirmAdmission} disabled={!selectionDetails}>Confirm Admission</Button>
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
                onDischarge={handleDischargeClient}
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
                                             <span className="text-xs font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded">{bed.number}</span>
                                             <Pencil className="w-3 h-3 text-stone-300 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"/>
                                         </div>
                                     )}
                                  </div>
                                  {occupant ? (
                                    <div className="mt-1 font-bold text-primary text-base truncate cursor-pointer hover:underline flex items-center gap-2" onClick={() => setViewingClient(occupant)}>
                                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                        {occupant.firstName} {occupant.lastName}
                                    </div>
                                  ) : (
                                    <div className="mt-1 text-sm text-stone-400 italic">Vacant</div>
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
             
             {/* SEPARATED BY HOUSE CONTEXT */}
             <div className="space-y-10">
                {/* Pending / Unassigned Section */}
                <div>
                   <h3 className="text-lg font-bold text-stone-500 border-b border-stone-200 pb-3 mb-6 flex items-center"><ClipboardCheck className="w-5 h-5 mr-2"/> Pending Applications / Unassigned</h3>
                   <div className="grid gap-4">
                      {filteredClients.filter(c => !c.assignedHouseId && c.status === 'active').length === 0 && <p className="text-stone-400 text-sm italic p-4 bg-stone-50 rounded-xl border border-dashed border-stone-200">No pending applications found for this context.</p>}
                      {filteredClients.filter(c => !c.assignedHouseId && c.status === 'active').map(client => (
                         <Card key={client.id} className="border-l-[6px] border-l-amber-400">
                             <div className="flex justify-between items-center">
                                 <div>
                                    <h4 className="font-bold text-xl text-stone-800">{client.firstName} {client.lastName}</h4>
                                    <p className="text-sm text-stone-500 mt-1">Applied: {client.submissionDate}</p>
                                    <p className="text-sm text-stone-500">Target: <span className="font-medium text-stone-700">{houses.find(h => h.id === client.targetHouseId)?.name || 'Unknown'}</span></p>
                                 </div>
                                 <div className="flex gap-3">
                                    <Button size="sm" variant="secondary" onClick={() => { setAdmittingClient(client); setAdmissionHouseId(client.targetHouseId || houses[0].id); }}>Admit</Button>
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
        </div>

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
            <button onClick={() => setTab('AI_REPORT')} className={`flex flex-col items-center p-2 rounded-xl transition-all w-16 ${tab === 'AI_REPORT' ? 'text-primary bg-primary/10' : 'text-stone-400'}`}>
                <BrainCircuit className="w-6 h-6" />
                <span className="text-[10px] font-bold mt-1">Report</span>
            </button>
        </div>
      </main>
    </div>
  );
};

const ClientPortal = ({ 
  currentUser, 
  onNavigate, 
  onCheckIn,
  onUpdateClient 
}: { 
  currentUser: Client, 
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
        // Timeout 5s to fail fast if no GPS lock
        position = await getPosition({ enableHighAccuracy: true, timeout: 5000 });
      } catch (err: any) {
        // 2. Fallback to Low Accuracy (WiFi/Cell Tower) - Better indoors, less battery
        // Only if error is Timeout (3) or Unavailable (2). 
        // If Permission Denied (1), we stop immediately.
        if (err.code === 2 || err.code === 3) {
          console.warn("High accuracy GPS failed, attempting low accuracy fallback...");
          position = await getPosition({ enableHighAccuracy: false, timeout: 10000 });
        } else {
          throw err;
        }
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
         alert("Password must be at least 6 characters long.");
         return;
     }
     onUpdateClient({ ...currentUser, password: newPass });
     setNewPass('');
     setIsChangePassOpen(false);
     alert("Password updated successfully.");
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

        {/* Check In Modal */}
        {checkInModal.open && (
             <div className="fixed inset-0 z-50 bg-[#3c4a3e]/60 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
                    <h3 className="text-xl font-bold text-stone-800 mb-6">Confirm Check-In</h3>
                    
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
  const [houses, setHouses] = useState<House[]>(MOCK_HOUSES);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [currentUser, setCurrentUser] = useState<Client | null>(null);
  const [authModal, setAuthModal] = useState<{ open: boolean, type: 'ADMIN' | 'RESIDENT' }>({ open: false, type: 'ADMIN' }); 

  // --- Handlers ---

  const handleIntakeSubmit = async (intakeData: IntakeForm) => {
    // Optional: AI Analysis
    await analyzeIntakeRisk(JSON.stringify(intakeData));
    
    const newClient: Client = {
      ...intakeData,
      id: `c${Date.now()}`,
      status: 'active',
      assignedBedId: null,
      assignedHouseId: null, // Intentionally null until manager assigns them, but they have a targetHouseId
      checkInLogs: [],
      drugTestLogs: []
    };

    setClients([...clients, newClient]);
    alert("Application submitted successfully! An admin will review your paperwork.");
    setView('LANDING');
  };

  // Update houses logic (for renaming)
  const handleUpdateHouses = (updatedHouses: House[]) => {
    setHouses(updatedHouses);
  };

  // Handle resident check-in logic
  const handleCheckIn = (log: CheckInLog) => {
    if (!currentUser) return;
    
    const updatedClient = {
      ...currentUser,
      checkInLogs: [log, ...currentUser.checkInLogs]
    };

    // Update in main client list
    setClients(clients.map(c => c.id === currentUser.id ? updatedClient : c));
    // Update current user state
    setCurrentUser(updatedClient);
  };

  const handleClientUpdate = (updatedClient: Client) => {
      setClients(clients.map(c => c.id === updatedClient.id ? updatedClient : c));
      // If the updated client is the current user, update that too
      if (currentUser && currentUser.id === updatedClient.id) {
          setCurrentUser(updatedClient);
      }
  };

  const handleLoginSuccess = (user?: Client) => {
    setAuthModal({ open: false, type: 'ADMIN' });
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
        setClients={setClients}
        onLoginSuccess={handleLoginSuccess}
      />

      {view === 'LANDING' && (
        <LandingPage 
          onNavigate={setView} 
          onRequestLogin={(type) => setAuthModal({ open: true, type })}
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
           setHouses={setHouses}
           clients={clients}
           setClients={setClients}
           onNavigate={setView}
           onUpdateHouses={handleUpdateHouses}
        />
      )}

      {view === 'CLIENT_PORTAL' && currentUser && (
        <ClientPortal 
           currentUser={currentUser}
           onNavigate={setView}
           onCheckIn={handleCheckIn}
           onUpdateClient={handleClientUpdate}
        />
      )}
    </div>
  );
}