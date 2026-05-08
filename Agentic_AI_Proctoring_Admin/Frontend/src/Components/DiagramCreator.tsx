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
import { 
  Square, Diamond, Circle, Database, Cloud, FileText, 
  ArrowRight, Trash2, Maximize, Minimize, MousePointer2, 
  Palette, Type, Grid3X3, Layers, Layout, ChevronRight, X, Eraser
} from 'lucide-react';

// ── Mettl Pro Custom Node Components ────────────────────────────────────────

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

// ── Categories ──────────────────────────────────────────────────────────────

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

const DiagramCreator: React.FC<any> = ({ onSave, initialData }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData?.edges || []);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

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

  const clearCanvas = () => {
     if(window.confirm("Clear all elements?")) {
         setNodes([]);
         setEdges([]);
     }
  };

  useEffect(() => { onSave({ nodes, edges }); }, [nodes, edges]);

  return (
    <div className="flex flex-col h-[700px] border-2 border-slate-200 rounded-3xl overflow-hidden bg-white shadow-2xl font-sans">
      
      {/* ── Mettl Top Tab Bar ── */}
      <div className="bg-slate-50 border-b flex items-center px-4 overflow-x-auto no-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all border-b-2 ${
              activeTab === cat.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Shape Toolbar ── */}
      <div className="bg-white border-b p-3 flex gap-4 overflow-x-auto items-center no-scrollbar">
        {CATEGORIES.find(c => c.id === activeTab)?.icons.map((item, idx) => (
          <div
            key={idx}
            draggable
            onDragStart={(e) => onDragStart(e, item.type)}
            className="flex flex-col items-center gap-1.5 p-2 min-w-[70px] rounded-xl border border-slate-50 hover:border-blue-200 hover:bg-blue-50/30 cursor-grab active:cursor-grabbing transition-all group"
          >
            <div className="text-slate-400 group-hover:text-blue-500 scale-90">{item.icon}</div>
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">{item.label}</span>
          </div>
        ))}
        <div className="ml-auto flex gap-2">
            <button onClick={clearCanvas} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Clear All">
                <Eraser size={20} />
            </button>
        </div>
      </div>

      <div className="flex-1 flex relative">
        {/* ── Main Canvas ── */}
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
            <Controls showInteractive={false} />
            
            <Panel position="top-left" className="bg-white/90 backdrop-blur shadow-sm border border-slate-100 rounded-lg p-2 m-4">
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Live Editor</span>
                    </div>
                </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* ── Mettl Pro Sidebar Properties ── */}
        <div className={`w-80 bg-white border-l shadow-2xl transition-all ${selectedNode ? 'translate-x-0' : 'translate-x-full'}`}>
          {selectedNode && (
            <div className="p-6 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Element Config</h3>
                <button onClick={() => setSelectedNode(null)} className="text-slate-300 hover:text-slate-900 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Label Edit */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Type size={12} />
                  Label Content
                </label>
                <textarea
                  value={selectedNode.data.label}
                  onChange={(e) => updateNodeData('label', e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-blue-600 outline-none transition-all min-h-[80px]"
                />
              </div>

              {/* Style Controls */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Palette size={12} />
                    Bg Color
                  </label>
                  <input 
                    type="color" 
                    value={selectedNode.data.bgColor} 
                    onChange={(e) => updateNodeData('bgColor', e.target.value)}
                    className="w-full h-10 rounded-xl cursor-pointer border-none bg-transparent"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <MousePointer2 size={12} />
                    Border
                  </label>
                  <input 
                    type="color" 
                    value={selectedNode.data.borderColor} 
                    onChange={(e) => updateNodeData('borderColor', e.target.value)}
                    className="w-full h-10 rounded-xl cursor-pointer border-none bg-transparent"
                  />
                </div>
              </div>

              {/* Font Size */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Font Size ({selectedNode.data.fontSize}px)</label>
                <input 
                  type="range" min="8" max="24" 
                  value={selectedNode.data.fontSize} 
                  onChange={(e) => updateNodeData('fontSize', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <button 
                onClick={() => {
                  setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
                  setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
                  setSelectedNode(null);
                }}
                className="w-full py-4 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-red-100 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                Delete Element
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function WrappedDiagramCreator(props: any) {
  return (
    <ReactFlowProvider>
      <DiagramCreator {...props} />
    </ReactFlowProvider>
  );
}
