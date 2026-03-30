
import random

from fastapi import HTTPException

from Backend.Connection.Assessment_Connection_DB import Pipe_Puzzle_Sessions_DB
from Backend.LogicGamifier.PipePuzzle.PipePuzzleModelSchema import Direction, EntryExit, GameSession, Position, TileState, TileType


STRAIGHT: list[tuple[Direction, Direction]] = [("LEFT", "RIGHT"), ("UP", "DOWN")]
CORNER: list[tuple[Direction, Direction]] = [
    ("UP", "RIGHT"), ("RIGHT", "DOWN"), ("DOWN", "LEFT"), ("LEFT", "UP")
]
ROTATE_MAP: dict[Direction, Direction] = {"UP": "RIGHT", "RIGHT": "DOWN", "DOWN": "LEFT", "LEFT": "UP"}
OPPOSITE_MAP: dict[Direction, Direction] = {"UP": "DOWN", "DOWN": "UP", "LEFT": "RIGHT", "RIGHT": "LEFT"}


def rotate_dir(d: Direction) -> Direction:
    return ROTATE_MAP[d]


def opposite_dir(d: Direction) -> Direction:
    return OPPOSITE_MAP[d]


def next_pos(p: Position, d: Direction) -> Position:
    if d == "UP":    return Position(row=p.row - 1, col=p.col)
    if d == "DOWN":  return Position(row=p.row + 1, col=p.col)
    if d == "LEFT":  return Position(row=p.row, col=p.col - 1)
    return Position(row=p.row, col=p.col + 1)


def get_dir(fr: Position, to: Position) -> Direction:
    if to.col > fr.col: return "RIGHT"
    if to.col < fr.col: return "LEFT"
    if to.row > fr.row: return "DOWN"
    return "UP"


def generate_start_end(rows: int, cols: int) -> tuple[EntryExit, EntryExit]:
    edge_pairs: list[tuple[Direction, Direction]] = [
        ("LEFT", "RIGHT"), ("RIGHT", "LEFT"), ("UP", "DOWN"), ("DOWN", "UP")
    ]
    start_edge, end_edge = random.choice(edge_pairs)

    def pick(edge: Direction) -> Position:
        if edge == "LEFT":  return Position(row=random.randint(0, rows - 1), col=0)
        if edge == "RIGHT": return Position(row=random.randint(0, rows - 1), col=cols - 1)
        if edge == "UP":    return Position(row=0, col=random.randint(0, cols - 1))
        return Position(row=rows - 1, col=random.randint(0, cols - 1))

    sp, ep = pick(start_edge), pick(end_edge)
    return (
        EntryExit(row=sp.row, col=sp.col, direction=start_edge),
        EntryExit(row=ep.row, col=ep.col, direction=end_edge),
    )


def find_random_path(start: Position, end: Position, rows: int, cols: int) -> list[Position]:
    visited: set[str] = {f"{start.row}-{start.col}"}

    def dfs(pos: Position) -> list[Position] | None:
        if pos.row == end.row and pos.col == end.col:
            return [pos]
        dirs: list[Direction] = ["UP", "DOWN", "LEFT", "RIGHT"]
        random.shuffle(dirs)
        for d in dirs:
            nxt = next_pos(pos, d)
            key = f"{nxt.row}-{nxt.col}"
            if 0 <= nxt.row < rows and 0 <= nxt.col < cols and key not in visited:
                visited.add(key)
                result = dfs(nxt)
                if result is not None:
                    return [pos] + result
                visited.discard(key)
        return None

    path = dfs(start)
    return path if path else [start, end]


