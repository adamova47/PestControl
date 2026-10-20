import { useEffect, useRef, useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    Brush,
    ResponsiveContainer,
} from 'recharts';

import { supabase } from '../lib/supabase';

const MIN_BRUSH_SPAN = 6;

function WeatherChart() {
    const [weather, setWeather] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [brushRange, setBrushRange] = useState(null);
    const brushRangeRef = useRef(null);

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

            if (data.length > 0) {
                const initial = { startIndex: 0, endIndex: data.length - 1 };
                brushRangeRef.current = initial;
                setBrushRange(initial);
            }
        }

        fetchWeather();
    }, []);

    const chartData = weather.map((day) => ({
        date: day.date,
        max: Number(day.temp_max),
        mean: Number(day.temp_mean),
        min: Number(day.temp_min),
    }));

    function handleBrushChange(range) {
        if (!range || range.startIndex == null || range.endIndex == null) return;

        let { startIndex, endIndex } = range;
        const prev = brushRangeRef.current;
        const span = endIndex - startIndex;

        if (span < MIN_BRUSH_SPAN && prev) {
            const startDelta = Math.abs(startIndex - prev.startIndex);
            const endDelta = Math.abs(endIndex - prev.endIndex);

            if (startDelta >= endDelta) {
                // left handle is the one being dragged -> clamp it
                startIndex = Math.max(0, endIndex - MIN_BRUSH_SPAN);
            } else {
                // right handle is the one being dragged -> clamp it
                endIndex = Math.min(chartData.length - 1, startIndex + MIN_BRUSH_SPAN);
            }
        }

        const next = { startIndex, endIndex };
        brushRangeRef.current = next;
        setBrushRange(next);
    }

    if (loading) {
        return <p>Loading weather data...</p>;
    }

    if (error) {
        return <p>Could not load weather data: {error}</p>;
    }

    return (
        <section>
            <h2>Temperature history</h2>

            <p>Weather records: {chartData.length}</p>

            <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData} margin={{ top: 5, right: 60, left: 0, bottom: 5 }}>
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
                    />

                    <Line
                        type="monotone"
                        dataKey="mean"
                        name="Mean"
                        dot={false}
                    />

                    <Line
                        type="monotone"
                        stroke='#ff9da7'
                        dataKey="min"
                        name="Minimum"
                        dot={false}
                    />

                    {brushRange && (
                        <Brush
                            dataKey="date"
                            height={30}
                            stroke="#76b7b2"
                            travellerWidth={10}
                            startIndex={brushRange.startIndex}
                            endIndex={brushRange.endIndex}
                            onChange={handleBrushChange}
                        />
                    )}
                </LineChart>
            </ResponsiveContainer>
        </section>
    );
}

export default WeatherChart;