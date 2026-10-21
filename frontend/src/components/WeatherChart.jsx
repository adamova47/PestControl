import { useEffect, useRef, useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

import { supabase } from '../lib/supabase';
import './WeatherChart.css';

// Minimum of 6 intervals = 7 daily records.
const MIN_VISIBLE_SPAN = 6;

function formatDate(dateString) {
    // Parse date-only strings as local dates to avoid timezone shifts.
    const [year, month, day] = dateString.split('-').map(Number);

    return new Date(year, month - 1, day).toLocaleDateString(
        undefined,
        { day: '2-digit', month: 'short', year: 'numeric' }
    );
}

function formatAxisDate(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);

    return new Date(year, month - 1, day).toLocaleDateString(
        undefined,
        { day: '2-digit', month: 'short' }
    );
}

function WeatherChart() {
    const [weather, setWeather] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [zoomIndices, setZoomIndices] = useState(null);
    const [hoveredIndex, setHoveredIndex] = useState(null);

    // Reference to the element that owns wheel interactions.
    const chartWheelRef = useRef(null);

    useEffect(() => {
        async function fetchWeather() {
            const { data, error } = await supabase
                .from('weather')
                .select('date, temp_max, temp_min, temp_mean')
                .order('date', { ascending: true });

            if (error) {
                setError(error.message);
                setLoading(false);
                return;
            }

            setWeather(data ?? []);
            setLoading(false);
        }

        fetchWeather();
    }, []);

    useEffect(() => {
        const chartElement = chartWheelRef.current;

        if (!chartElement) {
            return undefined;
        }

        const preventPageScroll = (event) => {
            event.preventDefault();
        };

        chartElement.addEventListener(
            'wheel',
            preventPageScroll,
            { passive: false }
        );

        // Remove the listener when the component unmounts.
        return () => {
            chartElement.removeEventListener(
                'wheel',
                preventPageScroll
            );
        };
    }, []);

    const fullChartData = weather.map((day) => ({
        date: day.date,

        // Keep missing database values as null, not zero.
        max: day.temp_max == null ? null : Number(day.temp_max),
        mean: day.temp_mean == null ? null : Number(day.temp_mean),
        min: day.temp_min == null ? null : Number(day.temp_min),
    }));

    const lastIndex = fullChartData.length - 1;

    const currentStart = zoomIndices?.start ?? 0;
    const currentEnd = zoomIndices?.end ?? lastIndex;
    const currentSpan = currentEnd - currentStart;

    const visibleData = fullChartData.slice(
        currentStart,
        currentEnd + 1
    );

    const handleMouseMove = (event) => {
        // The active tooltip index is relative to the visible data.
        const index = Number(event?.activeTooltipIndex);

        if (Number.isInteger(index) && index >= 0) {
            setHoveredIndex(index);
        }
    };

    const handleMouseLeave = () => {
        setHoveredIndex(null);
    };

    const handleWheel = (event) => {
        event.preventDefault();

        // Only zoom when there is enough data and the pointer is over a point.
        if (
            fullChartData.length <= MIN_VISIBLE_SPAN + 1 ||
            hoveredIndex === null ||
            event.deltaY === 0
        ) {
            return;
        }

        const isZoomIn = event.deltaY < 0;

        // Keep the pointer's relative position as the zoom anchor.
        const anchor = currentStart + hoveredIndex;

        const anchorRatio = currentSpan > 0
            ? hoveredIndex / currentSpan
            : 0.5;

        const maxSpan = lastIndex;
        let nextSpan;

        if (isZoomIn) {
            // Zoom in by 20%, with a minimum window of 7 daily records.
            if (currentSpan <= MIN_VISIBLE_SPAN) {
                return;
            }

            nextSpan = Math.max(
                MIN_VISIBLE_SPAN,
                Math.floor(currentSpan * 0.8)
            );
        } else {
            // Zoom out by 25%, stopping at the full dataset.
            if (currentStart === 0 && currentEnd === lastIndex) {
                return;
            }

            nextSpan = Math.min(
                maxSpan,
                Math.ceil(currentSpan * 1.25)
            );
        }

        // Calculate both bounds around the same anchor point.
        let nextStart = Math.round(
            anchor - anchorRatio * nextSpan
        );

        // Keep the new range inside the dataset.
        nextStart = Math.max(
            0,
            Math.min(nextStart, lastIndex - nextSpan)
        );

        const nextEnd = nextStart + nextSpan;

        // Use null to represent the full dataset.
        if (nextStart === 0 && nextEnd === lastIndex) {
            setZoomIndices(null);
        } else {
            setZoomIndices({
                start: nextStart,
                end: nextEnd,
            });
        }
    };

    const handleResetZoom = () => {
        setZoomIndices(null);
        setHoveredIndex(null);
    };

    if (loading) {
        return <p className="chart-status">Loading weather data...</p>;
    }

    if (error) {
        return (
            <p className="chart-status chart-error">
                Could not load weather data: {error}
            </p>
        );
    }

    if (fullChartData.length === 0) {
        return (
            <p className="chart-status">
                No weather data available.
            </p>
        );
    }

    const isZoomed = zoomIndices !== null;

    return (
        <section className="weather-history-chart">
            <div className="chart-controls">
                <div className="chart-heading">
                    <h2>Temperature history</h2>

                    <p className="chart-record-count">
                        Records: {fullChartData.length}
                        {isZoomed &&
                            ` (Showing ${visibleData.length} · Scroll over the chart to zoom)`}
                    </p>
                </div>

                {isZoomed && (
                    <button
                        className="reset-zoom-button"
                        onClick={handleResetZoom}
                        type="button"
                    >
                        Reset zoom
                    </button>
                )}
            </div>

            <div
                ref={chartWheelRef}
                className="history-chart-interaction"
                onWheel={handleWheel}
            >
                <div className="history-chart-canvas">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={visibleData}
                            margin={{
                                top: 5,
                                right: 30,
                                left: 5,
                                bottom: 5,
                            }}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                        >
                            <CartesianGrid
                                stroke="var(--chart-grid)"
                                strokeDasharray="5 5"
                            />

                            <XAxis
                                dataKey="date"
                                tickFormatter={formatAxisDate}
                                minTickGap={24}
                                tick={{
                                    fill: 'var(--text-muted)',
                                    fontSize: 12,
                                }}
                                axisLine={{
                                    stroke: 'var(--border)',
                                }}
                                tickLine={{
                                    stroke: 'var(--border)',
                                }}
                            />

                            <YAxis
                                tickFormatter={(value) => `${value}°C`}
                                tick={{
                                    fill: 'var(--text-muted)',
                                    fontSize: 12,
                                }}
                                axisLine={{
                                    stroke: 'var(--border)',
                                }}
                                tickLine={{
                                    stroke: 'var(--border)',
                                }}
                            />

                            <Tooltip
                                labelFormatter={formatDate}
                                formatter={(value, name) => [
                                    value == null
                                        ? 'No data'
                                        : `${Number(value).toFixed(1)}°C`,
                                    name,
                                ]}
                                contentStyle={{
                                    backgroundColor: 'var(--surface-raised)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    color: 'var(--text)',
                                    boxShadow: 'var(--shadow)',
                                }}
                                labelStyle={{
                                    color: 'var(--text-h)',
                                }}
                                itemStyle={{
                                    color: 'var(--text)',
                                }}
                            />

                            <Legend
                                verticalAlign="top"
                                height={36}
                                wrapperStyle={{
                                    color: 'var(--text)',
                                }}
                            />

                            <Line
                                type="monotone"
                                dataKey="max"
                                name="Maximum"
                                stroke="#67e8c4"
                                strokeWidth={2}
                                dot={false}
                                connectNulls={false}
                                isAnimationActive={false}
                            />

                            <Line
                                type="monotone"
                                dataKey="mean"
                                name="Mean"
                                stroke="#93c5fd"
                                strokeWidth={2}
                                dot={false}
                                connectNulls={false}
                                isAnimationActive={false}
                            />

                            <Line
                                type="monotone"
                                dataKey="min"
                                name="Minimum"
                                stroke="#fda4af"
                                strokeWidth={2}
                                dot={false}
                                connectNulls={false}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </section>
    );
}

export default WeatherChart;