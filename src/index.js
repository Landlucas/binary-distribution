const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');
let window;

let connections = [
  {
    socket: new net.Socket(),
    host: 'localhost',
    port: 11111,
  },
  {
    socket: new net.Socket(),
    host: 'localhost',
    port: 22222,
  },
  {
    socket: new net.Socket(),
    host: 'localhost',
    port: 33333,
  },
  {
    socket: new net.Socket(),
    host: 'localhost',
    port: 44444,
  },
];

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

const createWindow = () => {
  window = new BrowserWindow({
    width: 1240,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(app.getAppPath(), 'src/preload.js'),
    },
  });

  window.on('closed', () => {
    window = null;
  });

  window.loadFile(path.join(__dirname, 'index.html'));

  window.webContents.openDevTools();

  window.webContents.once('dom-ready', () => {
    for (let connection of connections) {
    }
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {});

ipcMain.on('openDialog', (event, args) => {
  dialog
    .showOpenDialog({ properties: ['openFile'] })
    .then((result) => {
      if (!result.canceled) {
        for (let filePath of result.filePaths) {
          let fileName = path.basename(filePath);
          let fileSize = fs.lstatSync(path.join(filePath)).size;
          let fragmentSize = Math.ceil(fs.lstatSync(path.join(filePath)).size / 4);
          console.log(`fragmentSize is ${fragmentSize}...`);
          console.log(`Sending file from ${filePath}...`);

          for (let [index, connection] of connections.entries()) {
            connection.socket.connect(connection.port, connection.host, () => {
              console.log(`Connected to ${connection.host}:${connection.port}.`);
              const writeData = (data, cb) => {
                if (!connection.socket.write(data)) {
                  connection.socket.once('drain', cb);
                } else {
                  process.nextTick(cb);
                }
              };
              writeData(path.basename(filePath), () => {
                let file = fs.createReadStream(filePath, {
                  start: index * fragmentSize,
                  end: (index + 1) * fragmentSize,
                });
                file.pipe(connection.socket);
              });
              connection.socket.on('finish', () => {
                console.log(`Finished streaming ${filePath}`);
              });
            });

            connection.socket.on('end', () => {
              console.log(`Connection to ${connection.host}:${connection.port} ended.`);
            });
            connection.socket.on('close', () => {
              console.log(`Connection to ${connection.host}:${connection.port} closed.`);
            });
          }

          console.log(`Adding file ${filePath} to the table list...`);
          window.webContents.executeJavaScript(
            `document.querySelector('.files-table-list tbody').innerHTML += '<tr><td><a href="#" onclick="downloadFile(this)">${fileName}</a></td><td>${fileSize} bytes</td></tr>';`
          );
        }
      }
    })
    .catch((err) => {
      console.error(err);
    });
});

ipcMain.on('downloadFile', (event, filename) => {
  let outputFilePath = path.resolve(__dirname, '..', 'temp', filename);
  let start = 0;
  for (let [index, connection] of connections.entries()) {
    let filePath = path.resolve(__dirname, '..', 'temp', connection.port.toString(), filename);
    if (!fs.existsSync(filePath)) {
      return;
    }
    console.log(`reading ${filePath}...`)
    let fileSize = fs.lstatSync(path.join(filePath)).size;
    const writable = fs.createWriteStream(outputFilePath, {
      start: start,
      end: fileSize,
      emitClose: true,
      autoClose: true,
    });
    fs.createReadStream(filePath, {
      autoClose: true,
    }).pipe(writable);
    start += fileSize;
  }
});
