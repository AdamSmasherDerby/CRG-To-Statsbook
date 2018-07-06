const XLP = require('xlsx-populate')
const moment = require('moment')
const {dialog} = require('electron').remote
const ipc = require('electron').ipcRenderer
const remote = require('electron').remote
const path = require('path')
const BrowserWindow = remote.BrowserWindow
const uuid = require('uuid/v4')
const isDev = require('electron-is-dev')

// Page Elements
let holder = document.getElementById('drag-file')
let fileSelect = document.getElementById('file-select')
let rightBox = document.getElementById('right-box')
let fileInfoBox = document.getElementById('fileInfoBox')
let saveNewButton = {}
let sbHolder = {}
let sbFileSelect = {}

// Setup Globals
let crgFilename = '',
    crgData = {},
    statsbookFileName = 'assets/wftda-statsbook-base-us-letter.xlsx',
    sbTemplate = require('../assets/2018statsbook.json'),
    skaters = {},
    newSB = true,
    skatersOnIGRF = {}
const teamNames = ['home','away']

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
    crgData = JSON.parse(e.target.result)

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
        dialog.showSaveDialog({defaultPath: 'statsbook.xlsx'}, (fileName) => {
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

        holder.classList.remove('box__ondragover')
        e.preventDefault()
        e.stopPropagation

        let sbFile = e.dataTransfer.files[0]

        prepareForExisting(sbFile.path)
        return false
    }

    sbHolder.ondragover = () => {
        holder.classList.add('box__ondragover')
        return false
    }

    sbHolder.ondragleave = () => {
        holder.classList.remove('box__ondragover')
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

    let win = new BrowserWindow({ 
        parent: remote.getCurrentWindow(),
        modal: true,
        icon: __dirname + '/build/flamingo-white.png'
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

    let workbook = XLP.fromFileAsync(inFileName)
        .then(
            workbook => {
                if (newSB){
                // Only update game data for new statsbooks.
                    workbook = updateGameData(workbook)
                }
                workbook = updateSkaters(workbook)
                return workbook
            })
        .catch(e => {
            throw e
        })
        .then(
            workbook => {
                workbook = updatePenalties(workbook)
                workbook = updateLineups(workbook)
                workbook = updateGameClock(workbook)
                workbook.toFileAsync(outFileName)
                    .then(
                        () => {
                            writeCompleteDialog(outFileName)
                            return workbook
                        })
                    .catch(e => {
                        // Throw error here if statsbook file is already open
                        console.log(e)
                    })
                return workbook
            })
        .catch(e => {
            console.log(e)
        })
    return workbook
}

let writeCompleteDialog = (outFileName) => {
// Display dialog indicating write complete
    dialog.showMessageBox({
        type: 'info',
        buttons: ['OK'],
        title: 'CRG to Statsbook',
        message: `Scoreboard data successfully written to ${outFileName}`
    })
}

let updateGameData = (workbook) => {
// Update the general game data - Time, Date, and Team Names
    let sheet = sbTemplate.mainSheet
    workbook.sheet(sheet).cell(sbTemplate.date).value(crgData.identifier.substr(0,10))
    workbook.sheet(sheet).cell(sbTemplate.time).value(crgData.identifier.slice(11,16))
    for (let t in crgData.teams){
        let name = crgData.teams[t].name
        let nameCell = sbTemplate.teams[teamNames[t]].league
        workbook.sheet(sheet).cell(nameCell).value(name)
    }
    return workbook
}

let updateSkaters = (workbook) => {
// Update the skater information on the IGRF.  Necessary even for existing statsbooks, not sure why.

    for (let t in teamNames){

        let teamSheet = sbTemplate.teams[teamNames[t]].sheetName
        let numberCell = rowcol(sbTemplate.teams[teamNames[t]].firstNumber)
        let nameCell = rowcol(sbTemplate.teams[teamNames[t]].firstName)

        // Go through list of skaters on this team.
        for (let s in Object.keys(skaters[teamNames[t]])){
            let id = Object.keys(skaters[teamNames[t]])[s]
            let name = skaters[teamNames[t]][id].name
            let number = skaters[teamNames[t]][id].number
            let row = skaters[teamNames[t]][id].row
            
            // Repopulate the IGRF
            workbook.sheet(teamSheet).row(numberCell.r + row).cell(numberCell.c).value(number)
            workbook.sheet(teamSheet).row(nameCell.r + row).cell(nameCell.c).value(name)
        }
    }

    return workbook
}

let updatePenalties = (workbook) => {
// Update the penalty data in the statsbook from the CRG data
    let sheet = sbTemplate.penalties.sheetName,
        expRe = /EXP-(\w)/

    for(let t in teamNames){
    // For each team
        let teamName = teamNames[t]
        let team = skaters[teamName]

        for (let p=1; p<3; p++){
        // For each period
            let firstPenaltyCell = rowcol(sbTemplate.penalties[p][teamName].firstPenalty)            
            let pFirstCol = firstPenaltyCell.c
            
            let firstJamCell = rowcol(sbTemplate.penalties[p][teamName].firstJam)
            let jFirstCol = firstJamCell.c

            let firstFOCell = rowcol(sbTemplate.penalties[p][teamName].firstFO)
            let firstFOJamCell = rowcol(sbTemplate.penalties[p][teamName].firstFOJam)

            for (let skaterID in team){
            // For each skater on the team

                let skater = team[skaterID]
                let skaterData = crgData.teams[t].skaters.find(x => x.id == skaterID)
                let penaltyRow = firstPenaltyCell.r + (skater.row * 2)
                let jamRow = firstJamCell.r + (skater.row * 2)
                let lastPenaltyCode = 'EXP'

                if(skaterData != undefined && skaterData.penalties.length > 0){
                    // If they have any penalties, add them

                    let plist = skaterData.penalties
                    lastPenaltyCode = plist[plist.length-1].code

                    let priorPenalties = plist.filter(x => x.period < p).length
                    let penaltyCol = pFirstCol + priorPenalties
                    let jamCol = jFirstCol + priorPenalties
                    plist = plist.filter(x => x.period == p)

                    for (let pen in plist){
                        let code = plist[pen].code
                        let jam = plist[pen].jam

                        workbook.sheet(sheet).row(penaltyRow).cell(penaltyCol).value(code)
                        workbook.sheet(sheet).row(jamRow).cell(jamCol).value(jam)

                        penaltyCol += 1
                        jamCol += 1
                    }

                }

                if(skaterData != undefined 
                    && skaterData.hasOwnProperty('fo_exp')
                    && skaterData.fo_exp.period == p
                ){
                    let code = ''
                    if (skaterData.fo_exp.code == 'FO'){
                        code = 'FO'
                    } else if (expRe.exec(skaterData.fo_exp.code) != null) {
                        code = expRe.exec(skaterData.fo_exp.code)[1]
                    } else if (skaterData.fo_exp.code == 'EXP'){
                        code = lastPenaltyCode
                    } else {
                        code = '??'
                    }
                    let jam = skaterData.fo_exp.jam
                    workbook.sheet(sheet).row(penaltyRow).cell(firstFOCell.c).value(code)
                    workbook.sheet(sheet).row(jamRow).cell(firstFOJamCell.c).value(jam)
                }
            }
        }
    }

    return workbook
}

let updateLineups = (workbook) => {
// Process lineups - add jammers to the score sheet and everyone else to the lineup tab
    let scoreSheet = sbTemplate.score.sheetName,
        lineupSheet = sbTemplate.lineups.sheetName,
        jamCells = {home: {}, away: {}},
        jammerCells = {home: {}, away: {}},
        lineupJammerCells = {home: {}, away: {}},
        lineupNoPivotCells = {home: {}, away: {}},
        lineupPivotCells = {home: {}, away: {}},
        boxCodes = sbTemplate.lineups.boxCodes,
        blockerRe = /Blocker(\d)/

    for (let p in crgData.periods){
    // For each period
        let period = crgData.periods[p].period

        // Get the starting cells for jam number and jammer         
        teamNames.forEach(team => {
            jamCells[team] = rowcol(sbTemplate.score[period][team].firstJamNumber)
            jammerCells[team] = rowcol(sbTemplate.score[period][team].firstJammerNumber)
            lineupJammerCells[team] = rowcol(sbTemplate.lineups[period][team].firstJammer)
            lineupPivotCells[team] = {r: lineupJammerCells[team].r, c: lineupJammerCells[team].c + boxCodes + 1}
            lineupNoPivotCells[team] = rowcol(sbTemplate.lineups[period][team].firstNoPivot)
        })

        for (let j in crgData.periods[p].jams){
        // For each jam

            // Retrieve the common jam number.
            let jamNumber = crgData.periods[p].jams[j].jam
            let starPass = [false, false]
            
            for (let t in teamNames){
                // For each team
                let team = teamNames[t]

                // Retrieve the jammer number.
                let jammerList = crgData.periods[p].jams[j].teams[t].skaters.filter(
                    x => x.position == 'Jammer'
                )
                // The jammer ID is undefined if no jammer was entered in this jam
                let jammerID = (jammerList.length > 0 ? jammerList[0].id : undefined)

                // Should return '' for jammer number if the jammer was not entered
                // OR if the selected jammer is not present in the skater list.
                let jammerNumber = 
                    jammerID && skaters[teamNames[t]].hasOwnProperty(jammerID) ? 
                        skaters[teamNames[t]][jammerID].number : ''
                

                // Add the jam number and jammer number to scores
                workbook.sheet(scoreSheet).row(jamCells[team].r).cell(jamCells[team].c).value(jamNumber)
                workbook.sheet(scoreSheet).row(jammerCells[team].r).cell(jammerCells[team].c).value(jammerNumber)

                // Retrieve the pivot number.
                let pivotList = crgData.periods[p].jams[j].teams[t].skaters.filter(
                    x => x.position =='Pivot'
                )

                let pivotID = (pivotList.length > 0 ? pivotList[0].id : undefined)
                let pivotNumber = pivotID && skaters[teamNames[t]].hasOwnProperty(pivotID)
                    ? skaters[teamNames[t]][pivotID].number 
                    : ''

                // Add the pivot number to lineups
                workbook.sheet(lineupSheet)
                    .row(lineupPivotCells[team].r)
                    .cell(lineupPivotCells[team].c)
                    .value(pivotNumber)

                // Retrieve the blocker numbers
                let blockerList = crgData.periods[p].jams[j].teams[t].skaters.filter(
                    x => blockerRe.test(x.position)
                )

                let firstBlockerOffset = 1
                if (blockerList.length > 3 && pivotID == undefined){
                // If there are more than three blockers and the pivot is undefined, start entering blockers in the pivot box
                    workbook.sheet(lineupSheet).row(lineupNoPivotCells[team].r).cell(lineupNoPivotCells[team].c).value('X') 
                    firstBlockerOffset = 0
                    // TODO test this branch
                }

                for (let b = 0; (b < 4 && b < blockerList.length); b++){
                // Add blockers to statsbook
                    let blockerID = blockerList[b].id
                    let blockerNumber = skaters[teamNames[t]].hasOwnProperty(blockerID) 
                        ? skaters[teamNames[t]][blockerID].number 
                        : ''
                    workbook.sheet(lineupSheet)
                        .row(lineupPivotCells[team].r)
                        .cell(lineupPivotCells[team].c + (b + firstBlockerOffset) * (boxCodes + 1))
                        .value(blockerNumber)
                }


                // check for star pass
                starPass[t] = crgData.periods[p].jams[j].teams[t].starPass

                // If there's a star pass on THIS team, add an SP and the pivot's number to scores and lineups
                if (starPass[t]){
                    jamCells[team].r += 1
                    jammerCells[team].r += 1
                    lineupPivotCells[team].r += 1
                    lineupNoPivotCells[team].r += 1  

                    workbook.sheet(scoreSheet).row(jamCells[team].r).cell(jamCells[team].c).value('SP')
                    workbook.sheet(scoreSheet).row(jammerCells[team].r).cell(jammerCells[team].c).value(pivotNumber)
                    workbook.sheet(lineupSheet).row(lineupNoPivotCells[team].r).cell(lineupNoPivotCells[team].c).value('X')
                    workbook.sheet(lineupSheet).row(lineupPivotCells[team].r).cell(lineupPivotCells[team].c).value(jammerNumber)

                    for (let b = 0; (b < 3 && b < blockerList.length); b++){
                    // Add blockers to star pass line
                        let blockerID = blockerList[b].id
                        let blockerNumber = skaters[teamNames[t]].hasOwnProperty(blockerID) 
                            ? skaters[teamNames[t]][blockerID].number 
                            : ''
                        workbook.sheet(lineupSheet)
                            .row(lineupPivotCells[team].r)
                            .cell(lineupPivotCells[team].c + (b + 1) * (boxCodes + 1))
                            .value(blockerNumber)
                    }
                }
            }

            // Check for opposite team star passes
            if(starPass.includes(true)){
                for(let t in teamNames){
                    if(!starPass[t]){
                        // If one team does NOT have a star pass, but a star pass exists:
                        let team = teamNames[t]

                        jamCells[team].r += 1
                        jammerCells[team].r += 1
                        lineupPivotCells[team].r += 1
                        lineupNoPivotCells[team].r += 1
    
                        workbook.sheet(scoreSheet).row(jamCells[team].r).cell(jamCells[team].c).value('SP*')
                    }
                }
            }

            for (let t in teamNames){
                let team = teamNames[t]
                jamCells[team].r += 1
                jammerCells[team].r += 1
                lineupPivotCells[team].r += 1
                lineupNoPivotCells[team].r += 1        
            }

        }
    }    

    return workbook
}

let updateGameClock = (workbook) => {
// Update Game Clock sheet
    let clockSheet = sbTemplate.clock.sheetName
    let timeRe = /(\d):(\d\d)(\.\d+)*/

    for (let p in crgData.periods){
    // For each period
        let period = crgData.periods[p].period
        let jamTimeCell = rowcol(sbTemplate.clock[period].firstJamTime)

        for (let j in crgData.periods[p].jams){
        // For each jam
            let rawJamTime = crgData.periods[p].jams[j].jamLength
            let jamTimeReResult = timeRe.exec(rawJamTime)
            let jamTime = `${jamTimeReResult[1]}:${jamTimeReResult[2]}`
            workbook.sheet(clockSheet).row(jamTimeCell.r).cell(jamTimeCell.c).value(jamTime)
            jamTimeCell.r += 1
        }
    }

    return workbook
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

        for(let s in crgData.teams[t].skaters){
            // Read the skater information from the scoreoard file
            let number = crgData.teams[t].skaters[s].number
            let name = crgData.teams[t].skaters[s].name
            let id = crgData.teams[t].skaters[s].id
            row = parseInt(s)            

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
