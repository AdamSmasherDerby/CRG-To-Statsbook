const electron = require('electron')
const remote = electron.remote
const ipc = require('electron').ipcRenderer

const cancelBtn = document.getElementById('cancelBtn')
const skaterTableDiv = document.getElementById('skaterTableDiv')

const teamNames = ['home','away']

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
            
            table.appendChild(tableRow)
        }
    }
    return table
}

cancelBtn.addEventListener('click', ()=> {
    let window = remote.getCurrentWindow()
    window.close()
})

ipc.on('send-skater-list', (event, crgJSON, skatersOnIGRFJSON) => {
    let crgData = JSON.parse(crgJSON)
    let skatersOnIGRF = JSON.parse(skatersOnIGRFJSON)
    skaterTableDiv.appendChild(makeSkaterTable(crgData, skatersOnIGRF))
    ipc.send('table-generated')
})

