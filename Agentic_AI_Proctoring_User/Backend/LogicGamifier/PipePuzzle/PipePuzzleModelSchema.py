
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field


Direction = Literal["UP", "DOWN", "LEFT", "RIGHT"]
TileType = Literal["STRAIGHT", "CORNER", "EMPTY"]
StatusType = Literal["PLAYING", "ANIMATING", "WON", "LOST"]


class TileState(BaseModel):
    id: str
    row: int
    col: int
    type: TileType
    openings: list[Direction]


class EntryExit(BaseModel):
    row: int
    col: int
    direction: Direction


class Position(BaseModel):
    row: int
    col: int


class GameSession(BaseModel):
    session_id: str
    grid: list[list[TileState]]
    start: EntryExit
    end: EntryExit
    status: StatusType = "PLAYING"
    rows: int
    cols: int
    attempts: int = 0
    moves: int = 0
    rotations: int = 0
    flips: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StartGameRequest(BaseModel):
    rows: int = 3
    cols: int = 3


class TileActionRequest(BaseModel):
    row: int
    col: int


class PPAssessmentResultEntry(BaseModel):
    level: int
    success: bool
    moves: int = 0
    rotations: int = 0
    flips: int = 0
    time: int = 0


class PPSaveResultsRequest(BaseModel):
    email: str
    user_name: str
    assessment_id: str
    scores: list[PPAssessmentResultEntry]

