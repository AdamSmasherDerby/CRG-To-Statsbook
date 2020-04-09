const XLP = require('xlsx-populate')
const moment = require('moment')
const {dialog} = require('electron').remote
const ipc = require('electron').ipcRenderer
const remote = require('electron').remote
const path = require('path')
const BrowserWindow = remote.BrowserWindow
const uuid = require('uuid/v4')
const isDev = require('electron-is-dev')
const formatcrgdata = require('./formatcrgdata')
const initializeWriter = require('./writers/xlsxWriter')

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
    statsbookFileName = 'assets/wftda-statsbook-full-us-letter.xlsx',
    sbTemplate = require('../assets/2018statsbook.json'),
    skaters = {},
    newSB = true,
    skatersOnIGRF = {},
    currentVersion = ''
const teamNames = ['home','away']

ipc.on('do-version-check', (event, version) => {
    let tagURL = 'https://api.github.com/repos/AdamSmasherDerby/CRG-To-Statsbook/tags'
    $.getJSON(tagURL, {_: new Date().getTime()})
        .done(function (json) {
            let latestVersion = json[0].name
            currentVersion = 'v' + version
            if (latestVersion != currentVersion) {
                newVersionWarningBox.innerHTML = `New version available: ${latestVersion} (Current Version: ${currentVersion})</BR>` +
                    '<A HREF="https://github.com/AdamSmasherDerby/CRG-To-Statsbook/releases/" target="_system">Download Here</a>'
            }
        })
        .fail(function () {console.log('Update check not performed: no connection')})
})

