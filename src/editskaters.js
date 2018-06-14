const electron = require('electron')
const remote = electron.remote
const ipc = require('electron').ipcRenderer
const uuid = require('uuid/v4')

const cancelBtn = document.getElementById('cancelBtn')
const confirmBtn = document.getElementById('confirmBtn')
const skaterTableDiv = document.getElementById('skaterTableDiv')
const errorMessage = document.getElementById('error-message')

const teamNames = ['home','away']
const maxNum = 20 // Make this dynamic at some point
let crgData = {},
    skatersOnIGRF = {}

let outFileName = ''

let makeSkaterTable = (crgData, skatersOnIGRF) => {
    // Create Table
    let table = document.createElement('table')
    table.setAttribute('class','table')

    for (let t in crgData.teams){
        // For each team

        // Get the list of all numbers in both locations.
        let CRGSkaterNumbers = Object.values(crgData.teams[t].skaters.map((v) => v.number))
        let IGRFSkaterNumbers = Object.values(skatersOnIGRF[teamNames[t]].map((v) => v.number))
        let concatNumbers = CRGSkaterNumbers.concat(IGRFSkaterNumbers)
        let numberSet = new Set(concatNumbers)
        let allNumbers = [...numberSet]
        allNumbers.sort()

        // Create Header
        let tableHeader = document.createElement('tr')

        let tableHeaderCell = document.createElement('th')
        tableHeaderCell.appendChild(document.createTextNode(crgData.teams[t].name))
        tableHeaderCell.setAttribute('colspan',2)
        tableHeader.appendChild(tableHeaderCell)

        tableHeaderCell = document.createElement('th')
        tableHeaderCell.appendChild(document.createTextNode('CRG'))
        tableHeader.appendChild(tableHeaderCell)

        tableHeaderCell = document.createElement('th')
        tableHeaderCell.appendChild(document.createTextNode('IGRF'))
        tableHeader.appendChild(tableHeaderCell)

        tableHeaderCell = document.createElement('th')
        tableHeaderCell.appendChild(document.createTextNode('Keep'))
        tableHeader.appendChild(tableHeaderCell)

        tableHeader.setAttribute('class','thead-dark') 
        table.appendChild(tableHeader)

        for (let n in allNumbers){
        // Go through the list of skater numbers
            let inIGRF = false,
                inCRG = false,
                name = '',
                skater = {},
                number = allNumbers[n]

            if(IGRFSkaterNumbers.includes(number)){
            // If the skater is on the IGRF, use the name from there
                skater = skatersOnIGRF[teamNames[t]].find(x => x.number == number)
                name = skater.name
                inIGRF = true
            }
            if(CRGSkaterNumbers.includes(number)){
                inCRG = true
                skater = crgData.teams[t].skaters.find(x => x.number == number)
                if(!inIGRF){
                // If the skater is NOT on the IGRF, use the name from the scorebord
                    name = skater.name
                }
            }

            let tableRow = document.createElement('tr')

            let tableCell = document.createElement('td')
            tableCell.appendChild(document.createTextNode(number))
            tableRow.appendChild(tableCell)

            tableCell = document.createElement('td')
            tableCell.appendChild(document.createTextNode(name))
            tableRow.appendChild(tableCell)

            tableCell = document.createElement('td')
            let check = document.createElement('i')
            check.setAttribute('class','fa fa-check')
            if(inCRG){
                tableCell.appendChild(check)
            }
            tableRow.appendChild(tableCell)

            tableCell = document.createElement('td')
            check = document.createElement('i')
            check.setAttribute('class','fa fa-check')
            if(inIGRF){
                tableCell.appendChild(check)
            }
            tableRow.appendChild(tableCell)

            tableCell = document.createElement('td')
            let checkDiv = document.createElement('div')
            checkDiv.setAttribute('class','form-check')
            let checkBox = document.createElement('input')
            Object.assign(checkBox, {
                type: 'checkBox',
                name: `checklist${t}`,
                value: number
            })
            checkBox.setAttribute('class','form-check-input')
            checkBox.addEventListener('click', () => {countChecks()})
            if(inIGRF){checkBox.setAttribute('checked','true')}
            checkDiv.appendChild(checkBox)
            tableCell.appendChild(checkDiv)
            tableRow.appendChild(tableCell)
            
            table.appendChild(tableRow)
        }
    }
    return table
}

let countChecks = () => {
// Count the number of checked boxes, and do something if there's more than maxNum on a team.
    let tooMany = false
    let errorText = ''

    for (let t in teamNames){
        let checklist = `checklist${t}`
        let nChecks = Array.from(document.getElementsByName(checklist)).filter((v) => v.checked == true).length
        if (nChecks > maxNum){
            errorText += `Too many skaters checked on ${crgData.teams[t].name}. `
            tooMany = true
        }
    }
    if (tooMany){
        confirmBtn.disabled = true
    } else {
        confirmBtn.disabled = false
    }
    errorMessage.innerHTML = (errorText != '' ? 'Warning: ' + errorText : '')
}

cancelBtn.addEventListener('click', () => {
    let window = remote.getCurrentWindow()
    ipc.send('skater-window-closed', outFileName, undefined)
    window.close()
})

confirmBtn.addEventListener('click', () => {
    let window = remote.getCurrentWindow()
    let skaterList = {}  

    for (let t in teamNames){
        let CRGSkaterNumbers = Object.values(crgData.teams[t].skaters.map((v) => v.number))
        let IGRFSkaterNumbers = Object.values(skatersOnIGRF[teamNames[t]].map((v) => v.number))
        let team = {}
        let checkedNumbers = Array.from(document.getElementsByName(`checklist${t}`)).map((v) => v.value)
        checkedNumbers.sort()

        for (let n in checkedNumbers){
            let number = checkedNumbers[n],
                IGRFskater = {},
                CRGskater = {},
                name = '',
                id = ''

            if(CRGSkaterNumbers.includes(number)){
                CRGskater = crgData.teams[t].skaters.find(x => x.number == number)
            }

            if(IGRFSkaterNumbers.includes(number)){
                IGRFskater = skatersOnIGRF[teamNames[t]].find(x => x.number == number)
            }

            // Get the skater name - priority to the name on the IGRF
            name = (IGRFSkaterNumbers.includes(number) ? IGRFskater.name : CRGskater.name)
            
            // Take the unique ID from the CRG data if present, assign one otherwise
            id = (CRGSkaterNumbers.includes(number) ? CRGskater.id : uuid())

            team[id] = {
                name: name,
                number: number,
                row: parseInt(n)
            }

        }

        skaterList[teamNames[t]] = team
    }

    ipc.send('skater-window-closed', outFileName, JSON.stringify(skaterList))
    window.close()
})

ipc.on('send-skater-list', (event, crgJSON, skatersOnIGRFJSON, outFile) => {
    outFileName = outFile
    crgData = JSON.parse(crgJSON)
    skatersOnIGRF = JSON.parse(skatersOnIGRFJSON)
    skaterTableDiv.appendChild(makeSkaterTable(crgData, skatersOnIGRF))
})

//Array.from(document.getElementsByName('checklist0')).map((v) => v.value)

// TODO:
// Add a "deselect all" button (Eventually add a "select all" option)
// When "confirm" button is cheked, combine the two lists, add ids skaters that don't have them, and return the skater list.
// Warn if *names* don't match betwen IGRF and CRG