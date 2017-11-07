'use strict'

const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

const IpfsAPiServer = require('ipfs/src/http');
const IpfsRepo = require('ipfs-repo');

const path = require('path');
const url = require('url');
const fs = require('fs');

const repoPath = new IpfsRepo(app.getPath('home')+"/.Trustr");


let mainWindow

function createWindow () {
    mainWindow = new BrowserWindow({width: 850, height: 600})

    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    // Open the DevTools.
    mainWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    mainWindow.on('closed', () => {
        mainWindow = null
    });
}

app.on('ready', function() {


    // Spawn your IpfsAPiServer node \o/

    let initIpfs = false;
    try {
        fs.statSync(repoPath);
    } catch (err) {
        initIpfs = true;
    }

    const api = new IpfsAPiServer(repoPath);


    api.start(initIpfs, function(err){
        if (err) {
            console.error(err);
        } else {
            console.log("IPFS Online");
            createWindow();
        }
    });

});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') { app.quit() }
})

app.on('activate', () => {
    if (mainWindow === null) { createWindow() }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate data and require them here.
