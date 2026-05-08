import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState,
  ReactFlowProvider,
  Handle,
  Position,
  Panel,
  MarkerType
} from 'reactflow';
import type { Connection, Edge, Node, NodeProps } from 'reactflow';
import 'reactflow/dist/style.css';
import { toPng } from 'html-to-image';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Square, Diamond, Circle, Database, Cloud, FileText, 
  Send, Trash2, Palette, Type, Layers, Layout, X, Eraser, MousePointer2, Settings2, Activity
} from 'lucide-react';

// ── Mettl Pro Custom Node Components (Shared for consistent grading) ────────

const BaseNode = ({ children, data, selected, color = '#3b82f6', shape = 'rounded' }: any) => {
  const borderRadius = shape === 'circle' ? '50%' : (shape === 'rounded' ? '8px' : '0px');
  return (
    <div 
      className={`relative px-4 py-2 shadow-sm transition-all border-2 ${selected ? 'ring-4 ring-blue-100 scale-105' : ''}`}
      style={{ 
        backgroundColor: data.bgColor || '#ffffff', 
        borderColor: data.borderColor || color,
        borderRadius: borderRadius,
        minWidth: '100px',
        textAlign: 'center'
      }}
    >
      <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !bg-slate-400 !border-none" />
      <div className="text-[11px] font-black text-slate-800 uppercase tracking-tight" style={{ fontSize: `${data.fontSize || 11}px` }}>
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !bg-slate-400 !border-none" />
      <Handle type="source" position={Position.Left} className="!w-1.5 !h-1.5 !bg-slate-400 !border-none" />
      <Handle type="source" position={Position.Right} className="!w-1.5 !h-1.5 !bg-slate-400 !border-none" />
    </div>
  );
};

const DiamondNode = ({ data, selected }: NodeProps) => (
  <div 
    className={`w-20 h-20 flex items-center justify-center rotate-45 border-2 shadow-sm transition-all ${selected ? 'ring-4 ring-orange-100 scale-105' : ''}`}
    style={{ backgroundColor: data.bgColor || '#fff', borderColor: data.borderColor || '#f97316' }}
  >
    <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !bg-slate-400 !-rotate-45" />
    <div className="-rotate-45 text-[9px] font-black text-slate-800 text-center uppercase tracking-tighter" style={{ fontSize: `${data.fontSize || 9}px` }}>
      {data.label}
    </div>
    <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !bg-slate-400 !-rotate-45" />
    <Handle type="source" position={Position.Left} className="!w-1.5 !h-1.5 !bg-slate-400 !-rotate-45" />
    <Handle type="source" position={Position.Right} className="!w-1.5 !h-1.5 !bg-slate-400 !-rotate-45" />
  </div>
);

const CloudNode = ({ data, selected }: NodeProps) => (
  <div className={`relative p-4 transition-all ${selected ? 'scale-105' : ''}`}>
    <Cloud size={60} fill={data.bgColor || '#eff6ff'} stroke={data.borderColor || '#3b82f6'} strokeWidth={2} />
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-[9px] font-black text-slate-700 uppercase" style={{ fontSize: `${data.fontSize || 9}px` }}>{data.label}</span>
    </div>
    <Handle type="target" position={Position.Top} className="!bg-slate-400" />
    <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
  </div>
);

const nodeTypes = {
  process: (props: any) => <BaseNode {...props} color="#3b82f6" shape="rounded" />,
  decision: DiamondNode,
  terminal: (props: any) => <BaseNode {...props} color="#1e293b" data={{...props.data, bgColor: '#1e293b'}} className="text-white" />,
  database: (props: any) => <BaseNode {...props} color="#10b981" shape="rounded" />,
  cloud: CloudNode,
  document: (props: any) => <BaseNode {...props} color="#f59e0b" shape="rect" />,
};

const CATEGORIES = [
  { id: 'general', label: 'General', icons: [
    { type: 'terminal', icon: <Circle />, label: 'Start/End' },
    { type: 'process', icon: <Square />, label: 'Process' },
    { type: 'decision', icon: <Diamond />, label: 'Decision' },
  ]},
  { id: 'flowchart', label: 'Flowchart', icons: [
    { type: 'document', icon: <FileText />, label: 'Document' },
    { type: 'database', icon: <Database />, label: 'Storage' },
    { type: 'cloud', icon: <Cloud />, label: 'Network' },
  ]},
  { id: 'uml', label: 'UML/Advanced', icons: [
    { type: 'process', icon: <Layers />, label: 'Actor' },
    { type: 'process', icon: <Layout />, label: 'Package' },
  ]}
];

// ── Main Component ──────────────────────────────────────────────────────────

