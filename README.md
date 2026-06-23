# 🎯 Gamma Dashboard - Análisis de Opciones en Tiempo Real

Dashboard web para analizar Gamma de opciones, calcular Greeks y predecir movimientos de precio en QQQ, SPY e IWM.

## ✨ Características

- **📊 Análisis de Greeks en tiempo real** (Delta, Gamma, Theta, Vega)
- **🎯 Predicción de movimiento de precio** basada en Delta agregado
- **💥 Detección de Gamma Squeeze** automática
- **📈 Monitoreo de 3 activos** (QQQ, SPY, IWM)
- **🔄 Actualización automática** cada 5 minutos
- **🎨 Dashboard intuitivo** con visualización en tiempo real
- **🌐 API REST** para integración

## 🚀 Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/nuevo70/gamma-dashboard.git
cd gamma-dashboard
```

### 2. Crear entorno virtual
```bash
python -m venv venv
source venv/bin/activate  # En Windows: venv\\Scripts\\activate
```

### 3. Instalar dependencias
```bash
pip install -r requirements.txt
```

## 🏃 Ejecución

### Iniciar la aplicación
```bash
python app.py
```

Luego accede a: **http://localhost:5000**

## 📊 API Endpoints

### Obtener datos de todos los tickers
```
GET /api/data
```

### Obtener datos de un ticker específico
```
GET /api/data/<ticker>
```

### Obtener historial de un ticker
```
GET /api/history/<ticker>
```

### Comparar todos los tickers
```
GET /api/compare
```

## 📋 Estructura de Respuesta

```json
{
  "ticker": "QQQ",
  "current_price": 380.50,
  "volatility": 18.45,
  "expiry": "2024-01-19",
  "timestamp": "2024-01-12 15:30:00",
  "greeks": {
    "net_delta": 0.45,
    "net_gamma": 0.0008,
    "call_delta": 0.50,
    "put_delta": -0.05,
    "call_gamma": 0.0006,
    "put_gamma": 0.0002,
    "days_to_expiry": 7
  },
  "prediction": {
    "direction": "ALCISTA",
    "direction_color": "info",
    "direction_icon": "📈",
    "gamma_risk": "MODERADO",
    "gamma_color": "warning",
    "squeeze": "BAJO",
    "squeeze_color": "success"
  }
}
```

## 🎯 Interpretación de Señales

### Delta
- **> 0.7**: FUERTEMENTE ALCISTA
- **0.3 - 0.7**: ALCISTA
- **-0.3 - 0.3**: NEUTRAL
- **-0.7 - -0.3**: BAJISTA
- **< -0.7**: FUERTEMENTE BAJISTA

### Gamma Risk
- **ALTO**: Gamma > 0.001 (Alto riesgo de volatilidad)
- **MODERADO**: Gamma 0.0005 - 0.001
- **BAJO**: Gamma < 0.0005

### Gamma Squeeze
- **CRÍTICO**: Delta cercano a 0 + Gamma muy alto
- **ALTO**: Delta < 0.3 + Gamma > 0.0005
- **BAJO**: Sin riesgo de squeeze

## ⚙️ Configuración

Edita `app.py` para cambiar:
- **Intervalo de actualización**: Modifica `time.sleep(300)` (línea 186)
- **Tickers analizados**: Cambia `['QQQ', 'SPY', 'IWM']`
- **Tasa libre de riesgo**: Ajusta `risk_free_rate` en GammaAnalyzer

## 📝 Notas Importantes

- **Datos estimados**: Los Greeks se calculan usando Black-Scholes con IV histórica (no datos reales de opciones)
- **Actualización**: Cada 5 minutos en background
- **Historial**: Se mantienen máximo 100 registros por ticker
- **API gratuita**: Usa yfinance (sin garantía de precisión)

## 🔗 Dependencias

- **Flask**: Framework web
- **yfinance**: Datos de opciones
- **scipy**: Cálculo de distribuciones normales (Black-Scholes)
- **pandas/numpy**: Procesamiento de datos

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Para cambios importantes, abre un issue primero.

## 📄 Licencia

MIT License

## ⚠️ Disclaimer

Esta herramienta es **SOLO para análisis educativo**. No es una recomendación de inversión. Úsala bajo tu propio riesgo.
