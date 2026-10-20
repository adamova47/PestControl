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

function WeatherChart() {
    const [weather, setWeather] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Zoom window indices (null means showing full dataset)
    const [zoomIndices, setZoomIndices] = useState(null);
    // Track where the mouse is currently hovering to use as the zoom anchor point
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

            setWeather(data);
            setLoading(false);
        }

        fetchWeather();
    }, []);

    const fullChartData = weather.map((day) => ({
        date: day.date,
        max: Number(day.temp_max),
        mean: Number(day.temp_mean),
        min: Number(day.temp_min),
    }));

    // Active bounds calculation
    const currentStart = zoomIndices ? zoomIndices.start : 0;
    const currentEnd = zoomIndices ? zoomIndices.end : fullChartData.length - 1;

    const visibleData = fullChartData.slice(currentStart, currentEnd + 1);

    // Track the active tooltip position to use as our anchor point
    const handleMouseMove = (e) => {
        if (e && e.activeTooltipIndex !== undefined) {
            setHoveredIndex(e.activeTooltipIndex);
        }
    };

    const handleMouseLeave = () => {
        setHoveredIndex(null);
    };

    // The core mouse-wheel event listener logic
    const handleWheel = (e) => {
        // Prevent the primary browser window from scrolling up/down while inside the chart
        e.preventDefault(); 

        if (fullChartData.length === 0 || hoveredIndex === null) return;

        // Map the relative hovered index back to its position in the full master array
        const absoluteAnchor = currentStart + hoveredIndex;

        // Zoom direction indicator (negative delta = scroll up = zoom in)
        const isZoomIn = e.deltaY < 0;
        
        // Define steps (zoom 10% of the active window per scroll tick)
        const currentSpan = currentEnd - currentStart;
        const step = Math.max(1, Math.round(currentSpan * 0.1));

        let nextStart = currentStart;
        let nextEnd = currentEnd;

        if (isZoomIn) {
            // Shrink the window towards the anchor point
            if (currentSpan <= 6) return; // Keep a minimum window of 6 records
            
            // Distribute steps based on where the mouse is positioned relative to the sides
            const leftRatio = hoveredIndex / (currentSpan || 1);
            const rightRatio = 1 - leftRatio;

            nextStart = Math.min(absoluteAnchor, currentStart + Math.round(step * leftRatio));
            nextEnd = Math.max(absoluteAnchor, currentEnd - Math.round(step * rightRatio));
        } else {
            // Expand the window outward from the anchor point
            if (currentStart === 0 && currentEnd === fullChartData.length - 1) return; // Max zoom out reached

            const leftRatio = hoveredIndex / (currentSpan || 1);
            const rightRatio = 1 - leftRatio;

            nextStart = Math.max(0, currentStart - Math.round(step * leftRatio));
            nextEnd = Math.min(fullChartData.length - 1, currentEnd + Math.round(step * rightRatio));
        }

        // Apply new slicing instructions
        if (nextStart === 0 && nextEnd === fullChartData.length - 1) {
            setZoomIndices(null); // Fully reset state if wide open
        } else {
            setZoomIndices({ start: nextStart, end: nextEnd });
        }
    };

    const handleResetZoom = () => {
        setZoomIndices(null);
    };

    if (loading) {
        return <p>Loading weather data...</p>;
    }

    if (error) {
        return <p>Could not load weather data: {error}</p>;
    }

    const isZoomed = zoomIndices !== null;

    return (
        <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Temperature history</h2>
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
                            fontWeight: 'bold'
                        }}
                    >
                        Reset Zoom
                    </button>
                )}
            </div>

            <p style={{ fontSize: '0.9em', color: '#666' }}>
                Records: {fullChartData.length} {isZoomed && `(Showing ${visibleData.length} • Scroll wheel to zoom)`}
            </p>

            {/* 
              We catch the native onWheel scroll events using a standard wrapper div element
              to prevent chart rendering logic blockages.
            */}
            <div onWheel={handleWheel} style={{ width: '100%' }}>
                <ResponsiveContainer width="100%" height={400}>
                    <LineChart 
                        data={visibleData} 
                        margin={{ top: 5, right: 60, left: 0, bottom: 5 }}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                    >
                        <CartesianGrid strokeDasharray="5 5" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ transform: 'translateX(30px)' }}/>

                        <Line
                            type="monotone"
                            stroke='#76b7b2'
                            dataKey="max"
                            name="Maximum"
                            dot={false}
                            isAnimationActive={false} // Disabled for instantaneous frame alignment while scrolling
                        />

                        <Line
                            type="monotone"
                            dataKey="mean"
                            name="Mean"
                            dot={false}
                            isAnimationActive={false}
                        />

                        <Line
                            type="monotone"
                            stroke='#ff9da7'
                            dataKey="min"
                            name="Minimum"
                            dot={false}
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}

export default WeatherChart;