ipc.on('set-paper-size', (event, size) => {
    switch (size) {
    case 'letter':
        statsbookFileName = 'assets/wftda-statsbook-full-us-letter.xlsx'
        break
    case 'A4':
        statsbookFileName = 'assets/wftda-statsbook-full-A4.xlsx'
        break
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
    
    $('*:focus').blur()

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
        [crgData.teams[0], crgData.teams[1]] = [crgData.teams[1], crgData.teams[0]]
        for (let p in crgData.periods){
            for (let j in crgData.periods[p].jams){
                [crgData.periods[p].jams[j].teams[0], crgData.periods[p].jams[j].teams[1]] =
                    [crgData.periods[p].jams[j].teams[1], crgData.periods[p].jams[j].teams[0]]
            }
        }
        updateFileInfoBox()
    }
}

let createSaveArea = () => {
// Create Drop Zone and Save to New Button for saving to existing StatsBooks

    rightBox.innerHTML = '<div class="col-12 text-center">Save To:&nbsp;<button id="save-blank" type="button" class="btn btn-primary btn-sm">New StatsBook</button></div>'
    rightBox.innerHTML += '<div class="col-12 text-center">or</div>'

    let sbBox = document.createElement('div')
    $(sbBox).attr({'class':'col-md-10','id':'drag-sb-file'})
    let inputArea = document.createElement('input')
    $(inputArea).attr({'type':'file','name':'sbfile', 'id': 'sbfile-select','class':'inputfile','accept':'.xlsx'})
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

        dialog.showSaveDialog({defaultPath: defaultFileName}, (fileName) => {
            if (fileName === undefined){
                return
            }
            prepareForNewSb(fileName)        
            $('*:focus').blur()

        })
    }

    sbFileSelect.onclick = () => {
    // Allows the same file to be selected more than once
        sbFileSelect.value = ''
    }

    sbFileSelect.onchange = (e) => {
    // When 'Select Existing Statsbook File' is clicked

        $('*:focus').blur()

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
    newSB = true
    
    if (tooManyCRGSkaters()){
        // With a new Statsbook, only call the edit skaters window if there are too many skaters in CRG
        editSkatersWindow(crgData, {}, outFileName)
    } else {
        skaters = getCRGSkaters()
        saveStatsbook(outFileName)
    }
}

let prepareForExisting = (outFileName) => {
// Check the state of the existing statsbook file in preparation for saving to it.

    newSB = false
    XLP.fromFileAsync(outFileName)
        .then(
            workbook => {
                skatersOnIGRF = getIGRFSkaters(workbook)

                // Test for identical skater number lists between the IGRF and CRG
                let CRGIGRFMatch = true
                for (let t in teamNames){
                    let CRGSkaterNumberString = Object.values(crgData.teams[t].skaters.map((v) => v.number)).sort().join(',')
                    let IGRFSkaterNumberString = Object.values(skatersOnIGRF[teamNames[t]]).map((v) => v.number).sort().join(',')
                    if (CRGSkaterNumberString != IGRFSkaterNumberString) {CRGIGRFMatch = false}
                }
                if (!CRGIGRFMatch || tooManyCRGSkaters()){
                    editSkatersWindow(crgData, skatersOnIGRF, outFileName)
                } else {
                    skaters = skatersOnIGRF
                    saveStatsbook(outFileName)
                }

            }
        )

}

let editSkatersWindow = (crgData, skatersOnIGRF, outFileName) => {
// Raise a dialog for handling discrepancies between CRG and IGRF rosters
    const modalPath = path.join('file://', __dirname, 'editskaters.html')
    const iconPath = path.join(__dirname,'../build/flamingo-white.png')

    let win = new BrowserWindow({ 
        parent: remote.getCurrentWindow(),
        modal: true,
        icon: iconPath
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

    win.webContents.on('did-finish-load', () => {
        win.webContents.send('send-skater-list', JSON.stringify(crgData), JSON.stringify(skatersOnIGRF), outFileName)
    })

}

ipc.on('skater-window-closed', (event, outFileName, skaterList) => {
// When the Edit Skaters dialog is closed, save to the statsbook.
    if(skaterList == undefined){return}
    skaters = JSON.parse(skaterList)
    saveStatsbook(outFileName)
})

let saveStatsbook = (outFileName) => {
// Write the statsbook data, either to a new copy of the statsbook or to the specified file.
    let inFileName = (newSB ? statsbookFileName : outFileName )

    initializeWriter(inFileName, newSB)
        .then((writer) => {
            writer.processGameData(crgData, skaters, currentVersion)
            return writer.writeFile(outFileName)
        }).then((filename) => {
                writeCompleteDialog(filename)
                
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

let writeCompleteDialog = (outFileName) => {
// Display dialog indicating write complete
    ipc.send('write-complete',outFileName)

    /*dialog.showMessageBox({
        type: 'info',
        buttons: ['OK'],
        title: 'CRG to Statsbook',
        message: `Scoreboard data successfully written to ${outFileName}`
    })*/
}

// Helper functions

let getIGRFSkaters = (workbook) => {
// Given a workbook, get the list of skaters on the IGRF

    for(let t in teamNames) {
        skatersOnIGRF[teamNames[t]] = {}
        let teamName = teamNames[t]
        let teamSheet = sbTemplate.teams[teamName].sheetName
        let numberCell = rowcol(sbTemplate.teams[teamNames[t]].firstNumber)
        let nameCell = rowcol(sbTemplate.teams[teamNames[t]].firstName)
        for(let s=0; s < sbTemplate.teams[teamNames[t]].maxNum; s++){
            let number = workbook.sheet(teamSheet).row(numberCell.r + s).cell(numberCell.c).value()
            let name = workbook.sheet(teamSheet).row(nameCell.r + s).cell(nameCell.c).value()
            name = (name == undefined ? '' : name)
            let scoreboardMatch = crgData.teams[t].skaters.find(x => x.number == number)
            let id = scoreboardMatch != undefined ? scoreboardMatch.id : uuid()
            if (number != undefined){
                skatersOnIGRF[teamNames[t]][id]={
                    number: number.toString(),
                    name: name,
                    row: s,
                    id: id
                }
            }
        }
    }

    return(skatersOnIGRF)

}

let getCRGSkaters = () => {
// Assuming a global crgData object, retrieve skaters from it
    let crgSkaters = {}

    // read the list of skaters from the crgData file and sb file if present
    for(let t in crgData.teams){
        let team = {}
        let row = 0
        let skaterNumbers = Object.values(crgData.teams[t].skaters).map((v)=> v.number)
        let sortedSkaterNumbers = skaterNumbers.slice().sort()
        let rows = skaterNumbers.map((v) => sortedSkaterNumbers.indexOf(v))

        for(let s in crgData.teams[t].skaters){
            // Read the skater information from the scoreoard file
            let number = crgData.teams[t].skaters[s].number
            let name = crgData.teams[t].skaters[s].name
            let id = crgData.teams[t].skaters[s].id
            row = parseInt(rows[s])            

            // Add skater information to the team
            team[id] = {
                name: name,
                number: number,
                row: row
            }

        }

        // Add each team to the "crgSkaters" object
        crgSkaters[teamNames[t]] = team
    }

    return crgSkaters

}

let tooManyCRGSkaters = () => {
// Return true if there are more skaters in CRG on either team than the limit

    let crgSkaters = getCRGSkaters(),
        tooManySkaters = false

    for (let t in teamNames){
    // Determine if there are too many skaters in CRG for the size of the IGRF
        let maxNum = sbTemplate.teams[teamNames[t]].maxNum
        if (Object.values(crgSkaters[teamNames[t]]).length > maxNum){
            tooManySkaters = true
        }
    }
    return tooManySkaters
}

let rowcol = (rcstring) => {
// Return row and col as 1 indexed numbers
    let [, colstr, rowstr] = /([a-zA-Z]+)([\d]+)/.exec(rcstring)
    let row = parseInt(rowstr)
    let col = colstr.split('').reduce((r, a) => r * 26 + parseInt(a, 36) - 9, 0)
    let robj = {r: row, c: col}
    return robj
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
