import '../css/style.css';
import feather from 'feather-icons';

feather.replace();

const API_KEY = process.env.WEATHER_API_KEY;
const BASE_URL = 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline';

let currentUnit = 'F';
let lastWeatherData = null;

const elements = {
    searchInput: document.querySelector('.search-bar input'),
    tempToggle: document.querySelector('.temp-toggle'),
    tempButtons: document.querySelectorAll('.temp-toggle span'),
    loading: document.querySelector('.loading'),
    weatherContent: document.querySelector('.weather-content'),
    location: document.querySelector('.location'),
    temperature: document.querySelector('.temperature'),
    condition: document.querySelector('.condition span'),
    highLow: document.querySelector('.high-low'),
    humidity: document.querySelector('.detail-card .value'),
    wind: document.querySelector('.detail-card:nth-child(2) .value'),
    precipitation: document.querySelector('.detail-card:nth-child(3) .value'),
    feelsLike: document.querySelector('.detail-card:nth-child(4) .value'),
    visibility: document.querySelector('.detail-card:nth-child(5) .value'),
    pressure: document.querySelector('.detail-card:nth-child(6) .value'),
    errorMessage: document.querySelector('.error-message')
};

function showLoading() {
    elements.loading.classList.remove('hidden');
    elements.weatherContent.classList.add('hidden');
    elements.errorMessage.classList.add('hidden');
    feather.replace();
}

function hideLoading() {
    elements.loading.classList.add('hidden');
}

function showError(message) {
    elements.errorMessage.querySelector('span').textContent = message;
    elements.errorMessage.classList.remove('hidden');
    elements.weatherContent.classList.add('hidden');
    feather.replace();
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}

function fahrenheitToCelsius(fahrenheit) {
    return (fahrenheit - 32) * 5/9;
}

function celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
}

function displayTemperature(temp, unit = 'F') {
    const temperature = unit === 'F' ? temp : fahrenheitToCelsius(temp);
    return `${Math.round(temperature)}°`;
}

async function fetchWeather(location) {
    showLoading();
    hideError();
    try {
        const url = `${BASE_URL}/${location}?unitGroup=us&key=${API_KEY}&contentType=json`;
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            lastWeatherData = data;
            await new Promise(resolve => setTimeout(resolve, 500));
            updateUI(data, currentUnit);
            elements.weatherContent.classList.remove('hidden');
            return data;
        } else {
            throw new Error(data.message || 'Failed to fetch weather data');
        }
    } catch (error) {
        console.error('Error fetching weather data:', error);
        showError(error.message === 'Failed to fetch'
            ? 'Network error. Please check your connection.'
            : 'Location not found. Please try again.');
    } finally {
        hideLoading();
    }
}

function updateUI(data, unit = 'F') {
    const current = data.currentConditions;
    
    elements.location.textContent = data.resolvedAddress;
    elements.temperature.textContent = displayTemperature(current.temp, unit);
    elements.condition.textContent = current.conditions;
    elements.highLow.textContent = `H: ${displayTemperature(data.days[0].tempmax, unit)} L: ${displayTemperature(data.days[0].tempmin, unit)}`;
    
    elements.humidity.textContent = `${Math.round(current.humidity)}%`;
    elements.wind.textContent = `${Math.round(current.windspeed)} mph`;
    elements.precipitation.textContent = `${Math.round(current.precipprob || 0)}%`;
    elements.feelsLike.textContent = displayTemperature(current.feelslike, unit);
    elements.visibility.textContent = `${Math.round(current.visibility)} mi`;
    elements.pressure.textContent = `${Math.round(current.pressure)} hPa`;

    elements.tempButtons.forEach(button => {
        button.classList.toggle('active', button.textContent.includes(unit));
    });
}

function handleUnitChange(unit) {
    currentUnit = unit;
    if (lastWeatherData) {
        updateUI(lastWeatherData, unit);
    }
}

elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const location = e.target.value.trim();
        if (location) {
            fetchWeather(location);
        }
    }
});

elements.tempToggle.addEventListener('click', (e) => {
    if (e.target.tagName === 'SPAN') {
        const unit = e.target.textContent.includes('F') ? 'F' : 'C';
        handleUnitChange(unit);
    }
});

fetchWeather('New York');