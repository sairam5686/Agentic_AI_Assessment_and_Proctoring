import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useLocation, useNavigate } from 'react-router';

// ─── Types & Constants ───

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type TileType = 'STRAIGHT' | 'CORNER' | 'EMPTY';
export type GameStatus = 'PLAYING' | 'ANIMATING' | 'WON' | 'LOST';

export interface TileState {
    id: string;
    row: number;
    col: number;
    type: TileType;
    openings: Direction[];
}

export interface EntryExit {
    row: number;
    col: number;
    direction: Direction;
}

export interface Position {
    row: number;
    col: number;
}

export type GridState = TileState[][];

export interface GameState {
    grid: GridState;
    start: EntryExit;
    end: EntryExit;
    status: GameStatus;
    selectedTile: Position | null;
    timeRemaining: number;
    attempts: number;
    moves: number;
    rotations: number;
    flips: number;
}

export interface LevelStats {
    moves: number;
    rotations: number;
    flips: number;
    time: number;
}

export interface LevelResult extends LevelStats {
    level: number;
    success: boolean;
}

export interface PathCell {
    row: number;
    col: number;
}

export const GAME_DURATION = 240;
export const ANIMATION_STEP_MS = 400;
export const ANIMATION_END_BUFFER_MS = 800;

export const TUTORIAL_STEPS: readonly string[] = [
    "Connect the flow from 🚀 Rocket to 🌍 Earth to establish a path.",
    "Select any tile to focus your adjustments on that station.",
    "Use ↻ Rotate to pivot the tile's flow direction by 90°.",
    "Use ⇄ Swap to reverse the polarity (flow) within the tile.",
    "Navigate through Corner tiles using their diagonal connections.",
    "Click the Submit button once your path is fully established!",
] as const;

export const DEFAULT_LEVELS: readonly { rows: number; cols: number; label: string }[] = [
    { rows: 3, cols: 3, label: 'Section 1' },
    { rows: 5, cols: 5, label: 'Section 2' },
    { rows: 7, cols: 7, label: 'Section 3' },
] as const;

// ─── API Client ───

const API_BASE = '/api/pipe-puzzle';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers as Record<string, string> },
        ...options,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'API error');
    }
    return res.json();
}

export interface ApiTile {
    id: string;
    row: number;
    col: number;
    type: TileType;
    openings: Direction[];
}

export interface GameStartResponse {
    session_id: string;
    grid: ApiTile[][];
    start: EntryExit;
    end: EntryExit;
    status: string;
}

export interface GridResponse {
    grid: ApiTile[][];
    rotations?: number;
    flips?: number;
}

export interface SubmitResponse {
    valid: boolean;
    status: string;
    path: PathCell[];
}

export const api = {
    startGame: (rows: number, cols: number): Promise<GameStartResponse> =>
        request<GameStartResponse>('/game/start', { method: 'POST', body: JSON.stringify({ rows, cols }) }),

    rotateTile: (sessionId: string, row: number, col: number): Promise<GridResponse> =>
        request<GridResponse>(`/game/${sessionId}/rotate`, { method: 'POST', body: JSON.stringify({ row, col }) }),

    flipTile: (sessionId: string, row: number, col: number): Promise<GridResponse> =>
        request<GridResponse>(`/game/${sessionId}/flip`, { method: 'POST', body: JSON.stringify({ row, col }) }),

    submitPath: (sessionId: string): Promise<SubmitResponse> =>
        request<SubmitResponse>(`/game/${sessionId}/submit`, { method: 'POST' }),

    selectTile: (sessionId: string, row: number, col: number): Promise<{ moves: number }> =>
        request<{ moves: number }>(`/game/${sessionId}/select`, { method: 'POST', body: JSON.stringify({ row, col }) }),

    saveResults: (email: string, user_name: string, assessment_id: string, scores: LevelResult[]): Promise<{ id: number; message: string }> =>
        request<{ id: number; message: string }>('/results', { method: 'POST', body: JSON.stringify({ email, user_name, assessment_id, scores }) }),
};

// ─── Styles ───

