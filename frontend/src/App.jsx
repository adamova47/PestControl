import WeatherChart from './components/WeatherChart';
import WeatherForecast from './components/WeatherForecast';
import './App.css'

function App() {
  return (
    <main className="app">
      <header className="app-header">
        <p className="app-eyebrow">Garden shenanigans</p>
        <h1>Weather dashboard</h1>
        <p>Weather insights for my garden.</p>
      </header>

      <WeatherForecast />

      <section className="history-section">
        <WeatherChart />
      </section>
    </main>
  );
}

export default App
