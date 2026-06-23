// Variables globales para gráficos
let charts = {};
let refreshInterval = 30000; // 30 segundos
let updateTimer;

// Colores del tema oscuro
const chartColors = {
    delta: 'rgba(0, 212, 255, 1)',
    gamma: 'rgba(255, 107, 107, 1)',
    price: 'rgba(76, 175, 80, 1)',
    vol: 'rgba(255, 167, 38, 1)',
    grid: 'rgba(74, 74, 106, 0.2)'
};

// Configuración de Chart.js global
Chart.defaults.color = 'rgba(160, 160, 192, 0.8)';
Chart.defaults.borderColor = 'rgba(74, 74, 106, 0.3)';

// Función para obtener datos de la API
async function fetchData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        
        // Actualizar cada ticker
        ['QQQ', 'SPY', 'IWM'].forEach(ticker => {
            if (data[ticker]) {
                updateTickerDisplay(ticker, data[ticker]);
                updateCharts(ticker);
            }
        });
        
        // Actualizar comparativa
        updateComparison(data);
        
        // Actualizar timestamp
        const now = new Date();
        document.getElementById('last-update').textContent = `Actualizado: ${now.toLocaleTimeString('es-ES')}`;
        
    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('last-update').textContent = 'Error al actualizar datos';
    }
}

// Función para actualizar la visualización de cada ticker
function updateTickerDisplay(ticker, data) {
    const container = document.querySelector(`[data-ticker="${ticker}"]`);
    
    if (!container || !data) return;
    
    // Actualizar información básica
    container.querySelector('.price-value').textContent = `$${data.current_price.toFixed(2)}`;
    container.querySelector('.volatility-value').textContent = `${data.volatility.toFixed(2)}%`;
    container.querySelector('.expiry-value').textContent = data.expiry || '--';
    
    // Actualizar predicción
    const directionBadge = container.querySelector('.direction-badge');
    directionBadge.textContent = `${data.prediction.direction_icon} ${data.prediction.direction}`;
    directionBadge.className = `badge direction-badge bg-${data.prediction.direction_color}`;
    
    // Riesgo de gamma
    const gammaRiskBadge = container.querySelector('.gamma-risk-badge');
    gammaRiskBadge.textContent = data.prediction.gamma_risk;
    gammaRiskBadge.className = `badge gamma-risk-badge bg-${data.prediction.gamma_color}`;
    
    // Gamma squeeze
    const squeezeBadge = container.querySelector('.squeeze-badge');
    squeezeBadge.textContent = data.prediction.squeeze;
    squeezeBadge.className = `badge squeeze-badge bg-${data.prediction.squeeze_color}`;
    
    // Actualizar Greeks
    container.querySelector('.delta-value').textContent = data.greeks.net_delta.toFixed(4);
    container.querySelector('.gamma-value').textContent = data.greeks.net_gamma.toFixed(6);
    container.querySelector('.call-delta-value').textContent = data.greeks.call_delta.toFixed(4);
    container.querySelector('.put-delta-value').textContent = data.greeks.put_delta.toFixed(4);
}

// Función para actualizar gráficos
async function updateCharts(ticker) {
    try {
        const response = await fetch(`/api/chart-data/${ticker}`);
        const chartData = await response.json();
        
        if (!chartData.timestamps || chartData.timestamps.length === 0) {
            return;
        }
        
        // Formatear timestamps (mostrar solo hora:minuto)
        const labels = chartData.timestamps.map(ts => {
            const date = new Date(ts);
            return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        });
        
        // Actualizar o crear gráfico de Delta
        updateOrCreateChart(
            `${ticker}-delta-chart`,
            labels,
            chartData.deltas,
            'Delta Neto',
            chartColors.delta
        );
        
        // Actualizar o crear gráfico de Gamma
        updateOrCreateChart(
            `${ticker}-gamma-chart`,
            labels,
            chartData.gammas.map(g => g * 10000), // Escalar para mejor visualización
            'Gamma Neto (×10⁻⁴)',
            chartColors.gamma
        );
        
        // Actualizar o crear gráfico de Precio
        updateOrCreateChart(
            `${ticker}-price-chart`,
            labels,
            chartData.prices,
            'Precio ($)',
            chartColors.price
        );
        
        // Actualizar o crear gráfico de Volatilidad
        updateOrCreateChart(
            `${ticker}-vol-chart`,
            labels,
            chartData.volatilities,
            'Volatilidad (%)',
            chartColors.vol
        );
        
    } catch (error) {
        console.error(`Error updating charts for ${ticker}:`, error);
    }
}

