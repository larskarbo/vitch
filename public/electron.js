const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const { ipcMain } = require('electron')
const fs = require('fs')
const Lame = require("node-lame").Lame;
const path = require('path');
const isDev = require('electron-is-dev');
const mkdirp = require('mkdirp')
var AudioContext = require('web-audio-api').AudioContext
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900, height: 680, webPreferences: {
      nodeIntegration: true
    }
  });
  mainWindow.loadURL(isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}`);
  if (isDev) {
    // Open the DevTools.
    //BrowserWindow.addDevToolsExtension('<location to your react chrome extension>');
    mainWindow.webContents.openDevTools();
  }
  mainWindow.on('closed', () => mainWindow = null);
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});


ipcMain.on('ondragstart', (event, filePath) => {
  event.sender.startDrag({
    file: path.join(__dirname, '../temp/file.mp3'),//filePath,
    icon: path.join(__dirname, './logo192.png')
  })
})

ipcMain.on('arraybuffer', async (event, ab) => {
  console.log('ab: ', ab);
  await mkdirp(path.join(__dirname, '../temp'))
  fs.writeFileSync(path.join(__dirname, '../temp/file.wav'), Buffer.from(ab), { flag: 'w' });


  const encoder = new Lame({
    output: path.join(__dirname, '../temp/file.mp3'),
    bitrate: 192
  }).setFile(path.join(__dirname, '../temp/file.wav'));

  encoder
    .encode()
    .then(() => {
      // Encoding finished
      console.log('fin')
    })
    .catch(error => {
      console.log('error: ', error);
      // Something went wrong
    });
})