const CSS = `
.pp-tile { aspect-ratio: 1; cursor: pointer; position: relative; border: 1px solid rgba(0, 0, 0, 0.06); transition: box-shadow 0.15s ease; overflow: hidden; }
.pp-tile:hover { opacity: 0.9; }
.pp-tile-selected { box-shadow: 0 0 0 3px var(--selection-color, #4a90e2); z-index: 5; }
.pp-tile-empty { background: #e8e8e8; cursor: default; }
.pp-subGrid { display: grid; grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr 1fr; width: 100%; height: 100%; gap: 0; }
.pp-subCell { display: flex; align-items: center; justify-content: center; }
.pp-filled { background: var(--tile-filled, #1a1a2e); }
.pp-subEmpty { background: transparent; }
.pp-arrowWrap { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; transition: transform 0.2s ease; }
.pp-gridWrapper { width: 100%; max-width: 1000px; padding: 2rem; display: flex; justify-content: center; align-items: center; }
.pp-gridPositioner { position: relative; width: 100%; display: flex; justify-content: center; align-items: center; }
.pp-grid { display: grid; gap: 0; background: var(--bg-secondary, #f8f9fa); border-radius: 12px; border: 3px solid #ccc; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12); width: 100%; max-width: 750px; aspect-ratio: 1; overflow: hidden; }
.pp-icon { position: absolute; font-size: 2rem; z-index: 10; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2)); }
.pp-bwIcon { filter: grayscale(1) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3)); }
.pp-rocketAnimate { position: absolute; font-size: 2.22rem; z-index: 25; pointer-events: none; transform: translate(-50%, -50%); transition: left 0.35s ease-in-out, top 0.35s ease-in-out; filter: grayscale(1) drop-shadow(0 3px 8px rgba(0, 0, 0, 0.4)); animation: pp-rocketPulse 0.4s ease-in-out infinite alternate; }
@keyframes pp-rocketPulse { 0% { transform: translate(-50%, -50%) scale(1); } 100% { transform: translate(-50%, -50%) scale(1.2); } }
.pp-controlsBar { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 0.75rem 1.5rem; margin-top: 1rem; }
.pp-timer { width: 56px; height: 56px; border-radius: 50%; border: 3px solid #1a1a2e; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; color: #1a1a2e; background: transparent; }
.pp-actionBtn { width: 52px; height: 52px; border-radius: 8px; border: none; background: #1a1a2e; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; transition: all 0.15s ease; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15); cursor: pointer; }
.pp-actionBtn:not(:disabled):hover { background: #2d2d4e; transform: translateY(-1px); }
.pp-actionBtn:disabled { opacity: 0.4; cursor: not-allowed; }
.pp-sectionLabel { font-size: 0.8rem; color: #2d2d4e; text-align: center; margin-top: 0.5rem; }
.pp-gameContainer { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; min-height: 100vh; padding: 6rem 2rem 2rem; background: #fdfdfd; font-family: 'Inter', system-ui, sans-serif; }
.pp-tutorialSection { width: 100%; display: flex; flex-direction: column; align-items: center; margin-bottom: 2rem; gap: 0.75rem; }


/* Overlay & Premium Modal */
.pp-overlay { position: fixed; inset: 0; background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: pp-fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.pp-modal { background: #fff; padding: 4rem; border-radius: 28px; text-align: center; box-shadow: 0 40px 100px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04); animation: pp-slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); max-width: 1400px; width: 96%; max-height: 90vh; overflow-y: auto; display: flex; flex-direction: row; gap: 4rem; align-items: stretch; }
.pp-modalContent { flex: 1.5; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 1rem; }
.pp-modalRight { flex: 1.2; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #fafafa; padding: 2.5rem; border-radius: 20px; border: 1px solid #efefef; min-height: 420px; }
.pp-modal h2 { font-size: 2.25rem; margin-bottom: 2rem; color: #1a1a2e; font-weight: 850; letter-spacing: -0.01em; }

/* Carousel Squarish UI */
.pp-carouselPill { display: flex; align-items: center; background: #1a1a2e; padding: 0.6rem; border-radius: 10px; margin-bottom: 2rem; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); width: 100%; justify-content: space-between; gap: 1rem; }
.pp-carouselPill button { background: rgba(255,255,255,0.1); border: none; color: #fff; padding: 0.75rem 1.5rem; border-radius: 8px; font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; transition: 0.2s; }
.pp-carouselPill button:hover:not(:disabled) { background: rgba(255,255,255,0.25); transform: translateY(-1px); }
.pp-carouselPill button:disabled { opacity: 0.2; cursor: default; }
.pp-carouselText { color: #fff; font-size: 1.15rem; font-weight: 500; flex: 1; text-align: center; line-height: 1.5; padding: 0 1.5rem; }

.pp-carouselDotActive { background: #1a1a2e; transform: scale(1.25); }

.pp-instructionsList { list-style: none; padding: 0; margin: 1.5rem 0 2.5rem; font-size: 1.05rem; }
.pp-instructionsList li { margin-bottom: 1rem; color: #444; }
.pp-instructionsList b { color: #1a1a2e; font-weight: 700; }
.pp-simTitle { font-size: 0.75rem; font-weight: 800; color: #999; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1rem; }
.pp-simContainer { width: 100%; max-width: 320px; position: relative; }

/* Simulated Buttons */
.pp-simControls { display: flex; gap: 1rem; justify-content: center; margin-top: 1.5rem; animation: pp-fadeIn 0.4s ease-out; }
.pp-simBtn { width: 50px; height: 50px; border-radius: 12px; border: 2px solid #1a1a2e; background: #fff; color: #1a1a2e; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; transition: 0.2s; }
.pp-simBtnActive { background: #1a1a2e; color: #fff; transform: scale(0.9); box-shadow: 0 0 15px rgba(26, 26, 46, 0.3); }

.pp-nextBtn { padding: 1.15rem 3.5rem; border-radius: 14px; border: none; background: #1a1a2e; color: #fff; font-weight: 700; cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); font-size: 1.15rem; box-shadow: 0 10px 25px rgba(26, 26, 46, 0.2); display: inline-flex; align-items: center; gap: 0.75rem; width: 100%; justify-content: center; }
.pp-nextBtn:hover { background: #2d2d4e; transform: translateY(-3px); box-shadow: 0 15px 35px rgba(26, 26, 46, 0.3); }
.pp-nextBtn:active { transform: translateY(-1px); }

@keyframes pp-fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes pp-slideUp { from { transform: translateY(40px) scale(0.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }

@media (max-width: 800px) {
  .pp-modal { flex-direction: column; align-items: center; padding: 2rem; gap: 2rem; }
  .pp-modalRight { width: 100%; min-height: auto; }
}
`;

