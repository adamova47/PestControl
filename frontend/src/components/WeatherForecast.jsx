import { useEffect, useState } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from 'recharts';

import './WeatherForecast.css';


// empty in development - Vite proxies /api to the backend
// in production, configure VITE_WEATHER_API_URL in Vercel
const API_URL = (import.meta.env.VITE_WEATHER_API_URL || '').replace(/\/$/, '');

function formatDay(date) {
    // Open-Meteo returns dates as YYYY-MM-DD
    return new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
}

function formatHour(dateTime) {
    // the API returns local forecast times, such as 2026-10-20T15:00.
    return dateTime.split('T')[1]?.slice(0, 5) ?? dateTime;
}


function describeWeather(code) {
    // WMO weather interpretation codes used by Open-Meteo
    if (code === 0) return { label: 'Clear sky', icon: '☀️' };
    if (code === 1) return { label: 'Mainly clear', icon: '🌤️' };
    if (code === 2) return { label: 'Partly cloudy', icon: '⛅' };
    if (code === 3) return { label: 'Overcast', icon: '☁️' };
    if (code === 45 || code === 48) return { label: 'Fog', icon: '🌫️' };
    if ([51, 53, 55, 56, 57].includes(code)) {
        return { label: 'Drizzle', icon: '🌦️' };
    }
    if ([61, 63, 65, 66, 67].includes(code)) {
        return { label: 'Rain', icon: '🌧️' };
    }
    if ([71, 73, 75, 77].includes(code)) {
        return { label: 'Snow', icon: '🌨️' };
    }
    if ([80, 81, 82].includes(code)) {
        return { label: 'Rain showers', icon: '🌦️' };
    }
    if ([85, 86].includes(code)) {
        return { label: 'Snow showers', icon: '🌨️' };
    }
    if ([95, 96, 99].includes(code)) {
        return { label: 'Thunderstorm', icon: '⛈️' };
    }
    return { label: 'Conditions unavailable', icon: '❔' };
}


