const XLP = require('xlsx-populate')
const moment = require('moment')
const {dialog} = require('electron').remote
const ipc = require('electron').ipcRenderer
const remote = require('electron').remote
const path = require('path')
const BrowserWindow = remote.BrowserWindow
const isDev = require('electron-is-dev')
const formatcrgdata = require('./formatcrgdata')
const initializeWriter = require('./writers/initializeXlsxWriter')
const SkaterManager = require('./writers/skaterManager')

const skaterManager = new SkaterManager()

let statsbookFileName = 'assets/wftda-statsbook-full-us-letter.xlsx'

// Page Elements
let holder = document.getElementById('drag-file')
let fileSelect = document.getElementById('file-select')
let rightBox = document.getElementById('right-box')
let fileInfoBox = document.getElementById('fileInfoBox')
let newVersionWarningBox = document.getElementById('newVersionWarning')
let saveNewButton = {}
let sbHolder = {}
let sbFileSelect = {}

// Setup Globals
let crgFilename = '',
    crgData = {},
    currentVersion = ''


ipc.on('do-version-check', (event, version) => {
    let tagURL = 'https://api.github.com/repos/AdamSmasherDerby/CRG-To-Statsbook/tags'
    fetch(tagURL)
        .then((response) => {
            if(response.ok) {
                return response.json()
            } else {
                throw new Error(`recieve a response code of ${response.status}`)
            }
        })
        .then((json) => {
            let latestVersion = json[0].name
                currentVersion = 'v' + version
                if (latestVersion != currentVersion) {
                    newVersionWarningBox.innerHTML = `New version available: ${latestVersion} (Current Version: ${currentVersion})</BR>` +
                    '<A HREF="https://github.com/AdamSmasherDerby/CRG-To-Statsbook/releases/" target="_system">Download Here</a>'
                }
        })
        .catch(() => {
            console.error('Update check not performed: no connection')
        })
})

ipc.on('set-paper-size', (event, size) => {
    switch (size) {
    case 'A4':
        statsbookFileName = 'assets/wftda-statsbook-full-A4.xlsx'
        break
    case 'letter':
    default:
        statsbookFileName = 'asseets/wftda-statsbook-full-us-letter.xlsx'
    }
})

fileSelect.onclick = () => {
// Allows the same file to be selected more than once
    fileSelect.value = ''
}

fileSelect.onchange = (e) => {
// When a CRG file is selected by clicking.


    if (e.target.value == ''){
        return false
    }

    e.preventDefault()
    e.stopPropagation

    if (e.target.files.length > 1){
        fileInfoBox.innerHTML = 'Error: Multiple Files Selected.'
        return false
    } 
    
    let sbFile = e.target.files[0]

    makeReader(sbFile)
    
    return false
}

holder.ondrop = (e) => {
// When a CRG File is dropped into the drop zone.

    holder.classList.remove('box__ondragover')
    e.preventDefault()
    e.stopPropagation

    if (e.dataTransfer.files.length > 1){
        fileInfoBox.innerHTML = 'Error: Multiple Files Selected.'
        return false
    } 
    
    let crgFile = e.dataTransfer.files[0]

    makeReader(crgFile)
    return false

}

let makeReader = (crgFile) => {
// Create reader object
    let reader = new FileReader()
    crgFilename = crgFile.name

    reader.onload = (e) => {
        // What to do after loading the file
        readCRGData(e)
    }

    // Actually load the file
    reader.readAsBinaryString(crgFile)
}

let readCRGData = (e) => {
// Read in the CRG data for an event e
    let fileData = JSON.parse(e.target.result)
    crgData = formatcrgdata.makecrgdata(fileData, crgFilename)

    skaterManager.setCrg(crgData)

    // Update the "File Information" box
    updateFileInfoBox()
    createSaveArea()
}

let updateFileInfoBox = () => {
// Update File Info Box - I should really learn React one of these days.

    fileInfoBox.innerHTML = `<strong>Filename:</strong> ${crgFilename}<br>`
        +  `<strong>Game Date:</strong> ${crgData.identifier.substr(0,10)}<br>`
        + `<strong>File Loaded:</strong> ${moment().format('HH:mm:ss MMM DD, YYYY')}`

    let teamOneBox = document.getElementById('teamOneBox')
    teamOneBox.innerHTML = `<strong>Team 1:</strong> ${crgData.teams[0].name}<br>`

    let teamTwoBox = document.getElementById('teamTwoBox')
    teamTwoBox.innerHTML = `<strong>Team 2:</strong> ${crgData.teams[1].name}<br>`

    // Setup ability to swap teams 
    let teamSwapBox = document.getElementById('teamSwapBox')
    while (teamSwapBox.firstChild){
        teamSwapBox.removeChild(teamSwapBox.firstChild)
    }
    let teamSwapButton = document.createElement('button')
    teamSwapButton.setAttribute('class', 'btn btn-primary btn-sm')
    Object.assign(teamSwapButton, {
        id: 'team-swap',
        innerHTML: 'Swap Teams'
    })
    teamSwapBox.appendChild(teamSwapButton)

    teamSwapButton.onclick = () => {
        skaterManager.swapCrgTeams(crgData)
        updateFileInfoBox()
    }
}

