import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../App';
import { DocumentType, ShipmentStatus } from '../types';
import { Logo } from '../constants';
import { extractBankPermitData, extractFormFields } from '../geminiService';
import { supabase } from '../supabaseClient';

// --- Sub-components for the Fillable Document ---

interface FormFieldProps {
  label: string;
  value: string | number;
  onChange: (val: string) => void;
  className?: string;
  type?: string;
  readOnly?: boolean;
  highlighted?: boolean;
}

const DocInput: React.FC<FormFieldProps> = ({
  label,
  value,
  onChange,
  className = '',
  type = 'text',
  readOnly = false,
  highlighted = false,
}) => (
  <div className={`flex border-b border-black last:border-b-0 ${className} ${highlighted ? 'bg-blue-50/30' : ''}`}>
    <div className="bg-[#f3f3f3] px-2 py-1.5 border-r border-black text-[8px] font-black text-black uppercase flex items-center w-32 shrink-0">
      {label}
    </div>
    <div className="relative flex-1 group">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className={`px-3 py-1.5 text-[10px] font-bold text-black w-full outline-none focus:bg-blue-50 transition-colors bg-transparent ${
          readOnly ? 'bg-gray-50' : 'cursor-text'
        }`}
      />
      {!readOnly && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none">
          <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </div>
      )}
    </div>
  </div>
);

const DocArea: React.FC<FormFieldProps> = ({ label, value, onChange, className = '' }) => (
  <div className={`flex border-b border-black last:border-b-0 ${className}`}>
    <div className="bg-[#f3f3f3] px-2 py-1.5 border-r border-black text-[8px] font-black text-black uppercase flex items-start w-32 shrink-0">
      {label}
    </div>
    <textarea
      value={String(value)}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 text-[10px] font-bold text-black flex-1 outline-none focus:bg-blue-50/50 transition-colors bg-white h-12 resize-none"
    />
  </div>
);

// --- Main Component ---

