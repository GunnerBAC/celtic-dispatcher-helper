const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let serverProcess;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile(path.join(__dirname, 'dist/public/index.html'));
}

function startServer() {
    serverProcess = fork(path.join(__dirname, 'dist/index.js'), {
        env: { ...process.env, NODE_ENV: 'production' }
    });
    serverProcess.on('exit', (code) => {
        console.log(`Server process exited with code ${code}`);
    });
}

app.whenReady().then(() => {
  startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});
