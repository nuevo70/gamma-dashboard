import yfinance as yf
import pandas as pd
import numpy as np
from scipy.stats import norm
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

from flask import Flask, render_template, jsonify
from flask_cors import CORS
import threading
import time
import json

app = Flask(__name__)
CORS(app)

# ============================================
# CLASE PARA CALCULAR GREEKS
# ============================================

class GreeksCalculator:
    """Calcula los Greeks usando Black-Scholes"""
    
    def __init__(self, S, K, T, r, sigma):
        self.S = S
        self.K = K
        self.T = T
        self.r = r
        self.sigma = sigma
        self.d1 = self._calculate_d1()
        self.d2 = self.d1 - self.sigma * np.sqrt(T) if T > 0 else 0
    
    def _calculate_d1(self):
        if self.T <= 0:
            return 0
        return (np.log(self.S / self.K) + (self.r + 0.5 * self.sigma ** 2) * self.T) / (self.sigma * np.sqrt(self.T))
    
    def delta_call(self):
        return norm.cdf(self.d1)
    
    def delta_put(self):
        return norm.cdf(self.d1) - 1
    
    def gamma(self):
        if self.T <= 0:
            return 0
        return norm.pdf(self.d1) / (self.S * self.sigma * np.sqrt(self.T))
    
    def theta_call(self):
        if self.T <= 0:
            return 0
        term1 = -(self.S * norm.pdf(self.d1) * self.sigma) / (2 * np.sqrt(self.T))
        term2 = self.r * self.K * np.exp(-self.r * self.T) * norm.cdf(self.d2)
        return (term1 - term2) / 365
    
    def theta_put(self):
        if self.T <= 0:
            return 0
        term1 = -(self.S * norm.pdf(self.d1) * self.sigma) / (2 * np.sqrt(self.T))
        term2 = self.r * self.K * np.exp(-self.r * self.T) * norm.cdf(-self.d2)
        return (term1 + term2) / 365
    
    def vega(self):
        if self.T <= 0:
            return 0
        return self.S * norm.pdf(self.d1) * np.sqrt(self.T) / 100


# ============================================
# CLASE PARA ANALIZAR GAMMA
# ============================================

class GammaAnalyzer:
    """Analiza Gamma Exposure y predice movimientos"""
    
    def __init__(self, ticker, risk_free_rate=0.05):
        self.ticker = ticker
        self.r = risk_free_rate
        self.current_price = None
        self.historical_volatility = None
        self.options_chain = None
        self.expiry_date = None
    
    def fetch_data(self):
        """Obtiene datos de yfinance"""
        try:
            stock = yf.Ticker(self.ticker)
            
            # Precio actual
            hist = stock.history(period='1d')
            self.current_price = hist['Close'].iloc[-1]
            
            # Volatilidad histórica
            hist_year = stock.history(period='1y')
            returns = hist_year['Close'].pct_change().dropna()
            self.historical_volatility = returns.std() * np.sqrt(252)
            
            # Opciones
            options_dates = stock.options
            if options_dates:
                self.expiry_date = options_dates[0]
                self.options_chain = stock.option_chain(self.expiry_date)
                return True
            return False
        
        except Exception as e:
            print(f"Error en {self.ticker}: {e}")
            return False
    
    def analyze_options(self):
        """Calcula Greeks para todas las opciones"""
        try:
            calls = self.options_chain.calls
            puts = self.options_chain.puts
            
            expiry = pd.to_datetime(self.expiry_date)
            today = pd.Timestamp.now()
            days_to_expiry = (expiry - today).days
            T = max(days_to_expiry / 365.0, 0.001)
            
            iv = self.historical_volatility
            
            call_deltas = []
            call_gammas = []
            put_deltas = []
            put_gammas = []
            
            for idx, row in calls.iterrows():
                if row['bid'] > 0:
                    calc = GreeksCalculator(self.current_price, row['strike'], T, self.r, iv)
                    call_deltas.append(calc.delta_call())
                    call_gammas.append(calc.gamma())
            
            for idx, row in puts.iterrows():
                if row['bid'] > 0:
                    calc = GreeksCalculator(self.current_price, row['strike'], T, self.r, iv)
                    put_deltas.append(calc.delta_put())
                    put_gammas.append(calc.gamma())
            
            net_delta = np.sum(call_deltas) + np.sum(put_deltas)
            net_gamma = np.sum(call_gammas) + np.sum(put_gammas)
            
            return {
                'net_delta': float(net_delta),
                'net_gamma': float(net_gamma),
                'call_delta': float(np.sum(call_deltas)),
                'put_delta': float(np.sum(put_deltas)),
                'call_gamma': float(np.sum(call_gammas)),
                'put_gamma': float(np.sum(put_gammas)),
                'days_to_expiry': days_to_expiry
            }
        
        except Exception as e:
            print(f"Error analizando opciones: {e}")
            return None
    
    def get_prediction(self, greeks_data):
        """Genera predicción basada en Greeks"""
        net_delta = greeks_data['net_delta']
        net_gamma = greeks_data['net_gamma']
        
        # Determinar dirección
        if net_delta > 0.7:
            direction = "FUERTEMENTE ALCISTA"
            direction_color = "success"
            direction_icon = "📈"
        elif net_delta > 0.3:
            direction = "ALCISTA"
            direction_color = "info"
            direction_icon = "📈"
        elif net_delta > -0.3:
            direction = "NEUTRAL"
            direction_color = "warning"
            direction_icon = "➡️"
        elif net_delta > -0.7:
            direction = "BAJISTA"
            direction_color = "danger"
            direction_icon = "📉"
        else:
            direction = "FUERTEMENTE BAJISTA"
            direction_color = "danger"
            direction_icon = "📉"
        
        # Riesgo de gamma
        if net_gamma > 0.001:
            gamma_risk = "ALTO"
            gamma_color = "danger"
        elif net_gamma > 0.0005:
            gamma_risk = "MODERADO"
            gamma_color = "warning"
        else:
            gamma_risk = "BAJO"
            gamma_color = "success"
        
        # Detección de squeeze
        if abs(net_delta) < 0.2 and net_gamma > 0.0008:
            squeeze = "CRÍTICO"
            squeeze_color = "danger"
        elif abs(net_delta) < 0.3 and net_gamma > 0.0005:
            squeeze = "ALTO"
            squeeze_color = "warning"
        else:
            squeeze = "BAJO"
            squeeze_color = "success"
        
        return {
            'direction': direction,
            'direction_color': direction_color,
            'direction_icon': direction_icon,
            'gamma_risk': gamma_risk,
            'gamma_color': gamma_color,
            'squeeze': squeeze,
            'squeeze_color': squeeze_color
        }
    
    def run(self):
        """Ejecuta análisis completo"""
        if self.fetch_data():
            greeks = self.analyze_options()
            if greeks:
                prediction = self.get_prediction(greeks)
                return {
                    'ticker': self.ticker,
                    'current_price': float(self.current_price),
                    'greeks': greeks,
                    'prediction': prediction,
                    'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    'volatility': float(self.historical_volatility * 100),
                    'expiry': self.expiry_date
                }
        return None


