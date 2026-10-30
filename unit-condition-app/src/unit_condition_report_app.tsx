import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  MinusCircle, 
  Save, 
  Send, 
  Search, 
  Printer, 
  Trash2, 
  Eye, 
  Building2, 
  ClipboardCheck, 
  Home, 
  ShieldAlert, 
  ChevronDown, 
  ChevronRight, 
  Filter, 
  User, 
  Calendar, 
  MapPin, 
  Info,
  Check,
  RotateCcw,
  Plus
} from 'lucide-react';

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "demo-api-key",
      authDomain: "demo-app.firebaseapp.com",
      projectId: "demo-app",
      storageBucket: "demo-app.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:abcdef"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'portland-condition-report-app';

// --- INITIAL FORM ITEM DATA SCHEMA (CUSTOMIZED FOR 1 BEDROOM / 1 BATHROOM) ---
const ROOM_SECTIONS = [
  {
    id: 'living_room',
    title: '1. Living Room / Entry',
    items: [
      'Walls', 'Ceiling', 'Floor Material', 'Doors', 'Door Frames', 'Knobs', 'Locks',
      'Sliding Door', 'Screens', 'Window Coverings', 'Curtain Rods', 'Light Fixtures',
      'Ceiling Fan', 'Bulbs', 'Electric Outlets', 'Switches', 'Outlet/Switch Covers',
      'Heater', 'Thermostat', 'Fireplace', 'Hooks and Rods', 'Window Unit Air Conditioner'
    ]
  },
  {
    id: 'kitchen_dining',
    title: '2. Kitchen / Dining Room',
    items: [
      'Walls', 'Ceiling', 'Floor Material', 'Sliding Door', 'Screens', 'Window Coverings',
      'Curtain Rods', 'Light Fixtures', 'Ceiling Fan', 'Bulbs', 'Electric Outlets', 'Switches',
      'Outlet/Switch Covers', 'Heater', 'Thermostat', 'Cabinetry', 'Cabinetry/Drawer Pulls',
      'Countertops', 'Backsplash', 'Sink', 'Faucet', 'Garbage Disposal', 'Oven/Stove',
      'Drip Pans', 'Hood Fan', 'Refrigerator', 'Dishwasher', 'Microwave', 'Hooks and Rods',
      'Window Unit Air Conditioner'
    ]
  },
  {
    id: 'storage_other',
    title: '3. Storage / Other',
    items: [
      'Doors', 'Door Frames', 'Knobs', 'Locks', 'Light Fixtures', 'Bulbs', 'Electric Outlets',
      'Switches', 'Outlet/Switch Covers', 'Heater', 'Thermostat', 'Washer', 'Dryer',
      'Deck/Patio', 'Hooks and Rods', 'Window Unit Air Conditioner'
    ]
  },
  {
    id: 'bedroom',
    title: '4. Bedroom',
    items: [
      'Walls', 'Ceiling', 'Floor Material', 'Doors', 'Door Frames', 'Closet Doors', 'Knobs',
      'Locks', 'Sliding Door', 'Screens', 'Window Coverings', 'Curtain Rods', 'Light Fixtures',
      'Ceiling Fan', 'Bulbs', 'Electric Outlets', 'Switches', 'Outlet/Switch Covers',
      'Heater', 'Thermostat', 'Hooks and Rods', 'Window Unit Air Conditioner'
    ]
  },
  {
    id: 'bathroom',
    title: '5. Bathroom',
    items: [
      'Walls', 'Ceiling', 'Floor Material', 'Doors', 'Door Frames', 'Knobs', 'Locks',
      'Screens', 'Window Coverings', 'Curtain Rods', 'Light Fixtures', 'Bulbs', 'Electric Outlets',
      'Switches', 'Outlet/Switch Covers', 'Sink', 'Faucet', 'Cabinetry', 'Cabinetry/Drawer Pulls',
      'Countertops', 'Mirror/Med Cabinet', 'Toilet', 'Toilet Seat', 'Shower/Tub',
      'Shower/Tub Surround', 'Showerhead', 'Tub Faucet', 'Towel Bars', 'Toilet Paper Holder',
      'Shower Rod', 'Fan', 'Heater', 'Thermostat', 'Hooks and Rods'
    ]
  },
  {
    id: 'essential_services',
    title: '6. Essential Services',
    items: [
      'Plumbing', 'Heating', 'Electricity', 'Water Heater', 'Gas'
    ]
  }
];

