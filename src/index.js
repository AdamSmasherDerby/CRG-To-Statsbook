//const electron = require('electron')
const XLSX = require('xlsx')

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
    statsbook = XLSX.readFile(statsbookFileName)

    updateGameData()
    updateSkaters()
    updatePenalties()
    createSaveNewButton()

    // Display Output
    if(outBox.lastElementChild){
        outBox.removeChild(outBox.lastElementChild)
    }
    outBox.innerHTML = XLSX.utils.sheet_to_html(statsbook.Sheets['Penalties'])
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

let updateGameData = () => {
    // Update the general game data - Time, Date, and Team Names
    let sheet = sbTemplate.mainSheet
    statsbook = insert(statsbook, sheet, sbTemplate.date, crgData.identifier.substr(0,10), 'd')
    statsbook = insert(statsbook, sheet, sbTemplate.time, crgData.identifier.slice(12,16), 's')
    for(let t in crgData.teams){
        let name = crgData.teams[t].name
        let nameCell = sbTemplate.teams[teamNames[t]].league
        statsbook = insert(statsbook, sheet, nameCell, name, 's')
    }

}

let updateSkaters = () => {
    // read the list of skaters the crgData
    for(let t in crgData.teams){
        let team = {}
        let teamSheet = sbTemplate.teams[teamNames[t]].sheetName
        let numberCell = XLSX.utils.decode_cell(sbTemplate.teams[teamNames[t]].firstNumber)
        let nameCell = XLSX.utils.decode_cell(sbTemplate.teams[teamNames[t]].firstName)

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
            let numCellString = [XLSX.utils.encode_cell(numberCell)]
            let nameCellString = [XLSX.utils.encode_cell(nameCell)]
            statsbook = insert(statsbook,teamSheet,numCellString,number,'s')
            statsbook = insert(statsbook,teamSheet,nameCellString,name,'s')
            numberCell.r += 1
            nameCell.r += 1
        }
        skaters[teamNames[t]] = team
    }
}

let updatePenalties = () => {
    // Update the penalty data in the statsbook from the CRG data
    let sheet = sbTemplate.penalties.sheetName

    for(let t in crgData.teams){
    // For each team

        for (let p=1; p<3; p++){
        // For each period            
            let penaltyCell = XLSX.utils.decode_cell(
                sbTemplate.penalties[p][teamNames[t]].firstPenalty
            )
            let pFirstCol = penaltyCell.c
            
            let jamCell = XLSX.utils.decode_cell(
                sbTemplate.penalties[p][teamNames[t]].firstJam
            )
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

                        let penCellString = XLSX.utils.encode_cell(penaltyCell)
                        let jamCellString = XLSX.utils.encode_cell(jamCell)
                        statsbook = insert(statsbook,sheet,penCellString,code,'s')
                        statsbook = insert(statsbook,sheet,jamCellString,jam,'n')

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
}

let insert = (book, sheet, cell, data, type) => {
    // Given a workbook, a sheet name, a cell in 'A4' form and data, 
    // insert the data at the given location.
    if (!book.Sheets[sheet][cell]){
        book.Sheets[sheet][cell] = {}
    }
    book.Sheets[sheet][cell].v = data
    book.Sheets[sheet][cell].t = type
    return book
}