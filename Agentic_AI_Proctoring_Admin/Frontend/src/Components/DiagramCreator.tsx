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
  MarkerType
} from 'reactflow';
import type { Connection, Edge, Node, NodeProps } from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  Square, Diamond, Circle, Database, Cloud, FileText, 
  Search, Bold, Italic, Underline, Link, Image, 
  Undo, Redo, ZoomIn, ZoomOut, Trash2, Maximize, MousePointer2, Type, ChevronDown, Eraser
} from 'lucide-react';

// ── Draw.io Style Custom Nodes ──────────────────────────────────────────────

const BaseNode = ({ data, selected, shape = 'rect' }: any) => {
  let borderRadius = '0px';
  if (shape === 'rounded') borderRadius = '8px';
  if (shape === 'circle') borderRadius = '50%';
  
  return (
    <div 
      className={`relative flex items-center justify-center border-[1.5px] ${selected ? 'border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.5)]' : ''}`}
      style={{ 
        backgroundColor: data.bgColor || '#ffffff', 
        borderColor: selected ? '#3b82f6' : (data.borderColor || '#000000'),
        borderRadius: borderRadius,
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
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-blue-500 !border-white !border-2 opacity-0 hover:opacity-100" />
      <div className="px-2 py-1 select-none">
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-blue-500 !border-white !border-2 opacity-0 hover:opacity-100" />
      <Handle type="source" position={Position.Left} className="!w-2 !h-2 !bg-blue-500 !border-white !border-2 opacity-0 hover:opacity-100" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-blue-500 !border-white !border-2 opacity-0 hover:opacity-100" />
    </div>
  );
};

const DiamondNode = ({ data, selected }: NodeProps) => (
  <div 
    className={`w-20 h-20 flex items-center justify-center rotate-45 border-[1.5px] ${selected ? 'border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.5)]' : ''}`}
    style={{ 
      backgroundColor: data.bgColor || '#ffffff', 
      borderColor: selected ? '#3b82f6' : (data.borderColor || '#000000'),
      color: data.fontColor || '#000000',
    }}
  >
    <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-blue-500 !border-white !border-2 opacity-0 hover:opacity-100 !-rotate-45" />
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
      {data.label}
    </div>
    <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-blue-500 !border-white !border-2 opacity-0 hover:opacity-100 !-rotate-45" />
    <Handle type="source" position={Position.Left} className="!w-2 !h-2 !bg-blue-500 !border-white !border-2 opacity-0 hover:opacity-100 !-rotate-45" />
    <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-blue-500 !border-white !border-2 opacity-0 hover:opacity-100 !-rotate-45" />
  </div>
);

const DatabaseNode = ({ data, selected }: NodeProps) => (
  <div 
    className={`w-16 h-20 flex flex-col items-center justify-center relative border-[1.5px] rounded-[50%/10%] ${selected ? 'border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.5)]' : ''}`}
    style={{ 
      backgroundColor: data.bgColor || '#ffffff', 
      borderColor: selected ? '#3b82f6' : (data.borderColor || '#000000'),
      color: data.fontColor || '#000000',
    }}
  >
    <div 
      className="absolute top-0 w-full h-4 border-b-[1.5px] rounded-[50%]" 
      style={{ borderColor: selected ? '#3b82f6' : (data.borderColor || '#000000') }}
    />
    <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-blue-500 !border-white !border-2 opacity-0 hover:opacity-100" />
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
      {data.label}
    </div>
    <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-blue-500 !border-white !border-2 opacity-0 hover:opacity-100" />
  </div>
);

const TextNode = ({ data, selected }: NodeProps) => (
  <div 
    className={`px-2 py-1 ${selected ? 'ring-1 ring-blue-500' : ''}`}
    style={{
        color: data.fontColor || '#000000',
        fontWeight: data.bold ? 'bold' : 'normal',
        fontStyle: data.italic ? 'italic' : 'normal',
        textDecoration: data.underline ? 'underline' : 'none',
        fontSize: `${data.fontSize || 12}px`,
        fontFamily: data.fontFamily || 'Arial, sans-serif'
    }}
  >
    {data.label}
  </div>
);


const nodeTypes = {
  rect: (props: any) => <BaseNode {...props} shape="rect" />,
  rounded: (props: any) => <BaseNode {...props} shape="rounded" />,
  circle: (props: any) => <BaseNode {...props} shape="circle" />,
  diamond: DiamondNode,
  database: DatabaseNode,
  text: TextNode
};

// ── Shape Palette Data ──────────────────────────────────────────────────────

const SHAPES = [
  { type: 'rect', label: '', outline: <div className="w-8 h-6 border-[1.5px] border-slate-600 bg-white" /> },
  { type: 'rounded', label: '', outline: <div className="w-8 h-6 border-[1.5px] border-slate-600 rounded bg-white" /> },
  { type: 'text', label: 'Text', outline: <div className="text-xs font-serif text-slate-600">Text</div> },
  { type: 'text', label: 'Heading', outline: <div className="text-sm font-bold text-slate-600">Heading</div> },
  { type: 'rect', label: '', outline: <div className="w-8 h-6 border-[1.5px] border-slate-600 bg-white relative"><div className="absolute inset-y-0 left-1 w-px bg-slate-600"/><div className="absolute inset-y-0 right-1 w-px bg-slate-600"/></div> },
  { type: 'diamond', label: '', outline: <div className="w-6 h-6 border-[1.5px] border-slate-600 rotate-45 bg-white" /> },
  { type: 'circle', label: '', outline: <div className="w-7 h-7 border-[1.5px] border-slate-600 rounded-full bg-white" /> },
  { type: 'database', label: '', outline: <div className="w-6 h-8 border-[1.5px] border-slate-600 rounded-[50%/10%] relative bg-white"><div className="absolute top-0 w-full h-1.5 border-b-[1.5px] border-slate-600 rounded-[50%]"/></div> },
];

// ── Main Component ──────────────────────────────────────────────────────────

const DiagramCreator: React.FC<any> = ({ onSave, initialData }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData?.edges || []);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ 
      ...params, 
      markerEnd: { type: MarkerType.ArrowClosed, color: '#000' },
      style: { stroke: '#000', strokeWidth: 1.5 } 
    }, eds)),
    [setEdges]
  );

  const onDragStart = (event: React.DragEvent, nodeType: string, defaultLabel: string) => {
    event.dataTransfer.setData('application/reactflow-type', nodeType);
    event.dataTransfer.setData('application/reactflow-label', defaultLabel);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow-type');
      const labelData = event.dataTransfer.getData('application/reactflow-label');
      
      if (!type || !reactFlowInstance) return;
      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      
      const newNode: Node = {
        id: `node_${nodes.length + 1}_${Date.now()}`,
        type,
        position,
        data: { 
          label: labelData || '', 
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
    },
    [reactFlowInstance, nodes]
  );

  const updateSelectedNode = (field: string, value: any) => {
    if (!selectedNode) return;
    setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, [field]: value } } : n));
  };

  const toggleSelectedNodeStyle = (field: 'bold' | 'italic' | 'underline') => {
    if (!selectedNode) return;
    setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, [field]: !n.data[field] } } : n));
  };

  const clearCanvas = () => {
    if(window.confirm("Are you sure you want to clear the response?")) {
        setNodes([]);
        setEdges([]);
    }
  };

  // Sync selected node state
  const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
    if (nodes.length > 0) {
      setSelectedNode(nodes[0]);
    } else {
      setSelectedNode(null);
    }
  }, []);

  useEffect(() => { onSave({ nodes, edges }); }, [nodes, edges]);

  return (
    <div className="flex flex-col h-full bg-white border border-slate-300 rounded overflow-hidden shadow-sm font-sans text-slate-800">
      
      {/* ── Top Toolbar (Mettl / Draw.io style) ── */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-200 bg-[#f8f9fa] overflow-x-auto">
        <div className="flex items-center gap-1 pr-3 border-r border-slate-300">
          <button className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><Undo size={14} /></button>
          <button className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><Redo size={14} /></button>
        </div>
        
        <div className="flex items-center gap-1 pr-3 border-r border-slate-300">
          <button className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><ZoomOut size={14} /></button>
          <span className="text-xs font-medium px-2">100%</span>
          <button className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><ZoomIn size={14} /></button>
        </div>

        {/* Formatting Tools (Enabled only if node selected) */}
        <div className={`flex items-center gap-1 pr-3 border-r border-slate-300 ${!selectedNode ? 'opacity-50 pointer-events-none' : ''}`}>
          <select 
            className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
            value={selectedNode?.data?.fontFamily || 'Arial'}
            onChange={(e) => updateSelectedNode('fontFamily', e.target.value)}
          >
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Times New Roman">Times New Roman</option>
          </select>
          <select 
            className="text-xs border border-slate-300 rounded px-2 py-1 bg-white w-14"
            value={selectedNode?.data?.fontSize || 12}
            onChange={(e) => updateSelectedNode('fontSize', parseInt(e.target.value))}
          >
            {[8,9,10,11,12,14,18,24,36].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          
          <button 
            onClick={() => toggleSelectedNodeStyle('bold')}
            className={`p-1.5 rounded ml-1 ${selectedNode?.data?.bold ? 'bg-slate-300' : 'hover:bg-slate-200'}`}
          ><Bold size={14} /></button>
          <button 
            onClick={() => toggleSelectedNodeStyle('italic')}
            className={`p-1.5 rounded ${selectedNode?.data?.italic ? 'bg-slate-300' : 'hover:bg-slate-200'}`}
          ><Italic size={14} /></button>
          <button 
            onClick={() => toggleSelectedNodeStyle('underline')}
            className={`p-1.5 rounded ${selectedNode?.data?.underline ? 'bg-slate-300' : 'hover:bg-slate-200'}`}
          ><Underline size={14} /></button>
        </div>

        <div className={`flex items-center gap-2 pr-3 border-r border-slate-300 ${!selectedNode ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center gap-1">
                <span className="text-[10px] uppercase text-slate-500">Bg</span>
                <input 
                    type="color" 
                    value={selectedNode?.data?.bgColor || '#ffffff'} 
                    onChange={(e) => updateSelectedNode('bgColor', e.target.value)}
                    className="w-5 h-5 border-none p-0 cursor-pointer"
                />
            </div>
            <div className="flex items-center gap-1">
                <span className="text-[10px] uppercase text-slate-500">Line</span>
                <input 
                    type="color" 
                    value={selectedNode?.data?.borderColor || '#000000'} 
                    onChange={(e) => updateSelectedNode('borderColor', e.target.value)}
                    className="w-5 h-5 border-none p-0 cursor-pointer"
                />
            </div>
            <div className="flex items-center gap-1">
                <span className="text-[10px] uppercase text-slate-500">Text</span>
                <input 
                    type="color" 
                    value={selectedNode?.data?.fontColor || '#000000'} 
                    onChange={(e) => updateSelectedNode('fontColor', e.target.value)}
                    className="w-5 h-5 border-none p-0 cursor-pointer"
                />
            </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
           <button 
             onClick={() => {
                 if(selectedNode) {
                    setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
                    setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
                 }
             }}
             className={`p-1.5 hover:bg-slate-200 rounded text-slate-600 flex items-center gap-1 ${!selectedNode ? 'opacity-50' : ''}`}
           >
              <Trash2 size={14} /> <span className="text-xs">Delete</span>
           </button>
           <button onClick={clearCanvas} className="flex items-center gap-1 px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded">
             <Eraser size={12} /> Clear Response
           </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* ── Left Sidebar (Shape Library) ── */}
        <div className="w-56 bg-[#f8f9fa] border-r border-slate-200 flex flex-col h-full overflow-y-auto">
           <div className="p-2 border-b border-slate-200">
              <div className="flex items-center gap-2 bg-white border border-slate-300 rounded px-2 py-1">
                 <Search size={14} className="text-slate-400" />
                 <input type="text" placeholder="Search Shapes" className="w-full text-xs outline-none" />
              </div>
           </div>

           {/* General Category */}
           <div className="flex flex-col">
              <button className="flex items-center gap-2 px-3 py-2 bg-[#e9ecef] border-b border-slate-200 hover:bg-[#dee2e6] transition-colors w-full text-left">
                 <ChevronDown size={14} className="text-slate-600" />
                 <span className="text-xs font-semibold text-slate-700">General</span>
              </button>
              <div className="p-3 grid grid-cols-4 gap-2 bg-white">
                 {SHAPES.map((shape, idx) => (
                    <div
                       key={idx}
                       draggable
                       onDragStart={(e) => onDragStart(e, shape.type, shape.label)}
                       className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded cursor-grab active:cursor-grabbing border border-transparent hover:border-slate-300"
                       title={shape.label || shape.type}
                    >
                       {shape.outline}
                    </div>
                 ))}
              </div>
           </div>

           {/* Other empty categories for visual match */}
           {['Misc', 'Advanced', 'Basic', 'Arrows', 'Flowchart', 'UML'].map(cat => (
              <button key={cat} className="flex items-center gap-2 px-3 py-2 bg-[#f8f9fa] border-b border-slate-200 hover:bg-[#e9ecef] transition-colors w-full text-left">
                 <ChevronDown size={14} className="text-slate-400 -rotate-90" />
                 <span className="text-xs text-slate-600">{cat}</span>
              </button>
           ))}
        </div>

        {/* ── Canvas Area ── */}
        <div className="flex-1 relative bg-white" ref={reactFlowWrapper}>
            {/* Input Overlay for text editing (Mettl style) */}
            {selectedNode && selectedNode.type !== 'text' && (
                <div className="absolute top-2 right-2 z-10 bg-white border border-blue-400 rounded p-1 shadow flex items-center">
                    <span className="text-[10px] text-slate-500 mr-2 uppercase">Edit Label:</span>
                    <input 
                        type="text" 
                        value={selectedNode.data.label || ''} 
                        onChange={(e) => updateSelectedNode('label', e.target.value)}
                        className="text-xs border-b border-slate-300 outline-none px-1 py-0.5 focus:border-blue-500 w-32"
                        placeholder="Type text..."
                    />
                </div>
            )}
            {selectedNode && selectedNode.type === 'text' && (
                 <div className="absolute top-2 right-2 z-10 bg-white border border-blue-400 rounded p-1 shadow flex items-center">
                    <span className="text-[10px] text-slate-500 mr-2 uppercase">Edit Text:</span>
                    <textarea 
                        value={selectedNode.data.label || ''} 
                        onChange={(e) => updateSelectedNode('label', e.target.value)}
                        className="text-xs border border-slate-300 outline-none px-1 py-0.5 focus:border-blue-500 w-48 h-16 resize-none"
                    />
                </div>
            )}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[10, 10]}
          >
            {/* Grid pattern exactly like draw.io */}
            <Background color="#e2e8f0" gap={10} size={1} />
            <Controls showInteractive={false} position="bottom-right" />
          </ReactFlow>
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
