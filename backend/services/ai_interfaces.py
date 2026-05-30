"""
AI Service Interfaces — Architecture-only stubs for future AI modules.

These abstract interfaces define the contract for AI-powered services.
NO implementation, NO fake data, NO random values.

When real AI models are available:
  1. Implement these interfaces
  2. Register implementations in the service container
  3. No changes needed in API routes or mobile app
"""

from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel


# ── Data Models ──

class CrowdEstimate(BaseModel):
    """Output of crowd estimation."""
    station_id: str
    timestamp: datetime
    level: float                  # 0.0 to 1.0
    level_text: str               # "Low", "Moderate", "High", "Very High"
    confidence: float             # Model confidence 0.0 to 1.0
    data_source: str              # e.g., "camera_ai", "sensor", "historical"


class CongestionForecast(BaseModel):
    """Output of congestion prediction."""
    station_id: str
    predictions: List[dict]       # [{time: str, level: float}, ...]
    version: str
    confidence: float


class CoachRecommendation(BaseModel):
    """Output of coach recommendation."""
    recommended_coach: int        # 1-6
    reason: str
    occupancy_levels: List[dict]  # [{coach: int, level: float}, ...]
    data_source: str


class OccupancyForecast(BaseModel):
    """Output of occupancy forecasting."""
    line: str
    time_range_start: datetime
    time_range_end: datetime
    forecasts: List[dict]         # [{time: str, occupancy: float}, ...]
    version: str


# ── Abstract Interfaces ──

class CrowdEstimator(ABC):
    """
    Interface for crowd estimation at stations.
    Future implementation: camera AI, sensor data, or historical patterns.
    """

    @abstractmethod
    async def estimate_crowd(
        self, station_id: str, timestamp: Optional[datetime] = None
    ) -> CrowdEstimate:
        ...

    @abstractmethod
    async def get_data_source(self) -> str:
        ...


class CongestionPredictor(ABC):
    """
    Interface for congestion prediction.
    Future implementation: ML model trained on historical ridership data.
    """

    @abstractmethod
    async def predict_congestion(
        self, station_id: str, time_window: timedelta
    ) -> CongestionForecast:
        ...


class CoachRecommender(ABC):
    """
    Interface for coach recommendation.
    Future implementation: real-time sensor data from trains.
    """

    @abstractmethod
    async def recommend_coach(
        self, train_id: str, station_id: str
    ) -> CoachRecommendation:
        ...


class OccupancyForecaster(ABC):
    """
    Interface for occupancy forecasting.
    Future implementation: time-series model on ridership data.
    """

    @abstractmethod
    async def forecast_occupancy(
        self, line: str, start: datetime, end: datetime
    ) -> OccupancyForecast:
        ...


# ── Placeholder Provider ──
# Returns "unavailable" status instead of fake data

class PlaceholderCrowdEstimator(CrowdEstimator):
    """Returns 'unavailable' — never generates fake crowd data."""

    async def estimate_crowd(
        self, station_id: str, timestamp: Optional[datetime] = None
    ) -> CrowdEstimate:
        return CrowdEstimate(
            station_id=station_id,
            timestamp=timestamp or datetime.now(),
            level=0.0,
            level_text="Data Unavailable",
            confidence=0.0,
            data_source="placeholder — real AI not connected",
        )

    async def get_data_source(self) -> str:
        return "placeholder"
