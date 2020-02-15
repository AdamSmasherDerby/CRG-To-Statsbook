let filenameText = document.getElementById('filename')
const electron = require('electron')
const remote = electron.remote
const ipc = electron.ipcRenderer
const { shell } = require('electron')

let filename = ''

ipc.on('set-filename', (event, file) => {
    filename = file
    filenameText.innerHTML = file
})

const openButton = document.getElementById('openButton')
const okButton = document.getElementById('okButton')

okButton.addEventListener('click', closeWindow)
openButton.addEventListener('click', openFile)

function closeWindow () {
// Close the window
    let window = remote.getCurrentWindow()
    window.close()
}

function openFile () {
    shell.openExternal(filename)
}