// ─── Helpers ───

const toGrid = (apiGrid: ApiTile[][]): GridState =>
    apiGrid.map(row => row.map(t => ({ id: t.id, row: t.row, col: t.col, type: t.type, openings: [...t.openings] })));

const OPENING_CELL_MAP: Record<Direction, string> = { UP: '0-1', DOWN: '2-1', LEFT: '1-0', RIGHT: '1-2' };
const TOWARD_CENTER: Record<Direction, number> = { UP: 90, DOWN: 270, LEFT: 0, RIGHT: 180 };
const AWAY_CENTER: Record<Direction, number> = { UP: 270, DOWN: 90, LEFT: 180, RIGHT: 0 };

const midAngle = (a: number, b: number): number => {
    let diff = b - a;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return (a + diff / 2 + 360) % 360;
};

const EMPTY_ENTRY: EntryExit = { row: 0, col: 0, direction: 'LEFT' };

const iconStyle = (point: EntryExit, rows: number, cols: number): React.CSSProperties => {
    switch (point.direction) {
        case 'LEFT': return { left: '-2.8rem', top: `${((point.row + 0.5) / rows) * 100}%`, transform: 'translateY(-50%)' };
        case 'RIGHT': return { right: '-2.8rem', top: `${((point.row + 0.5) / rows) * 100}%`, transform: 'translateY(-50%)' };
        case 'UP': return { top: '-2.8rem', left: `${((point.col + 0.5) / cols) * 100}%`, transform: 'translateX(-50%)' };
        case 'DOWN': return { bottom: '-2.8rem', left: `${((point.col + 0.5) / cols) * 100}%`, transform: 'translateX(-50%)' };
    }
};

const cellCenter = (row: number, col: number, rows: number, cols: number): { x: number; y: number } => ({
    x: ((col + 0.5) / cols) * 100,
    y: ((row + 0.5) / rows) * 100,
});

// ─── Components ───

const ArrowSVG = memo(({ angle }: { angle: number }) => (
    <div className="pp-arrowWrap" style={{ transform: `rotate(${angle}deg)` }}>
        <svg viewBox="0 0 24 24" width="65%" height="65%">
            <line x1="5" y1="12" x2="17" y2="12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            <polyline points="13,7 18,12 13,17" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    </div>
));
ArrowSVG.displayName = 'ArrowSVG';

const Tile = memo<{ tile: TileState; isSelected: boolean; onClick: () => void }>(({ tile, isSelected, onClick }) => {
    if (tile.type === 'EMPTY') return <div className="pp-tile pp-tile-empty" onClick={onClick} />;
    const cells = useMemo(() => {
        if (!tile.openings || tile.openings.length < 2) {
            console.warn("Tile missing openings:", tile);
            return Array(9).fill(null).map((_, i) => <div key={i} className="pp-subCell pp-subEmpty" />);
        }
        const [o0, o1] = tile.openings;
        let angle0: number, angleCenter: number, angle1: number;
        if (tile.type === 'STRAIGHT') {
            const flowAngle = AWAY_CENTER[o1];
            angle0 = flowAngle; angleCenter = flowAngle; angle1 = flowAngle;
        } else {
            angle0 = TOWARD_CENTER[o0]; angle1 = AWAY_CENTER[o1]; angleCenter = midAngle(angle0, angle1);
        }
        const filled = new Map<string, number>();
        filled.set(OPENING_CELL_MAP[o0], angle0);
        filled.set('1-1', angleCenter);
        filled.set(OPENING_CELL_MAP[o1], angle1);
        const result: React.ReactNode[] = [];
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const key = `${r}-${c}`;
                const arrowAngle = filled.get(key);
                result.push(
                    <div key={key} className={`pp-subCell ${arrowAngle !== undefined ? 'pp-filled' : 'pp-subEmpty'}`}>
                        {arrowAngle !== undefined && <ArrowSVG angle={arrowAngle} />}
                    </div>
                );
            }
        }
        return result;
    }, [tile.openings, tile.type]);
    return (
        <div className={`pp-tile ${isSelected ? 'pp-tile-selected' : ''}`} onClick={onClick}>
            <div className="pp-subGrid">{cells}</div>
        </div>
    );
});
Tile.displayName = 'Tile';

