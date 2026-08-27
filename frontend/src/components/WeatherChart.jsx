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

const TIME_RANGES = {
    week: 7,
    month: 30,
    threeMonths: 90,
    sixMonths: 180,
    year: 365,
};

function WeatherChart() {
    const [weather, setWeather] = useState([]);
    const [range, setRange] = useState('month');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchWeather() {
            setLoading(true);
            setError(null);

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

    const filteredWeather =
        range === 'all'
            ? weather
            : weather.slice(-TIME_RANGES[range]);

    const chartData = filteredWeather.map((day) => ({
        date: day.date,
        max: day.temp_max,
        mean: day.temp_mean,
        min: day.temp_min,
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

        <div>
            <button onClick={() => setRange('all')}>All</button>
            <button onClick={() => setRange('year')}>1 year</button>
            <button onClick={() => setRange('sixMonths')}>6 months</button>
            <button onClick={() => setRange('threeMonths')}>3 months</button>
            <button onClick={() => setRange('month')}>1 month</button>
            <button onClick={() => setRange('week')}>Week</button>
        </div>

        <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="date" />

            <YAxis />

            <Tooltip />

            <Legend />

            <Line
                type="monotone"
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