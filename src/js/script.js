import '../css/style.css';
import feather from 'feather-icons';
import Chart from 'chart.js/auto';

feather.replace();

const API_KEY = process.env.WEATHER_API_KEY;
const BASE_URL = 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline';

let currentUnit = 'F';
let lastWeatherData = null;
let currentChart = null;
let timeInterval;

const elements = {
    searchInput: document.querySelector('.search-bar input'),
    tempToggle: document.querySelector('.temp-toggle'),
    tempButtons: document.querySelectorAll('.temp-toggle span'),
    loading: document.querySelector('.loading'),
    weatherContent: document.querySelector('.weather-content'),
    cityState: document.querySelector('.city-state'),
    country: document.querySelector('.country'),
    temperature: document.querySelector('.temperature'),
    humidity: document.querySelector('.detail-card .value'),
    wind: document.querySelector('.detail-card:nth-child(2) .value'),
    precipitation: document.querySelector('.detail-card:nth-child(3) .value'),
    feelsLike: document.querySelector('.detail-card:nth-child(4) .value'),
    visibility: document.querySelector('.detail-card:nth-child(5) .value'),
    pressure: document.querySelector('.detail-card:nth-child(6) .value'),
    errorMessage: document.querySelector('.error-message'),
    day: document.querySelector('.day'),
    time: document.querySelector('.time'),
};

function showLoading() {
    const bootLogo = document.querySelector('.boot-logo');
    const loadingLogo = document.querySelector('.loading-logo');
    
    bootLogo.classList.add('icon-hidden');
    loadingLogo.classList.remove('icon-hidden');
    elements.weatherContent.classList.add('loading');
    elements.errorMessage.classList.add('hidden');
}

function hideLoading() {
    const bootLogo = document.querySelector('.boot-logo');
    const loadingLogo = document.querySelector('.loading-logo');
    
    bootLogo.classList.remove('icon-hidden');
    loadingLogo.classList.add('icon-hidden');
}