const GameGrid: React.FC<{ grid: GridState; selectedTile: Position | null; onTileClick: (pos: Position) => void; start: EntryExit; end: EntryExit; animating?: boolean; animationPath?: PathCell[] }> = ({ grid, selectedTile, onTileClick, start, end, animating, animationPath }) => {
    const cols = grid[0]?.length || 0;
    const rows = grid.length;
    const [rocketPos, setRocketPos] = useState<{ x: number; y: number } | null>(null);

    useEffect(() => {
        if (!animating || !animationPath || animationPath.length === 0) { setRocketPos(null); return; }
        const startCenter = cellCenter(start.row, start.col, rows, cols);
        const startOffset = {
            x: start.direction === 'LEFT' ? -8 : start.direction === 'RIGHT' ? 108 : startCenter.x,
            y: start.direction === 'UP' ? -8 : start.direction === 'DOWN' ? 108 : startCenter.y,
        };
        const endCenter = cellCenter(end.row, end.col, rows, cols);
        const endOffset = {
            x: end.direction === 'LEFT' ? -8 : end.direction === 'RIGHT' ? 108 : endCenter.x,
            y: end.direction === 'UP' ? -8 : end.direction === 'DOWN' ? 108 : endCenter.y,
        };
        const waypoints = [startOffset, ...animationPath.map(p => cellCenter(p.row, p.col, rows, cols)), endOffset];
        const timers: ReturnType<typeof setTimeout>[] = [];
        setRocketPos(startOffset);
        for (let i = 1; i < waypoints.length; i++) {
            timers.push(setTimeout(() => setRocketPos(waypoints[i]), i * ANIMATION_STEP_MS));
        }
        return () => timers.forEach(clearTimeout);
    }, [animating, animationPath, rows, cols, start, end]);

    return (
        <div className="pp-gridWrapper">
            <div className="pp-gridPositioner" style={{ width: rows === 3 ? '320px' : '100%' }}>
                <div className="pp-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                    {grid.map((row, r) => row.map((tile, c) => (
                        <Tile key={tile.id} tile={tile} isSelected={selectedTile?.row === r && selectedTile?.col === c}
                            onClick={() => onTileClick({ row: r, col: c })} />
                    )))}
                </div>
                <div className="pp-icon pp-bwIcon" style={{ ...iconStyle(start, rows, cols), fontSize: rows === 3 ? '1.5rem' : '2rem' }}>🚀</div>
                <div className="pp-icon pp-bwIcon" style={{ ...iconStyle(end, rows, cols), fontSize: rows === 3 ? '1.5rem' : '2rem' }}>🌍</div>
                {animating && rocketPos && <div className="pp-rocketAnimate pp-bwIcon" style={{ left: `${rocketPos.x}%`, top: `${rocketPos.y}%`, fontSize: rows === 3 ? '1.8rem' : '2.2rem' }}>🚀</div>}
            </div>
        </div>
    );
};

// ─── Tutorial Simulation ───