const DiagramSection = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([{ id: '1', type: 'terminal', position: { x: 400, y: 50 }, data: { label: 'START' } }]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ 
      ...params, 
      animated: true, 
      markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
      style: { stroke: '#64748b', strokeWidth: 2 } 
    }, eds)),
    [setEdges]
  );

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !reactFlowInstance) return;
      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const newNode: Node = {
        id: `node_${nodes.length + 1}`,
        type,
        position,
        data: { label: `${type.toUpperCase()}`, bgColor: '#ffffff', borderColor: '#3b82f6', fontSize: 11 },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, nodes]
  );

  const updateNodeData = (field: string, value: any) => {
    if (!selectedNode) return;
    setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, [field]: value } } : n));
  };

  const handleSubmit = async () => {
    if (!reactFlowWrapper.current) return;
    setIsSubmitting(true);
    try {
      const dataUrl = await toPng(reactFlowWrapper.current, { backgroundColor: '#fff' });
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
    <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* ── Top Enterprise Header ── */}
      <header className="bg-white border-b px-8 py-4 flex justify-between items-center z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
            <Activity size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800">System Architecture Design</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Draw the logical flow accurately using the shape library</p>
          </div>
        </div>

        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-200 disabled:opacity-50 transition-all"
        >
            {isSubmitting ? 'AI EVALUATING...' : (
              <>
                <Send size={14} />
                Submit Assessment
              </>
            )}
        </motion.button>
      </header>

      {/* ── Mettl Shape Tabs ── */}
      <div className="bg-slate-50 border-b flex items-center px-4 overflow-x-auto no-scrollbar z-40">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`px-8 py-4 text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all border-b-2 ${
              activeTab === cat.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Icon Palette ── */}
      <div className="bg-white border-b p-3 flex gap-6 overflow-x-auto items-center no-scrollbar z-40 shadow-sm">
        {CATEGORIES.find(c => c.id === activeTab)?.icons.map((item, idx) => (
          <div
            key={idx}
            draggable
            onDragStart={(e) => onDragStart(e, item.type)}
            className="flex flex-col items-center gap-2 p-2 min-w-[80px] rounded-2xl border border-slate-50 hover:border-blue-200 hover:bg-blue-50/50 cursor-grab active:cursor-grabbing transition-all group"
          >
            <div className="text-slate-300 group-hover:text-blue-600 transition-colors">{item.icon}</div>
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 flex relative overflow-hidden">
        {/* ── Canvas ── */}
        <div className="flex-1 relative bg-slate-50" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            onNodeClick={(_, n) => setSelectedNode(n)}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
          >
            <Background color="#cbd5e1" gap={20} size={1} />
            <Controls />
            <MiniMap />
            
            <Panel position="bottom-center" className="mb-4">
               <div className="bg-white/90 backdrop-blur-md px-6 py-2.5 rounded-full border shadow-xl flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    Drag shapes to canvas · Link handles to build logic
                  </p>
               </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* ── Floating Mettl Config Panel ── */}
        <AnimatePresence>
            {selectedNode && (
              <motion.div 
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 400, opacity: 0 }}
                className="absolute top-6 right-6 w-80 bg-white rounded-[32px] shadow-2xl border border-slate-100 p-8 z-50 overflow-y-auto max-h-[90%]"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Element Style</h3>
                  <button onClick={() => setSelectedNode(null)} className="text-slate-300 hover:text-slate-900 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Label Text</label>
                    <textarea
                      value={selectedNode.data.label}
                      onChange={(e) => updateNodeData('label', e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none transition-all min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fill Color</label>
                      <input 
                        type="color" 
                        value={selectedNode.data.bgColor} 
                        onChange={(e) => updateNodeData('bgColor', e.target.value)}
                        className="w-full h-12 rounded-2xl cursor-pointer border-none bg-transparent shadow-sm"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Border</label>
                      <input 
                        type="color" 
                        value={selectedNode.data.borderColor} 
                        onChange={(e) => updateNodeData('borderColor', e.target.value)}
                        className="w-full h-12 rounded-2xl cursor-pointer border-none bg-transparent shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Font Size ({selectedNode.data.fontSize}px)</label>
                    <input 
                      type="range" min="8" max="24" 
                      value={selectedNode.data.fontSize} 
                      onChange={(e) => updateNodeData('fontSize', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
                    />
                  </div>

                  <button 
                    onClick={() => {
                      setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
                      setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
                      setSelectedNode(null);
                    }}
                    className="w-full py-4 bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-red-100 transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    <Trash2 size={16} />
                    Delete Element
                  </button>
                </div>
              </motion.div>
            )}
        </AnimatePresence>
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
