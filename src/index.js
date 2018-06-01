const XLP = require('xlsx-populate')
const moment = require('moment')
const {dialog} = require('electron').remote

// Page Elements
let holder = document.getElementById('drag-file')
let fileSelect = document.getElementById('file-select')
let rightBox = document.getElementById('right-box')
let bottomBox = document.getElementById('bottom-box')
let saveNewButton = {}
let sbHolder = {}
let sbFileSelect = {}

// Setup Globals
let crgFilename = '',
    crgData = {},
    statsbookFileName = 'assets/wftda-statsbook-base-us-letter.xlsx',
    sbTemplate = require('../assets/2018statsbook.json'),
    skaters = {},
    newSB = true

const teamNames = ['home','away']


fileSelect.onchange = (e) => {
    
    $('*:focus').blur()

    if (e.target.value == ''){
        return false
    }

    e.preventDefault()
    e.stopPropagation

    if (e.target.files.length > 1){
        bottomBox.innerHTML = 'Error: Multiple Files Selected.'
        return false
    } 
    
    let sbFile = e.target.files[0]

    makeReader(sbFile)
    
    return false
}

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

holder.ondrop = (e) => {
    holder.classList.remove('box__ondragover')
    e.preventDefault()
    e.stopPropagation

    if (e.dataTransfer.files.length > 1){
        bottomBox.innerHTML = 'Error: Multiple Files Selected.'
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
    // Read in the statsbook data for an event e
    crgData = JSON.parse(e.target.result)

    // Update the "File Information" box
    updateFileInfoBox()
    createSaveArea()

}

let saveToExisting = (outFileName) => {
    // Given an existing StatsBook file, populate with the CRG Data

    newSB = false
    skaters = {}

    // TODO - THROW A WARNING THAT YOU'RE DOING THIS!

    // For now, just overwrite the existing file

    let workbook = XLP.fromFileAsync(outFileName)
        .then(
            workbook => {
                workbook = updateGameData(workbook)
                workbook = updateSkaters(workbook)
                return workbook
            })
        .catch(e => {
            // This is where you break out if user doesn't want to integrate missing skaters
            //console.log(e)
            throw e
        })
        .then(
            workbook => {
                workbook = updatePenalties(workbook)
                workbook = updateScores(workbook)
                workbook.toFileAsync(outFileName)
                return workbook
            })
        .catch(e => {
            console.log(e)
        })
    return workbook
}

let writeToNewSb = (outFileName) => {
    // Given an oututput file name, write the game data to a fresh statsbook file.

    newSB = true
    skaters = {}
 
    let workbook = XLP.fromFileAsync(statsbookFileName).then(
        workbook => {
            workbook = updateGameData(workbook)
            workbook = updateSkaters(workbook)
            workbook = updatePenalties(workbook)
            workbook = updateScores(workbook)
            workbook.toFileAsync(outFileName)
            return workbook
        })
        .catch(e => {
            console.log(e)
        })
    return workbook
}

let updateFileInfoBox = () => {
    // Update File Info Box

    bottomBox.innerHTML = `<strong>Filename:</strong> ${crgFilename}<br>`
    bottomBox.innerHTML += `<strong>Game Date:</strong> ${crgData.identifier.substr(0,10)}<br>`
    bottomBox.innerHTML += `<strong>Team 1:</strong> ${crgData.teams[0].name}<br>`
    bottomBox.innerHTML += `<strong>Team 2:</strong> ${crgData.teams[1].name}<br>`
    bottomBox.innerHTML += `<strong>File Loaded:</strong> ${moment().format('HH:mm:ss MMM DD, YYYY')}`
}

let createSaveArea = () => {

    rightBox.innerHTML = '<div class="col-12 text-center"><strong>Save To:</strong>&nbsp;<button id="save-blank" type="button" class="btn btn-sm">New StatsBook</button></div>'
    rightBox.innerHTML += '<div class="col-12 text-center">or</div>'
    let sbBox = document.createElement('div')
    $(sbBox).attr({'class':'col-md-10','id':'drag-sb-file'})
    let inputArea = document.createElement('input')
    $(inputArea).attr({'type':'file','name':'sbfile', 'id': 'sbfile-select','class':'inputfile','accept':'.xlsx'})
    let sbInputLabel = document.createElement('label')
    sbInputLabel.setAttribute('for','sbfile-select')
    sbBox.appendChild(inputArea)
    sbBox.appendChild(sbInputLabel)
    rightBox.appendChild(sbBox)
    sbInputLabel.innerHTML = 'Choose an existing StatsBook<BR><span class="box__dragndrop">or drag one here.</span>'

    saveNewButton = document.getElementById('save-blank')
    sbHolder = document.getElementById('drag-sb-file')
    sbFileSelect = document.getElementById('sbfile-select')

    saveNewButton.onclick = () => {
        dialog.showSaveDialog({defaultPath: 'statsbook.xlsx'}, (fileName) => {
            if (fileName === undefined){
                return
            }
            writeToNewSb(fileName)        
            $('*:focus').blur()

        })
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

        saveToExisting(sbFile.path)

        return false
    }

    sbHolder.ondrop = (e) => {
        // When a statsbook file is dropped into the drop zone

        holder.classList.remove('box__ondragover')
        e.preventDefault()
        e.stopPropagation

        let sbFile = e.dataTransfer.files[0]

        saveToExisting(sbFile.path)
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
    // Update the skater information.
    let skatersNotOnIGRF = []

    // read the list of skaters from the crgData file and sb file if present
    for(let t in crgData.teams){
        let team = {}
        let teamSheet = sbTemplate.teams[teamNames[t]].sheetName
        let numberCell = rowcol(sbTemplate.teams[teamNames[t]].firstNumber)
        let nameCell = rowcol(sbTemplate.teams[teamNames[t]].firstName)
        let igrfSkaterList = []
        let row = 0
        let maxNum = sbTemplate.teams[teamNames[t]].maxNum

        if (crgData.teams[t].skaters.length > maxNum){
            dialog.showMessageBox({
                type: 'error',
                buttons: ['Cancel'],
                title: 'CRG to Statsbook',
                message: `There are more than ${maxNum} skaters present in the scoreboard data, the maximum allowable on the IGRF`
            })
            throw 'Too Many Skaters'
        }

        if (!newSB){
            // If we're writing to an existing statsbook, record the list of skaters present on the IGRF:
            for(let s=0; s < sbTemplate.teams[teamNames[t]].maxNum; s++){
                let number = workbook.sheet(teamSheet).row(numberCell.r + s).cell(numberCell.c).value()
                if (number != undefined){igrfSkaterList.push(number.toString())}
            }
        }

        for(let s in crgData.teams[t].skaters){
            // Read the skater information from the scoreoard file
            let number = crgData.teams[t].skaters[s].number
            let name = crgData.teams[t].skaters[s].name
            let id = crgData.teams[t].skaters[s].id

            if(!newSB){
                // If we are updating an existing statsbook,
                // Record the row number on the IGRF for each skater. (zero indexed)
                row = igrfSkaterList.indexOf(number)

                if (row == -1){
                    skatersNotOnIGRF.push({team: t, number: number, name:name, id: id})
                }

                //TODO - throw warning for skater on IGRF not in CRG?
            } else {
                // If we're making a new statsbook, just assign the row numbers in order
                // and write the skaters to the IGRF
                row = parseInt(s)
                workbook.sheet(teamSheet).row(numberCell.r + row).cell(numberCell.c).value(number)
                workbook.sheet(teamSheet).row(nameCell.r + row).cell(nameCell.c).value(name)
            }

            // Add skater information to the internal table
            team[id] = {
                name: name,
                number: number,
                row: row
            }

        }

        // Add each team to the "skaters" object
        skaters[teamNames[t]] = team
    }

    if (skatersNotOnIGRF.length > 0) {
        // Throw an error if there are skaters in the scoreboard not on the IGRF
        let errorMsg = ''        
        let emptyRosterSpots = []
        let neededRosterSpots = []
        let enoughSpots = []

        for (let s in skatersNotOnIGRF){
            // Create the error messgae listing the missing skaters
            errorMsg += `Team: ${parseInt(skatersNotOnIGRF[s].team)+1} Number: ${skatersNotOnIGRF[s].number}\n`
        }

        for (let t in teamNames){
            // Determine if there is room to add the missing skaters
            emptyRosterSpots[t] = sbTemplate.teams[teamNames[t]].maxNum - Object.keys(skaters[teamNames[t]]).length
            neededRosterSpots[t] = skatersNotOnIGRF.filter(x => x.team == t).length
            enoughSpots[t] = (emptyRosterSpots[t] >= neededRosterSpots[t] ? true : false)
        }

        if(enoughSpots.every(x => x == true)){
            // If there is enough room, ask the user if they wish to do so.
            let addSkaters = addSkatersDialog(errorMsg)
            if (addSkaters){
                // If the user choses to add the skaters, do so
                for (let t in teamNames){
                    let row = Object.keys(skaters[teamNames[t]]).length
                    let newSkaters = skatersNotOnIGRF.filter(x => x.team == t)

                    for (let s in newSkaters){
                        // Add each new skater to the internal table and assign them the next available row number
                        skaters[teamNames[t]][newSkaters[s].id] = {
                            name: newSkaters[s].name,
                            number: newSkaters[s].number,
                            row: row
                        }
                        row++
                    }

                    // Get array of skater numbers on this team
                    let allNumbers = Object.values(skaters[teamNames[t]]).map((v) => (v.number))
                    
                    // Put the list in roster order
                    allNumbers.sort()

                    // Go through list of skaters on this team.
                    for (let s in Object.keys(skaters[teamNames[t]])){
                        let id = Object.keys(skaters[teamNames[t]])[s]
                        
                        // Reassign row number to be index of skater number in sorted list
                        let row = allNumbers.indexOf(skaters[teamNames[t]][id].number)
                        skaters[teamNames[t]][id].row = row
                    }

                }
            }
        } else {
            dialog.showMessageBox({
                type: 'error',
                buttons: ['Cancel'],
                title: 'CRG to Statsbook',
                message: 'The following skaters are in the scoreboard data,' + 
                'but not present on the IGRF. There is not enough room on the IGRF to add them.',
                detail: errorMsg
            })
            throw 'Missing Skaters without room to add'
        }
    }

    if (!newSB) {
        // If this is an existing statsbook rewrite all the names and numbers
        // *even if there were no errors*.  I have no idea why this is necessary,
        // but it breaks conditional formatting if you dont' do it.
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
    }

    return workbook
}

let addSkatersDialog = (errorMsg) => {

    let addSkaters = dialog.showMessageBox({
        type: 'question',
        buttons: ['Add','Cancel'],
        title: 'CRG to Statsbook',
        message: 'The following skaters are in the scoreboard data, ' + 
        'but not present on the IGRF.  Would you like to add them to the IGRF or Cancel?',
        detail: errorMsg
    })

    return (addSkaters == 0 ? true : false)
}

let updatePenalties = (workbook) => {
    // Update the penalty data in the statsbook from the CRG data
    let sheet = sbTemplate.penalties.sheetName

    for(let t in crgData.teams){
    // For each team

        for (let p=1; p<3; p++){
        // For each period
            let firstPenaltyCell = rowcol(sbTemplate.penalties[p][teamNames[t]].firstPenalty)            
            let pFirstCol = firstPenaltyCell.c
            
            let firstJamCell = rowcol(sbTemplate.penalties[p][teamNames[t]].firstJam)
            let jFirstCol = firstJamCell.c

            for (let s in crgData.teams[t].skaters){
            // For each skater on the team

                let skaterID = crgData.teams[t].skaters[s].id
                let skaterData = skaters[teamNames[t]][skaterID]
                let penaltyRow = firstPenaltyCell.r + (skaterData.row * 2)
                let jamRow = firstJamCell.r + (skaterData.row * 2)

                if(crgData.teams[t].skaters[s].penalties.length > 0){
                    // If they have any penalties, add them

                    let plist = crgData.teams[t].skaters[s].penalties
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

                    // If they have a FO or EXP, 
                    // Add that
                }
            }
        }
    }

    return workbook
}

let updateScores = (workbook) => {
    // Process scores.
    // For the time being, that just means jammers and jam numbers.
    let scoreSheet = sbTemplate.score.sheetName
    let lineupSheet = sbTemplate.lineups.sheetName
    let jamCells = {home: {}, away: {}}
    let jammerCells = {home: {}, away: {}}
    let lineupJamCells = {home: {}, away: {}}
    let lineupJammerCells = {home: {}, away: {}}
    let lineupNoPivotCells = {home: {}, away: {}}

    for (let p in crgData.periods){
        // For each period
        let period = crgData.periods[p].period

        // Get the starting cells for jam number and jammer         
        teamNames.forEach(team => {
            jamCells[team] = rowcol(sbTemplate.score[period][team].firstJamNumber)
            lineupJamCells[team] = rowcol(sbTemplate.lineups[period][team].firstJamNumber)
            jammerCells[team] = rowcol(sbTemplate.score[period][team].firstJammerNumber)
            lineupJammerCells[team] = rowcol(sbTemplate.lineups[period][team].firstJammer)
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

                // Retrieve the jammer number and check for presence of a star pass
                let jammerList = crgData.periods[p].jams[j].teams[t].skaters.filter(
                    x => x.position == 'Jammer'
                )
                let jammerID = (jammerList.length > 0 ? jammerList[0].id : undefined)
                let jammerNumber = (jammerID ? skaters[teamNames[t]][jammerID].number : '')

                // Add the jam number and jammer number to scores and lineups
                workbook.sheet(scoreSheet).row(jamCells[team].r).cell(jamCells[team].c).value(jamNumber)
                workbook.sheet(lineupSheet).row(lineupJamCells[team].r).cell(lineupJamCells[team].c).value(jamNumber)
                workbook.sheet(scoreSheet).row(jammerCells[team].r).cell(jammerCells[team].c).value(jammerNumber)
                workbook.sheet(lineupSheet).row(lineupJammerCells[team].r).cell(lineupJammerCells[team].c).value(jammerNumber)

                // check for star pass
                starPass[t] = crgData.periods[p].jams[j].teams[t].starPass

                // If there's a star pass on THIS team, add an SP and the pivot's number to scores and lineups
                if (starPass[t]){
                    jamCells[team].r += 1
                    lineupJamCells[team].r += 1
                    jammerCells[team].r += 1
                    lineupJammerCells[team].r += 1
                    lineupNoPivotCells[team].r += 1  

                    let pivotList = crgData.periods[p].jams[j].teams[t].skaters.filter(
                        x => x.position == 'Pivot'
                    )
                    let pivotID = (pivotList.length > 0 ? pivotList[0].id : undefined)
                    let pivotNumber = (pivotID ? skaters[teamNames[t]][pivotID].number : '')

                    workbook.sheet(scoreSheet).row(jamCells[team].r).cell(jamCells[team].c).value('SP')
                    workbook.sheet(lineupSheet).row(lineupJamCells[team].r).cell(lineupJamCells[team].c).value('SP')
                    workbook.sheet(scoreSheet).row(jammerCells[team].r).cell(jammerCells[team].c).value(pivotNumber)
                    workbook.sheet(lineupSheet).row(lineupJammerCells[team].r).cell(lineupJammerCells[team].c).value(pivotNumber)
                    workbook.sheet(lineupSheet).row(lineupNoPivotCells[team].r).cell(lineupNoPivotCells[team].c).value('X')
                }
            }

            // Check for opposite team star passes
            if(starPass.includes(true)){
                for(let t in teamNames){
                    if(!starPass[t]){
                        // If one team does NOT have a star pass, but a star pass exists:
                        let team = teamNames[t]

                        jamCells[team].r += 1
                        lineupJamCells[team].r += 1
                        jammerCells[team].r += 1
                        lineupJammerCells[team].r += 1
                        lineupNoPivotCells[team].r += 1
    
                        workbook.sheet(scoreSheet).row(jamCells[team].r).cell(jamCells[team].c).value('SP*')
                        workbook.sheet(lineupSheet).row(lineupJamCells[team].r).cell(lineupJamCells[team].c).value('SP*')

                    }
                }
            }

            for (let t in teamNames){
                let team = teamNames[t]
                jamCells[team].r += 1
                lineupJamCells[team].r += 1
                jammerCells[team].r += 1
                lineupJammerCells[team].r += 1
                lineupNoPivotCells[team].r += 1        
            }

        }
    }    

    return workbook
}

let rowcol = (rcstring) => {
    // Return row and col as 1 indexed numbers
    let [, colstr, rowstr] = /([a-zA-Z]+)([\d]+)/.exec(rcstring)
    let row = parseInt(rowstr)
    let col = colstr.split('').reduce((r, a) => r * 26 + parseInt(a, 36) - 9, 0)
    let robj = {r: row, c: col}
    return robj
}

// TODO - Figure out why the second run doesn't work