const INITIAL_GENERAL_INFO = {
  moveInDate: new Date().toISOString().split('T')[0],
  propertyNameNum: '',
  residentNames: '',
  unitNumber: '',
  streetAddress: '',
  city: 'Portland',
  state: 'OR',
  zip: '',
  numBedrooms: '1',
  numBathrooms: '1',
  dateDueToOwner: ''
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('form'); // 'form' | 'reports' | 'wear_tear'
  const [reports, setReports] = useState([]);
  const [currentReportId, setCurrentReportId] = useState(null);
  const [generalInfo, setGeneralInfo] = useState(INITIAL_GENERAL_INFO);
  
  // Checklist status structure: { sectionId: { itemIndex: { status: 'ACCEPTABLE'|'ISSUE'|'NA', note: '' } } }
  const [checklist, setChecklist] = useState({});
  const [additionalNotes, setAdditionalNotes] = useState('');
  
  // Signatures & Addenda
  const [residentSignature, setResidentSignature] = useState({ name: '', date: '', agreed: false });
  const [ownerSignature, setOwnerSignature] = useState({ name: '', date: '', agreed: false });
  const [wearAndTearAck, setWearAndTearAck] = useState(false);
  const [cleaningThresholds, setCleaningThresholds] = useState({
    under1000SqFt: '2',
    sqFt1001To2000: '4',
    over2000SqFt: '6',
    maxCharge: ''
  });

  // UI States
  const [openSection, setOpenSection] = useState('general');
  const [toast, setToast] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReportForView, setSelectedReportForView] = useState(null);

  // Initialize Auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Initialize Firestore listener
  useEffect(() => {
    if (!user) return;
    const publicCollection = collection(db, 'artifacts', appId, 'public', 'data', 'condition_reports');
    
    const unsubscribe = onSnapshot(publicCollection, (snapshot) => {
      const fetchedReports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort newest first
      fetchedReports.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setReports(fetchedReports);
    }, (error) => {
      console.error("Firestore error:", error);
      showToast('Error loading saved reports from cloud', 'error');
    });

    return () => unsubscribe();
  }, [user]);

  // Helper to show temporary toasts
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Helper to update item state
  const handleItemStatusChange = (sectionId, itemIdx, status) => {
    setChecklist(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [itemIdx]: {
          ...prev[sectionId]?.[itemIdx],
          status
        }
      }
    }));
  };

  const handleItemNoteChange = (sectionId, itemIdx, note) => {
    setChecklist(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [itemIdx]: {
          ...prev[sectionId]?.[itemIdx],
          note
        }
      }
    }));
  };

  // Bulk mark section
  const setAllSectionStatus = (sectionId, itemsCount, status) => {
    setChecklist(prev => {
      const sectionData = { ...prev[sectionId] };
      for (let i = 0; i < itemsCount; i++) {
        sectionData[i] = {
          ...sectionData[i],
          status
        };
      }
      return { ...prev, [sectionId]: sectionData };
    });
  };

  // Save report (Draft or Final)
  const saveReport = async (isFinal = false) => {
    if (!user) {
      showToast('Authentication required to save report', 'error');
      return;
    }

    if (!generalInfo.unitNumber || !generalInfo.propertyNameNum || !generalInfo.residentNames) {
      showToast('Please complete key General Info fields (Property, Resident, Unit #)', 'error');
      setOpenSection('general');
      return;
    }

    setIsSaving(true);
    const reportData = {
      generalInfo,
      checklist,
      additionalNotes,
      residentSignature,
      ownerSignature,
      wearAndTearAck,
      cleaningThresholds,
      status: isFinal ? 'Submitted' : 'Draft',
      updatedAt: new Date().toISOString(),
      createdAt: currentReportId ? (reports.find(r => r.id === currentReportId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      createdBy: user.uid
    };

    try {
      if (currentReportId) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'condition_reports', currentReportId);
        await setDoc(docRef, reportData, { merge: true });
        showToast(isFinal ? 'Report submitted successfully!' : 'Draft saved successfully!');
      } else {
        const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'condition_reports');
        const docRef = await addDoc(colRef, reportData);
        setCurrentReportId(docRef.id);
        showToast(isFinal ? 'Report submitted & stored!' : 'Draft created & saved!');
      }
    } catch (err) {
      console.error("Save error:", err);
      showToast('Failed to save report. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Load a report into form
  const loadReportIntoForm = (report) => {
    setCurrentReportId(report.id);
    setGeneralInfo(report.generalInfo || INITIAL_GENERAL_INFO);
    setChecklist(report.checklist || {});
    setAdditionalNotes(report.additionalNotes || '');
    setResidentSignature(report.residentSignature || { name: '', date: '', agreed: false });
    setOwnerSignature(report.ownerSignature || { name: '', date: '', agreed: false });
    setWearAndTearAck(report.wearAndTearAck || false);
    setCleaningThresholds(report.cleaningThresholds || { under1000SqFt: '2', sqFt1001To2000: '4', over2000SqFt: '6', maxCharge: '' });
    setActiveTab('form');
    setOpenSection('general');
    showToast(`Loaded Report for Unit ${report.generalInfo?.unitNumber || ''}`);
  };

  // Reset Form
  const resetForm = () => {
    if (window.confirm("Are you sure you want to clear the form? Unsaved changes will be lost.")) {
      setCurrentReportId(null);
      setGeneralInfo(INITIAL_GENERAL_INFO);
      setChecklist({});
      setAdditionalNotes('');
      setResidentSignature({ name: '', date: '', agreed: false });
      setOwnerSignature({ name: '', date: '', agreed: false });
      setWearAndTearAck(false);
      showToast('Form reset to blank state');
    }
  };

  // Delete Report
  const handleDeleteReport = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this condition report record?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'condition_reports', id));
      if (currentReportId === id) {
        setCurrentReportId(null);
      }
      showToast('Report deleted');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete report', 'error');
    }
  };

  // Filtered reports calculation
  const filteredReports = useMemo(() => {
    if (!searchTerm.trim()) return reports;
    const term = searchTerm.toLowerCase();
    return reports.filter(r => 
      (r.generalInfo?.residentNames || '').toLowerCase().includes(term) ||
      (r.generalInfo?.propertyNameNum || '').toLowerCase().includes(term) ||
      (r.generalInfo?.unitNumber || '').toLowerCase().includes(term) ||
      (r.generalInfo?.streetAddress || '').toLowerCase().includes(term)
    );
  }, [reports, searchTerm]);

  // Calculate statistics for checklist progress
  const completionStats = useMemo(() => {
    let totalItems = 0;
    let completedItems = 0;
    let issuesFound = 0;

    ROOM_SECTIONS.forEach(sec => {
      sec.items.forEach((_, idx) => {
        totalItems++;
        const itemState = checklist[sec.id]?.[idx];
        if (itemState?.status) {
          completedItems++;
          if (itemState.status === 'ISSUE') issuesFound++;
        }
      });
    });

    return {
      totalItems,
      completedItems,
      issuesFound,
      percent: Math.round((completedItems / totalItems) * 100)
    };
  }, [checklist]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12 print:bg-white print:text-black print:pb-0">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-white transition-all transform duration-300 ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      {/* HEADER BAR - Hidden in Print */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 print:hidden shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-sm">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-wide">Rental Unit Condition Report</h1>
              <p className="text-xs text-slate-400">City of Portland, Oregon • 1 Bed / 1 Bath Layout</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveTab('form')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'form' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>{currentReportId ? 'Edit Report' : 'New Report'}</span>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'reports' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Saved Reports ({reports.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('wear_tear')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'wear_tear' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Wear & Tear Guide</span>
            </button>
          </nav>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {/* ----------------- TAB 1: FORM CHECKLIST ----------------- */}
        {activeTab === 'form' && (
          <div className="space-y-6">
            
            {/* Top Toolbar Actions */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="text-slate-500">Progress: </span>
                  <span className="font-bold text-slate-800">{completionStats.percent}%</span>
                  <span className="text-xs text-slate-400 ml-1">({completionStats.completedItems}/{completionStats.totalItems} items)</span>
                </div>
                {completionStats.issuesFound > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    {completionStats.issuesFound} Issue{completionStats.issuesFound > 1 ? 's' : ''} Noted
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-sm font-medium transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print View</span>
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => saveReport(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Draft</span>
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => saveReport(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Final</span>
                </button>
              </div>
            </div>

            {/* PRINT-ONLY HEADER */}
            <div className="hidden print:block mb-6 border-b-2 border-black pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-bold uppercase tracking-wider">RENTAL UNIT CONDITION REPORT</h1>
                  <h2 className="text-base font-semibold">CITY OF PORTLAND, OREGON MOVE-IN CONDITION REPORT (1 BED / 1 BATH)</h2>
                  <p className="text-xs text-gray-600">Form M524 OR & Addenda Compliance Document</p>
                </div>
                <div className="text-right text-xs">
                  <p>Move-In Date: <strong>{generalInfo.moveInDate || 'N/A'}</strong></p>
                  <p>Unit #: <strong>{generalInfo.unitNumber || 'N/A'}</strong></p>
                  <p>Status: <strong>{currentReportId ? 'Official Saved Record' : 'Draft Copy'}</strong></p>
                </div>
              </div>
            </div>

            {/* SECTION 1: GENERAL INFORMATION */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setOpenSection(openSection === 'general' ? null : 'general')}
                className="w-full px-6 py-4 bg-slate-50 hover:bg-slate-100/80 border-b border-slate-200 text-left flex items-center justify-between font-semibold text-slate-800 transition print:bg-transparent print:border-b-2"
              >
                <div className="flex items-center gap-2">
                  <Home className="w-5 h-5 text-indigo-600 print:hidden" />
                  <span className="text-base">Move-In General Details & Property Header</span>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                  <span className="text-xs text-slate-500 font-normal">
                    {generalInfo.unitNumber ? `Unit ${generalInfo.unitNumber}` : 'Required Info'}
                  </span>
                  {openSection === 'general' ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </div>
              </button>

              {(openSection === 'general' || true) && (
                <div className={`p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${openSection === 'general' ? 'block' : 'hidden print:grid'}`}>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Move-In Date *</label>
                    <input
                      type="date"
                      value={generalInfo.moveInDate}
                      onChange={e => setGeneralInfo({ ...generalInfo, moveInDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 print:border-none print:p-0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Property Name / Number *</label>
                    <input
                      type="text"
                      placeholder="e.g. Oakridge Apartments #402"
                      value={generalInfo.propertyNameNum}
                      onChange={e => setGeneralInfo({ ...generalInfo, propertyNameNum: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 print:border-none print:p-0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Resident Name(s) *</label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe & Jane Smith"
                      value={generalInfo.residentNames}
                      onChange={e => setGeneralInfo({ ...generalInfo, residentNames: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 print:border-none print:p-0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Unit Number *</label>
                    <input
                      type="text"
                      placeholder="e.g. 3B"
                      value={generalInfo.unitNumber}
                      onChange={e => setGeneralInfo({ ...generalInfo, unitNumber: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 print:border-none print:p-0"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Street Address</label>
                    <input
                      type="text"
                      placeholder="e.g. 1234 SW Broadway"
                      value={generalInfo.streetAddress}
                      onChange={e => setGeneralInfo({ ...generalInfo, streetAddress: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 print:border-none print:p-0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">City / State / Zip</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={generalInfo.city}
                        onChange={e => setGeneralInfo({ ...generalInfo, city: e.target.value })}
                        className="w-2/4 px-2 py-2 text-sm border border-slate-300 rounded-lg print:border-none print:p-0"
                      />
                      <input
                        type="text"
                        value={generalInfo.state}
                        onChange={e => setGeneralInfo({ ...generalInfo, state: e.target.value })}
                        className="w-1/4 px-2 py-2 text-sm border border-slate-300 rounded-lg print:border-none print:p-0"
                      />
                      <input
                        type="text"
                        placeholder="Zip"
                        value={generalInfo.zip}
                        onChange={e => setGeneralInfo({ ...generalInfo, zip: e.target.value })}
                        className="w-1/4 px-2 py-2 text-sm border border-slate-300 rounded-lg print:border-none print:p-0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Date Due To Owner/Agent</label>
                    <input
                      type="date"
                      value={generalInfo.dateDueToOwner}
                      onChange={e => setGeneralInfo({ ...generalInfo, dateDueToOwner: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 print:border-none print:p-0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1"># of Bedrooms</label>
                    <select
                      value={generalInfo.numBedrooms}
                      onChange={e => setGeneralInfo({ ...generalInfo, numBedrooms: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 print:border-none print:p-0"
                    >
                      <option value="Studio">Studio</option>
                      <option value="1">1 Bed</option>
                      <option value="2">2 Beds</option>
                      <option value="3">3 Beds</option>
                      <option value="4+">4+ Beds</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1"># of Bathrooms</label>
                    <select
                      value={generalInfo.numBathrooms}
                      onChange={e => setGeneralInfo({ ...generalInfo, numBathrooms: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 print:border-none print:p-0"
                    >
                      <option value="1">1 Bath</option>
                      <option value="1.5">1.5 Baths</option>
                      <option value="2">2 Baths</option>
                      <option value="2.5+">2.5+ Baths</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* CHECKLIST SECTIONS ACCORDION */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-bold text-slate-800">Unit Condition Checklist</h2>
                <span className="text-xs text-slate-500 print:hidden">Select status for each item or use quick fill buttons</span>
              </div>

              {ROOM_SECTIONS.map((section) => {
                const isOpen = openSection === section.id;
                const sectionData = checklist[section.id] || {};
                
                // Calculate completion for this section
                const filledCount = section.items.filter((_, idx) => sectionData[idx]?.status).length;
                const issueCount = section.items.filter((_, idx) => sectionData[idx]?.status === 'ISSUE').length;

                return (
                  <div 
                    key={section.id} 
                    className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all print:border-b print:border-slate-300"
                  >
                    {/* Accordion Header */}
                    <div 
                      onClick={() => setOpenSection(isOpen ? null : section.id)}
                      className="w-full px-6 py-3.5 bg-slate-50 hover:bg-slate-100/80 border-b border-slate-200 text-left flex items-center justify-between cursor-pointer transition select-none print:bg-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-800 text-sm sm:text-base">{section.title}</span>
                        {issueCount > 0 && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                            {issueCount} Issue{issueCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 print:hidden">
                        <span className="text-xs text-slate-500">
                          {filledCount}/{section.items.length} done
                        </span>
                        {isOpen ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                      </div>
                    </div>

                    {/* Accordion Body */}
                    {(isOpen || true) && (
                      <div className={`p-4 sm:p-6 ${isOpen ? 'block' : 'hidden print:block'}`}>
                        
                        {/* Quick Action Bar for entire section */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100 print:hidden">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quick Fill Section:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setAllSectionStatus(section.id, section.items.length, 'ACCEPTABLE')}
                              className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200 transition"
                            >
                              Mark All Acceptable
                            </button>
                            <button
                              type="button"
                              onClick={() => setAllSectionStatus(section.id, section.items.length, 'NA')}
                              className="px-2.5 py-1 text-xs font-medium bg-slate-50 text-slate-600 hover:bg-slate-100 rounded border border-slate-200 transition"
                            >
                              Mark All N/A
                            </button>
                          </div>
                        </div>

                        {/* Items Grid/List */}
                        <div className="space-y-3">
                          {section.items.map((itemName, itemIdx) => {
                            const currentItem = sectionData[itemIdx] || { status: '', note: '' };

                            return (
                              <div 
                                key={itemIdx}
                                className={`p-3 rounded-lg border transition ${
                                  currentItem.status === 'ISSUE' 
                                    ? 'bg-amber-50/50 border-amber-200' 
                                    : currentItem.status === 'ACCEPTABLE'
                                    ? 'bg-slate-50/50 border-slate-200'
                                    : 'bg-white border-slate-100'
                                } flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:py-1 print:px-0 print:border-b print:border-slate-100 print:rounded-none`}
                              >
                                <div className="sm:w-1/3">
                                  <span className="text-sm font-medium text-slate-800">
                                    {itemIdx + 1}. {itemName}
                                  </span>
                                </div>

                                {/* Status Radio Buttons */}
                                <div className="flex items-center space-x-1 sm:space-x-2 print:space-x-4">
                                  <button
                                    type="button"
                                    onClick={() => handleItemStatusChange(section.id, itemIdx, 'ACCEPTABLE')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 transition ${
                                      currentItem.status === 'ACCEPTABLE'
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    } print:border-none print:p-0`}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Acceptable</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleItemStatusChange(section.id, itemIdx, 'ISSUE')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 transition ${
                                      currentItem.status === 'ISSUE'
                                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    } print:border-none print:p-0`}
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>Issue Noted</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleItemStatusChange(section.id, itemIdx, 'NA')}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 transition ${
                                      currentItem.status === 'NA'
                                        ? 'bg-slate-700 text-white border-slate-700'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    } print:border-none print:p-0`}
                                  >
                                    <MinusCircle className="w-3.5 h-3.5" />
                                    <span>N/A</span>
                                  </button>
                                </div>

                                {/* Issue Description Input */}
                                <div className="sm:w-1/3">
                                  <input
                                    type="text"
                                    placeholder={currentItem.status === 'ISSUE' ? "Describe issue noted..." : "Note (optional)"}
                                    value={currentItem.note || ''}
                                    onChange={e => handleItemNoteChange(section.id, itemIdx, e.target.value)}
                                    className={`w-full px-3 py-1.5 text-xs rounded-lg border transition ${
                                      currentItem.status === 'ISSUE'
                                        ? 'border-amber-300 focus:ring-2 focus:ring-amber-500 bg-white'
                                        : 'border-slate-200 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50'
                                    } print:border-none print:bg-transparent`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* SECTION 10: ADDITIONAL NOTES */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-base font-bold text-slate-800 mb-2">Additional Notes / Comments</h3>
              <p className="text-xs text-slate-500 mb-3">Provide any extra context, key codes, or specific general unit notes here.</p>
              <textarea
                rows={4}
                placeholder="Enter any additional notes..."
                value={additionalNotes}
                onChange={e => setAdditionalNotes(e.target.value)}
                className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 print:border-slate-400"
              />
            </div>

            {/* WEAR & TEAR ADDENDUM SUMMARY & ACKNOWLEDGMENT */}
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Info className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base font-bold text-indigo-950">City of Portland Wear and Tear Addendum Notice</h3>
                  <p className="text-xs text-indigo-800/80 leading-relaxed mt-1">
                    Resident is liable for damages beyond normal wear and tear. Cleaning excess limits: Under 1,000 sq ft ({cleaningThresholds.under1000SqFt} hrs), 1,001-2,000 sq ft ({cleaningThresholds.sqFt1001To2000} hrs), 2,001+ sq ft ({cleaningThresholds.over2000SqFt} hrs). Painting is charged if painted non-original colors. Repairs for nail holes beyond reasonable devices will be billed.
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-indigo-200 cursor-pointer hover:bg-indigo-50/30 transition">
                <input
                  type="checkbox"
                  checked={wearAndTearAck}
                  onChange={e => setWearAndTearAck(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-slate-800">
                  I acknowledge receipt and understanding of the City of Portland Wear and Tear Addendum terms (Form M532 OR).
                </span>
              </label>
            </div>

            {/* SIGNATURES & STATEMENT */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3">Signatures & Acceptances</h3>

              {/* Resident Sign Off */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-700 italic">
                  "RESIDENT: I accept this unit in clean condition and good repair except as noted above."
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Resident Typed E-Signature *</label>
                    <input
                      type="text"
                      placeholder="Type full legal name"
                      value={residentSignature.name}
                      onChange={e => setResidentSignature({ ...residentSignature, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-serif print:border-none print:p-0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Date Signed</label>
                    <input
                      type="date"
                      value={residentSignature.date}
                      onChange={e => setResidentSignature({ ...residentSignature, date: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 print:border-none print:p-0"
                    />
                  </div>
                </div>
              </div>

              {/* Owner/Agent Sign Off */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ownerSignature.agreed}
                    onChange={e => setOwnerSignature({ ...ownerSignature, agreed: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Owner/Agent accepts and agrees with the conditions noted above.
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Owner / Agent E-Signature</label>
                    <input
                      type="text"
                      placeholder="Type agent/owner name"
                      value={ownerSignature.name}
                      onChange={e => setOwnerSignature({ ...ownerSignature, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-serif print:border-none print:p-0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Date Signed</label>
                    <input
                      type="date"
                      value={ownerSignature.date}
                      onChange={e => setOwnerSignature({ ...ownerSignature, date: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 print:border-none print:p-0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 print:hidden">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => saveReport(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold shadow-sm transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Draft</span>
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => saveReport(true)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md transition flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Submit Final Report</span>
              </button>
            </div>

          </div>
        )}

        {/* ----------------- TAB 2: SAVED REPORTS DASHBOARD ----------------- */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            
            {/* Header & Search Bar */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Saved Condition Reports</h2>
                <p className="text-xs text-slate-500">View, search, edit, or print submitted unit reports stored in cloud</p>
              </div>

              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search resident, property, unit..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Reports List Grid */}
            {filteredReports.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-700">No Reports Found</h3>
                <p className="text-xs text-slate-500 mt-1">Start by filling out a new condition report in the main tab.</p>
                <button
                  onClick={() => setActiveTab('form')}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition"
                >
                  Create New Report
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredReports.map((report) => (
                  <div 
                    key={report.id} 
                    className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          report.status === 'Submitted' 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {report.status || 'Draft'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(report.updatedAt || report.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-800 text-base leading-snug">
                        Unit {report.generalInfo?.unitNumber || 'N/A'} - {report.generalInfo?.propertyNameNum || 'Unnamed Property'}
                      </h3>
                      
                      <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{report.generalInfo?.residentNames || 'No resident specified'}</span>
                      </p>

                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{report.generalInfo?.streetAddress || 'Portland, OR'}</span>
                      </p>
                    </div>

                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => setSelectedReportForView(report)}
                        className="text-xs font-medium text-slate-600 hover:text-indigo-600 flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Quick View</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => loadReportIntoForm(report)}
                          className="px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-200 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => handleDeleteReport(report.id, e)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                          title="Delete Report"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* QUICK VIEW MODAL */}
            {selectedReportForView && (
              <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">
                        Unit {selectedReportForView.generalInfo?.unitNumber} Summary
                      </h3>
                      <p className="text-xs text-slate-500">{selectedReportForView.generalInfo?.propertyNameNum}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedReportForView(null)}
                      className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg">
                      <div><strong>Resident:</strong> {selectedReportForView.generalInfo?.residentNames}</div>
                      <div><strong>Move-In Date:</strong> {selectedReportForView.generalInfo?.moveInDate}</div>
                      <div><strong>Address:</strong> {selectedReportForView.generalInfo?.streetAddress}</div>
                      <div><strong>Status:</strong> {selectedReportForView.status}</div>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-700 mb-1">Noted Issues Across Checklist:</h4>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {ROOM_SECTIONS.flatMap(sec => 
                          sec.items.map((itemName, idx) => {
                            const item = selectedReportForView.checklist?.[sec.id]?.[idx];
                            if (item?.status === 'ISSUE') {
                              return (
                                <div key={`${sec.id}-${idx}`} className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-900 flex justify-between">
                                  <span><strong>{sec.title} - {itemName}:</strong> {item.note || 'No description entered'}</span>
                                </div>
                              );
                            }
                            return null;
                          })
                        ).filter(Boolean).length === 0 ? (
                          <p className="text-slate-400 italic">No specific issues noted in checklist.</p>
                        ) : null}
                      </div>
                    </div>

                    {selectedReportForView.additionalNotes && (
                      <div>
                        <h4 className="font-bold text-slate-700 mb-1">Additional Notes:</h4>
                        <p className="p-2 bg-slate-50 rounded text-slate-600">{selectedReportForView.additionalNotes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        loadReportIntoForm(selectedReportForView);
                        setSelectedReportForView(null);
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700"
                    >
                      Open Full Form
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ----------------- TAB 3: WEAR & TEAR REFERENCE GUIDE ----------------- */}
        {activeTab === 'wear_tear' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <span className="px-2.5 py-1 text-xs font-semibold bg-indigo-100 text-indigo-800 rounded-md">
                City of Portland, Oregon • Form M532 OR
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-2">Wear and Tear Addendum Guidelines</h2>
              <p className="text-xs text-slate-500 mt-1">
                Objective criteria for distinguishing normal wear and tear from tenant-attributable damages under Portland rental standards.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <h3 className="font-bold text-red-900 flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Never Considered Normal Wear & Tear
                  </h3>
                  <ul className="list-disc list-inside text-xs text-red-800 space-y-1.5">
                    <li>Smoke damage of any type (tobacco, vape, or fire).</li>
                    <li>Resident painting with any color other than the original base color.</li>
                    <li>Damage caused by pets, unauthorized animals, or assistance animals.</li>
                    <li>Unrepaired wall holes from large anchors, TV mounts, or shelving brackets.</li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-2">Cleaning Guidelines</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-2">
                    Resident must regularly clean the premises. At move-out, the entire unit must be cleaned including sweeping, mopping, vacuuming, and cleaning all appliances/sinks.
                  </p>
                  <div className="text-xs bg-white p-3 rounded border border-slate-200 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Under 1,000 sq ft:</span>
                      <span className="font-semibold text-slate-800">Excess beyond 2 hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">1,001 - 2,000 sq ft:</span>
                      <span className="font-semibold text-slate-800">Excess beyond 4 hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">2,001+ sq ft:</span>
                      <span className="font-semibold text-slate-800">Excess beyond 6 hours</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-2">Painting & Wall Repairs</h3>
                  <p className="text-xs text-slate-600 leading-relaxed space-y-2">
                    <span>
                      Residents are expected to wipe down walls and remove nails/screws. Small holes from standard 3d nail picture hangers are acceptable in reasonable quantities.
                    </span>
                    <br /><br />
                    <strong className="text-slate-800">Important:</strong> Residents should <em>not</em> attempt to patch holes themselves as improper patching often causes larger areas requiring professional repaint.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-2">Flooring Material Repairs</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Under ORS 90.300(7)(c), security deposit deductions apply to discrete impacted areas requiring repair or replacement beyond ordinary wear and tear, rather than whole unit replacement when unneeded.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}