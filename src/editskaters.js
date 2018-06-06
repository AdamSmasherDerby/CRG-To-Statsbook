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

        for (let s in crgData.teams[t].skaters){ 
            let number = crgData.teams[t].skaters[s].number
            let name = crgData.teams[t].skaters[s].name

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
            tableCell.appendChild(check)
            tableRow.appendChild(tableCell)

            tableCell = document.createElement('td')
            check = document.createElement('i')
            check.setAttribute('class','fa fa-check')
            if(skatersOnIGRF[teamNames[t]].includes(number)){
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

