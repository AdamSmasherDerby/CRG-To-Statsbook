const XLP = require('xlsx-populate')
const moment = require('moment')
const {dialog} = require('electron').remote
const ipc = require('electron').ipcRenderer
const remote = require('electron').remote
const path = require('path')
const BrowserWindow = remote.BrowserWindow
const uuid = require('uuid/v4')
const isDev = require('electron-is-dev')
const formatcrgdata = require('./formatcrgdata.js')

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
                workbook = updateLineupsAndScore(workbook)
                workbook = updateGameClock(workbook)
                workbook = updateColophon(workbook)
                workbook.toFileAsync(outFileName)
                    .then(
                        () => {
                            writeCompleteDialog(outFileName)
                            return workbook
                        })
                    .catch(() => {
                        // Throw error here if statsbook file is already open - TODO Raise message
                        dialog.showMessageBox({
                            type: 'error',
                            buttons: ['OK'],
                            title: 'CRG to Statsbook',
                            message: `Unable to write to ${outFileName}, probably because it is already open. ` +
                                'Close the file in Excel and then retry.'
                        })

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
        let maxNum = sbTemplate.teams[teamNames[t]].maxNum
        let numSkaters = Object.keys(skaters[teamNames[t]]).length
        /*let skaterNumbers = Object.values(skaters[teamNames[t]]).map((v) => v.number)
        let sortedSkaterNumbers = skaterNumbers.slice().sort()
        let indices = sortedSkaterNumbers.map((v) => skaterNumbers.indexOf(v)) */

        // Go through list of skaters on this team.
        for (let s = 0; s < numSkaters; s++){
            let id = Object.keys(skaters[teamNames[t]])[s]
            let name = skaters[teamNames[t]][id].name
            let number = skaters[teamNames[t]][id].number
            let row = skaters[teamNames[t]][id].row
            
            // Repopulate the IGRF
            workbook.sheet(teamSheet).row(numberCell.r + row).cell(numberCell.c).value(number)
            workbook.sheet(teamSheet).row(nameCell.r + row).cell(nameCell.c).value(name)
        }

        for (let s = numSkaters; s < maxNum; s++){
            let row = numberCell.r
            workbook.sheet(teamSheet).row(row + s).cell(numberCell.c).value('')
            workbook.sheet(teamSheet).row(row + s).cell(nameCell.c).value('')
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

let updateLineupsAndScore = (workbook) => {
// Process lineups - add jammers to the score sheet and everyone else to the lineup tab
    let scoreSheet = sbTemplate.score.sheetName,
        lineupSheet = sbTemplate.lineups.sheetName,
        jamCells = {home: {}, away: {}},
        jammerCells = {home: {}, away: {}},
        lineupJammerCells = {home: {}, away: {}},
        lineupNoPivotCells = {home: {}, away: {}},
        lineupPivotCells = {home: {}, away: {}},
        firstTripCells = {home: {}, away: {}},
        firstLostCells = {home: {}, away: {}},
        firstLeadCells = {home: {}, away: {}},
        firstCallCells = {home: {}, away: {}},
        firstInjCells = {home: {}, away: {}},
        firstNpCells = {home: {}, away: {}}, 
        boxCodes = sbTemplate.lineups.boxCodes,
        blockerRe = /Blocker(\d)/,
        starPassTrip = 1,
        overtime = false

    for (let p in crgData.periods){
    // For each period
        let period = crgData.periods[p].period

        // Get the starting cells         
        teamNames.forEach(team => {
            jamCells[team] = rowcol(sbTemplate.score[period][team].firstJamNumber)
            jammerCells[team] = rowcol(sbTemplate.score[period][team].firstJammerNumber)
            lineupJammerCells[team] = rowcol(sbTemplate.lineups[period][team].firstJammer)
            lineupPivotCells[team] = {r: lineupJammerCells[team].r, c: lineupJammerCells[team].c + boxCodes + 1}
            lineupNoPivotCells[team] = rowcol(sbTemplate.lineups[period][team].firstNoPivot)
            firstTripCells[team] = rowcol(sbTemplate.score[period][team].firstTrip)
            firstLostCells[team] = rowcol(sbTemplate.score[period][team].firstLost)
            firstLeadCells[team] = rowcol(sbTemplate.score[period][team].firstLead)
            firstCallCells[team] = rowcol(sbTemplate.score[period][team].firstCall)
            firstInjCells[team] = rowcol(sbTemplate.score[period][team].firstInj)
            firstNpCells[team] = rowcol(sbTemplate.score[period][team].firstNp)
        })

        for (let j in crgData.periods[p].jams){
        // For each jam

            // Retrieve the common jam number.
            let jamNumber = crgData.periods[p].jams[j].jam
            let starPass = [false, false]
            
            for (let t in teamNames){
                // For each team
                let team = teamNames[t]
                let jamTeamData = crgData.periods[p].jams[j].teams[t]

                // Retrieve the jammer number.
                let jammerList = jamTeamData.skaters.filter(
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

                // Add version 4.0 data to the score sheet, if present
                if (jamTeamData.hasOwnProperty('tripScores')){

                    if (jamTeamData.tripScores[0][0] > 0 || (jamTeamData.tripScores[0].length == 0 && jamTeamData.tripScores[1][0] > 0)){
                        overtime = true
                    } else {
                        overtime = false
                    }

                    // Checkboxes for all cases
                    workbook.sheet(scoreSheet).row(firstLostCells[team].r).cell(firstLostCells[team].c).value(jamTeamData.lost ? 'X' : '')
                    workbook.sheet(scoreSheet).row(firstLeadCells[team].r).cell(firstLeadCells[team].c).value(jamTeamData.lead ? 'X' : '')
                    workbook.sheet(scoreSheet).row(firstCallCells[team].r).cell(firstCallCells[team].c).value(jamTeamData.call ? 'X' : '')

                    // Scoring Trip Data for all cases
                    for(let t = 1; t < jamTeamData.tripScores[0].length; t++){
                        // Add trip scores to sheet for initial jammer
                        workbook.sheet(scoreSheet).row(firstTripCells[team].r).cell(firstTripCells[team].c + t - 1).value(jamTeamData.tripScores[0][t])
                    }

                    if (!jamTeamData.starPass){
                    // If there is no star pass, add remaining data to current line

                        workbook.sheet(scoreSheet).row(firstInjCells[team].r).cell(firstInjCells[team].c).value(jamTeamData.injury ? 'X' : '')
                        workbook.sheet(scoreSheet).row(firstNpCells[team].r).cell(firstNpCells[team].c).value(jamTeamData.noInitial ? 'X' : '')
                    
                        if (overtime) {
                        // Handle overtime for the no star pass case (overwriting first jam with X + X)
                            let tripTwoScore = (jamTeamData.tripScores[0][1] ? ` + ${jamTeamData.tripScores[0][1]}` : '')
                            workbook.sheet(scoreSheet).row(firstTripCells[team].r).cell(firstTripCells[team].c).value(`${jamTeamData.tripScores[0][0]}${tripTwoScore}`)
                        }

                    } else {
                    // Handle star pass cases

                        starPassTrip = jamTeamData.tripScores[0].length + 1

                        if (!overtime) {
                            // Add second jammer scores for most cases
                            for (let t = starPassTrip; t < jamTeamData.tripScores[1].length; t++) {
                                workbook.sheet(scoreSheet).row(firstTripCells[team].r + 1).cell(firstTripCells[team].c + t - 1).value(jamTeamData.tripScores[1][t])
                            }
                        } else {
                            // Overtime with a star pass. (Yeesh)
                            // Put in data for scorimg trips 2 - end
                            for (let t = 0; t < jamTeamData.tripScores[1].length; t++){
                                workbook.sheet(scoreSheet).row(firstTripCells[team].r + 1).cell(firstTripCells[team].c + t + starPassTrip - 1).value(jamTeamData.tripScores[1][t + 1])
                            } 

                            if (starPassTrip == 1 && jamTeamData.tripScores[1].length > 1){
                            // If the star pass happened on the FIRST scoring trip, AND there was more than
                            // one scoring trip, overwrite the first column
                                workbook.sheet(scoreSheet).row(firstTripCells[team].r + 1).cell(firstTripCells[team].c).value(
                                    `${jamTeamData.tripScores[1][0]} + ${jamTeamData.tripScores[1][1]}`
                                )
                            }
                        }

                        // Sort checkboxes on score sheet
                        if(jamTeamData.noInitial) {
                            workbook.sheet(scoreSheet).row(firstNpCells[team].r).cell(firstNpCells[team].c).value('X')
                            workbook.sheet(scoreSheet).row(firstNpCells[team].r + 1).cell(firstNpCells[team].c).value('X')
                        } else if (starPassTrip == 1){
                            workbook.sheet(scoreSheet).row(firstNpCells[team].r).cell(firstNpCells[team].c).value('X')
                        }
                        workbook.sheet(scoreSheet).row(firstInjCells[team].r + 1).cell(firstInjCells[team].c).value(jamTeamData.inj ? 'X' : '')

                    }

                }

                // Retrieve the pivot number.
                let pivotList = jamTeamData.skaters.filter(
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
                let blockerList = jamTeamData.skaters.filter(
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

                rewriteLineupRow(team)

                // check for star pass
                starPass[t] = jamTeamData.starPass

                // If there's a star pass on THIS team, add an SP and the pivot's number to scores and lineups
                if (starPass[t]){
                    jamCells[team].r += 1
                    jammerCells[team].r += 1
                    lineupPivotCells[team].r += 1
                    lineupNoPivotCells[team].r += 1
                    firstTripCells[team].r += 1
                    firstLeadCells[team].r += 1
                    firstLostCells[team].r += 1
                    firstCallCells[team].r += 1
                    firstInjCells[team].r += 1
                    firstNpCells[team].r += 1

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

                    rewriteLineupRow(team)
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
                        firstTripCells[team].r += 1
                        firstLeadCells[team].r += 1
                        firstLostCells[team].r += 1
                        firstCallCells[team].r += 1
                        firstInjCells[team].r += 1
                        firstNpCells[team].r += 1

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
                firstTripCells[team].r += 1
                firstLeadCells[team].r += 1
                firstLostCells[team].r += 1
                firstCallCells[team].r += 1
                firstInjCells[team].r += 1
                firstNpCells[team].r += 1       
            }

        }
    }    

    return workbook

    function rewriteLineupRow  (team) {
        for (let b = 0; b < 4; b++) {
            // Rewrite the line whether or not values were entered.
            // This is to account for an Excel bug that breaks conditional formatting.
            let blockerNumber = workbook.sheet(lineupSheet)
                .row(lineupPivotCells[team].r)
                .cell(lineupPivotCells[team].c + b * (boxCodes + 1))
                .value()
            blockerNumber = (blockerNumber == undefined ? '' : blockerNumber.toString())
            workbook.sheet(lineupSheet)
                .row(lineupPivotCells[team].r)
                .cell(lineupPivotCells[team].c + b * (boxCodes +1))
                .value(blockerNumber)
        }
    }

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

let updateColophon = (workbook) => {
// Update colophon page with version data
    let colophonSheet = sbTemplate.colophon.sheetName
    let versionCell = sbTemplate.colophon.versionCell
    let versionText = `Statsbook generated by CRG to Statsbook Tool version ${currentVersion}`
    workbook.sheet(colophonSheet).cell(versionCell).value(versionText)
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
