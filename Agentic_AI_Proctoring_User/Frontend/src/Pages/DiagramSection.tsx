import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState,
  ReactFlowProvider,
  Handle,
  Position,
  MarkerType,
  ConnectionLineType,
  ConnectionMode
} from 'reactflow';
import type { Connection, Edge, Node, NodeProps } from 'reactflow';
import 'reactflow/dist/style.css';
import { toPng } from 'html-to-image';
import { toast } from 'react-toastify';
import { 
  Bold, Italic, Underline,
  Undo, Redo, ZoomIn, ZoomOut, Trash2, Eraser, Flag, FileQuestion,
  Square, Circle, Database, Type, MousePointer2, ArrowRight
} from 'lucide-react';

// ── Custom Nodes ────────────────────────────────────────────────────────────
const BaseNode = ({ data, selected, shape = 'rect' }: any) => {
  let borderRadius = '0px';
  if (shape === 'rounded') borderRadius = '8px';
  if (shape === 'circle') borderRadius = '50%';
  
  return (
    <div 
      className={`relative flex items-center justify-center border-[1.5px] transition-shadow ${selected ? 'border-[#6965db] shadow-[0_0_0_2px_rgba(105,101,219,0.3)]' : ''}`}
      style={{ 
        backgroundColor: data.bgColor || '#ffffff', 
        borderColor: selected ? '#6965db' : (data.borderColor || '#000000'),
        borderRadius,
        minWidth: '100px',
        minHeight: '40px',
        color: data.fontColor || '#000000',
        fontWeight: data.bold ? 'bold' : 'normal',
        fontStyle: data.italic ? 'italic' : 'normal',
        textDecoration: data.underline ? 'underline' : 'none',
        fontSize: `${data.fontSize || 12}px`,
        fontFamily: data.fontFamily || 'Arial, sans-serif'
      }}
    >
      <Handle type="source" position={Position.Top} id="top" className="!w-2 !h-2 !bg-[#6965db] !border-white !border-2 opacity-0 hover:opacity-100" />
      <div className="px-2 py-1 select-none whitespace-pre-wrap text-center">
        {data.label || <span className="text-gray-300 text-[10px] italic">double-click</span>}
      </div>
      <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2 !h-2 !bg-[#6965db] !border-white !border-2 opacity-0 hover:opacity-100" />
      <Handle type="source" position={Position.Left} id="left" className="!w-2 !h-2 !bg-[#6965db] !border-white !border-2 opacity-0 hover:opacity-100" />
      <Handle type="source" position={Position.Right} id="right" className="!w-2 !h-2 !bg-[#6965db] !border-white !border-2 opacity-0 hover:opacity-100" />
    </div>
  );
};

const DiamondNode = ({ data, selected }: NodeProps) => (
  <div 
    className={`w-20 h-20 flex items-center justify-center rotate-45 border-[1.5px] transition-shadow ${selected ? 'border-[#6965db] shadow-[0_0_0_2px_rgba(105,101,219,0.3)]' : ''}`}
    style={{ 
      backgroundColor: data.bgColor || '#ffffff', 
      borderColor: selected ? '#6965db' : (data.borderColor || '#000000'),
      color: data.fontColor || '#000000',
    }}
  >
    <Handle type="source" position={Position.Top} id="top" className="!w-2 !h-2 !bg-[#6965db] !border-white !border-2 opacity-0 hover:opacity-100 !-rotate-45" />
    <div 
      className="-rotate-45 select-none text-center leading-tight px-1"
      style={{
        fontWeight: data.bold ? 'bold' : 'normal',
        fontStyle: data.italic ? 'italic' : 'normal',
        textDecoration: data.underline ? 'underline' : 'none',
        fontSize: `${data.fontSize || 12}px`,
        fontFamily: data.fontFamily || 'Arial, sans-serif'
      }}
    >
      {data.label || <span className="text-gray-300 text-[8px] italic">edit</span>}
    </div>
    <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2 !h-2 !bg-[#6965db] !border-white !border-2 opacity-0 hover:opacity-100 !-rotate-45" />
    <Handle type="source" position={Position.Left} id="left" className="!w-2 !h-2 !bg-[#6965db] !border-white !border-2 opacity-0 hover:opacity-100 !-rotate-45" />
    <Handle type="source" position={Position.Right} id="right" className="!w-2 !h-2 !bg-[#6965db] !border-white !border-2 opacity-0 hover:opacity-100 !-rotate-45" />
  </div>
);

const DatabaseNode = ({ data, selected }: NodeProps) => (
  <div 
    className={`w-16 h-20 flex flex-col items-center justify-center relative border-[1.5px] rounded-[50%/10%] transition-shadow ${selected ? 'border-[#6965db] shadow-[0_0_0_2px_rgba(105,101,219,0.3)]' : ''}`}
    style={{ 
      backgroundColor: data.bgColor || '#ffffff', 
      borderColor: selected ? '#6965db' : (data.borderColor || '#000000'),
      color: data.fontColor || '#000000',
    }}
  >
    <div 
      className="absolute top-0 w-full h-4 border-b-[1.5px] rounded-[50%]" 
      style={{ borderColor: selected ? '#6965db' : (data.borderColor || '#000000') }}
    />
    <Handle type="source" position={Position.Top} id="top" className="!w-2 !h-2 !bg-[#6965db] !border-white !border-2 opacity-0 hover:opacity-100" />
    <div 
      className="select-none text-center mt-2 px-1"
      style={{
        fontWeight: data.bold ? 'bold' : 'normal',
        fontStyle: data.italic ? 'italic' : 'normal',
        textDecoration: data.underline ? 'underline' : 'none',
        fontSize: `${data.fontSize || 12}px`,
        fontFamily: data.fontFamily || 'Arial, sans-serif'
      }}
    >
      {data.label || <span className="text-gray-300 text-[8px] italic">edit</span>}
    </div>
    <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2 !h-2 !bg-[#6965db] !border-white !border-2 opacity-0 hover:opacity-100" />
  </div>
);

const TextNode = ({ data, selected }: NodeProps) => (
  <div 
    className={`px-2 py-1 ${selected ? 'ring-2 ring-[#6965db] rounded bg-[#e0dfff] bg-opacity-30' : ''}`}
    style={{
        color: data.fontColor || '#000000',
        fontWeight: data.bold ? 'bold' : 'normal',
        fontStyle: data.italic ? 'italic' : 'normal',
        textDecoration: data.underline ? 'underline' : 'none',
        fontSize: `${data.fontSize || 12}px`,
        fontFamily: data.fontFamily || 'Arial, sans-serif'
    }}
  >
    {data.label || <span className="text-gray-300 text-[10px] italic">double-click to edit</span>}
  </div>
);

const RectNode = (props: any) => <BaseNode {...props} shape="rect" />;
const RoundedNode = (props: any) => <BaseNode {...props} shape="rounded" />;
const CircleNode = (props: any) => <BaseNode {...props} shape="circle" />;

const nodeTypes = {
  rect: RectNode,
  rounded: RoundedNode,
  circle: CircleNode,
  diamond: DiamondNode,
  database: DatabaseNode,
  text: TextNode
};

// ── Components ──────────────────────────────────────────────────────────────

const ToolButton = ({ icon, active, onClick, title }: any) => (
  <button 
    onClick={onClick} 
    title={title}
    className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${active ? 'bg-[#e0dfff] text-[#6965db]' : 'text-slate-600 hover:bg-[#f0efff]'}`}
  >
    {icon}
  </button>
);

const DiagramSection = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const editInputRef = useRef<HTMLInputElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [activeTool, setActiveTool] = useState<string>('selection');

  const selectedNode = useMemo(
    () => nodes.find(n => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  // ── Undo / Redo ──────────────────────────────────────────────────────────
  const historyRef = useRef<{nodes: Node[], edges: Edge[]}[]>([]);
  const historyPosRef = useRef(-1);
  const isRestoringRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [diagramPrompt, setDiagramPrompt] = useState<string>('Based on the requirements, design a high-level architecture diagram or an activity flow diagram.');

  useEffect(() => {
    if (historyRef.current.length === 0) {
      historyRef.current.push({ nodes: [], edges: [] });
      historyPosRef.current = 0;
    }

    const fetchData = async () => {
      const assessmentId = localStorage.getItem('assessment_id');
      const email = localStorage.getItem('candidate_email');
      
      try {
        // 1. Fetch Question Metadata
        const qResp = await fetch(`http://localhost:8000/admin/test/${assessmentId}/Preview`);
        if (qResp.ok) {
          const data = await qResp.json();
          if (data.Diagram?.enabled) {
            setDiagramPrompt(data.Diagram.prompt);
          }
        }

        // 2. Fetch Existing Progress
        const pResp = await fetch(`http://localhost:8001/api/diagram/results/${assessmentId}`);
        if (pResp.ok) {
          const results = await pResp.json();
          const myResult = results.find((r: any) => r.email === email);
          if (myResult?.student_json) {
            setNodes(myResult.student_json.nodes || []);
            setEdges(myResult.student_json.edges || []);
            lastSavedRef.current = JSON.stringify(myResult.student_json);
          }
        }
      } catch (err) {
        console.error("Failed to fetch diagram data", err);
      }
    };
    fetchData();
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (isRestoringRef.current) { isRestoringRef.current = false; return; }
    const timer = window.setTimeout(() => {
      const snap = {
        nodes: nodes.map(n => ({ ...n, data: { ...n.data } })),
        edges: edges.map(e => ({ ...e }))
      };
      historyRef.current = historyRef.current.slice(0, historyPosRef.current + 1);
      historyRef.current.push(snap);
      historyPosRef.current = historyRef.current.length - 1;
      if (historyRef.current.length > 50) { historyRef.current.shift(); historyPosRef.current--; }
      setCanUndo(historyPosRef.current > 0);
      setCanRedo(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (historyPosRef.current > 0) {
      historyPosRef.current--;
      const snap = historyRef.current[historyPosRef.current];
      isRestoringRef.current = true;
      setNodes(snap.nodes.map(n => ({ ...n, data: { ...n.data } })));
      setEdges(snap.edges.map(e => ({ ...e })));
      setCanUndo(historyPosRef.current > 0);
      setCanRedo(true);
    }
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyPosRef.current < historyRef.current.length - 1) {
      historyPosRef.current++;
      const snap = historyRef.current[historyPosRef.current];
      isRestoringRef.current = true;
      setNodes(snap.nodes.map(n => ({ ...n, data: { ...n.data } })));
      setEdges(snap.edges.map(e => ({ ...e })));
      setCanUndo(true);
      setCanRedo(historyPosRef.current < historyRef.current.length - 1);
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  // ── Core Handlers ─────────────────────────────────────────────────────────

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ 
      ...params, 
      type: 'straight',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#000' },
      style: { stroke: '#000', strokeWidth: 1.5 } 
    }, eds)),
    [setEdges]
  );

  const onPaneClick = useCallback((event: React.MouseEvent) => {
    if (activeTool === 'selection' || activeTool === 'arrow') {
      setSelectedNodeId(null);
      return;
    }
    
    if (!reactFlowInstance) return;
    const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    
    const newNode: Node = {
      id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: activeTool,
      position,
      data: { 
        label: activeTool === 'text' ? 'Text' : '', 
        bgColor: '#ffffff', 
        borderColor: '#000000', 
        fontColor: '#000000',
        fontSize: 12,
        fontFamily: 'Arial',
        bold: false,
        italic: false,
        underline: false
      },
    };
    setNodes((nds) => nds.concat(newNode));
    setActiveTool('selection');
  }, [activeTool, reactFlowInstance, setNodes]);

  const updateSelectedNode = useCallback((field: string, value: any) => {
    if (!selectedNodeId) return;
    setNodes(nds => nds.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, [field]: value } } : n));
  }, [selectedNodeId, setNodes]);

  const toggleSelectedNodeStyle = useCallback((field: 'bold' | 'italic' | 'underline') => {
    if (!selectedNodeId) return;
    setNodes(nds => nds.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, [field]: !n.data[field] } } : n));
  }, [selectedNodeId, setNodes]);

  const [showClearModal, setShowClearModal] = useState(false);

  // ── Autosave Logic ───────────────────────────────────────────────────────
  const lastSavedRef = useRef<string>('');
  
  const saveProgress = useCallback(async () => {
    const currentData = JSON.stringify({ nodes, edges });
    if (currentData === lastSavedRef.current) return;
    
    try {
      const payload = {
        assessment_id: localStorage.getItem('assessment_id'),
        email: localStorage.getItem('candidate_email'),
        student_json: { nodes, edges }
      };

      await fetch('http://localhost:8001/api/diagram/save-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      lastSavedRef.current = currentData;
    } catch (err) {
      console.error("Autosave failed", err);
    }
  }, [nodes, edges]);

  useEffect(() => {
    const timer = setTimeout(saveProgress, 3000);
    return () => clearTimeout(timer);
  }, [nodes, edges, saveProgress]);

  // ── Core Handlers ─────────────────────────────────────────────────────────

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ 
      ...params, 
      type: 'straight',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#000' },
      style: { stroke: '#000', strokeWidth: 1.5 } 
    }, eds)),
    [setEdges]
  );

  const onPaneClick = useCallback((event: React.MouseEvent) => {
    if (activeTool === 'selection' || activeTool === 'arrow') {
      setSelectedNodeId(null);
      return;
    }
    
    if (!reactFlowInstance) return;
    const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    
    const newNode: Node = {
      id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: activeTool,
      position,
      data: { 
        label: activeTool === 'text' ? 'Text' : '', 
        bgColor: '#ffffff', 
        borderColor: '#000000', 
        fontColor: '#000000',
        fontSize: 12,
        fontFamily: 'Arial',
        bold: false,
        italic: false,
        underline: false
      },
    };
    setNodes((nds) => nds.concat(newNode));
    setActiveTool('selection');
  }, [activeTool, reactFlowInstance, setNodes]);

  const updateSelectedNode = useCallback((field: string, value: any) => {
    if (!selectedNodeId) return;
    setNodes(nds => nds.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, [field]: value } } : n));
  }, [selectedNodeId, setNodes]);

  const toggleSelectedNodeStyle = useCallback((field: 'bold' | 'italic' | 'underline') => {
    if (!selectedNodeId) return;
    setNodes(nds => nds.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, [field]: !n.data[field] } } : n));
  }, [selectedNodeId, setNodes]);

  const handleClearCanvas = () => {
    setNodes([]);
    setEdges([]);
    setShowClearModal(false);
    toast.info("Canvas cleared");
  };

  const deleteSelected = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes(nds => nds.filter(n => n.id !== selectedNodeId));
    setEdges(eds => eds.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setEdges]);

  const onSelectionChange = useCallback(({ nodes: sel }: { nodes: Node[] }) => {
    setSelectedNodeId(sel.length > 0 ? sel[0].id : null);
  }, []);

  const onNodeDoubleClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
    setTimeout(() => {
      if (node.type === 'text') editTextareaRef.current?.focus();
      else editInputRef.current?.focus();
    }, 50);
  }, []);

  const handleZoomIn = useCallback(() => reactFlowInstance?.zoomIn(), [reactFlowInstance]);
  const handleZoomOut = useCallback(() => reactFlowInstance?.zoomOut(), [reactFlowInstance]);

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!reactFlowWrapper.current) return;
    setIsSubmitting(true);
    try {
      const dataUrl = await toPng(reactFlowWrapper.current, { 
        backgroundColor: '#f8f8f8',
        filter: (node) => {
          // Filter out UI elements from the screenshot
          return !node.classList?.contains('z-10');
        }
      });
      
      const payload = {
        assessment_id: localStorage.getItem('assessment_id'),
        email: localStorage.getItem('candidate_email'),
        user_name: localStorage.getItem('candidate_name'),
        student_json: { nodes, edges },
        image_base64: dataUrl
      };

      const response = await fetch('http://localhost:8001/api/diagram/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.status === 429) {
        toast.error("Rate limit reached. Please wait.");
        return;
      }

      const result = await response.json();
      if (response.ok) {
        toast.success(`Submission Success! Score: ${result.score}`);
        localStorage.setItem('diagram_completed', 'true');
      } else {
        throw new Error(result.detail || 'Submission failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#f1f3f4] font-sans overflow-hidden">
      
      {/* ── Top Navbar ── */}
      <header className="bg-white border-b border-gray-200 px-6 py-2.5 flex justify-between items-center z-50 sticky top-0">
        <div className="flex items-center gap-6">
          <img src="/virtusa-logo.svg" alt="Virtusa" className="h-7" />
          <div className="h-6 w-px bg-gray-200"></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">Assessment Section</span>
            <span className="text-sm font-bold text-gray-800 leading-none">System Design / Diagram</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-tight">Autosave Active</span>
          </div>
          <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2 rounded-lg font-bold text-sm transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
              {isSubmitting ? 'Evaluating...' : 'Finish Section'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden p-4 gap-4 max-w-[1600px] mx-auto w-full">
         
         {/* ── Left Side: Question Prompt ── */}
         <div className="w-1/4 flex flex-col gap-4">
             <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex-1 overflow-y-auto">
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      Problem Statement
                    </h3>
                    <span className="text-[10px] font-bold bg-orange-50 text-orange-600 px-2 py-0.5 rounded uppercase">Required</span>
                 </div>
                 
                 <div className="prose prose-sm prose-slate max-w-none">
                    <p className="text-[0.95rem] text-gray-600 leading-relaxed font-medium mb-4">
                        {diagramPrompt}
                    </p>
                    <ul className="text-sm text-gray-500 space-y-2 list-disc pl-4">
                        <li>Use appropriate shapes for each component.</li>
                        <li>Ensure all flows are connected logically.</li>
                        <li>Double-click any shape to edit its label.</li>
                        <li>Your work is saved automatically every 3 seconds.</li>
                    </ul>
                 </div>

                 <div className="mt-8 pt-6 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                        <Flag size={12} /> Options
                    </div>
                    <button className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-sm font-semibold text-gray-600">
                        Mark for Revisit
                        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                    </button>
                 </div>
             </div>
         </div>

         {/* ── Right Side: Canvas Area ── */}
         <div className="flex-1 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col relative" ref={reactFlowWrapper}>
            
            {/* ── Floating Action Bar ── */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-md border border-gray-200 rounded-2xl px-2.5 py-2 shadow-xl ring-1 ring-black/5">
              <ToolButton title="Selection" tool="selection" icon={<MousePointer2 size={19} />} active={activeTool === 'selection'} onClick={() => setActiveTool('selection')} />
              <div className="w-px h-6 bg-gray-200 mx-1.5"></div>
              <ToolButton title="Arrow" tool="arrow" icon={<ArrowRight size={19} />} active={activeTool === 'arrow'} onClick={() => setActiveTool('arrow')} />
              <ToolButton title="Rectangle" tool="rect" icon={<Square size={19} />} active={activeTool === 'rect'} onClick={() => setActiveTool('rect')} />
              <ToolButton title="Rounded" tool="rounded" icon={<div className="w-[19px] h-[19px] border-[2.5px] border-current rounded-[6px]" />} active={activeTool === 'rounded'} onClick={() => setActiveTool('rounded')} />
              <ToolButton title="Circle" tool="circle" icon={<Circle size={19} />} active={activeTool === 'circle'} onClick={() => setActiveTool('circle')} />
              <ToolButton title="Diamond" tool="diamond" icon={<div className="w-4 h-4 border-[2.5px] border-current rotate-45" />} active={activeTool === 'diamond'} onClick={() => setActiveTool('diamond')} />
              <ToolButton title="Database" tool="database" icon={<Database size={19} />} active={activeTool === 'database'} onClick={() => setActiveTool('database')} />
              <ToolButton title="Text" tool="text" icon={<Type size={19} />} active={activeTool === 'text'} onClick={() => setActiveTool('text')} />
            </div>

            {/* ── Floating Format Bar ── */}
            {selectedNode && (
              <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2.5 py-2 shadow-lg ring-1 ring-black/5 animate-in fade-in zoom-in duration-200">
                <select className="text-xs font-bold text-gray-700 border-none outline-none bg-transparent cursor-pointer px-2" value={selectedNode.data?.fontFamily || 'Arial'} onChange={(e) => updateSelectedNode('fontFamily', e.target.value)}>
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Inter">Inter</option>
                </select>
                <div className="w-px h-4 bg-gray-200 mx-1.5"></div>
                <select className="text-xs font-bold text-gray-700 border-none outline-none bg-transparent cursor-pointer pl-1 pr-2" value={selectedNode.data?.fontSize || 12} onChange={(e) => updateSelectedNode('fontSize', parseInt(e.target.value))}>
                  {[10,12,14,18,24,32].map(s => <option key={s} value={s}>{s}px</option>)}
                </select>
                <div className="w-px h-4 bg-gray-200 mx-1.5"></div>
                <button onClick={() => toggleSelectedNodeStyle('bold')} className={`p-2 rounded-lg ${selectedNode.data?.bold ? 'bg-orange-50 text-orange-600' : 'text-gray-500 hover:bg-gray-50'}`}><Bold size={15} /></button>
                <button onClick={() => toggleSelectedNodeStyle('italic')} className={`p-2 rounded-lg ${selectedNode.data?.italic ? 'bg-orange-50 text-orange-600' : 'text-gray-500 hover:bg-gray-50'}`}><Italic size={15} /></button>
                <button onClick={() => toggleSelectedNodeStyle('underline')} className={`p-2 rounded-lg ${selectedNode.data?.underline ? 'bg-orange-50 text-orange-600' : 'text-gray-500 hover:bg-gray-50'}`}><Underline size={15} /></button>
                <div className="w-px h-4 bg-gray-200 mx-1.5"></div>
                <div className="flex items-center gap-3 px-2">
                  <div className="relative w-6 h-6 rounded-lg overflow-hidden border-2 border-gray-200 shadow-inner" title="Background">
                    <input type="color" value={selectedNode.data?.bgColor || '#ffffff'} onChange={(e) => updateSelectedNode('bgColor', e.target.value)} className="absolute -top-3 -left-3 w-12 h-12 cursor-pointer"/>
                  </div>
                  <div className="relative w-6 h-6 rounded-lg overflow-hidden border-2 border-gray-200 shadow-inner" title="Border">
                    <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-white z-10 pointer-events-none border border-gray-100 shadow-sm"></div>
                    <input type="color" value={selectedNode.data?.borderColor || '#000000'} onChange={(e) => updateSelectedNode('borderColor', e.target.value)} className="absolute -top-3 -left-3 w-12 h-12 cursor-pointer"/>
                  </div>
                </div>
                <div className="w-px h-4 bg-gray-200 mx-1.5"></div>
                <button onClick={deleteSelected} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={16} /></button>
              </div>
            )}

            {/* ── Control Panel (Bottom Left) ── */}
            <div className="absolute bottom-6 left-6 z-10 flex gap-4">
              <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden ring-1 ring-black/5">
                <button onClick={handleZoomOut} className="p-3 hover:bg-gray-50 text-gray-500 transition-colors"><ZoomOut size={17} /></button>
                <span className="text-xs font-bold px-3 min-w-[50px] text-center text-gray-600 bg-gray-50/50 py-3">{zoomLevel}%</span>
                <button onClick={handleZoomIn} className="p-3 hover:bg-gray-50 text-gray-500 transition-colors"><ZoomIn size={17} /></button>
              </div>
              <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden ring-1 ring-black/5">
                <button onClick={undo} className={`p-3 hover:bg-gray-50 text-gray-500 transition-colors ${!canUndo ? 'opacity-30' : ''}`}><Undo size={17} /></button>
                <button onClick={redo} className={`p-3 hover:bg-gray-50 text-gray-500 transition-colors ${!canRedo ? 'opacity-30' : ''}`}><Redo size={17} /></button>
                <div className="w-px h-6 bg-gray-100 mx-1"></div>
                <button onClick={() => setShowClearModal(true)} className="p-3 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Clear Canvas"><Eraser size={17} /></button>
              </div>
            </div>

            {/* ── Label Editor ── */}
            {selectedNode && selectedNode.type !== 'text' && (
              <div className="absolute top-6 right-6 z-10 bg-white border border-gray-200 rounded-xl p-3 shadow-xl ring-1 ring-black/5 flex items-center gap-3 animate-in slide-in-from-right-4 duration-300">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Label</span>
                <input ref={editInputRef} type="text" value={selectedNode.data.label || ''} onChange={(e) => updateSelectedNode('label', e.target.value)} className="text-sm font-bold text-gray-700 border-2 border-gray-50 outline-none focus:border-orange-200 focus:bg-orange-50/30 rounded-lg px-3 py-1.5 w-40 transition-all" placeholder="Enter name..."/>
              </div>
            )}
            {selectedNode && selectedNode.type === 'text' && (
              <div className="absolute top-6 right-6 z-10 bg-white border border-gray-200 rounded-xl p-3 shadow-xl ring-1 ring-black/5 flex flex-col gap-2 animate-in slide-in-from-right-4 duration-300">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Text Content</span>
                <textarea ref={editTextareaRef} value={selectedNode.data.label || ''} onChange={(e) => updateSelectedNode('label', e.target.value)} className="text-sm font-bold text-gray-700 border-2 border-gray-50 outline-none focus:border-orange-200 focus:bg-orange-50/30 rounded-lg px-3 py-2 w-56 h-24 resize-none transition-all" placeholder="Enter text..."/>
              </div>
            )}

            <div className={`w-full h-full ${activeTool !== 'selection' ? 'cursor-crosshair' : ''} ${activeTool === 'arrow' ? '[&_.react-flow__handle]:!opacity-100 [&_.react-flow__handle]:!w-4 [&_.react-flow__handle]:!h-4 [&_.react-flow__handle]:!-ml-2 [&_.react-flow__handle]:!-mt-2' : ''}`}>
              <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onInit={setReactFlowInstance}
                  onPaneClick={onPaneClick}
                  onSelectionChange={onSelectionChange}
                  onNodeDoubleClick={onNodeDoubleClick}
                  onMoveEnd={(_, viewport) => setZoomLevel(Math.round(viewport.zoom * 100))}
                  nodeTypes={nodeTypes}
                  connectionLineType={ConnectionLineType.Straight}
                  defaultEdgeOptions={{ 
                    type: 'straight',
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#000' },
                    style: { stroke: '#000', strokeWidth: 1.5 }
                  }}
                  connectionMode={ConnectionMode.Loose}
                  fitView
                  snapToGrid
                  snapGrid={[10, 10]}
                  deleteKeyCode="Delete"
              >
                  <Background color="#f1f5f9" gap={25} size={1} />
                  <Controls showInteractive={false} className="hidden" />
              </ReactFlow>
            </div>
         </div>
      </div>

      {/* ── Custom Modal: Clear Response ── */}
      {showClearModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4">
                    <Eraser size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Clear entire response?</h3>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                    This action will permanently delete all shapes and connections from your canvas. This cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowClearModal(false)}
                        className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        Keep Work
                    </button>
                    <button 
                        onClick={handleClearCanvas}
                        className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-lg shadow-red-200"
                    >
                        Clear All
                    </button>
                </div>
            </div>
        </div>
      )}

  );
};

export default function WrappedDiagramSection() {
  return (
    <ReactFlowProvider>
      <DiagramSection />
    </ReactFlowProvider>
  );
}
