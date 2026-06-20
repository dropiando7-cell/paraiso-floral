const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

let mainWindow;
const ERP_URL = 'https://sistema.bioelectronicahn.com/login';

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    show: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Maximizar por defecto para mejorar experiencia de usuario
  mainWindow.maximize();
  mainWindow.show();

  // Cargar URL del ERP
  mainWindow.loadURL(ERP_URL);

  // Ocultar menú predeterminado del navegador para estética más limpia y nativa
  Menu.setApplicationMenu(null);

  // Manejar fallos de carga (como desconexiones a Internet)
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    // Evitamos redireccionar a offline si el fallo es menor (como redirecciones canceladas por el usuario o llamadas canceladas)
    if (errorCode === -3 || errorCode === -2) return;
    
    console.log(`Fallo al cargar URL: ${validatedURL}. Código error: ${errorCode} (${errorDescription})`);
    
    // Cargar pantalla offline local
    mainWindow.loadFile(path.join(__dirname, 'offline.html'));
  });

  // Asegurar que enlaces externos se abran en el navegador web predeterminado del sistema operativo
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(ERP_URL)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Habilitar atajos útiles de teclado (F5 para refrescar, Ctrl+R / Cmd+R)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // F5 o Ctrl+R (Cmd+R en Mac)
    if (input.key === 'F5' || ((input.control || input.meta) && input.key.toLowerCase() === 'r')) {
      mainWindow.webContents.reload();
    }
    // F12 para abrir DevTools en desarrollo (opcional)
    if (input.key === 'F12') {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Inicializar la aplicación
app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Salir cuando todas las ventanas estén cerradas (comportamiento estándar de Windows/Linux)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
