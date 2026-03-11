import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../App';
import { generateShipmentSummary } from '../geminiService';
import {
  ShipmentStatus,
  Document,
  Lot,
  QualitySpec,
  RouteTemplate,
  ShipmentTask,
  TaskStatus,
} from '../types';
import { computeCompliance, computeRisk, ensureShipmentIntelligence } from '../intelligence';
import { supabase } from '../supabaseClient';

const ShipmentDetail: React.FC = () => {
  const { id } = useParams();
  const { state, updateShipmentStatus, addDocument, updateShipment } = useApp();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [tasks, setTasks] = useState<ShipmentTask[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const shipmentRaw = state.shipments.find((s) => s.id === id);
  const shipment = shipmentRaw ? ensureShipmentIntelligence(shipmentRaw) : undefined;

  const allDocs = useMemo(
    () => state.documents.filter((doc) => doc.shipmentId === shipment?.id),
    [state.documents, shipment?.id]
  );

  const systemDocs = useMemo(() => allDocs.filter((doc) => !doc.isExternal), [allDocs]);
  const vaultDocs = useMemo(() => allDocs.filter((doc) => doc.isExternal), [allDocs]);

  const buyer = useMemo(() => {
    if (!shipment) return undefined;

    return (
      state.buyers.find((b) => shipment.buyerId && b.id === shipment.buyerId) ||
      state.buyers.find((b) => b.name.toLowerCase() === (shipment.buyerName || '').toLowerCase())
    );
  }, [state.buyers, shipment]);

  const compliance = shipment ? computeCompliance(shipment, allDocs) : null;
  const routes = state.routes ?? [];
  const lots = state.lots ?? [];
  const risk = shipment ? computeRisk(shipment, buyer, allDocs, lots, routes) : null;

  useEffect(() => {
    const run = async () => {
      if (!shipment) return;

      if (!supabase) {
        setTasks(shipment.tasks ?? []);
        return;
      }

      const { data, error } = await supabase
        .from('shipment_tasks')
        .select('*')
        .eq('shipment_id', shipment.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('TASK LOAD ERROR', error);
        setTasks([]);
        return;
      }

      const mapped: ShipmentTask[] = (data ?? []).map((t: any) => ({
        id: t.id,
        title: t.title,
        owner: t.owner ?? undefined,
        dueDate: t.due_date ? String(t.due_date).slice(0, 10) : undefined,
        status:
          t.status === 'done'
            ? 'Done'
            : t.status === 'in_progress'
            ? 'In Progress'
            : 'Open',
        createdAt: t.created_at ?? new Date().toISOString(),
      }));

      setTasks(mapped);
    };

    run();
  }, [shipment?.id]);

  useEffect(() => {
    if (!shipment) return;
    generateShipmentSummary(shipment).then(setSummary).catch(() => setSummary(null));
  }, [shipment]);

  if (!shipment) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-black text-white">Shipment Node Not Found</h2>
        <p className="text-white/40 mt-2">
          The shipment could not be loaded. Try returning to the shipment list and reopening it.
        </p>
        <Link
          to="/shipments"
          className="mt-6 px-5 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
        >
          Back to Shipments
        </Link>
      </div>
    );
  }

  const showToast = (message: string, ms = 2500) => {
    setFeedback(message);
    setTimeout(() => setFeedback(null), ms);
  };

  const handleTerminate = async () => {
    await updateShipmentStatus(shipment.id, ShipmentStatus.SHIPMENT_CLOSED);
    setShowConfirm(false);
    showToast('SHIPMENT LIFECYCLE TERMINATED', 3000);
  };

  const handleStatusChange = async (newStatus: ShipmentStatus) => {
    await updateShipmentStatus(shipment.id, newStatus);
    showToast(`NODE UPDATED: ${newStatus.toUpperCase()}`, 3000);
  };

  const handleGenerateProtocol = () => {
    navigate('/forms', { state: { shipmentId: shipment.id } });
  };

  const patchMilestone = async (
    milestoneId: string,
    patch: Partial<{ expectedDate: string; actualDate: string; status: 'Pending' | 'Done' }>
  ) => {
    const updated = ensureShipmentIntelligence(shipment);
    const nextMilestones = (updated.milestones ?? []).map((m) =>
      m.id === milestoneId ? { ...m, ...patch } : m
    );
    await updateShipment({ ...updated, milestones: nextMilestones });
  };

  const addDays = (isoDate: string, days: number) => {
    const d = new Date(`${isoDate}T00:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const applyRouteToMilestones = async (route: RouteTemplate) => {
    const updated = ensureShipmentIntelligence(shipment);
    const base = new Date().toISOString().split('T')[0];
    const inland = route.inlandLeadDays;
    const port = route.portHandlingDays;
    const sea = route.seaTransitDays;

    const ms = (updated.milestones ?? []).map((m) => ({ ...m }));

    const idx = (name: string) => ms.findIndex((x) => x.name === name);

    const setIf = (name: string, dayOffset: number) => {
      const i = idx(name);
      if (i >= 0) ms[i].expectedDate = addDays(base, dayOffset);
    };

    setIf('Contract Signed', 0);
    setIf('Coffee Collected / Sourced', 1);
    setIf('Quality Graded', 2);
    setIf('Processing Completed', 4);
    setIf('Export/Bank Permit Approved', inland);
    setIf('Container Stuffed', inland + 1);
    setIf('Loaded at Port', inland + port);
    setIf('Vessel Departed', inland + port + 1);
    setIf('Arrived at Destination', inland + port + sea);
    setIf('Payment Cleared', inland + port + sea + 5);

    await updateShipment({ ...updated, routeId: route.id, milestones: ms });
    showToast(`ROUTE APPLIED: ${route.name.toUpperCase()}`);
  };

  const updateQualitySpec = async (patch: Partial<QualitySpec>) => {
    const updated = ensureShipmentIntelligence(shipment);
    const nextSpec: QualitySpec = {
      minCuppingScore: 84,
      maxMoisturePercent: 12.5,
      minScreenSize: 15,
      ...(updated.qualitySpec ?? {}),
      ...patch,
    };
    await updateShipment({ ...updated, qualitySpec: nextSpec });
  };

  const toggleLot = async (lotId: string) => {
    const updated = ensureShipmentIntelligence(shipment);
    const cur = updated.lotIds ?? [];
    const next = cur.includes(lotId) ? cur.filter((x) => x !== lotId) : [...cur, lotId];

    if (supabase) {
      if (cur.includes(lotId)) {
        await supabase
          .from('shipment_lots')
          .delete()
          .eq('shipment_id', shipment.id)
          .eq('lot_id', lotId);
      } else {
        await supabase
          .from('shipment_lots')
          .insert({ shipment_id: shipment.id, lot_id: lotId } as any);
      }
    }

    await updateShipment({ ...updated, lotIds: next });
  };

  const addTask = async (title: string) => {
    const task: ShipmentTask = {
      id: crypto.randomUUID(),
      title,
      status: 'Open',
      createdAt: new Date().toISOString(),
    };

    if (supabase) {
      await supabase.from('shipment_tasks').insert({
        id: task.id,
        shipment_id: shipment.id,
        title: task.title,
        status: 'open',
      } as any);
    }

    setTasks((prev) => [...prev, task]);
  };

  const patchTask = async (taskId: string, patch: Partial<ShipmentTask>) => {
    const next = tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t));
    setTasks(next);

    if (supabase) {
      const t = next.find((x) => x.id === taskId);
      if (!t) return;

      await supabase
        .from('shipment_tasks')
        .update({
          title: t.title,
          owner: t.owner ?? null,
          due_date: t.dueDate ?? null,
          status: t.status === 'Done' ? 'done' : t.status === 'In Progress' ? 'in_progress' : 'open',
        } as any)
        .eq('id', taskId);
    }
  };

  const deleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (supabase) {
      await supabase.from('shipment_tasks').delete().eq('id', taskId);
    }
  };

  const addPlaceholderDocForChecklist = async (docType: Document['type'], label: string) => {
    const newDoc: Document = {
      id: `DOC-${Math.floor(Math.random() * 9000) + 1000}`,
      shipmentId: shipment.id,
      buyerId: shipment.buyerId,
      name: `${label} - Placeholder`,
      type: docType,
      status: 'Pending Approval',
      date: new Date().toISOString().split('T')[0],
      isExternal: false,
      buyerVisible: false,
    };

    await addDocument(newDoc);
    showToast(`${label.toUpperCase()} PLACEHOLDER GENERATED`);
  };

  const processFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 5;
      });
    }, 50);

    setTimeout(async () => {
      clearInterval(interval);
      setUploadProgress(100);

      const newDoc: Document = {
        id: `DOC-${Math.floor(Math.random() * 9000) + 1000}`,
        shipmentId: shipment.id,
        buyerId: shipment.buyerId,
        name: file.name,
        type: 'External Attachment',
        status: 'Final',
        date: new Date().toISOString().split('T')[0],
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        isExternal: true,
        buyerVisible: false,
      };

      await addDocument(newDoc);
      setIsUploading(false);
      setUploadProgress(0);
      showToast(`ASSET ${file.name.toUpperCase()} INJECTED SUCCESSFULLY`, 3000);

      if (fileInputRef.current) fileInputRef.current.value = '';
    }, 1500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const handleDownload = (doc: Document) => {
    showToast(`RETRIEVING ${doc.name.toUpperCase()} FROM VAULT...`, 2000);

    const content = `
TOMOCA EXPORT SYSTEMS - SECURE ASSET RETRIEVAL
----------------------------------------------
PROTOCOL ID: ${doc.id}
ASSET NAME: ${doc.name}
TYPE: ${doc.type}
STATUS: ${doc.status}
SYNC DATE: ${doc.date}
LINKED NODE: ${doc.shipmentId || 'MASTER'}
----------------------------------------------
This is a simulated secure asset retrieval from the ERM Vault.
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name.replace(/\s+/g, '_')}_ARCHIVE.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: ShipmentStatus) => {
    switch (status) {
      case ShipmentStatus.DELIVERED:
      case ShipmentStatus.PAYMENT_RECEIVED:
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case ShipmentStatus.IN_TRANSIT:
      case ShipmentStatus.VESSEL_BOOKED:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case ShipmentStatus.QUALITY_CHECK:
      case ShipmentStatus.LAB_TESTING:
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case ShipmentStatus.DOCUMENTATION_PENDING:
      case ShipmentStatus.ORDER_CONFIRMED:
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case ShipmentStatus.SHIPMENT_CLOSED:
        return 'bg-white/5 text-white/30 border-white/10';
      default:
        return 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20';
    }
  };

  const TabButton = ({ name, label }: { name: string; label: string }) => (
    <button
      onClick={() => setActiveTab(name)}
      className={`px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${
        activeTab === name ? 'text-[#D4AF37]' : 'text-white/30 hover:text-white/60'
      }`}
    >
      {label}
      {activeTab === name && (
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#D4AF37] shadow-[0_0_10px_#D4AF37]" />
      )}
    </button>
  );

  const formatPct = (n: number | null | undefined) => {
    if (n == null) return '—';
    return `${Math.max(0, Math.min(100, Math.round(n)))}%`;
  };

  const getTimelineSteps = () => {
    const steps = [
      { title: 'Buyer Request Initialized', status: 'completed', date: shipment.date },
      { title: 'Quality & Lab Testing Node', status: 'completed', date: shipment.date },
      { title: 'Contract Protocol Verified', status: 'completed', date: shipment.date },
      {
        title: `Current Stage: ${shipment.status}`,
        status: 'current',
        date: new Date().toISOString().split('T')[0],
      },
      { title: 'Final Logistics Handover', status: 'upcoming', date: 'TBD' },
    ];

    if (
      shipment.status === ShipmentStatus.SHIPMENT_CLOSED ||
      shipment.status === ShipmentStatus.DELIVERED
    ) {
      steps[3].status = 'completed';
      steps[4].status = 'completed';
      steps[4].date = new Date().toISOString().split('T')[0];
    }

    return steps;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {feedback && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-4">
          <div className="bg-[#D4AF37] text-black px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-3">
            <span className="w-2 h-2 bg-black rounded-full animate-pulse" />
            {feedback}
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <div className="bg-[#1A0F0A] border border-red-500/30 p-10 rounded-[40px] max-w-md w-full text-center space-y-8 shadow-2xl">
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Terminate Shipment?</h3>
              <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-2">
                This action will mark the lifecycle as closed and archive all associated telemetry.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-4 bg-white/5 text-white/60 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10"
              >
                Abort
              </button>
              <button
                onClick={() => void handleTerminate()}
                className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20"
              >
                Execute
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-[#D4AF37] mb-4 flex items-center gap-2 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
            Return to Pipeline
          </button>

          <div className="flex items-center gap-6">
            <h2 className="text-5xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              {shipment.id}
            </h2>
            <span
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                shipment.riskLevel === 'Low'
                  ? 'bg-green-500/10 text-green-500 border-green-500/20'
                  : shipment.riskLevel === 'Medium'
                  ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                  : 'bg-red-500/10 text-red-500 border-red-500/20'
              }`}
            >
              {shipment.riskLevel} Risk Vector
            </span>
          </div>

          <p className="text-white/40 font-bold uppercase tracking-[0.2em] mt-3 flex items-center gap-3">
            <button
              onClick={() => {
                if (buyer) navigate(`/buyers/${buyer.id}`);
              }}
              className="hover:text-[#D4AF37] transition-colors"
            >
              {shipment.buyerName}
            </button>
            <span className="w-1 h-1 bg-white/20 rounded-full" />
            {shipment.destination}
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="relative group">
            <select
              value={shipment.status}
              onChange={(e) => void handleStatusChange(e.target.value as ShipmentStatus)}
              className="appearance-none px-6 py-3 pr-12 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/80 hover:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all cursor-pointer"
            >
              {Object.values(ShipmentStatus).map((status) => (
                <option key={status} value={status} className="bg-[#0A0A0A] text-white/70">
                  {status}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20 group-hover:text-[#D4AF37]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <button
            onClick={handleGenerateProtocol}
            className="px-6 py-3 border border-white/10 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:border-white/30 transition-all"
          >
            Generate Protocol
          </button>

          <button
            onClick={() =>
              navigate('/forms', { state: { shipmentId: shipment.id, activeTab: 'Commercial Invoice' } })
            }
            className="px-6 py-3 border border-[#D4AF37]/30 bg-[#D4AF37]/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all"
          >
            Commercial Invoice
          </button>

          <button
            onClick={() => setShowConfirm(true)}
            className="px-6 py-3 bg-[#D4AF37] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-[0_10px_20px_rgba(212,175,55,0.2)] hover:scale-105 transition-all"
          >
            Terminate Shipment
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#1A0F0A] to-[#0A0A0A] border border-[#D4AF37]/20 p-8 rounded-[32px] shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37] opacity-[0.03] blur-3xl -mr-32 -mt-32" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl">
              <svg className="w-4 h-4 text-[#D4AF37]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.536 14.95a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM15.657 14.95l-.707-.707a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414z" />
              </svg>
            </div>
            <div>
              <h4 className="font-black text-[11px] tracking-widest text-[#D4AF37] uppercase">
                System Synthesis
              </h4>
              <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">
                Cognitive Overview v2.1
              </p>
            </div>
          </div>
          <p className="text-sm text-white/80 leading-relaxed italic font-medium p-6 border-l-2 border-[#D4AF37]/30 bg-white/[0.01] rounded-r-2xl">
            {summary ? `"${summary}"` : 'CALIBRATING SYSTEM SENSORS...'}
          </p>
        </div>
      </div>

      <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[32px] overflow-hidden">
        <div className="flex border-b border-white/5 bg-white/[0.01] overflow-x-auto custom-scrollbar">
          <TabButton name="overview" label="Operational Data" />
          <TabButton name="milestones" label="Milestones" />
          <TabButton name="quality" label="Quality" />
          <TabButton name="compliance" label="Compliance" />
          <TabButton name="risk" label="Risk" />
          <TabButton name="buyerPreview" label="Buyer Preview" />
          <TabButton name="tasks" label="Tasks" />
          <TabButton name="linkedDocs" label="System Protocols" />
          <TabButton name="documents" label="Asset Vault" />
          <TabButton name="finance" label="Credit Ledger" />
          <TabButton name="timeline" label="Event Log" />
        </div>

        <div className="p-10">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              <div className="space-y-6">
                <h5 className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em] border-b border-white/5 pb-3">
                  Cargo Telemetry
                </h5>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Type</span>
                  <span className="text-sm font-black text-white/90">{shipment.coffeeType}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Mass</span>
                  <span className="text-sm font-black text-white/90 font-mono">
                    {shipment.weight.toLocaleString()} KG
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Timestamp</span>
                  <span className="text-sm font-black text-white/90 font-mono">{shipment.date}</span>
                </div>
              </div>

              <div className="space-y-6">
                <h5 className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em] border-b border-white/5 pb-3">
                  Logistics Grid
                </h5>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Carrier</span>
                  <span className="text-sm font-black text-white/90">ETH SHIPPING LINES</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">ETA Projection</span>
                  <span className="text-sm font-black text-white/90 font-mono">2024.04.12</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Node Status</span>
                  <span
                    className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border whitespace-nowrap ${getStatusColor(
                      shipment.status
                    )}`}
                  >
                    {shipment.status}
                  </span>
                </div>
              </div>

              {state.role !== 'Sales' && (
                <div className="space-y-6 bg-white/[0.03] p-8 rounded-3xl border border-white/5">
                  <h5 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] border-b border-white/5 pb-3">
                    Profitability Analysis
                  </h5>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Gross Value</span>
                    <span className="text-sm font-black text-white/90 font-mono">${shipment.value.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Cost Basis</span>
                    <span className="text-sm font-black text-white/50 font-mono">
                      ${(shipment.value * 0.82).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Net Efficiency</span>
                    <span className="text-lg font-black text-[#10B981]">{shipment.margin}%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'milestones' && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h5 className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em]">
                    Shipment Milestones
                  </h5>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-2">
                    Set expected dates, mark completion, and track slippage.
                  </p>
                </div>

                <div className="bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 flex items-center justify-between gap-6">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Late milestones</p>
                    <p className="text-xl font-black text-white/90 mt-1">
                      {(() => {
                        const today = new Date().toISOString().split('T')[0];
                        const ms = shipment.milestones ?? [];
                        return ms.filter((m) => m.status !== 'Done' && m.expectedDate && m.expectedDate < today).length;
                      })()}
                    </p>
                  </div>

                  <div className="w-px h-10 bg-white/10" />

                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Completed</p>
                    <p className="text-xl font-black text-[#10B981] mt-1">
                      {(() => {
                        const ms = shipment.milestones ?? [];
                        return ms.filter((m) => m.status === 'Done').length;
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="space-y-2">
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Route template</div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <select
                      value={shipment.routeId ?? ''}
                      onChange={async (e) => {
                        const routeId = e.target.value;
                        const updated = ensureShipmentIntelligence(shipment);
                        await updateShipment({ ...updated, routeId: routeId || undefined });
                      }}
                      className="min-w-[320px] bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/70"
                    >
                      <option value="">No route selected</option>
                      {routes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => {
                        const r = routes.find((x) => x.id === shipment.routeId);
                        if (!r) {
                          showToast('SELECT A ROUTE FIRST', 2000);
                          return;
                        }
                        void applyRouteToMilestones(r);
                      }}
                      className="px-5 py-3 rounded-xl bg-[#D4AF37] text-black text-[10px] font-black uppercase tracking-widest"
                    >
                      Auto-fill expected dates
                    </button>
                  </div>

                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                    Admin sets routes in the Route Library. This action only updates expected dates.
                  </div>
                </div>

                <button
                  onClick={() => navigate('/routes')}
                  className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/10"
                >
                  Manage routes
                </button>
              </div>

              <div className="space-y-4">
                {(shipment.milestones ?? []).map((m) => (
                  <div key={m.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                          m.status === 'Done'
                            ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]'
                            : 'bg-white/[0.03] border-white/10 text-white/30'
                        }`}
                      >
                        {m.status === 'Done' ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
                          </svg>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-black text-white/90 uppercase tracking-widest">{m.name}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-2">
                          Status:{' '}
                          <span className={m.status === 'Done' ? 'text-[#10B981]' : 'text-white/50'}>
                            {m.status}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full lg:w-auto">
                      <div className="space-y-2">
                        <label className="block text-[9px] font-black uppercase tracking-widest text-white/30">
                          Expected
                        </label>
                        <input
                          type="date"
                          value={m.expectedDate ?? ''}
                          onChange={(e) => void patchMilestone(m.id, { expectedDate: e.target.value })}
                          className="w-full md:w-48 px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/70 focus:ring-1 focus:ring-[#D4AF37] outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[9px] font-black uppercase tracking-widest text-white/30">
                          Actual
                        </label>
                        <input
                          type="date"
                          value={m.actualDate ?? ''}
                          onChange={(e) => void patchMilestone(m.id, { actualDate: e.target.value })}
                          className="w-full md:w-48 px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/70 focus:ring-1 focus:ring-[#D4AF37] outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[9px] font-black uppercase tracking-widest text-white/30">
                          Complete
                        </label>
                        <button
                          onClick={() =>
                            void patchMilestone(m.id, {
                              status: m.status === 'Done' ? 'Pending' : 'Done',
                              actualDate:
                                m.status === 'Done'
                                  ? m.actualDate ?? ''
                                  : m.actualDate ?? new Date().toISOString().split('T')[0],
                            })
                          }
                          className={`w-full md:w-40 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                            m.status === 'Done'
                              ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30 hover:bg-[#10B981]/25'
                              : 'bg-white/[0.03] text-white/60 border-white/10 hover:border-[#D4AF37]/50 hover:text-[#D4AF37]'
                          }`}
                        >
                          {m.status === 'Done' ? 'Mark Pending' : 'Mark Done'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'quality' && (
            <div className="space-y-10">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                <div>
                  <h5 className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em]">
                    Quality & Cupping
                  </h5>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-2">
                    Link lots to this shipment and define minimum quality specs.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/lots')}
                  className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/10"
                >
                  Manage lots
                </button>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Required specs</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
                  <label className="space-y-2">
                    <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Min cupping score</div>
                    <input
                      type="number"
                      value={(shipment.qualitySpec?.minCuppingScore ?? 84).toString()}
                      onChange={(e) => void updateQualitySpec({ minCuppingScore: Number(e.target.value) })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/70"
                    />
                  </label>

                  <label className="space-y-2">
                    <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Max moisture %</div>
                    <input
                      type="number"
                      step="0.1"
                      value={(shipment.qualitySpec?.maxMoisturePercent ?? 12.5).toString()}
                      onChange={(e) => void updateQualitySpec({ maxMoisturePercent: Number(e.target.value) })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/70"
                    />
                  </label>

                  <label className="space-y-2">
                    <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Min screen size</div>
                    <input
                      type="number"
                      value={(shipment.qualitySpec?.minScreenSize ?? 15).toString()}
                      onChange={(e) => void updateQualitySpec({ minScreenSize: Number(e.target.value) })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/70"
                    />
                  </label>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Linked lots</div>
                    <div className="text-xs text-white/40 font-bold uppercase tracking-widest mt-2">
                      {shipment.lotIds?.length ? `${shipment.lotIds.length} linked` : 'No lots linked yet'}
                    </div>
                  </div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Select lots to reserve</div>
                </div>

                <div className="mt-6 space-y-3">
                  {lots.length === 0 && (
                    <div className="text-xs text-white/40 font-semibold">
                      No lots found. Create lots in the Lots page.
                    </div>
                  )}

                  {lots.map((l: Lot) => {
                    const linked = shipment.lotIds?.includes(l.id) ?? false;
                    const spec = {
                      minCuppingScore: shipment.qualitySpec?.minCuppingScore ?? 84,
                      maxMoisturePercent: shipment.qualitySpec?.maxMoisturePercent ?? 12.5,
                      minScreenSize: shipment.qualitySpec?.minScreenSize ?? 15,
                    };

                    const fails: string[] = [];
                    if (l.cuppingScore != null && l.cuppingScore < spec.minCuppingScore) {
                      fails.push(`Cupping ${l.cuppingScore} < ${spec.minCuppingScore}`);
                    }
                    if (l.moisturePercent != null && l.moisturePercent > spec.maxMoisturePercent) {
                      fails.push(`Moisture ${l.moisturePercent}% > ${spec.maxMoisturePercent}%`);
                    }
                    if (l.screenSize != null && l.screenSize < spec.minScreenSize) {
                      fails.push(`Screen ${l.screenSize} < ${spec.minScreenSize}`);
                    }

                    const ok = fails.length === 0;

                    return (
                      <button
                        key={l.id}
                        onClick={() => void toggleLot(l.id)}
                        className={`w-full text-left bg-black/30 border rounded-2xl p-6 transition-all ${
                          linked
                            ? 'border-[#D4AF37]/40 shadow-[0_0_18px_rgba(212,175,55,0.12)]'
                            : 'border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37]">
                              {l.code}
                            </div>
                            <div className="text-lg font-black mt-2">
                              {l.origin} • {l.processingType}
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-2">
                              {l.grade} — {l.warehouse}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                ok
                                  ? 'bg-[#10B981]/10 border-[#10B981]/20 text-[#10B981]'
                                  : 'bg-red-500/10 border-red-500/20 text-red-400'
                              }`}
                            >
                              {ok ? 'Spec OK' : 'Mismatch'}
                            </span>
                            <span
                              className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                linked
                                  ? 'bg-[#D4AF37]/10 border-[#D4AF37]/20 text-[#D4AF37]'
                                  : 'bg-white/5 border-white/10 text-white/40'
                              }`}
                            >
                              {linked ? 'Linked' : 'Not linked'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
                          <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                            <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Qty</div>
                            <div className="text-lg font-black mt-1">{Math.round(l.quantityKg / 1000)}t</div>
                          </div>
                          <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                            <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Cupping</div>
                            <div className="text-lg font-black mt-1">{l.cuppingScore ?? '—'}</div>
                          </div>
                          <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                            <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Moisture</div>
                            <div className="text-lg font-black mt-1">
                              {l.moisturePercent != null ? `${l.moisturePercent}%` : '—'}
                            </div>
                          </div>
                          <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                            <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Screen</div>
                            <div className="text-lg font-black mt-1">{l.screenSize ?? '—'}</div>
                          </div>
                        </div>

                        {!ok && (
                          <div className="mt-4 text-xs text-red-400 font-bold uppercase tracking-widest">
                            {fails.join(' • ')}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="space-y-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <h5 className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em]">
                    Compliance Checklist
                  </h5>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-2">
                    Status is computed from linked documents. You can generate placeholders to start an approval workflow.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4">
                  <div className="bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Completeness</p>
                    <p className="text-2xl font-black text-white/90 mt-1">{formatPct(compliance?.completeness)}</p>
                  </div>
                  <div className="bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Missing critical</p>
                    <p className="text-2xl font-black text-red-500 mt-1">
                      {(compliance?.missingCritical?.length ?? 0).toString().padStart(2, '0')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {(compliance?.updatedChecklist ?? shipment.complianceChecklist ?? []).map((item) => (
                  <div key={item.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                          item.status === 'Approved'
                            ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]'
                            : item.status === 'Uploaded'
                            ? 'bg-[#D4AF37]/10 border-[#D4AF37]/25 text-[#D4AF37]'
                            : 'bg-white/[0.03] border-white/10 text-white/20'
                        }`}
                      >
                        {item.status === 'Approved' ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : item.status === 'Uploaded' ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-black text-white/90 uppercase tracking-widest">{item.name}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-2">
                          Status:{' '}
                          <span
                            className={
                              item.status === 'Approved'
                                ? 'text-[#10B981]'
                                : item.status === 'Uploaded'
                                ? 'text-[#D4AF37]'
                                : 'text-white/50'
                            }
                          >
                            {item.status}
                          </span>
                          {item.critical && (
                            <span className="ml-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20">
                              Critical
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 justify-end">
                      {item.docType && (
                        <button
                          onClick={() => navigate('/documents')}
                          className="px-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition-all"
                        >
                          Open Documents
                        </button>
                      )}

                      {item.docType && item.status === 'Missing' && (
                        <button
                          onClick={() => void addPlaceholderDocForChecklist(item.docType, item.name)}
                          className="px-4 py-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl text-[9px] font-black uppercase tracking-widest text-[#D4AF37] hover:bg-[#D4AF37]/15 transition-all"
                        >
                          Generate Placeholder
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'risk' && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white/[0.03] border border-white/5 rounded-[28px] p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-52 h-52 bg-[#D4AF37] opacity-[0.03] blur-3xl -mr-24 -mt-24" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37]">
                    Shipment Risk Score
                  </p>
                  <p className="text-6xl font-black text-white/90 tracking-tighter mt-3">
                    {risk?.score ?? 0}
                    <span className="text-base text-white/30 font-black align-top">/100</span>
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    <span
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        risk?.level === 'High'
                          ? 'bg-red-500/10 text-red-500 border-red-500/20'
                          : risk?.level === 'Medium'
                          ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                          : 'bg-green-500/10 text-green-500 border-green-500/20'
                      }`}
                    >
                      {risk?.level ?? 'Low'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                      Compliance: {formatPct(risk?.compliance)}
                    </span>
                  </div>
                </div>

                <div className="bg-white/[0.03] border border-white/5 rounded-[28px] p-8">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37]">
                    Primary drivers
                  </p>
                  <div className="mt-6 space-y-3">
                    {(risk?.reasons?.length ? risk.reasons : ['No significant risk drivers detected.'])
                      .slice(0, 6)
                      .map((r, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <span className="w-2 h-2 rounded-full bg-[#D4AF37] mt-2" />
                          <p className="text-sm text-white/70 leading-relaxed">{r}</p>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-white/[0.03] border border-white/5 rounded-[28px] p-8">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37]">Actions</p>
                  <div className="mt-6 space-y-3">
                    <button
                      onClick={() => setActiveTab('compliance')}
                      className="w-full px-5 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition-all"
                    >
                      Review Compliance
                    </button>
                    <button
                      onClick={() => setActiveTab('milestones')}
                      className="w-full px-5 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition-all"
                    >
                      Review Milestones
                    </button>
                    <button
                      onClick={() => navigate('/alerts')}
                      className="w-full px-5 py-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#D4AF37] hover:bg-[#D4AF37]/15 transition-all"
                    >
                      Open Alerts Center
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'buyerPreview' && (
            <div className="space-y-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <h5 className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em]">
                    Buyer Portal Preview
                  </h5>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-2">
                    This is exactly what the buyer would see (read-only). Internal risk, margins, and notes are hidden.
                  </p>
                </div>

                <div className="bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Buyer</p>
                  <p className="text-sm font-black text-white/90 mt-1 uppercase tracking-widest">{shipment.buyerName}</p>
                  {buyer?.portalCode && (
                    <p className="text-[10px] font-mono text-white/30 mt-2">/#/buyer/{buyer.portalCode}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-[28px] p-8">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37]">
                    Shipment Summary
                  </p>
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Shipment ID</p>
                      <p className="text-lg font-black text-white/90 mt-1">{shipment.id}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Status</p>
                      <p className="text-lg font-black text-white/90 mt-1">{shipment.status}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Destination</p>
                      <p className="text-lg font-black text-white/90 mt-1">{shipment.destination}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Coffee</p>
                      <p className="text-lg font-black text-white/90 mt-1">{shipment.coffeeType}</p>
                    </div>
                  </div>

                  <div className="mt-8">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Sanitized narrative</p>
                    <p className="mt-3 text-sm text-white/70 leading-relaxed bg-black/30 border border-white/10 rounded-2xl p-5">
                      {summary ? summary : 'Summary not generated yet.'}
                    </p>
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-[28px] p-8">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37]">Shared Documents</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-2">
                    Only docs toggled as “buyer visible” appear here.
                  </p>

                  <div className="mt-6 space-y-3">
                    {systemDocs.filter((d) => d.buyerVisible).length ? (
                      systemDocs
                        .filter((d) => d.buyerVisible)
                        .map((d) => (
                          <div key={d.id} className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-white/80 truncate max-w-[200px]">
                                {d.name}
                              </p>
                              <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mt-1">
                                {d.type} • {d.status}
                              </p>
                            </div>
                            <button
                              onClick={() => setSelectedDoc(d)}
                              className="px-3 py-1.5 bg-white/[0.04] border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition-all"
                            >
                              View
                            </button>
                          </div>
                        ))
                    ) : (
                      <div className="p-10 text-center bg-white/[0.02] border border-white/5 rounded-2xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
                          No documents shared yet
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={() => navigate('/documents')}
                      className="w-full px-5 py-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#D4AF37] hover:bg-[#D4AF37]/15 transition-all"
                    >
                      Manage Sharing in Documents Hub
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-8">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                <div>
                  <h5 className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em]">
                    Shipment Task Board
                  </h5>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-2">
                    Turn alerts into actions: assign, set due dates, and track completion.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="e.g., Upload phyto / Confirm LC / Approve invoice"
                    className="min-w-[320px] bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-[11px] font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]/60"
                  />
                  <button
                    onClick={async () => {
                      const title = newTaskTitle.trim();
                      if (!title) return;
                      await addTask(title);
                      setNewTaskTitle('');
                      showToast('TASK CREATED', 2000);
                    }}
                    disabled={!newTaskTitle.trim()}
                    className="px-6 py-4 bg-[#D4AF37] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30"
                  >
                    Add Task
                  </button>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-[28px] overflow-hidden">
                <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4AF37]">Tasks</p>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">
                      Stored per shipment.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl">
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Open</span>
                      <span className="ml-2 text-sm font-black text-white/90">
                        {tasks.filter((t) => t.status !== 'Done').length}
                      </span>
                    </div>
                    <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl">
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Done</span>
                      <span className="ml-2 text-sm font-black text-[#10B981]">
                        {tasks.filter((t) => t.status === 'Done').length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-white/5">
                  {tasks.length === 0 && (
                    <div className="p-12 text-center text-white/20 font-black uppercase tracking-widest">
                      No tasks yet
                    </div>
                  )}

                  {tasks.map((t) => {
                    const overdue =
                      t.dueDate &&
                      t.status !== 'Done' &&
                      t.dueDate < new Date().toISOString().split('T')[0];

                    return (
                      <div key={t.id} className="px-8 py-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-sm font-black text-white/90">{t.title}</span>
                            {overdue && (
                              <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-red-500/30 bg-red-500/10 text-red-400">
                                Overdue
                              </span>
                            )}
                          </div>

                          <div className="mt-3 flex gap-6 flex-wrap">
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Owner</span>
                            <input
                              value={t.owner ?? ''}
                              onChange={(e) => void patchTask(t.id, { owner: e.target.value })}
                              placeholder="Admin"
                              className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white/70 placeholder:text-white/20"
                            />

                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Due</span>
                            <input
                              type="date"
                              value={t.dueDate ?? ''}
                              onChange={(e) => void patchTask(t.id, { dueDate: e.target.value || undefined })}
                              className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white/70"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          <select
                            value={t.status}
                            onChange={(e) => void patchTask(t.id, { status: e.target.value as TaskStatus })}
                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/70"
                          >
                            {(['Open', 'In Progress', 'Done'] as TaskStatus[]).map((s) => (
                              <option key={s} value={s} className="bg-[#0A0A0A]">
                                {s}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => void deleteTask(t.id)}
                            className="px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-red-400 hover:border-red-500/40 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'linkedDocs' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h5 className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em]">
                  Authorized System Assets ({systemDocs.length.toString().padStart(2, '0')})
                </h5>
              </div>

              {systemDocs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {systemDocs.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-all group cursor-pointer relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-[#D4AF37] opacity-20" />
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-black/40 border border-[#D4AF37]/20 rounded-xl flex items-center justify-center text-[#D4AF37] group-hover:border-[#D4AF37]/50 transition-all">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-black text-white/90 uppercase tracking-widest">{doc.name}</p>
                          <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-1">
                            Protocol: {doc.type} • Status: <span className="text-[#D4AF37]">{doc.status}</span>
                          </p>
                        </div>
                      </div>

                      <button className="px-4 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition-all">
                        Retrieve
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="p-6 rounded-full bg-white/5 text-white/10">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v2m4 6h.01M12 17h.01M16 17h.01" />
                    </svg>
                  </div>
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
                    No validated documents attached to this node
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h5 className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em]">
                  Encrypted Asset Vault ({vaultDocs.length.toString().padStart(2, '0')})
                </h5>
                <div>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white border border-white/10 px-4 py-2 rounded-xl transition-all flex items-center gap-2 group"
                  >
                    {isUploading ? (
                      <>
                        <span className="w-2 h-2 bg-[#D4AF37] rounded-full animate-ping" />
                        Encrypting...
                      </>
                    ) : (
                      <>
                        <span className="group-hover:text-[#D4AF37] transition-colors text-lg leading-none">+</span>
                        Inject File
                      </>
                    )}
                  </button>
                </div>
              </div>

              {isUploading && (
                <div className="bg-white/[0.03] border border-white/5 p-6 rounded-2xl space-y-3 animate-in fade-in zoom-in-95">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest">
                      Neural Encryption in Progress
                    </span>
                    <span className="text-[10px] font-mono text-white/40">{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#D4AF37] transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative transition-all duration-500 rounded-[40px] border-2 border-dashed ${
                  isDragging ? 'bg-[#D4AF37]/10 border-[#D4AF37] scale-[1.01]' : 'bg-transparent border-transparent'
                }`}
              >
                {isDragging && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm rounded-[40px] pointer-events-none">
                    <div className="w-20 h-20 bg-[#D4AF37] rounded-full flex items-center justify-center text-black animate-bounce">
                      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                      </svg>
                    </div>
                    <p className="mt-6 text-sm font-black text-white uppercase tracking-[0.4em]">
                      Release to Inject Asset
                    </p>
                  </div>
                )}

                {vaultDocs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vaultDocs.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc)}
                        className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-all group cursor-pointer"
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-black/40 border border-white/10 rounded-xl flex items-center justify-center text-white/20 group-hover:border-[#D4AF37]/40 transition-all">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs font-black text-white/90 uppercase tracking-widest truncate max-w-[200px]">
                              {doc.name}
                            </p>
                            <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-1">
                              Uploaded Asset • {doc.fileSize || 'Size Unknown'}
                            </p>
                          </div>
                        </div>

                        <button className="p-2 text-white/20 hover:text-[#D4AF37] transition-colors">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-20 text-center flex flex-col items-center justify-center space-y-6">
                    <div className="w-20 h-20 bg-white/[0.03] border border-white/5 rounded-full flex items-center justify-center text-white/5">
                      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">
                        No external assets registered
                      </p>
                      <p className="text-[9px] text-white/10 font-bold uppercase tracking-[0.2em] mt-2">
                        Drag and drop or use the inject button above
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'finance' && state.role === 'Sales' && (
            <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
              <div className="p-6 rounded-full bg-white/5 text-white/10">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
                Access Denied: Clearance Level Insufficient
              </p>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="py-6 max-w-3xl mx-auto">
              <div className="space-y-12 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px before:h-full before:w-0.5 before:bg-white/5">
                {getTimelineSteps().map((step, idx) => (
                  <div key={idx} className="relative flex items-center group">
                    <div
                      className={`flex items-center justify-center w-12 h-12 rounded-2xl border shrink-0 z-10 transition-all ${
                        step.status === 'completed'
                          ? 'bg-[#D4AF37] border-[#D4AF37]'
                          : step.status === 'current'
                          ? 'bg-white border-white'
                          : 'bg-black border-white/10'
                      }`}
                    >
                      {step.status === 'completed' && (
                        <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {step.status === 'current' && <div className="w-2 h-2 bg-black rounded-full animate-ping" />}
                    </div>

                    <div className="ml-10 w-full bg-white/[0.02] p-6 rounded-2xl border border-white/5 group-hover:bg-white/[0.04] transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`text-xs font-black uppercase tracking-widest ${
                            step.status === 'upcoming' ? 'text-white/20' : 'text-white/90'
                          }`}
                        >
                          {step.title}
                        </div>
                        <time className="font-mono text-[10px] text-[#D4AF37] font-black">{step.date}</time>
                      </div>
                      <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                        Automated System Log Entry #{idx + 1024}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#0F0906] border-2 border-[#D4AF37]/30 p-12 rounded-[56px] shadow-2xl relative overflow-hidden max-w-2xl w-full">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#D4AF37] via-transparent to-[#D4AF37]" />

            <button
              onClick={() => setSelectedDoc(null)}
              className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-6 mb-10">
              <div className="w-16 h-16 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl flex items-center justify-center text-[#D4AF37]">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tighter uppercase">{selectedDoc.name}</h3>
                <p className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-[0.4em] mt-1">
                  Protocol ID: {selectedDoc.id}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-10">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Type</p>
                <p className="text-xs font-bold text-white/80 uppercase">{selectedDoc.type}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Status</p>
                <p className="text-xs font-bold text-[#10B981] uppercase">{selectedDoc.status}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Sync Date</p>
                <p className="text-xs font-bold text-white/80 font-mono">{selectedDoc.date}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Linked Node</p>
                <p className="text-xs font-bold text-[#D4AF37] font-mono">
                  {selectedDoc.shipmentId || 'MASTER'}
                </p>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl mb-10">
              <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-4">
                AI Extraction Summary
              </p>
              <p className="text-xs text-white/60 leading-relaxed italic">
                "This asset has been verified against the global export registry. All signatures are valid and the
                document hash matches the blockchain record. No anomalies detected in the protocol buffer."
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setSelectedDoc(null)}
                className="flex-1 py-4 bg-white/5 border border-white/10 text-white/40 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-white transition-all"
              >
                Close Preview
              </button>

              {[
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
              ].includes(selectedDoc.type) && (
                <button
                  onClick={() => {
                    navigate('/forms', {
                      state: {
                        shipmentId: selectedDoc.shipmentId,
                        buyerId: selectedDoc.buyerId,
                        activeTab: selectedDoc.type,
                      },
                    });
                  }}
                  className="flex-1 py-4 bg-white/5 border border-white/10 text-white/40 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-white transition-all"
                >
                  Edit Protocol
                </button>
              )}

              <button
                onClick={() => handleDownload(selectedDoc)}
                className="flex-[2] py-4 bg-[#D4AF37] text-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#D4AF37]/20 hover:scale-[1.02] transition-all"
              >
                Download Secure Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipmentDetail;