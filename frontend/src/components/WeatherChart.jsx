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

    const chartData = weather.map((day) => ({
        date: day.date,
        max: Number(day.temp_max),
        mean: Number(day.temp_mean),
        min: Number(day.temp_min),
    }));

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

            <ResponsiveContainer width="95%" height={400}>
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="5 5" />

                    <XAxis dataKey="date" />

                    <YAxis />

                    <Tooltip />

                    <Legend />

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
                </LineChart>
            </ResponsiveContainer>
        </section>
    );
}

export default WeatherChart;