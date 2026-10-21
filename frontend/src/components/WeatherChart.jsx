
import { useEffect, useState } from 'react';
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

// CHANGE: Minimum of 6 intervals = 7 daily records.
const MIN_VISIBLE_SPAN = 6;

function formatDate(dateString) {
    // CHANGE: Parse date-only strings as local dates to avoid timezone shifts.
    const [year, month, day] = dateString.split('-').map(Number);

    return new Date(year, month - 1, day).toLocaleDateString(
        undefined,
        { day: '2-digit', month: 'short', year: 'numeric' }
    );
}

function WeatherChart() {
    const [weather, setWeather] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [zoomIndices, setZoomIndices] = useState(null);
    const [hoveredIndex, setHoveredIndex] = useState(null);

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

    const fullChartData = weather.map((day) => ({
        date: day.date,

        // CHANGE: Preserve database NULLs instead of converting them to 0.
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
        // CHANGE: activeTooltipIndex is relative to the currently visible data.
        if (Number.isInteger(Number(event?.activeTooltipIndex))) {
            setHoveredIndex(Number(event.activeTooltipIndex));
        }
    };

    const handleMouseLeave = () => {
        setHoveredIndex(null);
    };

    const handleWheel = (event) => {
        event.preventDefault();

        if (
            fullChartData.length <= MIN_VISIBLE_SPAN + 1 ||
            hoveredIndex === null ||
            event.deltaY === 0
        ) {
            return;
        }

        const isZoomIn = event.deltaY < 0;

        // CHANGE: Keep the pointer's relative position as the zoom anchor.
        const anchor = currentStart + hoveredIndex;
        const anchorRatio = currentSpan > 0
            ? hoveredIndex / currentSpan
            : 0.5;

        const maxSpan = lastIndex;

        let nextSpan;

        if (isZoomIn) {
            // CHANGE: Shrink by 20%, respecting the minimum window.
            if (currentSpan <= MIN_VISIBLE_SPAN) return;

            nextSpan = Math.max(
                MIN_VISIBLE_SPAN,
                Math.floor(currentSpan * 0.8)
            );
        } else {
            // CHANGE: Expand by 25%, up to the full dataset.
            if (currentStart === 0 && currentEnd === lastIndex) return;

            nextSpan = Math.min(
                maxSpan,
                Math.ceil(currentSpan * 1.25)
            );
        }

        // CHANGE: Calculate both bounds around the same anchor.
        let nextStart = Math.round(
            anchor - anchorRatio * nextSpan
        );

        // CHANGE: Clamp the window to valid dataset boundaries.
        nextStart = Math.max(
            0,
            Math.min(nextStart, lastIndex - nextSpan)
        );

        const nextEnd = nextStart + nextSpan;

        if (nextStart === 0 && nextEnd === lastIndex) {
            setZoomIndices(null);
        } else {
            setZoomIndices({ start: nextStart, end: nextEnd });
        }
    };

    const handleResetZoom = () => {
        setZoomIndices(null);
        setHoveredIndex(null);
    };

    if (loading) {
        return <p>Loading weather data...</p>;
    }

    if (error) {
        return <p>Could not load weather data: {error}</p>;
    }

    // CHANGE: Handle an empty query result explicitly.
    if (fullChartData.length === 0) {
        return <p>No weather data available.</p>;
    }

    const isZoomed = zoomIndices !== null;

    return (
        <section>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >

                {isZoomed && (
                    <button
                        onClick={handleResetZoom}
                        style={{
                            padding: '6px 12px',
                            cursor: 'pointer',
                            backgroundColor: '#76b7b2',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                        }}
                    >
                        Reset Zoom
                    </button>
                )}
            </div>

            <p style={{ fontSize: '0.9em', color: '#666' }}>
                Records: {fullChartData.length}
                {isZoomed &&
                    ` (Showing ${visibleData.length} • Scroll to zoom)`}
            </p>

            <div
                onWheel={handleWheel}
                style={{ width: '100%' }}
            >
                <ResponsiveContainer width="100%" height={400}>
                    <LineChart
                        data={visibleData}
                        margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                    >
                        <CartesianGrid strokeDasharray="5 5" />

                        {/* CHANGE: Show compact, readable date labels. */}
                        <XAxis
                            dataKey="date"
                            tickFormatter={(date) =>
                                new Date(
                                    ...date.split('-').map(
                                        (part, index) =>
                                            Number(part) -
                                            (index === 1 ? 1 : 0)
                                    )
                                ).toLocaleDateString(
                                    undefined,
                                    { day: '2-digit', month: 'short' }
                                )
                            }
                            minTickGap={24}
                        />

                        {/* CHANGE: Make the temperature unit explicit. */}
                        <YAxis
                            tickFormatter={(value) => `${value}°C`}
                        />

                        {/* CHANGE: Format tooltip dates and temperatures. */}
                        <Tooltip
                            labelFormatter={(date) => formatDate(date)}
                            formatter={(value, name) => [
                                value == null
                                    ? 'No data'
                                    : `${Number(value).toFixed(1)}°C`,
                                name,
                            ]}
                        />

                        <Legend verticalAlign="top" height={36} />

                        <Line
                            type="monotone"
                            dataKey="max"
                            name="Maximum"
                            stroke="#76b7b2"
                            dot={false}
                            connectNulls={false}
                            isAnimationActive={false}
                        />

                        <Line
                            type="monotone"
                            dataKey="mean"
                            name="Mean"
                            dot={false}
                            connectNulls={false}
                            isAnimationActive={false}
                        />

                        <Line
                            type="monotone"
                            dataKey="min"
                            name="Minimum"
                            stroke="#ff9da7"
                            dot={false}
                            connectNulls={false}
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}

export default WeatherChart;