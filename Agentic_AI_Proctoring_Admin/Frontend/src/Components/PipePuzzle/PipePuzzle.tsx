import React, { useState, useEffect, useCallback } from 'react';
import './PipePuzzle.css';

type TileType = 'straight' | 'corner' | 'empty';

interface TileState {
    id: string;
    type: TileType;
    rotation: number; // 0, 90, 180, 270
    flipped: boolean;
    row: number;
    col: number;
}

interface PipePuzzleProps {
    assessmentId: string;
    onComplete: (stats: any) => void;
    config: {
        roundsCount: number;
        durationPerRound: number;
    };
}

const PipePuzzle: React.FC<PipePuzzleProps> = ({ assessmentId, onComplete, config }) => {
    const [currentRound, setCurrentRound] = useState(1);
    const [gridSize, setGridSize] = useState(3);
    const [tiles, setTiles] = useState<TileState[]>([]);
    const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
    const [timer, setTimer] = useState(config.durationPerRound * 60);
    const [showTutorial, setShowTutorial] = useState(true);
    const [tutorialStep, setTutorialStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stats, setStats] = useState({ totalMoves: 0, rotations: 0, flips: 0 });
    const [sessionId, setSessionId] = useState<string | null>(null);

    // Initialize Game Round
    const initRound = useCallback(async (round: number) => {
        try {
            const formData = new FormData();
            formData.append('assessment_id', assessmentId);
            formData.append('round', String(round));

            const response = await fetch('http://127.0.0.1:8000/game/pipe-puzzle/start', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();

            setSessionId(data.session_id);
            setGridSize(data.size);
            setTimer(config.durationPerRound * 60);

            // Flatten grid if necessary or handle 2D grid
            const flatTiles: TileState[] = [];
            data.grid.forEach((row: any[], rIdx: number) => {
                row.forEach((tile: any, cIdx: number) => {
                    flatTiles.push({
                        id: `${rIdx}-${cIdx}`,
                        ...tile
                    });
                });
            });
            setTiles(flatTiles);
        } catch (error) {
            console.error("Failed to init round:", error);
        }
    }, [assessmentId, config.durationPerRound]);

    useEffect(() => {
        if (!showTutorial) {
            initRound(currentRound);
        }
    }, [currentRound, showTutorial, initRound]);

    // Timer Effect
    useEffect(() => {
        if (showTutorial || timer <= 0) return;
        const interval = setInterval(() => {
            setTimer(prev => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [showTutorial, timer]);

    // Actions
    const handleAction = async (action: 'rotate' | 'flip') => {
        if (!selectedTileId || !sessionId) return;
        const [row, col] = selectedTileId.split('-').map(Number);

        try {
            const formData = new FormData();
            formData.append('session_id', sessionId);
            formData.append('row', String(row));
            formData.append('col', String(col));
            formData.append('action', action);

            const response = await fetch('http://127.0.0.1:8000/game/pipe-puzzle/action', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();

            setTiles(prev => prev.map(t =>
                t.id === selectedTileId ? { ...t, ...data.tile } : t
            ));

            setStats(prev => ({
                ...prev,
                totalMoves: prev.totalMoves + 1,
                rotations: action === 'rotate' ? prev.rotations + 1 : prev.rotations,
                flips: action === 'flip' ? prev.flips + 1 : prev.flips
            }));
        } catch (error) {
            console.error("Action failed:", error);
        }
    };

    const handleSubmit = async () => {
        if (!sessionId) return;
        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('session_id', sessionId);

            const response = await fetch('http://127.0.0.1:8000/game/pipe-puzzle/submit', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();

            if (data.valid) {
                // Trigger success animation logic here (visual only)
                setTimeout(() => {
                    setIsSubmitting(false);
                    if (currentRound < config.roundsCount) {
                        setCurrentRound(prev => prev + 1);
                    } else {
                        onComplete(stats);
                    }
                }, 1500);
            } else {
                setIsSubmitting(false);
                // Handle invalid path
            }
        } catch (error) {
            console.error("Submit failed:", error);
            setIsSubmitting(false);
        }
    };

    const PipeIcon = ({ type, rotation, flipped }: { type: TileType, rotation: number, flipped: boolean }) => {
        if (type === 'empty') return null;

        return (
            <div className="pipe-element" style={{ transform: `rotate(${rotation}deg) scaleX(${flipped ? -1 : 1})` }}>
                <svg viewBox="0 0 100 100" className="pipe-svg">
                    {type === 'straight' ? (
                        <>
                            <path d="M50 0 L50 100" className="pipe-path" />
                            <path d="M40 20 L50 10 L60 20" className="arrow-head" />
                        </>
                    ) : (
                        <>
                            <path d="M50 100 L50 50 Q50 50 100 50" className="pipe-path" />
                            <path d="M80 40 L90 50 L80 60" className="arrow-head" />
                        </>
                    )}
                </svg>
            </div>
        );
    };

    return (
        <div className="pipe-puzzle-container">
            {showTutorial && (
                <div className="tutorial-overlay">
                    <div className="tutorial-card">
                        <div className="tutorial-nav">
                            <button disabled={tutorialStep === 1} onClick={() => setTutorialStep(s => s - 1)}>←</button>
                            <div className="pagination">
                                {[1, 2, 3, 4, 5, 6].map(s => (
                                    <span key={s} className={`dot ${s === tutorialStep ? 'active' : ''}`} />
                                ))}
                            </div>
                            <button disabled={tutorialStep === 6} onClick={() => setTutorialStep(s => s + 1)}>→</button>
                        </div>
                        <div className="tutorial-content">
                            <div className="tutorial-visual">
                                <div className="simulation-badge">SIMULATION</div>
                                {/* Visual content based on Step */}
                                <p>Tutorial Step {tutorialStep} Visual Demo</p>
                            </div>
                            <h3>Step {tutorialStep}</h3>
                            <p>Tutorial instructions go here...</p>
                            {tutorialStep === 6 && (
                                <button className="btn-submit" onClick={() => setShowTutorial(false)}>Start Game</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="game-grid-wrapper">
                <div className="simulation-badge">SIMULATION</div>
                <div className="start-icon" style={{ top: '40px', left: '-25px' }}>🚀</div>
                <div className="end-icon" style={{ bottom: '40px', right: '-25px' }}>🌍</div>

                <div className="game-grid" style={{
                    gridTemplateColumns: `repeat(${gridSize}, 80px)`,
                    gridTemplateRows: `repeat(${gridSize}, 80px)`
                }}>
                    {tiles.map(tile => (
                        <div
                            key={tile.id}
                            className={`grid-tile ${selectedTileId === tile.id ? 'selected' : ''}`}
                            onClick={() => setSelectedTileId(tile.id)}
                        >
                            <PipeIcon type={tile.type} rotation={tile.rotation} flipped={tile.flipped} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="controls-panel">
                <div className="timer-circle">
                    <span className="timer-value">{timer}</span>
                    <span className="timer-label">SEC</span>
                </div>

                <div className="control-buttons">
                    <button className="btn-game" onClick={() => handleAction('rotate')} disabled={!selectedTileId}>
                        🔄
                    </button>
                    <button className="btn-game" onClick={() => handleAction('flip')} disabled={!selectedTileId}>
                        ↔️
                    </button>
                    <button className="btn-submit btn-game" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Checking...' : 'Submit'} ✅
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PipePuzzle;
