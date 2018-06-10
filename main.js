const {app, BrowserWindow, Menu, dialog} = require('electron')
const path = require('path')
const url = require('url')
const ipc = require('electron').ipcMain
const isDev = require('electron-is-dev')
require('electron-debug')({enabled: false})

let menu,
    win,
    aboutWin

let createWindow = () => {
    win = new BrowserWindow({
        title: 'CRG Data Tool',
        icon: __dirname + '/build/flamingo-white.png',
        width: 800, 
        height: 600
    })

    win.loadURL(url.format({
        pathname: path.join(__dirname, 'src/index.html'),
        protocol: 'file',
        slashes: true
    }))

    if (isDev){
        win.webContents.openDevTools()
        //require('devtron').install()
    }

    win.on('closed', ()=> {
        win=null
    })

    win.webContents.on('crashed', ()=> {
        dialog.showMessageBox(win, {
            type: 'error',
            title: 'CRG Data Tool',
            message: 'CRG Data Tool has crashed.  This should probably not surprise you.'
        })
    })

    win.on('unresponsive', ()=> {
        dialog.showMessageBox(win, {
            type: 'error',
            title: 'CRG Data Tool',
            message: 'CRG Data Tool has become unresponsive.  Perhaps you should give it some personal space.'
        })
    })

    win.webContents.on('new-window', 
        (event, url, frameName, disposition, options) => {
            Object.assign(options, {
                parent: win,
                modal: true
            })
        })

    menu = Menu.buildFromTemplate([
        {
            label: 'Options',
            submenu: [
                {
                    label:'Exit',
                    click(){
                        app.quit()
                    }
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {   label: 'About',
                    click: function(){
                        openAbout()
                    }
                }
            ]    
        }
    ])
    Menu.setApplicationMenu(menu)
}



app.on('ready', createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate',() => {
    if (win == null){
        createWindow()
    }
})

let openAbout = () => {
// opening function for "About This Software" window
    aboutWin = new BrowserWindow({
        parent: win,
        title: 'CRG Data Tool',
        icon: __dirname + '/build/flamingo-white.png',
        width: 300,
        height: 300,
        x: win.getPosition()[0] + 250,
        y: win.getPosition()[1] + 150
    })

    aboutWin.setMenu(null)

    aboutWin.loadURL(url.format({
        pathname: path.join(__dirname, 'src/about.html'),
        protocol: 'file',
        slashes: true
    }))

    aboutWin.webContents.on('new-window', function(e, url) {
        e.preventDefault()
        require('electron').shell.openExternal(url)
    })

    aboutWin.on('closed', () => {
        aboutWin = null
    })

    aboutWin.webContents.on('did-finish-load', () => {
        aboutWin.webContents.send('set-version', app.getVersion())
    })
    
}

ipc.on('table-generated', () => {
    win.webContents.send('table-generated')
})

ipc.on('skater-window-closed', (event, outFileName) => {
    win.webContents.send('skater-window-closed',outFileName)
})

// Error handlers

ipc.on('error-thrown', (event, msg, url, lineNo, columnNo) => {
    dialog.showMessageBox(win, {
        type: 'error',
        title: 'CRG Data Tool',
        message: `CRG Data Tool has encountered an error.
        Here's some details:
        Message: ${msg}
        URL: ${url}
        Line Number: ${lineNo}
        Column Number: ${columnNo}
        Does this help?  It probably doesn't help.`
    })
})

process.on('uncaughtException', (err) => {
    dialog.showMessageBox(win, {
        type: 'error',
        title: 'CRG Data Tool',
        message: `CRG Data Tool has had an uncaught exception in main.js.  Does this help? (Note: will probably not help.) ${err}`
    })       
})