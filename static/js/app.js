// Variables globales
let refreshInterval = 30000; // 30 segundos
let updateTimer;

// Función para obtener datos de la API
async function fetchData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        
        // Actualizar cada ticker
        ['QQQ', 'SPY', 'IWM'].forEach(ticker => {
            if (data[ticker]) {
                updateTickerDisplay(ticker, data[ticker]);
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
    
    const directionClass = data.prediction.direction_color === 'success' ? 'text-success' : 
                          data.prediction.direction_color === 'danger' ? 'text-danger' : 'text-warning';
    
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
});

// Permitir actualización manual con F5
document.addEventListener('keydown', function(e) {
    if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
        e.preventDefault();
        fetchData();
    }
});