def generate_solvable_grid(rows: int, cols: int, start: EntryExit, end: EntryExit) -> list[list[TileState]]:
    for _attempt in range(20):
        path = find_random_path(
            Position(row=start.row, col=start.col),
            Position(row=end.row, col=end.col),
            rows, cols,
        )

        solution: dict[str, tuple[Direction, Direction]] = {}
        for i, pos in enumerate(path):
            entry_dir: Direction = start.direction if i == 0 else opposite_dir(get_dir(path[i - 1], pos))
            exit_dir: Direction = end.direction if i == len(path) - 1 else get_dir(pos, path[i + 1])
            solution[f"{pos.row}-{pos.col}"] = (entry_dir, exit_dir)

        grid: list[list[TileState]] = []
        for r in range(rows):
            row: list[TileState] = []
            for c in range(cols):
                key = f"{r}-{c}"
                if key in solution:
                    openings = list(solution[key])
                    tile_type: TileType = "STRAIGHT" if opposite_dir(openings[0]) == openings[1] else "CORNER"
                else:
                    is_straight = random.random() > 0.4
                    pool = STRAIGHT if is_straight else CORNER
                    openings = list(random.choice(pool))
                    tile_type = "STRAIGHT" if is_straight else "CORNER"
                row.append(TileState(id=f"{r}-{c}", row=r, col=c, type=tile_type, openings=openings))
            grid.append(row)

        if not validate_path(grid, start, end):
            continue

        for row in grid:
            for tile in row:
                n = 1 + random.randint(0, 2)
                for _ in range(n):
                    tile.openings = [rotate_dir(d) for d in tile.openings]
                if random.random() > 0.5:
                    tile.openings = [tile.openings[1], tile.openings[0]]
        return grid

    return _build_fallback(rows, cols)


def _build_fallback(rows: int, cols: int) -> list[list[TileState]]:
    grid: list[list[TileState]] = []
    for r in range(rows):
        row: list[TileState] = []
        for c in range(cols):
            is_straight = random.random() > 0.4
            pool = STRAIGHT if is_straight else CORNER
            openings = list(random.choice(pool))
            for _ in range(1 + random.randint(0, 2)):
                openings = [rotate_dir(d) for d in openings]
            row.append(TileState(
                id=f"{r}-{c}", row=r, col=c,
                type="STRAIGHT" if is_straight else "CORNER",
                openings=openings,
            ))
        grid.append(row)
    return grid


def validate_path(grid: list[list[TileState]], start: EntryExit, end: EntryExit) -> list[dict]:
    rows = len(grid)
    cols = len(grid[0]) if grid else 0
    entry: Direction = start.direction
    cur = Position(row=start.row, col=start.col)
    visited: set[str] = set()
    path: list[dict] = []

    for _ in range(rows * cols + 1):
        key = f"{cur.row}-{cur.col}"
        if key in visited:
            return []
        visited.add(key)
        if cur.row < 0 or cur.row >= rows or cur.col < 0 or cur.col >= cols:
            return []
        tile = grid[cur.row][cur.col]
        if tile.type == "EMPTY":
            return []
        path.append({"row": cur.row, "col": cur.col})
        if tile.openings[0] != entry:
            return []
        exit_dir = tile.openings[1]
        if cur.row == end.row and cur.col == end.col and exit_dir == end.direction:
            return path
        cur = next_pos(cur, exit_dir)
        entry = opposite_dir(exit_dir)
    return []


def rotate_tile(grid: list[list[TileState]], pos: Position) -> list[list[TileState]]:
    tile = grid[pos.row][pos.col]
    if tile.type != "EMPTY":
        tile.openings = [rotate_dir(d) for d in tile.openings]
    return grid


def flip_tile(grid: list[list[TileState]], pos: Position) -> list[list[TileState]]:
    tile = grid[pos.row][pos.col]
    if tile.type != "EMPTY":
        tile.openings = [tile.openings[1], tile.openings[0]]
    return grid


# ╔══════════════════════════════════════════════════════╗
# ║              SESSION HELPERS                         ║
# ╚══════════════════════════════════════════════════════╝

async def _get_pp_session(session_id: str) -> GameSession:
    doc = Pipe_Puzzle_Sessions_DB.find_one({"session_id": session_id})
    if not doc:
        raise HTTPException(404, "Session not found")
    # Convert _id if present
    if "_id" in doc: del doc["_id"]
    return GameSession(**doc)


async def _save_pp_session(session: GameSession) -> None:
    Pipe_Puzzle_Sessions_DB.replace_one(
        {"session_id": session.session_id},
        session.model_dump(),
        upsert=True
    )


def _require_pp_playing(session: GameSession) -> None:
    if session.status != "PLAYING":
        raise HTTPException(400, "Game not in PLAYING state")


def _validate_pp_tile_bounds(session: GameSession, row: int, col: int) -> None:
    if not (0 <= row < session.rows and 0 <= col < session.cols):
        raise HTTPException(400, "Tile position out of bounds")


def _grid_response(grid: list[list[TileState]]) -> list[list[dict]]:
    return [[t.model_dump() for t in row] for row in grid]