const TutorialSim: React.FC<{ step: number }> = ({ step }) => {
    const [grid, setGrid] = useState<GridState>([]);
    const [selected, setSelected] = useState<Position | null>(null);
    const [animating, setAnimating] = useState(false);
    const [activeBtn, setActiveBtn] = useState<'rotate' | 'swap' | null>(null);
    const start: EntryExit = { row: 0, col: 0, direction: 'LEFT' };
    const end: EntryExit = { row: 2, col: 2, direction: 'RIGHT' };

    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        let timeout: ReturnType<typeof setTimeout>;

        if (step === 0) { // Goal: Rocket to Earth
            setGrid([
                [{ id: '0-0', row: 0, col: 0, type: 'STRAIGHT', openings: ['LEFT', 'RIGHT'] }, { id: '0-1', row: 0, col: 1, type: 'CORNER', openings: ['LEFT', 'DOWN'] }, { id: '0-2', row: 0, col: 2, type: 'EMPTY', openings: [] }],
                [{ id: '1-0', row: 1, col: 0, type: 'EMPTY', openings: [] }, { id: '1-1', row: 1, col: 1, type: 'STRAIGHT', openings: ['UP', 'DOWN'] }, { id: '1-2', row: 1, col: 2, type: 'EMPTY', openings: [] }],
                [{ id: '2-0', row: 2, col: 0, type: 'EMPTY', openings: [] }, { id: '2-1', row: 2, col: 1, type: 'CORNER', openings: ['UP', 'RIGHT'] }, { id: '2-2', row: 2, col: 2, type: 'STRAIGHT', openings: ['LEFT', 'RIGHT'] }]
            ]);
            setSelected(null);
            setAnimating(false);
        } else if (step === 1) { // Selection
            setGrid([
                [{ id: '0-0', row: 0, col: 0, type: 'STRAIGHT', openings: ['LEFT', 'RIGHT'] }, { id: '0-1', row: 0, col: 1, type: 'EMPTY', openings: [] }, { id: '0-2', row: 0, col: 2, type: 'EMPTY', openings: [] }],
                [{ id: '1-0', row: 1, col: 0, type: 'EMPTY', openings: [] }, { id: '1-1', row: 1, col: 1, type: 'CORNER', openings: ['UP', 'DOWN'] }, { id: '1-2', row: 1, col: 2, type: 'EMPTY', openings: [] }],
                [{ id: '2-0', row: 2, col: 0, type: 'EMPTY', openings: [] }, { id: '2-1', row: 2, col: 1, type: 'EMPTY', openings: [] }, { id: '2-2', row: 2, col: 2, type: 'STRAIGHT', openings: ['LEFT', 'RIGHT'] }]
            ]);
            setSelected(null);
            timer = setInterval(() => { setSelected(prev => prev ? null : { row: 1, col: 1 }); }, 1000);
        } else if (step === 2) { // Rotate
            setGrid([
                [{ id: '0-0', row: 0, col: 0, type: 'EMPTY', openings: [] }, { id: '0-1', row: 0, col: 1, type: 'EMPTY', openings: [] }, { id: '0-2', row: 0, col: 2, type: 'EMPTY', openings: [] }],
                [{ id: '1-0', row: 1, col: 0, type: 'EMPTY', openings: [] }, { id: '1-1', row: 1, col: 1, type: 'STRAIGHT', openings: ['UP', 'DOWN'] }, { id: '1-2', row: 1, col: 2, type: 'EMPTY', openings: [] }],
                [{ id: '2-0', row: 2, col: 0, type: 'EMPTY', openings: [] }, { id: '2-1', row: 2, col: 1, type: 'EMPTY', openings: [] }, { id: '2-2', row: 2, col: 2, type: 'EMPTY', openings: [] }]
            ]);
            setSelected({ row: 1, col: 1 });
            timer = setInterval(() => {
                setActiveBtn('rotate');
                setTimeout(() => setActiveBtn(null), 300);
                setGrid(prev => {
                    const next = [...prev.map(r => [...r])];
                    const t = next[1][1];
                    next[1][1] = { ...t, openings: t.openings[0] === 'UP' ? ['LEFT', 'RIGHT'] : ['UP', 'DOWN'] };
                    return next;
                });
            }, 1800);
        } else if (step === 3) { // Swap/Flip
            setGrid([
                [{ id: '0-0', row: 0, col: 0, type: 'EMPTY', openings: [] }, { id: '0-1', row: 0, col: 1, type: 'EMPTY', openings: [] }, { id: '0-2', row: 0, col: 2, type: 'EMPTY', openings: [] }],
                [{ id: '1-0', row: 1, col: 0, type: 'EMPTY', openings: [] }, { id: '1-1', row: 1, col: 1, type: 'STRAIGHT', openings: ['LEFT', 'RIGHT'] }, { id: '1-2', row: 1, col: 2, type: 'EMPTY', openings: [] }],
                [{ id: '2-0', row: 2, col: 0, type: 'EMPTY', openings: [] }, { id: '2-1', row: 2, col: 1, type: 'EMPTY', openings: [] }, { id: '2-2', row: 2, col: 2, type: 'EMPTY', openings: [] }]
            ]);
            setSelected({ row: 1, col: 1 });
            timer = setInterval(() => {
                setActiveBtn('swap');
                setTimeout(() => setActiveBtn(null), 300);
                setGrid(prev => {
                    const next = [...prev.map(r => [...r])];
                    const t = next[1][1];
                    next[1][1] = { ...t, openings: [t.openings[1], t.openings[0]] };
                    return next;
                });
            }, 1800);
        } else if (step === 4) { // Corner tiles
            setGrid([
                [{ id: '0-0', row: 0, col: 0, type: 'EMPTY', openings: [] }, { id: '0-1', row: 0, col: 1, type: 'EMPTY', openings: [] }, { id: '0-2', row: 0, col: 2, type: 'EMPTY', openings: [] }],
                [{ id: '1-0', row: 1, col: 0, type: 'EMPTY', openings: [] }, { id: '1-1', row: 1, col: 1, type: 'CORNER', openings: ['UP', 'RIGHT'] }, { id: '1-2', row: 1, col: 2, type: 'EMPTY', openings: [] }],
                [{ id: '2-0', row: 2, col: 0, type: 'EMPTY', openings: [] }, { id: '2-1', row: 2, col: 1, type: 'EMPTY', openings: [] }, { id: '2-2', row: 2, col: 2, type: 'EMPTY', openings: [] }]
            ]);
            setSelected({ row: 1, col: 1 });
            timer = setInterval(() => {
                setActiveBtn('rotate');
                setTimeout(() => setActiveBtn(null), 300);
                setGrid(prev => {
                    const next = [...prev.map(r => [...r])];
                    const t = next[1][1];
                    // Rotate corner: ['UP','RIGHT'] -> ['RIGHT','DOWN'] -> ['DOWN','LEFT'] -> ['LEFT','UP'] -> ...
                    const order: Direction[][] = [['UP', 'RIGHT'], ['RIGHT', 'DOWN'], ['DOWN', 'LEFT'], ['LEFT', 'UP']];
                    const idx = order.findIndex(o => o[0] === t.openings[0] && o[1] === t.openings[1]);
                    next[1][1] = { ...t, openings: order[(idx + 1) % 4] };
                    return next;
                });
            }, 1800);
        } else if (step === 5) { // Submit
            setGrid([
                [{ id: '0-0', row: 0, col: 0, type: 'STRAIGHT', openings: ['LEFT', 'RIGHT'] }, { id: '0-1', row: 0, col: 1, type: 'CORNER', openings: ['LEFT', 'DOWN'] }, { id: '0-2', row: 0, col: 2, type: 'EMPTY', openings: [] }],
                [{ id: '1-0', row: 1, col: 0, type: 'EMPTY', openings: [] }, { id: '1-1', row: 1, col: 1, type: 'STRAIGHT', openings: ['UP', 'DOWN'] }, { id: '1-2', row: 1, col: 2, type: 'EMPTY', openings: [] }],
                [{ id: '2-0', row: 2, col: 0, type: 'EMPTY', openings: [] }, { id: '2-1', row: 2, col: 1, type: 'CORNER', openings: ['UP', 'RIGHT'] }, { id: '2-2', row: 2, col: 2, type: 'STRAIGHT', openings: ['LEFT', 'RIGHT'] }]
            ]);
            setSelected(null);
            timer = setInterval(() => { setAnimating(true); timeout = setTimeout(() => setAnimating(false), 3200); }, 4500);
        }

        return () => { clearInterval(timer); clearTimeout(timeout); };
    }, [step]);

    return (
        <div className="pp-simContainer">
            <GameGrid
                grid={grid}
                selectedTile={selected}
                onTileClick={() => { }}
                start={start}
                end={end}
                animating={animating}
                animationPath={[{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 2, col: 2 }]}
            />
            {step !== 0 && step !== 1 && step !== 5 && (
                <div className="pp-simControls">
                    <div className={`pp-simBtn ${activeBtn === 'rotate' ? 'pp-simBtnActive' : ''}`} style={{ opacity: (step === 2 || step === 4) ? 1 : 0.2 }}>↻</div>
                    <div className={`pp-simBtn ${activeBtn === 'swap' ? 'pp-simBtnActive' : ''}`} style={{ opacity: step === 3 ? 1 : 0.2 }}>⇄</div>
                </div>
            )}
        </div>
    );
};