// Función para actualizar o crear gráficos
function updateOrCreateChart(canvasId, labels, data, label, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (charts[canvasId]) {
        // Actualizar gráfico existente
        charts[canvasId].data.labels = labels;
        charts[canvasId].data.datasets[0].data = data;
        charts[canvasId].update('none'); // Sin animación para mejor rendimiento
    } else {
        // Crear nuevo gráfico
        charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    borderColor: color,
                    backgroundColor: color.replace('1)', '0.1)'),
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointBackgroundColor: color,
                    pointBorderColor: '#1e1e2e',
                    pointBorderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: 'rgba(160, 160, 192, 0.9)',
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 30, 46, 0.9)',
                        titleColor: '#00d4ff',
                        bodyColor: 'rgba(160, 160, 192, 0.9)',
                        borderColor: 'rgba(74, 74, 106, 0.5)',
                        borderWidth: 1,
                        titleFont: { weight: 'bold' },
                        padding: 10,
                        displayColors: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: chartColors.grid,
                            drawBorder: false
                        },
                        ticks: {
                            color: 'rgba(160, 160, 192, 0.6)',
                            font: { size: 10 },
                            maxTicksLimit: 10
                        }
                    },
                    y: {
                        grid: {
                            color: chartColors.grid,
                            drawBorder: false
                        },
                        ticks: {
                            color: 'rgba(160, 160, 192, 0.6)',
                            font: { size: 10 }
                        }
                    }
                }
            }
        });
    }
}

// Función para actualizar comparativa
function updateComparison(data) {
    const compareContainer = document.getElementById('compare-cards');
    compareContainer.innerHTML = '';
    
    ['QQQ', 'SPY', 'IWM'].forEach(ticker => {
        if (data[ticker]) {
            const tickerData = data[ticker];
            const card = createCompareCard(ticker, tickerData);
            compareContainer.appendChild(card);
        }
    });
}

// Función para crear card de comparación
function createCompareCard(ticker, data) {
    const col = document.createElement('div');
    col.className = 'col-md-4 mb-3';
    
    col.innerHTML = `
        <div class="compare-card">
            <div class="ticker-name">${ticker}</div>
            <div class="ticker-price">$${data.current_price.toFixed(2)}</div>
            <div class="signal-badge bg-${data.prediction.direction_color}">
                ${data.prediction.direction_icon} ${data.prediction.direction}
            </div>
            <br>
            <div class="signal-badge bg-${data.prediction.gamma_color}">
                Gamma: ${data.prediction.gamma_risk}
            </div>
            <div class="signal-badge bg-${data.prediction.squeeze_color}">
                Squeeze: ${data.prediction.squeeze}
            </div>
            <div style="margin-top: 1rem; font-size: 0.85rem; color: #a0a0c0;">
                <div>Δ: ${data.greeks.net_delta.toFixed(4)}</div>
                <div>Γ: ${data.greeks.net_gamma.toFixed(6)}</div>
            </div>
        </div>
    `;
    
    return col;
}

// Función para iniciar actualización automática
function startAutoUpdate() {
    // Obtener datos inmediatamente
    fetchData();
    
    // Actualizar cada 30 segundos
    updateTimer = setInterval(() => {
        fetchData();
    }, refreshInterval);
}

// Función para detener actualización automática
function stopAutoUpdate() {
    if (updateTimer) {
        clearInterval(updateTimer);
    }
}

// Inicializar cuando el documento esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard cargado');
    startAutoUpdate();
    
    // Detener actualizaciones cuando el usuario deja la página
    window.addEventListener('beforeunload', stopAutoUpdate);
    
    // Manejar cambios de tabs para actualizar gráficos
    document.querySelectorAll('[role="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', function() {
            setTimeout(() => {
                Object.values(charts).forEach(chart => chart.resize());
            }, 100);
        });
    });
});

// Permitir actualización manual con F5
document.addEventListener('keydown', function(e) {
    if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
        e.preventDefault();
        fetchData();
    }
});