let createSaveArea = () => {
// Create Drop Zone and Save to New Button for saving to existing StatsBooks

    rightBox.innerHTML = '<div class="col-12 text-center">Save To:&nbsp;<button id="save-blank" type="button" class="btn btn-primary btn-sm">New StatsBook</button></div>'
    rightBox.innerHTML += '<div class="col-12 text-center">or</div>'

    let sbBox = document.createElement('div')
    sbBox.className = 'col-10'
    sbBox.id = 'drag-sb-file'

    let inputArea = document.createElement('input')
    inputArea.setAttribute('type','file')
    inputArea.setAttribute('name','sbfile')
    inputArea.setAttribute('accept', '.xlsx')
    inputArea.id = 'sbfile-select'
    inputArea.className = 'inputfile'

    let sbInputLabel = document.createElement('label')
    sbInputLabel.setAttribute('for','sbfile-select')
    sbInputLabel.innerHTML = 'Choose an existing StatsBook<BR><span class="box__dragndrop">or drag one here.</span>'

    sbBox.appendChild(inputArea)
    sbBox.appendChild(sbInputLabel)
    rightBox.appendChild(sbBox)
    
    saveNewButton = document.getElementById('save-blank')
    sbHolder = document.getElementById('drag-sb-file')
    sbFileSelect = document.getElementById('sbfile-select')

    saveNewButton.onclick = () => {
        let defaultFileName = 'statsbook.xlsx'
        if (crgFilename.slice(-4)=='json'){
            defaultFileName = crgFilename.slice(0,-4) + 'xlsx'
        }

        dialog.showSaveDialog({defaultPath: defaultFileName})
            .then((result) => {
                const fileName = result.filePath
                if (fileName === undefined){
                    return
                }
                prepareForNewSb(fileName)        
            })
    }

    sbFileSelect.onclick = () => {
    // Allows the same file to be selected more than once
        sbFileSelect.value = ''
    }

    sbFileSelect.onchange = (e) => {
    // When 'Select Existing Statsbook File' is clicked

        if (e.target.value == ''){
            return false
        }

        e.preventDefault()
        e.stopPropagation

        let sbFile = e.target.files[0]

        prepareForExisting(sbFile.path)

        return false
    }

    sbHolder.ondrop = (e) => {
    // When a statsbook file is dropped into the drop zone

        sbHolder.classList.remove('box__ondragover')
        e.preventDefault()
        e.stopPropagation

        let sbFile = e.dataTransfer.files[0]

        prepareForExisting(sbFile.path)
        return false
    }

    sbHolder.ondragover = () => {
        sbHolder.classList.add('box__ondragover')
        return false
    }

    sbHolder.ondragleave = () => {
        sbHolder.classList.remove('box__ondragover')
        return false
    }

    sbHolder.ondragend = () => {
        return false
    }
}

let prepareForNewSb = (outFileName) => {
// Given an oututput file name, prepare to write the game data to a fresh statsbook file.
    if (skaterManager.tooManyCrgSkaters()){
        // With a new Statsbook, only call the edit skaters window if there are too many skaters in CRG
        editSkatersWindow()
            .then(() => saveStatsbook(true, outFileName))
    } else {
        skaterManager.setSkaters(skaterManager.crgSkaters)
        saveStatsbook(true, outFileName)
    }
}

let prepareForExisting = (outFileName) => {
// Check the state of the existing statsbook file in preparation for saving to it.
    XLP.fromFileAsync(outFileName)
        .then(
            workbook => {
                skaterManager.setIgrf(workbook)
                if (!skaterManager.compareCrgAndIgrf()){
                    editSkatersWindow()
                    .then(() => saveStatsbook(false, outFileName))
                } else {
                    skaterManager.setSkaters(skaterManager.crgSkaters)
                    saveStatsbook(false, outFileName)
                }

            }
        )

}

let editSkatersWindow = () => {
// Raise a dialog for handling discrepancies between CRG and IGRF rosters
    const modalPath = path.join('file://', __dirname, 'editskaters.html')
    const iconPath = path.join(__dirname,'../build/flamingo-white.png')

    let win = new BrowserWindow({ 
        parent: remote.getCurrentWindow(),
        modal: true,
        icon: iconPath,
        webPreferences: {
            nodeIntegration: true
        }
    })

    if (isDev){
        win.webContents.openDevTools()
    }

    win.setMenu(null)
    win.on('close', function () { 
        win = null
    })
    win.loadURL(modalPath)
    win.show()

    return new Promise((resolve, reject) => {
        win.webContents.on('did-finish-load', () => {
            win.webContents.send('send-skater-list', JSON.stringify(skaterManager.crgSkaters), JSON.stringify(skaterManager.igrfSkaters))
        })

        ipc.once('skater-window-closed', (event, skaterList) => {
            // When the Edit Skaters dialog is closed, save to the statsbook.
                if(skaterList == undefined){
                    reject()
                }
                skaterManager.setSkaters(JSON.parse(skaterList))
                resolve()
            })
    })
    

}



let saveStatsbook = (newSB, outFileName) => {
// Write the statsbook data, either to a new copy of the statsbook or to the specified file.
    let inFileName = (newSB ? statsbookFileName : outFileName )

    initializeWriter(inFileName, newSB)
        .then((writer) => {
            writer.loadGameData(crgData, skaterManager, currentVersion)
            writer.processGameData()
            return writer.writeFile(outFileName)
        }).then((filename) => {
            ipc.send('write-complete',filename)
        }).catch((e) => {
            console.log(e)
            // Throw error here if statsbook file is already open - TODO Raise message
            dialog.showMessageBox({
                type: 'error',
                buttons: ['OK'],
                title: 'CRG to Statsbook',
                message: `Unable to write to ${outFileName}, probably because it is already open. ` +
                    'Close the file in Excel and then retry.'
            })
        })
}


window.onerror = (msg, url, lineNo, columnNo) => {
// Catch unhandled errors and send them back to main.js
    ipc.send('error-thrown', msg, url, lineNo, columnNo)
    return false
}

// Cosmetic Functions for Drop Zone

holder.ondragover = () => {
    holder.classList.add('box__ondragover')
    return false
}

holder.ondragleave = () => {
    holder.classList.remove('box__ondragover')
    return false
}

holder.ondragend = () => {
    return false
}