function showError(message) {
    elements.errorMessage.querySelector('span').textContent = message;
    elements.errorMessage.classList.remove('hidden');
    elements.weatherContent.classList.add('loading');
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

function getChartColors(conditions, datetime) {
    const baseColor = getBackgroundColor(conditions, datetime);
    const rgb = hexToRgb(baseColor);
    
    return {
        line: `rgba(255, 255, 255, 0.8)`,
        point: `rgba(255, 255, 255, 0.8)`,
        pointBorder: baseColor,
        grid: `rgba(255, 255, 255, 0.1)`,
        text: `rgba(255, 255, 255, 0.8)`
    };
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function generateTemperatureCurve(hourlyData, timezone) {
    if (currentChart) {
        currentChart.destroy();
    }

    const ctx = document.getElementById('tempChart').getContext('2d');
    
    const nextDayFirstHour = hourlyData.length > 24 ? hourlyData[24] : { 
        datetime: '00:00:00',
        temp: hourlyData[23].temp 
    };
    
    const processedData = hourlyData
        .slice(0, 24)
        .filter((hour, index) => index === 0 || index % 4 === 0)
        .concat([nextDayFirstHour])
        .map(hour => ({
            time: hour.datetime.slice(0, 5),
            temp: hour.temp
        }));

    const chartColors = getChartColors(
        lastWeatherData.currentConditions.conditions,
        lastWeatherData.currentConditions.datetime
    );

    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: processedData.map(data => data.time),
            datasets: [{
                label: 'Temperature',
                data: processedData.map(data => data.temp),
                borderColor: chartColors.line,
                borderWidth: 2,
                pointBackgroundColor: chartColors.point,
                pointBorderColor: chartColors.pointBorder,
                pointBorderWidth: 2,
                pointRadius: 4,
                tension: 0.4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    bottom: -20
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: chartColors.pointBorder,
                    bodyColor: chartColors.pointBorder,
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 14
                    },
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            let temp = context.parsed.y;
                            if (currentUnit === 'C') {
                                temp = fahrenheitToCelsius(temp);
                            }
                            return `${Math.round(temp)}°${currentUnit}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: chartColors.text,
                        font: {
                            size: 14
                        },
                        padding: 20
                    },
                    border: {
                        display: false
                    }
                },
                y: {
                    display: false,
                    border: {
                        display: false
                    }
                }
            }
        }
    });
}

function getWeatherIcon(conditions) {
    conditions = conditions.toLowerCase();
    
    const iconMap = [
        { condition: 'snow', icon: 'cloud-snow' },
        { condition: 'storm', icon: 'cloud-lightning' },
        { condition: 'rain', icon: 'cloud-rain' },
        { condition: 'thunder', icon: 'cloud-lightning' },
        { condition: 'fog', icon: 'cloud' },
        { condition: 'overcast', icon: 'cloud' },
        { condition: 'partly cloudy', icon: 'cloud' },
        { condition: 'partially cloudy', icon: 'cloud' },
        { condition: 'cloudy', icon: 'cloud' },
        { condition: 'wind', icon: 'wind' },
        { condition: 'clear', icon: 'sun' },
        { condition: 'sunny', icon: 'sun' }
    ];

    for (const { condition, icon } of iconMap) {
        if (conditions.includes(condition)) {
            return icon;
        }
    }
    
    return 'sun';
}

function updateWeeklyForecast(data, unit = 'F') {
    const weeklyForecast = document.querySelector('.weekly-forecast');
    weeklyForecast.innerHTML = '';
    
    data.days.slice(0, 7).forEach((day, index) => {
        const date = new Date(day.datetimeEpoch * 1000);
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
        const isCurrentDay = index === 0;
        
        let maxTemp = day.tempmax;
        let minTemp = day.tempmin;
        if (unit === 'C') {
            maxTemp = fahrenheitToCelsius(maxTemp);
            minTemp = fahrenheitToCelsius(minTemp);
        }
        
        const card = document.createElement('div');
        card.className = `forecast-card${isCurrentDay ? ' current-day' : ''}`;
        
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            updatePrimaryCard(day, isCurrentDay, data.timezone);
            document.querySelectorAll('.forecast-card').forEach(c => c.classList.remove('current-day'));
            card.classList.add('current-day');
        });
        
        card.innerHTML = `
            <div class="forecast-day">${dayOfWeek}</div>
            <i data-feather="${getWeatherIcon(day.conditions)}"></i>
            <div class="forecast-temp">
                <span class="max">${Math.round(maxTemp)}°</span>
                <span class="min">${Math.round(minTemp)}°</span>
            </div>
        `;
        
        weeklyForecast.appendChild(card);
    });
    
    feather.replace();
}

function updatePrimaryCard(dayData, isCurrentDay, timezone) {
    if (timeInterval) {
        clearInterval(timeInterval);
        timeInterval = null;
    }

    const date = new Date(dayData.datetimeEpoch * 1000);
    
    const dayStr = date.toLocaleString('en-US', { 
        weekday: 'long',
        timeZone: timezone 
    });
    
    elements.day.textContent = dayStr;
    elements.time.textContent = '';

    if (isCurrentDay && lastWeatherData) {
        const current = lastWeatherData.currentConditions;
        
        elements.temperature.textContent = displayTemperature(current.temp, currentUnit);
        
        const conditionDiv = document.querySelector('.condition');
        conditionDiv.innerHTML = `
            <i data-feather="${getWeatherIcon(current.conditions)}"></i>
            <span>${current.conditions}</span>
        `;
        feather.replace();
        
        elements.humidity.textContent = `${Math.round(current.humidity)}%`;
        elements.wind.textContent = `${Math.round(current.windspeed)} mph`;
        elements.precipitation.textContent = `${Math.round(current.precipprob || 0)}%`;
        elements.feelsLike.textContent = displayTemperature(current.feelslike, currentUnit);
        elements.visibility.textContent = `${Math.round(current.visibility)} mi`;
        elements.pressure.textContent = `${Math.round(current.pressure)} hPa`;

        updateLocalTime(timezone);
        timeInterval = setInterval(() => updateLocalTime(timezone), 1000);
    } else {
        elements.temperature.textContent = displayTemperature(dayData.temp || dayData.tempmax, currentUnit);
        
        const conditionDiv = document.querySelector('.condition');
        conditionDiv.innerHTML = `
            <i data-feather="${getWeatherIcon(dayData.conditions)}"></i>
            <span>${dayData.conditions}</span>
        `;
        feather.replace();
        
        elements.humidity.textContent = `${Math.round(dayData.humidity)}%`;
        elements.wind.textContent = `${Math.round(dayData.windspeed)} mph`;
        elements.precipitation.textContent = `${Math.round(dayData.precipprob || 0)}%`;
        elements.feelsLike.textContent = displayTemperature(dayData.feelslike || dayData.temp || dayData.tempmax, currentUnit);
        elements.visibility.textContent = `${Math.round(dayData.visibility)} mi`;
        elements.pressure.textContent = `${Math.round(dayData.pressure)} hPa`;
    }
    
    if (dayData.hours) {
        generateTemperatureCurve(dayData.hours, timezone);
    }
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
            await new Promise(resolve => setTimeout(resolve, 300));
            updateUI(data, currentUnit);
            elements.weatherContent.classList.remove('loading');
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

function updateLocalTime(timezone) {
    const timeStr = new Date().toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: timezone
    });
    elements.time.textContent = timeStr;
}

function updateUI(data, unit = 'F') {
    const current = data.currentConditions;

    document.body.style.backgroundColor = getBackgroundColor(current.conditions, current.datetime);

    const date = new Date(current.datetimeEpoch * 1000);
    date.setMinutes(0);
    const dayStr = date.toLocaleString('en-US', { 
        weekday: 'long',
        timeZone: data.timezone 
    });

    elements.day.textContent = dayStr;
    
    const locationParts = data.resolvedAddress.split(', ');

    if (locationParts.length === 1) {
        elements.cityState.textContent = locationParts[0];
        elements.country.textContent = '';
    } else if (locationParts.length === 2 && locationParts[1] === 'United States') {
        elements.cityState.textContent = locationParts[0];
        elements.country.textContent = locationParts[1];
    } else {
        elements.cityState.textContent = locationParts.slice(0, -1).join(', ');
        elements.country.textContent = locationParts[locationParts.length - 1];
    }
    
    elements.temperature.textContent = displayTemperature(current.temp, unit);
    
    const conditionDiv = document.querySelector('.condition');
    conditionDiv.innerHTML = `
        <i data-feather="${getWeatherIcon(current.conditions)}"></i>
        <span>${current.conditions}</span>
    `;
    feather.replace();
    
    elements.humidity.textContent = `${Math.round(current.humidity)}%`;
    elements.wind.textContent = `${Math.round(current.windspeed)} mph`;
    elements.precipitation.textContent = `${Math.round(current.precipprob || 0)}%`;
    elements.feelsLike.textContent = displayTemperature(current.feelslike, unit);
    elements.visibility.textContent = `${Math.round(current.visibility)} mi`;
    elements.pressure.textContent = `${Math.round(current.pressure)} hPa`;

    elements.tempButtons.forEach(button => {
        button.classList.toggle('active', button.textContent.includes(unit));
    });

    generateTemperatureCurve(data.days[0].hours, data.timezone);
    updateWeeklyForecast(data, unit);

    if (timeInterval) {
        clearInterval(timeInterval);
        timeInterval = null;
    }

    if (data.timezone) {
        updateLocalTime(data.timezone);
        timeInterval = setInterval(() => updateLocalTime(data.timezone), 1000);
    }
}

function getBackgroundColor(conditions, datetime) {
    conditions = conditions.toLowerCase();
    const hour = new Date(datetime).getHours();
    
    const colorSchemes = {
        clear: '#4A90E2',
        sunny: '#4A90E2',
        rain: '#3B7BCE',
        'partly cloudy': '#5499E4',
        'partially cloudy': '#5499E4',
        cloudy: '#4885D6',
        overcast: '#4076C2',
        snow: '#5499E4',
        storm: '#3B7BCE',
        default: '#4A90E2'
    };

    let baseColor = colorSchemes.default;
    for (let condition in colorSchemes) {
        if (conditions.includes(condition)) {
            baseColor = colorSchemes[condition];
            break;
        }
    }

    if (hour >= 20 || hour < 6) {
        return adjustColor(baseColor, -30);
    } else if (hour < 9 || hour >= 17) {
        return adjustColor(baseColor, -15);
    } else {
        return baseColor;
    }
}

function adjustColor(color, amount) {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const b = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const g = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return `#${(g | (b << 8) | (r << 16)).toString(16).padStart(6, '0')}`;
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