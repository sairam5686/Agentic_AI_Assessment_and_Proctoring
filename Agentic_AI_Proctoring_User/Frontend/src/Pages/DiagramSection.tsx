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
  ConnectionLineType
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
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-[#6965db] !border-white !border-2 opacity-0 hover:opacity-100" />
      <div className="px-2 py-1 select-none whitespace-pre-wrap text-center">
        {data.label || <span className="text-gray-300 text-[10px] italic">double-click</span>}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-[#6965db] !border-white !border-2 opacity-0 hover:opacity-100" />
      <Handle type="source" position={Position.Left} className="!w-2 !h-2 !bg-[#6965db] !border-white !border-2 opacity-0 hover:opacity-100" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-[#6965db] !border-white !border-2 opacity-0 hover:opacity-100" />
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
    <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-[#6965db] !border-white !border-2 opacity-0 hover:opacity-100 !-rotate-45" />
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
    <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-[#6965db] !border-white !border-2 opacity-0 hover:opacity-100 !-rotate-45" />
    <Handle type="source" position={Position.Left} className="!w-2 !h-2 !bg-[#6965db] !border-white !border-2 opacity-0 hover:opacity-100 !-rotate-45" />
    <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-[#6965db] !border-white !border-2 opacity-0 hover:opacity-100 !-rotate-45" />
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
    <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-[#6965db] !border-white !border-2 opacity-0 hover:opacity-100" />
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
    <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-[#6965db] !border-white !border-2 opacity-0 hover:opacity-100" />
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

  useEffect(() => {
    if (historyRef.current.length === 0) {
      historyRef.current.push({ nodes: [], edges: [] });
      historyPosRef.current = 0;
    }
  }, []);

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
    if (activeTool === 'selection') {
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

  const clearCanvas = () => {
    if (window.confirm("Are you sure you want to clear the canvas?")) {
      setNodes([]);
      setEdges([]);
    }
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
      const dataUrl = await toPng(reactFlowWrapper.current, { backgroundColor: '#f8f8f8' });
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
        toast.success(`Submission Success! AI Score: ${result.score}/10`);
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
      <header className="bg-[#0b1b3d] text-white px-6 py-3 flex justify-between items-center z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <span className="font-bold text-white tracking-widest">M</span>
            </div>
            <span className="font-semibold text-sm">Online Assessment</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-[#6965db] hover:bg-[#5753d0] text-white px-8 py-1.5 rounded font-semibold text-sm transition-all shadow-sm"
          >
              {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
          </button>
        </div>
      </header>

      {/* ── Secondary Header ── */}
      <div className="bg-white border-b border-[#e7e6f7] px-6 py-3 flex justify-between items-center shadow-sm z-40">
         <div className="flex items-center gap-2">
             <span className="font-bold text-slate-800 text-sm">Question 1</span>
             <Flag size={14} className="text-[#6965db]" />
         </div>
         <button className="text-xs font-semibold text-slate-500 flex items-center gap-1 hover:text-slate-800 transition-colors">
             <FileQuestion size={14} /> Revisit Later
         </button>
      </div>

      <div className="flex-1 flex overflow-hidden p-4 gap-4 max-w-7xl mx-auto w-full">
         
         {/* ── Left Side: Question Prompt ── */}
         <div className="w-1/3 flex flex-col gap-4">
             <div className="bg-white border border-[#e7e6f7] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
                 <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-[#6965db]"></div>
                   Instructions
                 </h3>
                 <p className="text-sm text-slate-600 leading-relaxed">
                     Build an activity diagram showing the requested logical flow. Select a tool from the floating toolbar and click on the canvas to place it.
                 </p>
             </div>
         </div>

         {/* ── Right Side: Canvas Area ── */}
         <div className="w-2/3 bg-[#f8f8f8] border border-[#e7e6f7] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.05)] flex flex-col relative" ref={reactFlowWrapper}>
            
            {/* ── Floating Action Bar ── */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white border border-[#e7e6f7] rounded-xl px-2 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
              <ToolButton title="Selection" tool="selection" icon={<MousePointer2 size={18} />} active={activeTool === 'selection'} onClick={() => setActiveTool('selection')} />
              <div className="w-px h-6 bg-slate-200 mx-1"></div>
              <ToolButton title="Arrow" tool="arrow" icon={<ArrowRight size={18} />} active={activeTool === 'arrow'} onClick={() => setActiveTool('arrow')} />
              <ToolButton title="Rectangle" tool="rect" icon={<Square size={18} />} active={activeTool === 'rect'} onClick={() => setActiveTool('rect')} />
              <ToolButton title="Rounded" tool="rounded" icon={<div className="w-[18px] h-[18px] border-[2px] border-current rounded-[6px]" />} active={activeTool === 'rounded'} onClick={() => setActiveTool('rounded')} />
              <ToolButton title="Circle" tool="circle" icon={<Circle size={18} />} active={activeTool === 'circle'} onClick={() => setActiveTool('circle')} />
              <ToolButton title="Diamond" tool="diamond" icon={<div className="w-4 h-4 border-[2px] border-current rotate-45" />} active={activeTool === 'diamond'} onClick={() => setActiveTool('diamond')} />
              <ToolButton title="Database" tool="database" icon={<Database size={18} />} active={activeTool === 'database'} onClick={() => setActiveTool('database')} />
              <ToolButton title="Text" tool="text" icon={<Type size={18} />} active={activeTool === 'text'} onClick={() => setActiveTool('text')} />
            </div>

            {/* ── Floating Format Bar ── */}
            {selectedNode && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white border border-[#e7e6f7] rounded-lg px-2 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                <select className="text-xs font-medium text-slate-700 border-none outline-none bg-transparent cursor-pointer px-2" value={selectedNode.data?.fontFamily || 'Arial'} onChange={(e) => updateSelectedNode('fontFamily', e.target.value)}>
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times New Roman">Times</option>
                </select>
                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                <select className="text-xs font-medium text-slate-700 border-none outline-none bg-transparent cursor-pointer pl-1 pr-2" value={selectedNode.data?.fontSize || 12} onChange={(e) => updateSelectedNode('fontSize', parseInt(e.target.value))}>
                  {[10,12,14,18,24,32].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                <button onClick={() => toggleSelectedNodeStyle('bold')} className={`p-1.5 rounded ${selectedNode.data?.bold ? 'bg-[#e0dfff] text-[#6965db]' : 'text-slate-600 hover:bg-[#f0efff]'}`}><Bold size={14} /></button>
                <button onClick={() => toggleSelectedNodeStyle('italic')} className={`p-1.5 rounded ${selectedNode.data?.italic ? 'bg-[#e0dfff] text-[#6965db]' : 'text-slate-600 hover:bg-[#f0efff]'}`}><Italic size={14} /></button>
                <button onClick={() => toggleSelectedNodeStyle('underline')} className={`p-1.5 rounded ${selectedNode.data?.underline ? 'bg-[#e0dfff] text-[#6965db]' : 'text-slate-600 hover:bg-[#f0efff]'}`}><Underline size={14} /></button>
                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                <div className="flex items-center gap-2 px-2">
                  <div className="relative w-5 h-5 rounded-full overflow-hidden border border-slate-300 shadow-sm" title="Background">
                    <input type="color" value={selectedNode.data?.bgColor || '#ffffff'} onChange={(e) => updateSelectedNode('bgColor', e.target.value)} className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer"/>
                  </div>
                  <div className="relative w-5 h-5 rounded-full overflow-hidden border border-slate-300 shadow-sm" title="Border">
                    <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-white z-10 pointer-events-none"></div>
                    <input type="color" value={selectedNode.data?.borderColor || '#000000'} onChange={(e) => updateSelectedNode('borderColor', e.target.value)} className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer"/>
                  </div>
                </div>
                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                <button onClick={deleteSelected} className="p-1.5 hover:bg-red-50 text-slate-500 hover:text-red-500 rounded transition-colors"><Trash2 size={14} /></button>
              </div>
            )}

            {/* ── Control Panel (Bottom Left) ── */}
            <div className="absolute bottom-4 left-4 z-10 flex gap-3">
              <div className="flex items-center bg-white border border-[#e7e6f7] rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
                <button onClick={handleZoomOut} className="p-2.5 hover:bg-[#f0efff] text-slate-600 transition-colors"><ZoomOut size={16} /></button>
                <span className="text-xs font-medium px-2 min-w-[44px] text-center text-slate-700">{zoomLevel}%</span>
                <button onClick={handleZoomIn} className="p-2.5 hover:bg-[#f0efff] text-slate-600 transition-colors"><ZoomIn size={16} /></button>
              </div>
              <div className="flex items-center bg-white border border-[#e7e6f7] rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
                <button onClick={undo} className={`p-2.5 hover:bg-[#f0efff] text-slate-600 transition-colors ${!canUndo ? 'opacity-40' : ''}`}><Undo size={16} /></button>
                <button onClick={redo} className={`p-2.5 hover:bg-[#f0efff] text-slate-600 transition-colors ${!canRedo ? 'opacity-40' : ''}`}><Redo size={16} /></button>
                <div className="w-px h-5 bg-slate-200 mx-0.5"></div>
                <button onClick={clearCanvas} className="p-2.5 hover:bg-red-50 text-slate-500 hover:text-red-500 transition-colors" title="Clear Canvas"><Eraser size={16} /></button>
              </div>
            </div>

            {/* ── Label Editor ── */}
            {selectedNode && selectedNode.type !== 'text' && (
              <div className="absolute top-4 right-4 z-10 bg-white border border-[#e7e6f7] rounded-lg p-2 shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex items-center">
                <span className="text-[10px] font-semibold text-slate-400 mr-2 uppercase tracking-wide">Label</span>
                <input ref={editInputRef} type="text" value={selectedNode.data.label || ''} onChange={(e) => updateSelectedNode('label', e.target.value)} className="text-sm text-slate-700 border-none outline-none focus:ring-2 focus:ring-[#e0dfff] rounded px-2 py-1 w-32 bg-slate-50" placeholder="Type..."/>
              </div>
            )}
            {selectedNode && selectedNode.type === 'text' && (
              <div className="absolute top-4 right-4 z-10 bg-white border border-[#e7e6f7] rounded-lg p-2 shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex items-center">
                <span className="text-[10px] font-semibold text-slate-400 mr-2 uppercase tracking-wide">Text</span>
                <textarea ref={editTextareaRef} value={selectedNode.data.label || ''} onChange={(e) => updateSelectedNode('label', e.target.value)} className="text-sm text-slate-700 border-none outline-none focus:ring-2 focus:ring-[#e0dfff] rounded px-2 py-1 w-48 h-16 resize-none bg-slate-50"/>
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
                  fitView
                  snapToGrid
                  snapGrid={[10, 10]}
                  deleteKeyCode="Delete"
              >
                  <Background color="#ccc" gap={20} size={1} />
                  <Controls showInteractive={false} className="hidden" />
              </ReactFlow>
            </div>
         </div>
      </div>
    </div>
  );
};

export default function WrappedDiagramSection() {
  return (
    <ReactFlowProvider>
      <DiagramSection />
    </ReactFlowProvider>
  );
}