# ============================================
# ALMACENAMIENTO DE DATOS
# ============================================

analysis_data = {
    'QQQ': None,
    'SPY': None,
    'IWM': None
}

analysis_history = {
    'QQQ': [],
    'SPY': [],
    'IWM': []
}


# ============================================
# FUNCIÓN DE ACTUALIZACIÓN EN BACKGROUND
# ============================================

def update_data_background():
    """Actualiza datos cada X segundos en background"""
    while True:
        try:
            for ticker in ['QQQ', 'SPY', 'IWM']:
                analyzer = GammaAnalyzer(ticker)
                result = analyzer.run()
                
                if result:
                    analysis_data[ticker] = result
                    
                    # Guardar historial (máximo 288 registros = 24 horas a 5 min)
                    analysis_history[ticker].append(result)
                    if len(analysis_history[ticker]) > 288:
                        analysis_history[ticker].pop(0)
            
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Datos actualizados")
        
        except Exception as e:
            print(f"Error en actualización: {e}")
        
        # Actualizar cada 5 minutos
        time.sleep(300)


# ============================================
# RUTAS DE LA API
# ============================================

@app.route('/')
def index():
    """Página principal del dashboard"""
    return render_template('dashboard.html')


@app.route('/api/data')
def get_data():
    """Obtiene datos actuales de todos los tickers"""
    return jsonify(analysis_data)


@app.route('/api/data/<ticker>')
def get_ticker_data(ticker):
    """Obtiene datos de un ticker específico"""
    if ticker.upper() in analysis_data:
        return jsonify(analysis_data[ticker.upper()])
    return jsonify({'error': 'Ticker not found'}), 404


@app.route('/api/history/<ticker>')
def get_ticker_history(ticker):
    """Obtiene historial completo de análisis"""
    if ticker.upper() in analysis_history:
        return jsonify(analysis_history[ticker.upper()])
    return jsonify({'error': 'Ticker not found'}), 404


@app.route('/api/compare')
def compare_tickers():
    """Compara los tres tickers"""
    comparison = {
        'tickers': {},
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    
    for ticker in ['QQQ', 'SPY', 'IWM']:
        if analysis_data[ticker]:
            data = analysis_data[ticker]
            comparison['tickers'][ticker] = {
                'price': data['current_price'],
                'delta': data['greeks']['net_delta'],
                'gamma': data['greeks']['net_gamma'],
                'direction': data['prediction']['direction'],
                'gamma_risk': data['prediction']['gamma_risk'],
                'squeeze': data['prediction']['squeeze']
            }
    
    return jsonify(comparison)


@app.route('/api/chart-data/<ticker>')
def get_chart_data(ticker):
    """Obtiene datos formateados para gráficos"""
    if ticker.upper() not in analysis_history:
        return jsonify({'error': 'Ticker not found'}), 404
    
    history = analysis_history[ticker.upper()]
    
    if not history:
        return jsonify({
            'timestamps': [],
            'prices': [],
            'deltas': [],
            'gammas': [],
            'volatilities': []
        })
    
    return jsonify({
        'timestamps': [item['timestamp'] for item in history],
        'prices': [item['current_price'] for item in history],
        'deltas': [item['greeks']['net_delta'] for item in history],
        'gammas': [item['greeks']['net_gamma'] for item in history],
        'volatilities': [item['volatility'] for item in history]
    })


# ============================================
# INICIAR APLICACIÓN
# ============================================

if __name__ == '__main__':
    # Iniciar thread de actualización
    background_thread = threading.Thread(target=update_data_background, daemon=True)
    background_thread.start()
    
    # Ejecutar Flask
    app.run(debug=True, host='0.0.0.0', port=5000)
