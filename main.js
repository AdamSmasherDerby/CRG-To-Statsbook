const {app, BrowserWindow, Menu, dialog} = require('electron')
const path = require('path')
const url = require('url')
//const ipc = require('electron').ipcMain

let menu,
    win

let createWindow = () => {
    win = new BrowserWindow({
        title: 'CRG Data Tool',
        //icon: __dirname + '/build/flamingo-white.png',
        width: 800, 
        height: 600
    })

    win.loadURL(url.format({
        pathname: path.join(__dirname, 'src/index.html'),
        protocol: 'file',
        slashes: true
    }))

    if (isDev()){
        win.webContents.openDevTools()
    }

    win.on('closed', ()=> {
        win=null
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
                        dialog.showMessageBox({
                            type: 'info',
                            title: 'CRG Data Tool',
                            message: (`CRG Data Tool Version: ${app.getVersion()}\n` +
                                'by: Adam Smasher (Daniel Alt)\n' +
                                'https://github.com/AdamSmasherDerby/CRGDataTool/releases/' 
                            )
                        })
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

let isDev = () => {
    return process.mainModule.filename.indexOf('app.asar') === -1
}

