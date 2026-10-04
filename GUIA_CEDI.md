# Guía de Implementación: Servidor de Impresión Híbrido (CEDI)

Esta guía detalla los pasos para dejar funcionales **ambas opciones de impresión simultáneamente** en las computadoras del CEDI, evitando que se desperdicie papel cuando se atiende a un consumidor final y manteniendo la opción original para impresiones tamaño carta.

> [!NOTE]
> El script `print_server_tickets.py` **ya está subido al repositorio en GitHub**. Al sincronizar (hacer `git pull`) en la computadora del CEDI, el script bajará automáticamente dentro de la carpeta `scripts/`.

---

## 1. Configuración de la Impresora Térmica (Tickets)
Dado que no estás seguro de poder conectarla por Ethernet (cable de red), aquí están las alternativas:

- **Si logras conectarla por Red (Ethernet):**
  1. Averigua la dirección IP asignada a la impresora (ej. `192.168.x.x`).
  2. Abre el archivo `scripts/print_server_tickets.py` en la computadora del CEDI.
  3. Modifica la variable `PRINTER_IP` (línea 16) con la nueva IP.

- **Si la conectas por USB:**
  > [!WARNING]
  > El script actual se conecta mediante Sockets (IP). Si usas USB, necesitarás instalar los drivers de Star BSC10 en Windows, compartir la impresora en red (ej. con el nombre `Ticketera`) y hacer un leve ajuste al código de Python para que imprima al puerto USB local o usar la librería `win32print`.
  *Recomendación:* Intenta usar Ethernet conectando la impresora directamente al router del local; es mucho más estable y no requiere drivers de Windows.

---

## 2. Puesta en Marcha del Print Server (Python)
Este proceso dejará el "puente" corriendo en la computadora cajera del CEDI para que lea las órdenes de la nube.

1. **Sincronizar Repositorio:** Abre la terminal en la carpeta del sistema y ejecuta:
   ```cmd
   git pull
   ```
2. **Instalar Dependencias de Python (si no están instaladas):**
   ```cmd
   pip install requests
   ```
3. **Ejecutar el Servidor de Tickets:**
   ```cmd
   python scripts/print_server_tickets.py
   ```
   *Tip:* Para que no tengas que abrirlo manualmente todos los días, puedes crear un archivo `.bat` en el escritorio o agregarlo a la carpeta de Inicio de Windows (`shell:startup`) para que arranque automáticamente al encender la PC.

---

## 3. Entrenamiento a los Operarios (El Flujo)
La interfaz ya está preparada para separar ambos tipos de impresión. Tienes que indicarles el siguiente flujo a los empleados:

1. **Venta a Mayorista / Factura Formal:** 
   - Hacen clic en **"Imprimir (Carta)"** (o la opción nativa de siempre).
   - Se abrirá la vista nativa de Google Chrome.
   - En la lista de impresoras de Chrome, deben asegurarse de tener seleccionada la **Epson** tamaño carta.

2. **Venta a Consumidor Final (1 o 2 ítems):**
   - Hacen clic en el nuevo botón **"Ticket"**.
   - Aparecerá la ventana emergente con la previsualización del ticket térmico que armamos.
   - Presionan **"Imprimir Ticket Ahora"**.
   - ¡Listo! El sistema en la nube enviará la orden y la ventanita negra de Python que dejamos corriendo capturará el ticket y lo escupirá en la impresora Star BSC10 al instante.

> [!TIP]
> **Impresión Directa:** Si los empleados se acostumbran y ya no quieren ver la "Vista Previa" para ahorrar tiempo, ve al panel izquierdo a **Configuración > Punto de Venta e Impresión** y activa la opción **Impresión Directa**. Esto guardará la preferencia en esa computadora para saltarse la previsualización y mandar a imprimir en un solo clic.