const FormsHub: React.FC = () => {
  const { state, updateShipmentStatus, addDocument, updateDocument } = useApp();
  const location = useLocation();

  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [selectedBuyerId, setSelectedBuyerId] = useState('');
  const [activeTab, setActiveTab] = useState<DocumentType>('Sales Contract');
  const [successMsg, setSuccessMsg] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const permitFileInputRef = useRef<HTMLInputElement>(null);
  const documentFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!location.state) return;
    const navState = location.state as any;
    if (navState.shipmentId) setSelectedShipmentId(navState.shipmentId);
    if (navState.buyerId) setSelectedBuyerId(navState.buyerId);
    if (navState.activeTab) setActiveTab(navState.activeTab);
  }, [location.state]);

  const selectedShipment = useMemo(
    () => state.shipments.find((s) => s.id === selectedShipmentId),
    [state.shipments, selectedShipmentId]
  );

  const selectedBuyer = useMemo(() => {
    if (selectedShipment?.buyerId) {
      return state.buyers.find((b) => b.id === selectedShipment.buyerId);
    }
    if (selectedShipment?.buyerName) {
      return state.buyers.find((b) => b.name === selectedShipment.buyerName);
    }
    if (selectedBuyerId) {
      return state.buyers.find((b) => b.id === selectedBuyerId);
    }
    return undefined;
  }, [state.buyers, selectedShipment, selectedBuyerId]);

  useEffect(() => {
    if (selectedShipment?.buyerId) {
      setSelectedBuyerId(selectedShipment.buyerId);
      return;
    }
    if (selectedShipment?.buyerName) {
      const matchedBuyer = state.buyers.find((b) => b.name === selectedShipment.buyerName);
      if (matchedBuyer) {
        setSelectedBuyerId(matchedBuyer.id);
        return;
      }
    }
    if (!selectedShipment) {
      setSelectedBuyerId('');
    }
  }, [selectedShipment, state.buyers]);

  const [formData, setFormData] = useState<any>({
    tin: '0000178528',
    license: '14/670/24450/2004 (BL)',
    sellerName: 'TOMOCA COFFEE PLC',
    address: 'ADDIS ABABA ARADA NO WOREDA-139 WOREDA 01, 858/3, 24615',
    appRef: '0000178528/25/117',
    refDate: '2025-10-22',
    appNo: 'ECTA/25/5701',
    lpcoRef: 'ECTA/25/5701/CF1',
    contractNo: '',
    buyerName: '',
    buyerCountry: '',
    buyerAddress: 'SEOUL, SOUTH KOREA',
    contractDate: '2025-10-15',
    partialShipment: 'Not allowed',
    cbra: 'Bank of Abyssinia',
    branch: 'Sales Contract Agreement Department',
    packing: '500gr - BAR - Dark Roast Beans (500kg)',
    itemCount: 0,
    shipmentDateRange: '23/10/2025 ~ 31/12/2025',
    incoterms: 'FOB',
    paymentTerms: 'Advance Payment (TT)',
    totalAmount: 0,
    hsCode: '09012100',
    quantity: 0,
    netWeight: 0,
    grossWeight: 0,
    packages: 0,
    approver: 'Tizazu Edossa',
    lpcoId: 'fbe4333d92',
    invoiceNo: '0036',
    invoiceDate: '2025-10-24',
    orderNo: 'Against Advance Payment',
    iecNo: '0000178528',
    binNo: '14/670/24450/2004',
    originCountry: 'ETHIOPIA',
    finalDestination: 'SOUTH KOREA',
    preCarriage: 'By Air',
    placeOfReceipt: 'Bole Int. Airport, Addis Ababa',
    vesselFlight: 'ET 672',
    portOfLoading: 'ADDIS ABABA AIRPORT',
    portOfDischarge: 'SEOUL, SOUTH KOREA',
    bankAccount: '108343068',
    swiftCode: 'ABYSETAA',
    marksDescription: 'TOMOCA COFFEE PLC.',
    kindOfPkgs: 'Carton',
    commodityDescription: 'Roasted Ethiopian Coffee',
    unitPrice: 14.0,
    amountInWords: 'Fourteen Thousand USD Only',
  });

  const structuredTabs: DocumentType[] = [
    'Sales Contract',
    'Proforma Invoice',
    'Commercial Invoice',
    'Packing List',
  ];

  const requiresStructuredFields = structuredTabs.includes(activeTab);

  const existingDoc = useMemo(() => {
    if (!selectedShipmentId) return undefined;
    return state.documents.find(
      (d) => d.type === activeTab && d.shipmentId === selectedShipmentId
    );
  }, [state.documents, activeTab, selectedShipmentId]);

  useEffect(() => {
    if (existingDoc?.content) {
      setFormData((prev: any) => ({ ...prev, ...existingDoc.content }));
      return;
    }

    if (selectedShipment) {
      setFormData((prev: any) => ({
        ...prev,
        buyerName: (selectedBuyer?.name || selectedShipment.buyerName || '').toUpperCase(),
        buyerCountry: selectedBuyer?.country || selectedShipment.destination || '',
        buyerAddress: selectedBuyer ? `${selectedBuyer.country.toUpperCase()} REGIONAL OFFICE` : prev.buyerAddress,
        totalAmount: selectedShipment.value || 0,
        contractNo: `ECTA/${selectedShipment.id.slice(0, 8).toUpperCase()}`,
        incoterms: selectedShipment.incoterms || 'FOB',
        paymentTerms: selectedShipment.paymentTerms || 'Advance Payment (TT)',
      }));
      return;
    }

    if (selectedBuyer) {
      setFormData((prev: any) => ({
        ...prev,
        buyerName: selectedBuyer.name.toUpperCase(),
        buyerCountry: selectedBuyer.country,
        buyerAddress: `${selectedBuyer.country.toUpperCase()} REGIONAL OFFICE`,
        totalAmount: 0,
        contractNo: `ECTA/NEW-${selectedBuyer.id.slice(0, 4).toUpperCase()}`,
      }));
    }
  }, [existingDoc, selectedShipment, selectedBuyer]);

  const updateField = (key: string, val: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: val }));
  };

  const uploadSelectedFile = async (shipmentId: string) => {
    if (!documentFile || !supabase) return undefined;

    const safeName = `${Date.now()}-${documentFile.name.replace(/\s+/g, '-')}`;
    const storagePath = `${shipmentId}/${safeName}`;

    const { error } = await supabase.storage
      .from('documents')
      .upload(storagePath, documentFile, { upsert: true });

    if (error) throw error;

    return storagePath;
  };

  const persistFormDocument = async (mode: 'Draft' | 'Final') => {
    if (!selectedShipmentId) {
      alert('Please select a shipment first. Buyer will sync automatically.');
      return;
    }

    setSaving(true);

    try {
      const storagePath = await uploadSelectedFile(selectedShipmentId);

      const payload = {
        id: existingDoc ? existingDoc.id : `DOC-${Math.floor(Math.random() * 9000) + 1000}`,
        shipmentId: selectedShipmentId,
        buyerId: selectedBuyerId || selectedBuyer?.id || undefined,
        name: `${activeTab} #${selectedShipmentId}${mode === 'Draft' ? ' (Draft)' : ''}`,
        type: activeTab,
        status: mode,
        date: new Date().toISOString().split('T')[0],
        content: requiresStructuredFields ? formData : undefined,
        buyerVisible: existingDoc?.buyerVisible ?? false,
        storagePath: storagePath ?? existingDoc?.storagePath,
        fileSize: documentFile
          ? `${Math.max(1, Math.round(documentFile.size / 1024))} KB`
          : existingDoc?.fileSize,
      };

      if (existingDoc) {
        await updateDocument(payload as any);
      } else {
        await addDocument(payload as any);
      }

      if (activeTab === 'Sales Contract' && mode === 'Final') {
        await updateShipmentStatus(selectedShipmentId, ShipmentStatus.CONTRACT_SIGNED);
      }

      setSuccessMsg(
        mode === 'Draft'
          ? 'CLOUD DRAFT SYNCHRONIZED'
          : `${activeTab.toUpperCase()} AUTHORIZED & ARCHIVED`
      );

      setTimeout(() => setSuccessMsg(''), 2500);
      setDocumentFile(null);

      if (documentFileInputRef.current) {
        documentFileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('FORM SAVE FAILED', error);
      alert(error?.message || 'Failed to save form to Supabase.');
    } finally {
      setSaving(false);
    }
  };

  const handleFormSubmit = async () => persistFormDocument('Final');
  const handleDraftSave = async () => persistFormDocument('Draft');

  const tabs: DocumentType[] = [
    'Sales Contract',
    'Proforma Invoice',
    'Commercial Invoice',
    'Packing List',
    'Air Waybill',
    'Bank Permit',
    'Certificate of Origin',
    'Declaration',
    'Bank Receipt',
    'Phytosanitary Certificate',
  ];

  const [permitInput, setPermitInput] = useState('');
  const [permitData, setPermitData] = useState<any>(null);

  const runPermitAI = async (textOverride?: string) => {
    const textToProcess = textOverride || permitInput;
    if (!textToProcess.trim()) {
      alert('PROTOCOL EMPTY: NO DATA DETECTED IN BUFFER.');
      return;
    }

    setAiLoading(true);

    try {
      if (activeTab !== 'Bank Permit') {
        const data = await extractFormFields(activeTab, textToProcess);
        if (data) {
          setFormData((prev: any) => ({ ...prev, ...data }));
          setSuccessMsg(`AI EXTRACTION COMPLETE: ${activeTab.toUpperCase()} FIELDS UPDATED`);
          setTimeout(() => setSuccessMsg(''), 3000);
        }
      } else {
        const data = await extractBankPermitData(textToProcess);
        if (data) {
          setPermitData(data);
          setSuccessMsg('AI EXTRACTION COMPLETE: FIELDS POPULATED');
          setTimeout(() => setSuccessMsg(''), 3000);
        }
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handlePermitFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setPermitInput(text);
      await runPermitAI(text);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-white/[0.02] backdrop-blur-md p-8 rounded-[32px] border border-white/5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#D4AF37]/10 rounded-2xl">
            <svg className="w-6 h-6 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tighter uppercase">
              Master Documentation Terminal
            </h2>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.4em] mt-1">
              Select shipment to pre-fill protocols
            </p>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <div className="space-y-1">
            <label className="text-[8px] font-black text-[#D4AF37] uppercase tracking-widest ml-2">
              Active Shipment
            </label>
            <select
              value={selectedShipmentId}
              onChange={(e) => setSelectedShipmentId(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black text-white focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="">-- SYNC WITH SHIPMENT --</option>
              {state.shipments.map((s) => (
                <option key={s.id} value={s.id}>
                  {(s.buyerName || 'UNKNOWN BUYER').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-black text-[#D4AF37] uppercase tracking-widest ml-2">
              Registered Buyer
            </label>
            <div className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black text-white/80">
              {selectedBuyer ? `${selectedBuyer.name.toUpperCase()} (${selectedBuyer.country})` : '-- SYNC WITH BUYER --'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
              activeTab === tab
                ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-[0_8px_20px_rgba(212,175,55,0.2)]'
                : 'bg-white/[0.02] text-white/40 border-white/10 hover:border-white/20 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {successMsg && (
        <div className="bg-[#10B981]/10 border border-[#10B981]/30 p-4 rounded-2xl animate-in slide-in-from-top-4">
          <p className="text-[10px] font-black text-[#10B981] uppercase tracking-[0.3em] text-center">
            {successMsg}
          </p>
        </div>
      )}

      <div className="bg-black/40 p-8 rounded-[32px] border border-white/5 border-dashed">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="text-xs font-black text-[#D4AF37] uppercase tracking-[0.3em]">
              Cognitive Protocol Buffer
            </h4>
            <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest mt-1">
              Paste or upload raw data to auto-populate {activeTab}
            </p>
          </div>
          <div className="flex gap-3">
            <input
              type="file"
              accept=".txt,.csv,.json"
              ref={permitFileInputRef}
              onChange={handlePermitFileUpload}
              className="hidden"
            />
            <button
              onClick={() => permitFileInputRef.current?.click()}
              className="px-4 py-2 bg-white/5 border border-white/10 text-white/60 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
            >
              Upload Raw Text
            </button>
            <button
              onClick={() => runPermitAI()}
              disabled={aiLoading}
              className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
                aiLoading ? 'bg-white/10 text-white/20' : 'bg-[#D4AF37] text-black hover:scale-105'
              }`}
            >
              {aiLoading ? 'Processing...' : 'Sync AI Buffer'}
            </button>
          </div>
        </div>
        <textarea
          className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-[10px] text-white h-24 font-mono outline-none focus:border-[#D4AF37]/50 transition-all"
          placeholder={`Paste ${activeTab} raw text data here...`}
          value={permitInput}
          onChange={(e) => setPermitInput(e.target.value)}
        />
      </div>

      <div className="bg-white/[0.02] backdrop-blur-md p-8 rounded-[32px] border border-white/5 shadow-2xl">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div>
            <h4 className="text-xs font-black text-[#D4AF37] uppercase tracking-[0.3em]">
              Document Upload Node
            </h4>
            <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest mt-1">
              Every tab supports file upload. Structured fields are saved only for Sales Contract, Proforma Invoice,
              Commercial Invoice and Packing List.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="file"
              ref={documentFileInputRef}
              onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <button
              onClick={() => documentFileInputRef.current?.click()}
              className="px-4 py-2 bg-white/5 border border-white/10 text-white/60 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
            >
              Select File
            </button>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              {documentFile ? documentFile.name : existingDoc?.storagePath ? 'Existing file linked' : 'No file selected'}
            </span>
          </div>
        </div>
      </div>

      <div
        className={`p-1 rounded-[40px] border transition-all ${
          activeTab === 'Sales Contract'
            ? 'bg-[#f8f8f8] border-gray-300 shadow-2xl overflow-hidden'
            : 'bg-white/[0.02] backdrop-blur-md border-white/5'
        }`}
      >
        {activeTab === 'Sales Contract' && (selectedShipment || selectedBuyer) ? (
          <div className="bg-white p-12 text-black font-sans max-w-[1000px] mx-auto shadow-inner border border-black/5">
            <div className="flex justify-between items-center border-b-2 border-black pb-8 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white border-2 border-black rounded-full flex items-center justify-center overflow-hidden">
                  <img
                    src="https://picsum.photos/seed/authority/100/100"
                    alt="Authority Logo"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h4 className="text-[10px] font-black leading-tight tracking-tight uppercase">
                    የኢትዮጵያ
                    <br />
                    ቡናና ሻይ ባለሥልጣን
                  </h4>
                  <h4 className="text-[11px] font-black leading-tight uppercase mt-0.5">
                    ETHIOPIAN
                    <br />
                    COFFEE AND TEA AUTHORITY
                  </h4>
                </div>
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-black uppercase tracking-tight">Coffee Sales Contract Agreement</h1>
                <div className="h-0.5 w-32 bg-black mx-auto mt-1" />
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <h4 className="text-[14px] font-black leading-tight text-green-700 uppercase">e-TRADE</h4>
                  <p className="text-[7px] text-gray-500 font-bold tracking-tighter">
                    Ethiopian Electronic Single Window
                  </p>
                </div>
                <div className="w-16 h-16 bg-white border-2 border-black flex items-center justify-center overflow-hidden">
                  <img
                    src="https://picsum.photos/seed/etrade/100/100"
                    alt="e-Trade Logo"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-l border-black grid grid-cols-2">
              <DocInput label="TIN" value={formData.tin} onChange={(v) => updateField('tin', v)} />
              <DocInput
                label="App. Ref. No."
                value={formData.appRef}
                onChange={(v) => updateField('appRef', v)}
                className="border-l border-black"
              />
              <DocInput label="License No." value={formData.license} onChange={(v) => updateField('license', v)} />
              <DocInput
                label="Reference Date"
                value={formData.refDate}
                type="date"
                onChange={(v) => updateField('refDate', v)}
                className="border-l border-black"
              />
              <DocInput label="Name" value={formData.sellerName} onChange={(v) => updateField('sellerName', v)} />
              <DocInput
                label="App. No."
                value={formData.appNo}
                onChange={(v) => updateField('appNo', v)}
                className="border-l border-black"
              />
              <DocArea label="Address" value={formData.address} onChange={(v) => updateField('address', v)} />
              <DocInput
                label="LPCO Ref. No."
                value={formData.lpcoRef}
                onChange={(v) => updateField('lpcoRef', v)}
                className="border-l border-black"
              />
              <DocInput
                label="Contract No."
                value={formData.contractNo}
                onChange={(v) => updateField('contractNo', v)}
              />
              <div className="border-b border-black" />
            </div>

            <div className="mt-6 border-t border-l border-black grid grid-cols-2">
              <DocInput label="Buyer Name" value={formData.buyerName} onChange={(v) => updateField('buyerName', v)} />
              <DocInput
                label="Country"
                value={formData.buyerCountry}
                onChange={(v) => updateField('buyerCountry', v)}
                className="border-l border-black"
              />
              <DocArea label="Address" value={formData.buyerAddress} onChange={(v) => updateField('buyerAddress', v)} className="col-span-2" />
            </div>

            <div className="mt-6 border-t border-l border-black grid grid-cols-2">
              <DocInput
                label="Contract Date"
                value={formData.contractDate}
                type="date"
                onChange={(v) => updateField('contractDate', v)}
              />
              <DocInput
                label="Partial Shipment"
                value={formData.partialShipment}
                onChange={(v) => updateField('partialShipment', v)}
                className="border-l border-black"
              />
              <DocInput label="CBRA" value={formData.cbra} onChange={(v) => updateField('cbra', v)} />
              <DocInput
                label="Branch"
                value={formData.branch}
                onChange={(v) => updateField('branch', v)}
                className="border-l border-black"
              />
              <DocArea label="Packing" value={formData.packing} onChange={(v) => updateField('packing', v)} />
              <DocInput
                label="Total Count Items"
                value={formData.itemCount}
                type="number"
                onChange={(v) => updateField('itemCount', v)}
                className="border-l border-black"
              />
              <DocInput
                label="Shipment Date"
                value={formData.shipmentDateRange}
                onChange={(v) => updateField('shipmentDateRange', v)}
              />
              <DocInput
                label="Incoterms"
                value={formData.incoterms}
                onChange={(v) => updateField('incoterms', v)}
                className="border-l border-black font-black text-blue-800"
                highlighted
              />
              <DocInput
                label="Destination"
                value={formData.buyerCountry}
                onChange={(v) => updateField('buyerCountry', v)}
              />
              <DocInput
                label="Payment Terms"
                value={formData.paymentTerms}
                onChange={(v) => updateField('paymentTerms', v)}
                className="border-l border-black font-black text-blue-800"
                highlighted
              />
              <DocInput
                label="Total Amount"
                value={`[USD] ${Number(formData.totalAmount || 0).toLocaleString()}`}
                onChange={(v) => updateField('totalAmount', v)}
                className="col-span-2 bg-yellow-50 font-black"
              />
            </div>

            <div className="mt-6 border-t border-l border-black grid grid-cols-2">
              <DocInput label="Cost" value={`[USD] ${Number(formData.totalAmount || 0).toLocaleString()}`} onChange={() => {}} readOnly />
              <DocInput label="Freight" value="" onChange={() => {}} className="border-l border-black" />
              <DocInput label="Insurance" value="" onChange={() => {}} />
              <DocInput label="Other" value="[USD] 0" onChange={() => {}} className="border-l border-black" />
            </div>

            <div className="mt-10 overflow-x-auto">
              <h3 className="text-[10px] font-black uppercase mb-3 border-b-2 border-black pb-1 inline-block">
                Commodity Protocols
              </h3>
              <table className="w-full border-collapse border border-black text-[8px]">
                <thead>
                  <tr className="bg-[#eef2ff]">
                    <th className="border border-black p-2 font-black uppercase">HS Code</th>
                    <th className="border border-black p-2 font-black uppercase">Quantity (LBR)</th>
                    <th className="border border-black p-2 font-black uppercase">Unit Price ($)</th>
                    <th className="border border-black p-2 font-black uppercase">Net Weight</th>
                    <th className="border border-black p-2 font-black uppercase">Gross Weight</th>
                    <th className="border border-black p-2 font-black uppercase">Packages</th>
                    <th className="border border-black p-2 font-black uppercase">Origin</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="border border-black">
                      <input className="w-full p-2 outline-none text-center font-bold" value={formData.hsCode} onChange={(e) => updateField('hsCode', e.target.value)} />
                    </td>
                    <td className="border border-black">
                      <input className="w-full p-2 outline-none text-center font-bold" type="number" value={formData.quantity} onChange={(e) => updateField('quantity', e.target.value)} />
                    </td>
                    <td className="border border-black">
                      <input className="w-full p-2 outline-none text-center font-bold" readOnly value={formData.quantity > 0 ? (Number(formData.totalAmount || 0) / Number(formData.quantity || 1)).toFixed(4) : 0} />
                    </td>
                    <td className="border border-black">
                      <input className="w-full p-2 outline-none text-center font-bold" value={formData.netWeight} onChange={(e) => updateField('netWeight', e.target.value)} />
                    </td>
                    <td className="border border-black">
                      <input className="w-full p-2 outline-none text-center font-bold" value={formData.grossWeight} onChange={(e) => updateField('grossWeight', e.target.value)} />
                    </td>
                    <td className="border border-black">
                      <input className="w-full p-2 outline-none text-center font-bold" value={formData.packages} onChange={(e) => updateField('packages', e.target.value)} />
                    </td>
                    <td className="border border-black">
                      <input className="w-full p-2 outline-none text-center font-bold" value="ETHIOPIA" readOnly />
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={7} className="border border-black p-4 bg-gray-50/50">
                      <div className="flex flex-col gap-2">
                        <label className="text-[7px] font-black text-gray-400 uppercase">Cargo Narrative</label>
                        <textarea
                          className="w-full bg-transparent border-none outline-none font-bold italic text-[9px] h-20 leading-relaxed"
                          defaultValue={`Roasted coffee, not decaffeinated. - 500gr – BAR - Dark Roast Beans. type(washed/Natural):Natural, Organic Certified:Y, Source Of Coffee:Value Added, Coffee Type/Origin:Bench Maji, Coffee Grade:4, Coffee Status:Roast and Grind, Processing Type: UNWASHED`}
                        />
                        <div className="flex justify-between items-center border-t border-black/10 pt-2">
                          <span className="font-black">Contract NO. : {formData.contractNo}</span>
                          <span onClick={() => updateField('hsCode', '09012100-MODIFIED')} className="text-blue-600 font-bold uppercase cursor-pointer hover:underline text-[7px]">
                            Append Technical Specification
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-8">
              <div className="border border-black border-dashed p-4 text-center group hover:bg-blue-50/50 transition-colors">
                <p className="text-[8px] uppercase font-black border-b border-black pb-2 mb-2">Approver Name</p>
                <input className="w-full text-center text-sm font-black bg-transparent outline-none" value={formData.approver} onChange={(e) => updateField('approver', e.target.value)} />
              </div>
              <div className="border border-black border-dashed p-4 text-center group hover:bg-blue-50/50 transition-colors">
                <p className="text-[8px] uppercase font-black border-b border-black pb-2 mb-2">Signature Date</p>
                <p className="text-sm font-black uppercase tracking-tighter">23/10/2025</p>
              </div>
              <div className="border border-black border-dashed p-4 text-center group hover:bg-blue-50/50 transition-colors">
                <p className="text-[8px] uppercase font-black border-b border-black pb-2 mb-2">LPCO ID</p>
                <input className="w-full text-center text-sm font-mono font-black bg-transparent outline-none uppercase" value={formData.lpcoId} onChange={(e) => updateField('lpcoId', e.target.value)} />
              </div>
            </div>

            <div className="mt-12 flex justify-between items-end border-t border-black pt-4 text-[8px] font-bold text-gray-500">
              <div>Digital Verification Active • Version 4.0.1</div>
              <div className="text-right uppercase leading-tight">
                Ethiopia Electronic Single Window
                <br />
                Visit http://esw.et/esw-cbra/ for verification
              </div>
            </div>

            <div className="mt-12 flex gap-4 no-print border-t border-black/5 pt-8">
              <button
                onClick={handleFormSubmit}
                disabled={saving}
                className="flex-1 py-5 bg-black text-white disabled:opacity-40 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-gray-800 transition-all shadow-xl hover:-translate-y-1 active:scale-95"
              >
                Authorize & Finalize
              </button>
              <button
                onClick={handleDraftSave}
                disabled={saving}
                className="px-8 py-5 border-2 border-black text-black disabled:opacity-40 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-all"
              >
                Draft Save
              </button>
              <button
                onClick={() => window.print()}
                className="px-8 py-5 border-2 border-black text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-all"
              >
                Export PDF
              </button>
            </div>
          </div>
        ) : activeTab === 'Commercial Invoice' && (selectedShipment || selectedBuyer) ? (
          <div className="bg-white p-12 text-black font-sans max-w-[1000px] mx-auto shadow-inner border border-black/5">
            <div className="flex items-center justify-between mb-8">
              <div className="w-20 h-20">
                <Logo className="w-full h-full" />
              </div>
              <div className="text-center flex-1">
                <h1 className="text-2xl font-black uppercase tracking-widest">
                  TOMOCA COFFEE – COMMERCIAL INVOICE
                </h1>
                <div className="h-1 w-full bg-black mt-2" />
              </div>
            </div>

            <div className="grid grid-cols-2 border border-black">
              <div className="border-r border-black p-0 space-y-0">
                <DocInput label="Exporter" value={formData.sellerName} onChange={(v) => updateField('sellerName', v)} />
                <DocInput label="Tel" value="+251 947373375" onChange={() => {}} readOnly />
                <DocArea label="Address" value={formData.address} onChange={(v) => updateField('address', v)} />
                <DocInput label="Email" value="INFO@TOMOCACOFFEE.COM" onChange={() => {}} readOnly />
              </div>

              <div className="p-0">
                <div className="border-b border-black p-0 grid grid-cols-2">
                  <DocInput label="# Invoice No" value={formData.invoiceNo} onChange={(v) => updateField('invoiceNo', v)} />
                  <DocInput
                    label="Date"
                    value={formData.invoiceDate}
                    type="date"
                    onChange={(v) => updateField('invoiceDate', v)}
                    className="border-l border-black"
                  />
                </div>
                <div className="p-0 space-y-0">
                  <DocInput label="Buyer's Order No" value={formData.orderNo} onChange={(v) => updateField('orderNo', v)} />
                  <DocInput label="Other Ref IEC" value={formData.iecNo} onChange={(v) => updateField('iecNo', v)} />
                  <DocInput label="BIN NO" value={formData.binNo} onChange={(v) => updateField('binNo', v)} />
                </div>
              </div>

              <div className="border-t border-r border-black p-0 space-y-0">
                <DocInput label="Consignee" value={formData.buyerName} onChange={(v) => updateField('buyerName', v)} />
                <DocArea label="Address" value={formData.buyerAddress} onChange={(v) => updateField('buyerAddress', v)} />
                <DocInput label="Country" value={formData.buyerCountry} onChange={(v) => updateField('buyerCountry', v)} />
              </div>

              <div className="border-t border-black p-0 space-y-0">
                <DocInput label="Buyer (if other)" value={formData.buyerName} onChange={(v) => updateField('buyerName', v)} />
                <div className="grid grid-cols-2 border-t border-black">
                  <DocInput label="Origin Country" value={formData.originCountry} onChange={(v) => updateField('originCountry', v)} />
                  <DocInput
                    label="Final Dest"
                    value={formData.finalDestination}
                    onChange={(v) => updateField('finalDestination', v)}
                    className="border-l border-black"
                  />
                </div>
              </div>

              <div className="border-t border-r border-black grid grid-cols-2">
                <DocInput label="Pre-Carriage" value={formData.preCarriage} onChange={(v) => updateField('preCarriage', v)} />
                <DocInput
                  label="Place Receipt"
                  value={formData.placeOfReceipt}
                  onChange={(v) => updateField('placeOfReceipt', v)}
                  className="border-l border-black"
                />
              </div>

              <div className="border-t border-black p-0">
                <DocInput label="Terms" value={formData.incoterms} onChange={(v) => updateField('incoterms', v)} highlighted />
                <div className="border-t border-black">
                  <DocInput label="Bank" value={formData.cbra} onChange={(v) => updateField('cbra', v)} />
                  <DocInput label="Account" value={formData.bankAccount} onChange={(v) => updateField('bankAccount', v)} />
                  <DocInput label="Swift" value={formData.swiftCode} onChange={(v) => updateField('swiftCode', v)} />
                </div>
              </div>

              <div className="border-t border-r border-black grid grid-cols-2">
                <DocInput label="Vessel/Flight" value={formData.vesselFlight} onChange={(v) => updateField('vesselFlight', v)} />
                <DocInput
                  label="Port Loading"
                  value={formData.portOfLoading}
                  onChange={(v) => updateField('portOfLoading', v)}
                  className="border-l border-black"
                />
              </div>

              <div className="border-t border-black grid grid-cols-2">
                <DocInput
                  label="Port Discharge"
                  value={formData.portOfDischarge}
                  onChange={(v) => updateField('portOfDischarge', v)}
                />
                <DocInput
                  label="Final Dest"
                  value={formData.finalDestination}
                  onChange={(v) => updateField('finalDestination', v)}
                  className="border-l border-black"
                />
              </div>
            </div>

            <table className="w-full border-x border-b border-black mt-0 text-[10px]">
              <thead className="bg-gray-100 border-t border-black">
                <tr>
                  <th className="border-r border-black p-2 font-black uppercase text-left">Marks Description</th>
                  <th className="border-r border-black p-2 font-black uppercase">Kind of Pkgs.</th>
                  <th className="border-r border-black p-2 font-black uppercase">Description</th>
                  <th className="border-r border-black p-2 font-black uppercase">Qty</th>
                  <th className="border-r border-black p-2 font-black uppercase">Unit Price</th>
                  <th className="p-2 font-black uppercase">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-black">
                  <td className="border-r border-black p-0">
                    <input className="w-full p-2 outline-none font-black text-center" value={formData.marksDescription} onChange={(e) => updateField('marksDescription', e.target.value)} />
                  </td>
                  <td className="border-r border-black p-0">
                    <input className="w-full p-2 outline-none text-center" value={formData.kindOfPkgs} onChange={(e) => updateField('kindOfPkgs', e.target.value)} />
                  </td>
                  <td className="border-r border-black p-0">
                    <input className="w-full p-2 outline-none italic text-center" value={formData.commodityDescription} onChange={(e) => updateField('commodityDescription', e.target.value)} />
                  </td>
                  <td className="border-r border-black p-0">
                    <input className="w-full p-2 outline-none text-center font-black" value="KG" readOnly />
                  </td>
                  <td className="border-r border-black p-0">
                    <input className="w-full p-2 outline-none text-center font-black" value="USD" readOnly />
                  </td>
                  <td className="p-0">
                    <input className="w-full p-2 outline-none text-center font-black" value="Total" readOnly />
                  </td>
                </tr>
                <tr className="border-t border-black bg-gray-50">
                  <td colSpan={3} className="p-4">
                    <div className="space-y-2">
                      <input className="w-full bg-transparent border-none outline-none" value="1. 500gr – BAR - Dark Roast Beans (500kg)" onChange={() => {}} />
                      <input className="w-full bg-transparent border-none outline-none" value="2. 250gr – BAR - Dark Roast Beans (500kgs)" onChange={() => {}} />
                    </div>
                  </td>
                  <td className="border-l border-r border-black p-0">
                    <input className="w-full p-2 outline-none text-center font-black" type="number" value={formData.quantity} onChange={(e) => updateField('quantity', e.target.value)} />
                  </td>
                  <td className="border-r border-black p-0">
                    <input className="w-full p-2 outline-none text-center font-black" type="number" value={formData.unitPrice} onChange={(e) => updateField('unitPrice', e.target.value)} />
                  </td>
                  <td className="p-0">
                    <input className="w-full p-2 outline-none text-center font-black" value={(Number(formData.quantity || 0) * Number(formData.unitPrice || 0)).toLocaleString()} readOnly />
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="grid grid-cols-3 border-x border-b border-black">
              <div className="p-4 border-r border-black text-[8px] font-bold leading-tight">
                The exporter of the products covered by this document declares that except where otherwise clearly
                indicated, these products are of ETHIOPIAN Origin according to Rules of Origin of the Generalized System
                of Preferences of the European Union and that the origin criterion met is "W0901"
              </div>
              <div className="p-4 border-r border-black">
                <p className="text-[8px] font-black uppercase mb-1">Amount in Words:</p>
                <input className="w-full bg-transparent border-none outline-none text-[10px] font-black italic" value={formData.amountInWords} onChange={(e) => updateField('amountInWords', e.target.value)} />
              </div>
              <div className="p-4 flex justify-between items-center">
                <span className="text-xs font-black uppercase">Total</span>
                <div className="text-right">
                  <p className="text-[8px] font-black">USD</p>
                  <p className="text-lg font-black">{(Number(formData.quantity || 0) * Number(formData.unitPrice || 0)).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="mt-12 flex justify-end">
              <div className="text-center relative">
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-60">
                  <img src="https://picsum.photos/seed/stamp/120/120" className="w-24 h-24 rounded-full border-4 border-blue-800/30 rotate-12" alt="stamp" referrerPolicy="no-referrer" />
                </div>
                <p className="text-[10px] font-black uppercase border-t border-black pt-2 px-8">
                  SIGNATURE & DATE
                </p>
              </div>
            </div>

            <div className="mt-12 flex gap-4 no-print border-t border-black/5 pt-8">
              <button
                onClick={handleFormSubmit}
                disabled={saving}
                className="flex-1 py-5 bg-black text-white disabled:opacity-40 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-gray-800 transition-all shadow-xl"
              >
                Authorize & Finalize
              </button>
              <button
                onClick={() => window.print()}
                className="px-8 py-5 border-2 border-black text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-all"
              >
                Export PDF
              </button>
            </div>
          </div>
        ) : activeTab === 'Proforma Invoice' && (selectedShipment || selectedBuyer) ? (
          <div className="bg-white p-12 text-black font-sans max-w-[1000px] mx-auto shadow-inner border border-black/5">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-black uppercase tracking-widest">TOMOCA COFFEE – PROFORMA INVOICE</h1>
              <div className="h-1 w-full bg-black mt-2" />
            </div>

            <div className="grid grid-cols-2 border border-black">
              <div className="border-r border-black p-0 space-y-0">
                <DocInput label="Exporter" value={formData.sellerName} onChange={(v) => updateField('sellerName', v)} />
                <DocArea label="Address" value={formData.address} onChange={(v) => updateField('address', v)} />
              </div>

              <div className="p-0">
                <div className="border-b border-black p-0 grid grid-cols-2">
                  <DocInput label="Date" value={formData.invoiceDate} type="date" onChange={(v) => updateField('invoiceDate', v)} />
                  <DocInput label="Invoice No" value={formData.invoiceNo} onChange={(v) => updateField('invoiceNo', v)} className="border-l border-black" />
                </div>
                <div className="p-0 space-y-0">
                  <DocInput label="Buyer's Order No" value={formData.orderNo} onChange={(v) => updateField('orderNo', v)} />
                  <DocInput label="Other Ref IEC" value={formData.iecNo} onChange={(v) => updateField('iecNo', v)} />
                  <DocInput label="BIN NO" value={formData.binNo} onChange={(v) => updateField('binNo', v)} />
                </div>
              </div>

              <div className="border-t border-r border-black p-0 space-y-0">
                <DocInput label="Consignee" value={formData.buyerName} onChange={(v) => updateField('buyerName', v)} />
                <DocArea label="Address" value={formData.buyerAddress} onChange={(v) => updateField('buyerAddress', v)} />
                <DocInput label="Country" value={formData.buyerCountry} onChange={(v) => updateField('buyerCountry', v)} />
              </div>

              <div className="border-t border-black p-0 space-y-0">
                <DocInput label="Buyer (if other)" value={formData.buyerName} onChange={(v) => updateField('buyerName', v)} />
                <div className="grid grid-cols-2 border-t border-black">
                  <DocInput label="Origin Country" value={formData.originCountry} onChange={(v) => updateField('originCountry', v)} />
                  <DocInput
                    label="Final Dest"
                    value={formData.finalDestination}
                    onChange={(v) => updateField('finalDestination', v)}
                    className="border-l border-black"
                  />
                </div>
              </div>

              <div className="border-t border-r border-black grid grid-cols-2">
                <DocInput label="Pre-Carriage" value={formData.preCarriage} onChange={(v) => updateField('preCarriage', v)} />
                <DocInput
                  label="Place Receipt"
                  value={formData.placeOfReceipt}
                  onChange={(v) => updateField('placeOfReceipt', v)}
                  className="border-l border-black"
                />
              </div>

              <div className="border-t border-black p-0">
                <DocInput label="Terms" value={formData.incoterms} onChange={(v) => updateField('incoterms', v)} highlighted />
                <div className="border-t border-black">
                  <DocInput label="Bank" value={formData.cbra} onChange={(v) => updateField('cbra', v)} />
                  <DocInput label="Account" value={formData.bankAccount} onChange={(v) => updateField('bankAccount', v)} />
                  <DocInput label="Swift" value={formData.swiftCode} onChange={(v) => updateField('swiftCode', v)} />
                </div>
              </div>

              <div className="border-t border-r border-black grid grid-cols-2">
                <DocInput label="Vessel/Flight" value={formData.vesselFlight} onChange={(v) => updateField('vesselFlight', v)} />
                <DocInput
                  label="Port Loading"
                  value={formData.portOfLoading}
                  onChange={(v) => updateField('portOfLoading', v)}
                  className="border-l border-black"
                />
              </div>

              <div className="border-t border-black grid grid-cols-2">
                <DocInput
                  label="Port Discharge"
                  value={formData.portOfDischarge}
                  onChange={(v) => updateField('portOfDischarge', v)}
                />
                <DocInput
                  label="Final Dest"
                  value={formData.finalDestination}
                  onChange={(v) => updateField('finalDestination', v)}
                  className="border-l border-black"
                />
              </div>
            </div>

            <table className="w-full border-x border-b border-black mt-0 text-[10px]">
              <thead className="bg-gray-100 border-t border-black">
                <tr>
                  <th className="border-r border-black p-2 font-black uppercase text-left">Marks Description</th>
                  <th className="border-r border-black p-2 font-black uppercase">Kind of Pkgs.</th>
                  <th className="border-r border-black p-2 font-black uppercase">Description</th>
                  <th className="border-r border-black p-2 font-black uppercase">KG</th>
                  <th className="p-2 font-black uppercase">CT</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-black">
                  <td className="border-r border-black p-0">
                    <input className="w-full p-2 outline-none font-black text-center" value={formData.marksDescription} onChange={(e) => updateField('marksDescription', e.target.value)} />
                  </td>
                  <td className="border-r border-black p-0">
                    <input className="w-full p-2 outline-none text-center" value={formData.kindOfPkgs} onChange={(e) => updateField('kindOfPkgs', e.target.value)} />
                  </td>
                  <td className="border-r border-black p-0">
                    <input className="w-full p-2 outline-none italic text-center" value={formData.commodityDescription} onChange={(e) => updateField('commodityDescription', e.target.value)} />
                  </td>
                  <td className="border-r border-black p-0">
                    <input className="w-full p-2 outline-none text-center font-black" value="KG" readOnly />
                  </td>
                  <td className="p-0">
                    <input className="w-full p-2 outline-none text-center font-black" value="CT" readOnly />
                  </td>
                </tr>
                <tr className="border-t border-black bg-gray-50">
                  <td colSpan={3} className="p-4">
                    <div className="space-y-2">
                      <input className="w-full bg-transparent border-none outline-none" value="1. 500gr – BAR - Dark Roast Beans (500kg)" onChange={() => {}} />
                      <input className="w-full bg-transparent border-none outline-none" value="2. 250gr – BAR - Dark Roast Beans (500kgs)" onChange={() => {}} />
                    </div>
                  </td>
                  <td className="border-l border-r border-black p-0">
                    <input className="w-full p-2 outline-none text-center font-black" type="number" value={formData.quantity} onChange={(e) => updateField('quantity', e.target.value)} />
                  </td>
                  <td className="p-0">
                    <input className="w-full p-2 outline-none text-center font-black" type="number" value={formData.packages} onChange={(e) => updateField('packages', e.target.value)} />
                  </td>
                </tr>
              </tbody>
              <tfoot className="border-t-2 border-black font-black">
                <tr>
                  <td colSpan={3} className="p-4 text-right uppercase">Total Net Weight:</td>
                  <td className="border-l border-black p-0">
                    <input className="w-full p-2 outline-none text-center" value={`${formData.netWeight} KG`} onChange={(e) => updateField('netWeight', e.target.value)} />
                  </td>
                  <td className="border-l border-black p-0">
                    <input className="w-full p-2 outline-none text-center" value={`${formData.packages} CT`} onChange={(e) => updateField('packages', e.target.value)} />
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="mt-8 p-4 border border-black border-dashed rounded-xl">
              <p className="text-[10px] font-black uppercase mb-2">Declaration:</p>
              <p className="text-[9px] font-bold leading-relaxed">
                WE HEREBY DECLARE THAT COUNTRY OF ORIGIN OF THESE GOODS IS ETHIOPIA. All Disputes subject to Ethiopian
                Jurisdiction Only.
              </p>
            </div>

            <div className="mt-12 flex gap-4 no-print border-t border-black/5 pt-8">
              <button
                onClick={handleFormSubmit}
                disabled={saving}
                className="flex-1 py-5 bg-black text-white disabled:opacity-40 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-gray-800 transition-all shadow-xl"
              >
                Authorize & Finalize
              </button>
              <button
                onClick={() => window.print()}
                className="px-8 py-5 border-2 border-black text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-all"
              >
                Export PDF
              </button>
            </div>
          </div>
        ) : activeTab === 'Packing List' && (selectedShipment || selectedBuyer) ? (
          <div className="bg-white p-12 text-black font-sans max-w-[1000px] mx-auto shadow-inner border border-black/5">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-black uppercase tracking-widest">TOMOCA COFFEE – PACKING / WEIGHT LIST</h1>
              <div className="h-1 w-full bg-black mt-2" />
            </div>

            <div className="grid grid-cols-2 border border-black">
              <div className="border-r border-black p-0 space-y-0">
                <DocInput label="Exporter" value={formData.sellerName} onChange={(v) => updateField('sellerName', v)} />
                <DocArea label="Address" value={formData.address} onChange={(v) => updateField('address', v)} />
              </div>

              <div className="p-0">
                <div className="border-b border-black p-0 grid grid-cols-2">
                  <DocInput label="Date" value={formData.invoiceDate} type="date" onChange={(v) => updateField('invoiceDate', v)} />
                  <DocInput label="Invoice No" value={formData.invoiceNo} onChange={(v) => updateField('invoiceNo', v)} className="border-l border-black" />
                </div>
                <div className="p-0 space-y-0">
                  <DocInput label="Buyer's Order No" value={formData.orderNo} onChange={(v) => updateField('orderNo', v)} />
                  <DocInput label="Other Ref IEC" value={formData.iecNo} onChange={(v) => updateField('iecNo', v)} />
                  <DocInput label="BIN NO" value={formData.binNo} onChange={(v) => updateField('binNo', v)} />
                </div>
              </div>

              <div className="border-t border-r border-black p-0 space-y-0">
                <DocInput label="Consignee" value={formData.buyerName} onChange={(v) => updateField('buyerName', v)} />
                <DocArea label="Address" value={formData.buyerAddress} onChange={(v) => updateField('buyerAddress', v)} />
                <DocInput label="Country" value={formData.buyerCountry} onChange={(v) => updateField('buyerCountry', v)} />
              </div>

              <div className="border-t border-black p-0 space-y-0">
                <DocInput label="Buyer (if other)" value={formData.buyerName} onChange={(v) => updateField('buyerName', v)} />
                <div className="grid grid-cols-2 border-t border-black">
                  <DocInput label="Origin Country" value={formData.originCountry} onChange={(v) => updateField('originCountry', v)} />
                  <DocInput
                    label="Final Dest"
                    value={formData.finalDestination}
                    onChange={(v) => updateField('finalDestination', v)}
                    className="border-l border-black"
                  />
                </div>
              </div>

              <div className="border-t border-r border-black grid grid-cols-2">
                <DocInput label="Pre-Carriage" value={formData.preCarriage} onChange={(v) => updateField('preCarriage', v)} />
                <DocInput
                  label="Place Receipt"
                  value={formData.placeOfReceipt}
                  onChange={(v) => updateField('placeOfReceipt', v)}
                  className="border-l border-black"
                />
              </div>

              <div className="border-t border-black p-0">
                <DocInput label="Terms" value={formData.incoterms} onChange={(v) => updateField('incoterms', v)} highlighted />
                <div className="border-t border-black">
                  <DocInput label="Bank" value={formData.cbra} onChange={(v) => updateField('cbra', v)} />
                  <DocInput label="Account" value={formData.bankAccount} onChange={(v) => updateField('bankAccount', v)} />
                  <DocInput label="Swift" value={formData.swiftCode} onChange={(v) => updateField('swiftCode', v)} />
                </div>
              </div>

              <div className="border-t border-r border-black grid grid-cols-2">
                <DocInput label="Vessel/Flight" value={formData.vesselFlight} onChange={(v) => updateField('vesselFlight', v)} />
                <DocInput
                  label="Port Loading"
                  value={formData.portOfLoading}
                  onChange={(v) => updateField('portOfLoading', v)}
                  className="border-l border-black"
                />
              </div>

              <div className="border-t border-black grid grid-cols-2">
                <DocInput
                  label="Port Discharge"
                  value={formData.portOfDischarge}
                  onChange={(v) => updateField('portOfDischarge', v)}
                />
                <DocInput
                  label="Final Dest"
                  value={formData.finalDestination}
                  onChange={(v) => updateField('finalDestination', v)}
                  className="border-l border-black"
                />
              </div>
            </div>

            <table className="w-full border-x border-b border-black mt-0 text-[10px]">
              <thead className="bg-gray-100 border-t border-black">
                <tr>
                  <th className="border-r border-black p-2 font-black uppercase text-left">Marks Description</th>
                  <th className="border-r border-black p-2 font-black uppercase">Kind of Pkgs.</th>
                  <th className="border-r border-black p-2 font-black uppercase">Description</th>
                  <th className="border-r border-black p-2 font-black uppercase">KG</th>
                  <th className="p-2 font-black uppercase">CT</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-black">
                  <td className="border-r border-black p-0">
                    <input className="w-full p-2 outline-none font-black text-center" value={formData.marksDescription} onChange={(e) => updateField('marksDescription', e.target.value)} />
                  </td>
                  <td className="border-r border-black p-0">
                    <input className="w-full p-2 outline-none text-center" value={formData.kindOfPkgs} onChange={(e) => updateField('kindOfPkgs', e.target.value)} />
                  </td>
                  <td className="border-r border-black p-0">
                    <input className="w-full p-2 outline-none italic text-center" value={formData.commodityDescription} onChange={(e) => updateField('commodityDescription', e.target.value)} />
                  </td>
                  <td className="border-r border-black p-0">
                    <input className="w-full p-2 outline-none text-center font-black" value="KG" readOnly />
                  </td>
                  <td className="p-0">
                    <input className="w-full p-2 outline-none text-center font-black" value="CT" readOnly />
                  </td>
                </tr>
                <tr className="border-t border-black bg-gray-50">
                  <td colSpan={3} className="p-4">
                    <div className="space-y-2">
                      <input className="w-full bg-transparent border-none outline-none" value="1. 500gr – BAR - Dark Roast Beans (500kg)" onChange={() => {}} />
                      <input className="w-full bg-transparent border-none outline-none" value="2. 250gr – BAR - Dark Roast Beans (500kgs)" onChange={() => {}} />
                    </div>
                  </td>
                  <td className="border-l border-r border-black p-0">
                    <input className="w-full p-2 outline-none text-center font-black" type="number" value={formData.quantity} onChange={(e) => updateField('quantity', e.target.value)} />
                  </td>
                  <td className="p-0">
                    <input className="w-full p-2 outline-none text-center font-black" type="number" value={formData.packages} onChange={(e) => updateField('packages', e.target.value)} />
                  </td>
                </tr>
              </tbody>
              <tfoot className="border-t-2 border-black font-black">
                <tr>
                  <td colSpan={3} className="p-4 text-right uppercase">Total Net Weight:</td>
                  <td className="border-l border-black p-0">
                    <input className="w-full p-2 outline-none text-center" value={`${formData.netWeight} KG`} onChange={(e) => updateField('netWeight', e.target.value)} />
                  </td>
                  <td className="border-l border-black p-0">
                    <input className="w-full p-2 outline-none text-center" value={`${formData.packages} CT`} onChange={(e) => updateField('packages', e.target.value)} />
                  </td>
                </tr>
                <tr className="border-t border-black">
                  <td colSpan={3} className="p-4 text-right uppercase">Total Gross Weight:</td>
                  <td className="border-l border-black p-0">
                    <input className="w-full p-2 outline-none text-center" value={`${formData.grossWeight} KG`} onChange={(e) => updateField('grossWeight', e.target.value)} />
                  </td>
                  <td className="border-l border-black p-0" />
                </tr>
              </tfoot>
            </table>

            <div className="mt-8 p-4 border border-black border-dashed rounded-xl">
              <p className="text-[10px] font-black uppercase mb-2">Declaration:</p>
              <p className="text-[9px] font-bold leading-relaxed">
                WE HEREBY DECLARE THAT COUNTRY OF ORIGIN OF THESE GOODS IS ETHIOPIA. All Disputes subject to Ethiopian
                Jurisdiction Only.
              </p>
            </div>

            <div className="mt-12 flex justify-end">
              <div className="text-center relative">
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-60">
                  <img src="https://picsum.photos/seed/stamp/120/120" className="w-24 h-24 rounded-full border-4 border-blue-800/30 rotate-12" alt="stamp" referrerPolicy="no-referrer" />
                </div>
                <p className="text-[10px] font-black uppercase border-t border-black pt-2 px-8">
                  SIGNATURE & DATE
                </p>
              </div>
            </div>

            <div className="mt-12 flex gap-4 no-print border-t border-black/5 pt-8">
              <button
                onClick={handleFormSubmit}
                disabled={saving}
                className="flex-1 py-5 bg-black text-white disabled:opacity-40 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-gray-800 transition-all shadow-xl"
              >
                Authorize & Finalize
              </button>
              <button
                onClick={() => window.print()}
                className="px-8 py-5 border-2 border-black text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-all"
              >
                Export PDF
              </button>
            </div>
          </div>
        ) : (selectedShipment || selectedBuyer) ? (
          <div className="bg-black/20 backdrop-blur-xl p-12 rounded-[40px] border border-white/5 shadow-2xl">
            <div className="flex items-center gap-8 mb-12">
              <div className="w-24 h-24 bg-[#D4AF37]/10 rounded-[32px] flex items-center justify-center border border-[#D4AF37]/20 shadow-[0_0_50px_rgba(212,175,55,0.1)]">
                <svg className="w-12 h-12 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-[0.4em]">{activeTab}</h2>
                <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-[0.2em] mt-2 opacity-60">
                  Data Integration Node • Protocol Sync Active
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest border-b border-white/10 pb-2">
                  Extracted Protocol Data
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  {Object.entries(formData)
                    .filter(([k, v]) => v && typeof v !== 'object' && !['sellerName', 'address', 'buyerName', 'buyerAddress'].includes(k))
                    .slice(0, 8)
                    .map(([key, value]) => (
                      <div key={key} className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl flex justify-between items-center group hover:border-[#D4AF37]/30 transition-all">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-wider group-hover:text-[#D4AF37]/50 transition-colors">
                          {key.replace(/([A-Z])/g, ' $1')}
                        </span>
                        <span className="text-xs font-bold text-white tracking-tight">{String(value)}</span>
                      </div>
                    ))}
                  {Object.keys(formData).length === 0 && (
                    <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-3xl">
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                        No Data Harvested Yet
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest border-b border-white/10 pb-2">
                  System Directives
                </h4>
                <div className="p-8 bg-[#D4AF37]/5 border border-[#D4AF37]/10 rounded-3xl space-y-6">
                  <div className="flex gap-4">
                    <div className="w-1 h-12 bg-[#D4AF37] rounded-full" />
                    <div>
                      <p className="text-[11px] font-black text-white uppercase tracking-wider">
                        Protocol Status: Pending Validation
                      </p>
                      <p className="text-[9px] text-white/40 font-medium mt-1 leading-relaxed">
                        This document type does not require a manual form layout. Upload the source file, use the Cognitive Buffer above if needed, then authorize the protocol to store the file and metadata in Supabase.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleFormSubmit}
                    className="w-full py-5 bg-[#D4AF37] text-black rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:shadow-[0_10px_40px_rgba(212,175,55,0.2)] hover:-translate-y-1 transition-all"
                  >
                    Authorize Protocol
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-96 flex flex-col items-center justify-center text-center space-y-8">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/10 animate-pulse">
              <svg className="w-12 h-12 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-black text-white uppercase tracking-[0.4em]">Node Linkage Pending</p>
              <p className="text-[9px] text-white/20 font-bold uppercase tracking-[0.2em] max-w-xs mx-auto">
                Select a valid shipment node from the master terminal to initialize document protocols.
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          aside, header, nav, .custom-scrollbar { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          .p-1, .p-12 { padding: 0 !important; }
          .shadow-2xl, .shadow-xl { box-shadow: none !important; }
          .bg-white { background-color: white !important; }
          input, textarea { border: none !important; background: transparent !important; padding: 0 !important; }
          .bg-[#f8f8f8] { background: white !important; }
        }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
    </div>
  );
};

export default FormsHub;