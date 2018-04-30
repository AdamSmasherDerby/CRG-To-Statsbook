//const electron = require('electron')
const XLSX = require('xlsx')
const XLP = require('xlsx-populate')

// Page Elements
let holder = document.getElementById('drag-file')
let fileSelect = document.getElementById('file-select')
let fileInfoBox = document.getElementById('file-info-box')
let outBox = document.getElementById('output-box')
let saveNewButton = {}

// Setup Globals
let crgFilename = '',
    crgData = {},
    statsbookFileName = 'assets/wftda-statsbook-base-us-letter.xlsx',
    sbTemplate = require('../assets/2018statsbook.json'),
    statsbook = {},
    skaters = {}

const teamNames = ['home','away']


fileSelect.onchange = (e) => {
    if (e.target.value == undefined){
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
    // Read in the statsbook data for an event e
    crgData = JSON.parse(e.target.result)

    // Update the "File Information" box
    updateFileInfoBox()

    // Read in a statsbook to populate
    //statsbook = XLSX.readFile(statsbookFileName)
    XLP.fromFileAsync(statsbookFileName).then(
        workbook => {
            workbook = updateGameData(workbook)
            workbook = updateSkaters(workbook)
            workbook = updatePenalties(workbook)
            workbook = updateScores(workbook)
            return workbook.toFileAsync('./test.xlsx')
        }
    )

    //createSaveNewButton()
    

    // Display Output
    if(outBox.lastElementChild){
        outBox.removeChild(outBox.lastElementChild)
    }
    //outBox.innerHTML = XLSX.utils.sheet_to_html(statsbook.Sheets['Penalties'])
    outBox.innerHTML = 'Statsbook File Loaded'
}



let updateFileInfoBox = () => {
    // Update File Info Box
    fileInfoBox.innerHTML = `<strong>Filename:</strong> ${crgFilename}<br>`
    fileInfoBox.innerHTML += `<strong>Game Date:</strong> ${crgData.identifier.substr(0,10)}<br>`
    fileInfoBox.innerHTML += `<strong>Team 1:</strong> ${crgData.teams[0].name}<br>`
    fileInfoBox.innerHTML += `<strong>Team 2:</strong> ${crgData.teams[1].name}<br>`
}

let createSaveNewButton = () => {

    fileInfoBox.innerHTML += '<strong>Save To:</strong> <button id="refresh" type="button" class="btn btn-sm">Blank SB</button>'
    saveNewButton = document.getElementById('refresh')

    saveNewButton.onclick = () => {
        XLSX.writeFile(statsbook, 'test.xlsx')
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
    // read the list of skaters the crgData
    for(let t in crgData.teams){
        let team = {}
        let teamSheet = sbTemplate.teams[teamNames[t]].sheetName
        let numberCell = rowcol(sbTemplate.teams[teamNames[t]].firstNumber)
        let nameCell = rowcol(sbTemplate.teams[teamNames[t]].firstName)

        for(let s in crgData.teams[t].skaters){
            // For each skater get information
            let number = crgData.teams[t].skaters[s].number
            let name = crgData.teams[t].skaters[s].name

            // Add that information to the internal table
            team[crgData.teams[t].skaters[s].id] = {
                name: name,
                number: number
            }

            // Add it to the IGRF
            workbook.sheet(teamSheet).row(numberCell.r).cell(numberCell.c).value(number)
            workbook.sheet(teamSheet).row(nameCell.r).cell(nameCell.c).value(name)
            numberCell.r += 1
            nameCell.r += 1
        }
        skaters[teamNames[t]] = team
    }

    return workbook
}

let updatePenalties = (workbook) => {
    // Update the penalty data in the statsbook from the CRG data
    let sheet = sbTemplate.penalties.sheetName

    for(let t in crgData.teams){
    // For each team

        for (let p=1; p<3; p++){
        // For each period
            let penaltyCell = rowcol(sbTemplate.penalties[p][teamNames[t]].firstPenalty)            
            let pFirstCol = penaltyCell.c
            
            let jamCell = rowcol(sbTemplate.penalties[p][teamNames[t]].firstJam)
            let jFirstCol = jamCell.c

            for (let s in crgData.teams[t].skaters){
            // For each skater on the team

                if(crgData.teams[t].skaters[s].penalties.length > 0){
                    // If they have any penalties, add them

                    let plist = crgData.teams[t].skaters[s].penalties
                    plist = plist.filter(x => x.period == p)

                    for (let pen in plist){
                        let code = plist[pen].code
                        let jam = plist[pen].jam

                        workbook.sheet(sheet).row(penaltyCell.r).cell(penaltyCell.c).value(code)
                        workbook.sheet(sheet).row(jamCell.r).cell(jamCell.c).value(jam)

                        penaltyCell.c += 1
                        jamCell.c += 1
                    }

                    // If they have a FO or EXP, 
                    // Add that
                }

                penaltyCell.c = pFirstCol
                penaltyCell.r += 2
                jamCell.c = jFirstCol
                jamCell.r += 2
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

    for (let p in crgData.periods){
        // For each period
        period = crgData.periods[p].period

        // Get the starting cells for jam number and jammer         
        teamNames.forEach(team => {
            jamCells[team] = rowcol(sbTemplate.score[period][team].firstJamNumber)
            lineupJamCells[team] = rowcol(sbTemplate.lineups[period][team].firstJamNumber)
            jammerCells[team] = rowcol(sbTemplate.score[period][team].firstJammerNumber)
            lineupJammerCells[team] = rowcol(sbTemplate.lineups[period][team].firstJammer)
        })

        for (let j in crgData.periods[p].jams){
            // For each jam

            // Retrieve the common jam number.
            let jamNumber = crgData.periods[p].jams[j].jam
            let starPass = [false, false]
            
            for (let t in teamNames){
                // For each team
                let team = teamNames[t]

                // TODO - don't barf if jammer wasn't entered
                // Retrieve the jammer number and check for presence of a star pass
                let jammerID = crgData.periods[p].jams[j].teams[t].skaters.filter(
                    x => x.position == 'Jammer'
                )[0].id
                let jammerNumber = skaters[teamNames[t]][jammerID].number

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

                    // TODO - account for missing pivot number.
                    let pivotID = crgData.periods[p].jams[j].teams[t].skaters.filter(
                        x => x.position == 'Pivot'
                    )[0].id
                    let pivotNumber = skaters[teamNames[t]][pivotID].number    

                    workbook.sheet(scoreSheet).row(jamCells[team].r).cell(jamCells[team].c).value('SP')
                    workbook.sheet(lineupSheet).row(lineupJamCells[team].r).cell(lineupJamCells[team].c).value('SP')
                    workbook.sheet(scoreSheet).row(jammerCells[team].r).cell(jammerCells[team].c).value(pivotNumber)
                    workbook.sheet(lineupSheet).row(lineupJammerCells[team].r).cell(lineupJammerCells[team].c).value(pivotNumber)
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
            }

        }
    }    

    return workbook
}

let rowcol = (rcstring) => {
    // Return row and col as 1 indexed numbers
    let [_, colstr, rowstr] = /([a-zA-Z]+)([\d]+)/.exec(rcstring)
    let row = parseInt(rowstr)
    let col = colstr.split('').reduce((r, a) => r * 26 + parseInt(a, 36) - 9, 0)
    let robj = {r: row, c: col}
    return robj
}