const InstructionOverlay: React.FC<{ onStart: () => void }> = ({ onStart }) => {
    const [step, setStep] = useState(0);

    return (
        <div className="pp-overlay">
            <style>{CSS}</style>
            <header style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                background: 'white',
                borderBottom: '1px solid #e5e7eb',
                padding: '12px 24px',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center'
            }}>
                <img src="/virtusa-logo.svg" alt="Virtusa" style={{ height: '28px' }} />
            </header>
            <div className="pp-modal">
                <div className="pp-modalContent">
                    <h2>Pipe Puzzle Assessment</h2>
                    <div className="pp-carouselPill">
                        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>Previous</button>
                        <div className="pp-carouselText">{TUTORIAL_STEPS[step]}</div>
                        <button onClick={() => setStep(s => Math.min(TUTORIAL_STEPS.length - 1, s + 1))} disabled={step === TUTORIAL_STEPS.length - 1}>Next</button>
                    </div>

                    <div className="pp-carouselDots">
                        {TUTORIAL_STEPS.map((_, i) => (
                            <div key={i} className={`pp-carouselDot ${i === step ? 'pp-carouselDotActive' : ''}`} />
                        ))}
                    </div>

                    <div className="pp-instructionsText">
                        {step === TUTORIAL_STEPS.length - 1 && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 mt-4">
                                <button className="pp-nextBtn" onClick={onStart}>
                                    Begin Assessment
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="pp-modalRight">
                    <div className="pp-simTitle">Visual Guide</div>
                    <TutorialSim step={step} />
                </div>
            </div>
        </div>
    );
};