function WeatherForecast() {
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    async function loadForecast(forceRefresh = false) {
        // show a different button state for manual refreshes
        if (forceRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

    setError('');

    try {
        const endpoint = forceRefresh
            ? `${API_URL}/api/forecast/refresh`
            : `${API_URL}/api/forecast`;

        const response = await fetch(endpoint, {
            // a normal fetch would use GET, a manual refresh uses POST
            method: forceRefresh ? 'POST' : 'GET',
        });

        if (!response.ok) {
            throw new Error(`Weather API returned an error (${response.status}).`);
        }

        const data = await response.json();
        setForecast(data);
        } catch (err) {
            setError(
                'Could not load the forecast. Check that the backend is running and try again.'
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    // loads the forecast when the dashboard first opens
    useEffect(() => {
        loadForecast();
    }, []);

    if (loading && !forecast) {
        return (
            <section className="forecast-status">
                <p>Loading the garden weather forecast...</p>
            </section>
        );
    }

    if (error && !forecast) {
        return (
            <section className="forecast-status">
                <p className="forecast-error">{error}</p>
                <button onClick={() => loadForecast()}>Try again</button>
            </section>
        );
    }

    // prepares the hourly arrays for Recharts
    // each array uses the same index for the same hour
    const hourly = forecast.hourly.time.map((time, index) => ({
        time,
        hour: formatHour(time),
        temperature: forecast.hourly.temperature_2m[index],
        precipitation: forecast.hourly.precipitation[index],
        precipitationProbability:
        forecast.hourly.precipitation_probability[index],
        humidity: forecast.hourly.relative_humidity_2m[index],
        wind: forecast.hourly.wind_speed_10m[index],
        gusts: forecast.hourly.wind_gusts_10m[index],
        weatherCode: forecast.hourly.weather_code[index],
    }));

    // show the next 24 hour forecast
    const currentHour = forecast.current.time.slice(0, 13);
    const startIndex = hourly.findIndex((hour) =>
        hour.time.startsWith(currentHour)
    );
    const next24Hours = hourly.slice(
        Math.max(startIndex, 0),
        Math.max(startIndex, 0) + 24
    );

    const current = forecast.current;
    const daily = forecast.daily;

    return (
        <section className="weather-forecast">
            <div className="forecast-heading">
                <div>
                    <h2>Weather forecast</h2>
                    <p className="forecast-muted">
                        Next seven days · Čajkov
                    </p>
                </div>

                <button
                    className="refresh-button"
                    onClick={() => loadForecast(true)}
                    disabled={refreshing}
                >
                    {refreshing ? 'Refreshing...' : '↻ Refresh'}
                </button>
            </div>

            {error && <p className="forecast-error">{error}</p>}

            <section className="current-weather">
                <div>
                    <p className="forecast-muted">Current temperature</p>
                    <p className="current-temperature">
                        {current.temperature_2m ?? '—'}°C
                    </p>
                    <p className="current-condition">
                        {describeWeather(current.weather_code).icon}{' '}
                        {describeWeather(current.weather_code).label}
                    </p>
                </div>

                <div className="current-details">
                    <p>
                        <span>Humidity</span>
                        <strong>{current.relative_humidity_2m ?? '—'}%</strong>
                    </p>
                    <p>
                        <span>Wind</span>
                        <strong>{current.wind_speed_10m ?? '—'} km/h</strong>
                    </p>
                    <p>
                        <span>Precipitation</span>
                        <strong>{current.precipitation ?? '—'} mm</strong>
                    </p>
                </div>
            </section>

            <section className="forecast-section">
                <h3>Next seven days</h3>

                <div className="daily-forecast">
                    {daily.time.map((date, index) => (
                        <article className="daily-card" key={date}>
                            <p className="daily-date">{formatDay(date)}</p>
                            <div className="daily-condition">
                                <span className="weather-icon">
                                    {describeWeather(daily.weather_code[index]).icon}
                                </span>
                                <span>{describeWeather(daily.weather_code[index]).label}</span>
                            </div>
                            <p className="daily-temperatures">
                                <strong>
                                {daily.temperature_2m_max[index] ?? '—'}°
                                </strong>
                                <span>{daily.temperature_2m_min[index] ?? '—'}°</span>
                            </p>
                            <p className="daily-detail">
                                Rain: {daily.precipitation_sum[index] ?? '—'} mm
                            </p>
                            <p className="daily-detail">
                                Wind gusts: {daily.wind_gusts_10m_max[index] ?? '—'} km/h
                            </p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="forecast-section">
                <h3>Hourly temperature</h3>
                <p className="forecast-muted">Next 24 hours</p>

                <div className="temperature-chart">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={next24Hours}>
                            <CartesianGrid stroke="#dce6dd" strokeDasharray="3 3" />
                            <XAxis
                                dataKey="hour"
                                interval={3}
                                tick={{ fontSize: 12, fill: '#425849' }}
                                axisLine={{ stroke: '#b9c8bd' }}
                                tickLine={{ stroke: '#b9c8bd' }}
                            />
                            <YAxis
                                unit="°C"
                                width={48}
                                tick={{ fontSize: 12, fill: '#425849' }}
                                axisLine={{ stroke: '#b9c8bd' }}
                                tickLine={{ stroke: '#b9c8bd' }}
                            />
                            <Tooltip
                                labelFormatter={(label) => `Time: ${label}`}
                                formatter={(value) => [`${value}°C`, 'Temperature']}
                                contentStyle={{
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #dce6dd',
                                    borderRadius: '8px',
                                    color: '#24352a',
                                }}
                                labelStyle={{ color: '#24352a' }}
                                itemStyle={{ color: '#244d32' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="temperature"
                                name="Temperature"
                                stroke="#477a5b"
                                strokeWidth={2}
                                dot={false}
                                connectNulls={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </section>

            <section className="forecast-section">
                <h3>Upcoming hours</h3>

                <div className="hourly-table-wrapper">
                    <table className="hourly-table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Temp.</th>
                                <th>Rain chance</th>
                                <th>Rain</th>
                                <th>Humidity</th>
                                <th>Wind</th>
                                <th>Gusts</th>
                                <th>Code</th>
                            </tr>
                        </thead>
                        <tbody>
                            {next24Hours.map((hour) => (
                                <tr key={hour.time}>
                                <td>{formatHour(hour.time)}</td>
                                <td>{hour.temperature ?? '—'}°C</td>
                                <td>{hour.precipitationProbability ?? '—'}%</td>
                                <td>{hour.precipitation ?? '—'} mm</td>
                                <td>{hour.humidity ?? '—'}%</td>
                                <td>{hour.wind ?? '—'} km/h</td>
                                <td>{hour.gusts ?? '—'} km/h</td>
                                <td>
                                    {describeWeather(hour.weatherCode).icon}{' '}
                                    {describeWeather(hour.weatherCode).label}
                                </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <p className="forecast-footer">
                Forecast fetched: {new Date(forecast.fetched_at).toLocaleString()}
            </p>
        </section>
    );
}

export default WeatherForecast;