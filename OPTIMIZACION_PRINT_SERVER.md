# 📌 Guía de Optimización: Script de Print Server (Impresión Local)

Este documento contiene las instrucciones y el código optimizado para actualizar el script de impresión local en la PC de la empresa y reducir en un 90% las peticiones redundantes a Supabase.

---

## 🔍 Diagnóstico Actual
* **Archivos afectados:** `scripts/print_server_unified.py`, `scripts/print_server_niimbot.py`, `scripts/print_server_checkin_tsc.py`.
* **Comportamiento previo:** El script realiza peticiones HTTP `GET` a `/api/impresion/niimbot/pendientes` cada **10 a 15 segundos** las 24 horas del día.
* **Impacto:** Genera más de 200,000 peticiones al mes hacia Supabase, consumiendo cuota de ancho de banda (Egress) incluso cuando no hay etiquetas que imprimir.

---

## 🛠️ Solución Propuesta: Adaptative Backoff (Espera Inteligente)

### Regla de Polling:
1. **Si hay trabajos pendientes (`trabajos > 0`):** Procesar e inspeccionar de inmediato en **3 segundos** (`TIEMPO_ESPERA_ACTIVE = 3`).
2. **Si la cola está vacía (`trabajos == 0`):** Esperar **45 a 60 segundos** (`TIEMPO_ESPERA_IDLE = 45`) antes de realizar la siguiente consulta.

---

## 💻 Código Python Optimizado (Para reemplazar el bucle principal)

```python
import time
import requests
import os

# Configuración de Tiempos
HOST = os.environ.get("SERVER_URL", "https://bioelectronicahn.vercel.app")
API_PENDIENTES = f"{HOST}/api/impresion/niimbot/pendientes"
API_COMPLETAR  = f"{HOST}/api/impresion/niimbot/completar"

TIEMPO_ESPERA_ACTIVE = 3   # Segundos de espera cuando SÍ hay impresiones
TIEMPO_ESPERA_IDLE   = 45  # Segundos de espera cuando NO hay impresiones

print("🚀 Servidor de impresión optimizado iniciado...")

while True:
    try:
        response = requests.get(API_PENDIENTES, timeout=10)
        if response.status_code == 200:
            data = response.json()
            trabajos = data.get("trabajos", [])
            
            if trabajos:
                print(f"🖨️ Se encontraron {len(trabajos)} trabajos pendientes.")
                for trabajo in trabajos:
                    # Lógica de impresión existente...
                    procesar_impresion(trabajo)
                
                # Re-check rápido si hubo impresiones
                time.sleep(TIEMPO_ESPERA_ACTIVE)
            else:
                # Cola vacía: Esperar intervalo extendido para ahorrar bandwidth
                time.sleep(TIEMPO_ESPERA_IDLE)
        else:
            print(f"⚠️ Respuesta no esperada de la API: {response.status_code}")
            time.sleep(TIEMPO_ESPERA_IDLE)

    except Exception as e:
        print(f"❌ Error al consultar la cola de impresión: {e}")
        time.sleep(TIEMPO_ESPERA_IDLE)
```

---

## 📋 Pasos para Aplicar en el Sitio (En la PC de la Empresa):

1. Ir a la PC física donde se ejecuta el script de impresión.
2. Abrir la carpeta del proyecto o el script de Python (`print_server_unified.py` o `print_server_niimbot.py`).
3. Reemplazar la constante `TIEMPO_ESPERA = 15` por la estructura de espera dinámica `TIEMPO_ESPERA_IDLE = 45`.
4. Reiniciar la consola / servicio de Python.