const Controls = memo<{ onRotate: () => void; onFlip: () => void; onSubmit: () => void; timeRemaining: number; selectionCount: number; disabled: boolean; currentLevel: number; totalLevels: number }>(({ onRotate, onFlip, onSubmit, timeRemaining, selectionCount, disabled, currentLevel, totalLevels }) => {
    const formattedTime = useMemo(() => {
        const m = Math.floor(timeRemaining / 60);
        const s = (timeRemaining % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }, [timeRemaining]);
    return (
        <div>
            <div className="pp-controlsBar">
                <div className="pp-timer">{formattedTime}</div>
                <button className="pp-actionBtn" onClick={onRotate} disabled={disabled || selectionCount === 0} title="Rotate">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                </button>
                <button className="pp-actionBtn" onClick={onFlip} disabled={disabled || selectionCount === 0} title="Flip">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
                </button>
                <button className="pp-actionBtn" onClick={onSubmit} disabled={disabled} title="Submit">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </button>
            </div>
            <div className="pp-sectionLabel">Section {currentLevel} of {totalLevels}</div>
        </div>
    );
});
Controls.displayName = 'Controls';

// ─── PathfinderGame Component ───

const PathfinderGame: React.FC<{ rows: number; cols: number; currentLevel: number; totalLevels: number; onComplete: (success: boolean, stats: LevelStats) => void }> = ({ rows, cols, currentLevel, totalLevels, onComplete }) => {
    const [sessionId, setSessionId] = useState('');
    const [isStarted, setIsStarted] = useState(currentLevel > 1);
    const [gameState, setGameState] = useState<GameState>({
        grid: [], start: EMPTY_ENTRY, end: EMPTY_ENTRY, status: 'PLAYING', selectedTile: null,
        timeRemaining: GAME_DURATION, attempts: 0, moves: 0, rotations: 0, flips: 0,
    });
    const [animationPath, setAnimationPath] = useState<PathCell[]>([]);

    useEffect(() => {
        let cancelled = false;
        api.startGame(rows, cols).then(res => {
            if (cancelled) return;
            console.log("Pipe Puzzle Start Response:", res);
            setSessionId(res.session_id);
            setGameState({ ...gameState, grid: toGrid(res.grid), start: res.start, end: res.end, status: 'PLAYING', timeRemaining: GAME_DURATION });
        }).catch(err => {
            console.error("Pipe Puzzle API Error:", err);
        });
        return () => { cancelled = true; };
    }, [rows, cols]);

    useEffect(() => {
        if (gameState.status !== 'PLAYING' || !isStarted) return;
        const timer = setInterval(() => {
            setGameState(prev => {
                if (prev.timeRemaining <= 1) { clearInterval(timer); return { ...prev, timeRemaining: 0, status: 'LOST' }; }
                return { ...prev, timeRemaining: prev.timeRemaining - 1 };
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState.status, isStarted]);

    const handleTileClick = useCallback((pos: Position) => {
        if (gameState.status !== 'PLAYING' || !sessionId) return;
        setGameState(prev => ({ ...prev, selectedTile: pos, moves: prev.moves + 1 }));
        api.selectTile(sessionId, pos.row, pos.col).catch(err => console.warn(err));
    }, [gameState.status, sessionId]);

    const handleRotate = useCallback(() => {
        if (gameState.status !== 'PLAYING' || !gameState.selectedTile || !sessionId) return;
        const { row, col } = gameState.selectedTile;
        api.rotateTile(sessionId, row, col).then(res => {
            setGameState(prev => ({ ...prev, grid: toGrid(res.grid), rotations: res.rotations ?? prev.rotations + 1 }));
        }).catch(err => console.error(err));
    }, [gameState.status, gameState.selectedTile, sessionId]);

    const handleFlip = useCallback(() => {
        if (gameState.status !== 'PLAYING' || !gameState.selectedTile || !sessionId) return;
        const { row, col } = gameState.selectedTile;
        api.flipTile(sessionId, row, col).then(res => {
            setGameState(prev => ({ ...prev, grid: toGrid(res.grid), flips: res.flips ?? prev.flips + 1 }));
        }).catch(err => console.error(err));
    }, [gameState.status, gameState.selectedTile, sessionId]);

    const handleSubmit = useCallback(() => {
        if (gameState.status !== 'PLAYING' || !sessionId) return;
        api.submitPath(sessionId).then(res => {
            if (res.valid && res.path) {
                setAnimationPath(res.path);
                setGameState(prev => ({ ...prev, status: 'ANIMATING', attempts: prev.attempts + 1 }));
                setTimeout(() => {
                    setAnimationPath([]);
                    setGameState(prev => ({ ...prev, status: 'WON' }));
                }, res.path.length * ANIMATION_STEP_MS + ANIMATION_END_BUFFER_MS);
            } else {
                setGameState(prev => ({ ...prev, attempts: prev.attempts + 1 }));
            }
        }).catch(err => console.error(err));
    }, [gameState.status, sessionId]);

    const stats = useMemo<LevelStats>(() => ({
        moves: gameState.moves, rotations: gameState.rotations, flips: gameState.flips, time: GAME_DURATION - gameState.timeRemaining,
    }), [gameState.moves, gameState.rotations, gameState.flips, gameState.timeRemaining]);

    // Auto-progress when won
    useEffect(() => {
        if (gameState.status === 'WON') {
            // Give a small delay for the animation to finish
            const timer = setTimeout(() => {
                onComplete(true, stats);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [gameState.status, onComplete, stats]);

    if (!isStarted && currentLevel === 1) {
        return <InstructionOverlay onStart={() => setIsStarted(true)} />;
    }

    if (!sessionId || gameState.grid.length === 0) {
        return (
            <div className="pp-gameContainer">
                <style>{CSS}</style>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Initializing Puzzle...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="pp-gameContainer">
            <style>{CSS}</style>

            {/* Virtusa Header */}
            <header style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                background: 'white',
                borderBottom: '1px solid #e5e7eb',
                padding: '12px 24px',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center'
            }}>
                <img src="/virtusa-logo.svg" alt="Virtusa" style={{ height: '28px' }} />
            </header>

            <div className="pp-gameLayout flex flex-col items-center justify-center">
                <GameGrid grid={gameState.grid} selectedTile={gameState.selectedTile} onTileClick={handleTileClick} start={gameState.start} end={gameState.end} animating={gameState.status === 'ANIMATING'} animationPath={animationPath} />
                <Controls onRotate={handleRotate} onFlip={handleFlip} onSubmit={handleSubmit} timeRemaining={gameState.timeRemaining} selectionCount={gameState.selectedTile ? 1 : 0} disabled={gameState.status !== 'PLAYING'} currentLevel={currentLevel} totalLevels={totalLevels} />
            </div>
            {/* Show modal only for LOSS (Time's Up) or keep as is? User said remove results page for 'every round' */}
            {gameState.status === 'LOST' && (
                <div className="pp-overlay"><div className="pp-modal">
                    <div className="pp-successIcon" style={{ width: '40px', height: '40px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '50%', margin: '0 auto 1.5rem' }} />
                    <h2>Time's Up</h2>
                    <button className="pp-nextBtn" onClick={() => onComplete(false, stats)}>Next Round →</button>
                </div></div>
            )}
        </div>
    );
};

// ─── Main PipePuzzle Wrapper ───

export const PipePuzzle: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const assessmentData = location.state || {};
    const gamingConfig = assessmentData.Gaming_Config || {};

    // Get rounds_count from backend config; fall back to DEFAULT_LEVELS if config missing
    const roundsCount = gamingConfig.games?.[0]?.rounds_count || 0;

    // Generate levels dynamically; fall back to built-in defaults if not configured
    const dynamicLevels = useMemo(() => {
        if (!roundsCount) {
            return DEFAULT_LEVELS.map(l => ({ rows: l.rows, cols: l.cols, label: l.label }));
        }
        return Array.from({ length: roundsCount }, (_, i) => ({
            rows: 3 + i * 2,
            cols: 3 + i * 2,
            label: `Section ${i + 1}`
        }));
    }, [roundsCount]);

    const [step, setStep] = useState<'GAME' | 'RESULTS'>('GAME');
    const [currentLevel, setCurrentLevel] = useState(0);
    const [results, setResults] = useState<LevelResult[]>([]);
    const [saving, setSaving] = useState(false);

    const handleLevelComplete = useCallback((success: boolean, stats: LevelStats) => {
        setResults(prev => {
            const newResults = [...prev, { level: currentLevel + 1, success, ...stats }];
            if (currentLevel >= dynamicLevels.length - 1) {
                localStorage.setItem('gaming_completed', 'true');
                // Show results card; user clicks to proceed
                setStep('RESULTS');
            }
            return newResults;
        });
        if (currentLevel < dynamicLevels.length - 1) setCurrentLevel(prev => prev + 1);
    }, [currentLevel, dynamicLevels.length]);

    const handleMoveNext = useCallback(() => {
        setSaving(true);
        const email = localStorage.getItem('candidate_email') || '';
        const user_name = localStorage.getItem('candidate_name') || '';
        const assessment_id = localStorage.getItem('assessment_id') || '';

        api.saveResults(email, user_name, assessment_id, results).finally(() => {
            navigate('/section/mcq', { state: assessmentData });
        });
    }, [results, navigate, assessmentData]);

    if (step === 'RESULTS') {
        const roundsCompleted = results.filter(r => r.success).length;
        return (
            <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', flexDirection: 'column' }}>
                {/* Virtusa topbar */}
                <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 24px', flexShrink: 0 }}>
                    <img src="/virtusa-logo.svg" alt="Virtusa" style={{ height: '32px', display: 'block' }} />
                </header>

                {/* Completion card */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                    <div style={{
                        background: '#fff', borderRadius: '16px', padding: '3rem 2.5rem',
                        width: '100%', maxWidth: '480px',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
                        textAlign: 'center',
                    }}>
                        <div style={{ 
                            width: '40px', height: '40px', background: '#f0fdf4', 
                            border: '1px solid #bbf7d0', borderRadius: '50%', 
                            margin: '0 auto 1.25rem' 
                        }} />
                        {/* ✅ Emoji Removed */}

                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>
                            Section Completed!
                        </h2>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 0.25rem' }}>
                            Your results have been recorded successfully.
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 2rem' }}>
                            Simulation Assessment Completed
                        </p>

                        <div className="h-4" />

                        {/* CTA */}
                        <button
                            onClick={handleMoveNext}
                            disabled={saving}
                            style={{
                                width: '100%', padding: '0.875rem',
                                background: saving ? '#374151' : '#111827',
                                color: '#fff', border: 'none', borderRadius: '10px',
                                fontSize: '0.875rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                                transition: 'background 0.15s',
                            }}
                        >
                            {saving ? 'Saving…' : 'Move to Next Section →'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <PathfinderGame
            key={currentLevel}
            rows={dynamicLevels[currentLevel].rows}
            cols={dynamicLevels[currentLevel].cols}
            currentLevel={currentLevel + 1}
            totalLevels={dynamicLevels.length}
            onComplete={handleLevelComplete}
        />
    );
};

export default PipePuzzle;
