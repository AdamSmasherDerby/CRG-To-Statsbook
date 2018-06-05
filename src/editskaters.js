const electron = require('electron')
const remote = electron.remote
const ipc = require('electron').ipcRenderer

const cancelBtn = document.getElementById('cancelBtn')
const skaterTableDiv = document.getElementById('skaterTableDiv')

let makeSkaterTable = (crgData) => {
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

        tableHeader.setAttribute('class','thead-dark') // Move this to CSS
        table.appendChild(tableHeader)

        for (let s in crgData.teams[t].skaters){ //style these using bootstrap
            let tableRow = document.createElement('tr')

            let tableCell = document.createElement('td')
            tableCell.appendChild(document.createTextNode(crgData.teams[t].skaters[s].number))
            tableRow.appendChild(tableCell)

            tableCell = document.createElement('td')
            tableCell.appendChild(document.createTextNode(crgData.teams[t].skaters[s].name))
            tableRow.appendChild(tableCell)

            tableCell = document.createElement('td')
            let checkbox = document.createElement('INPUT')
            checkbox.setAttribute('type','checkbox')
            tableCell.appendChild(checkbox)
            tableRow.appendChild(tableCell)

            tableCell = document.createElement('td')
            checkbox = document.createElement('INPUT')
            checkbox.setAttribute('type','checkbox')
            tableCell.appendChild(checkbox)
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

ipc.on('send-skater-list', (event, crgJSON) => {
    let crgData = JSON.parse(crgJSON)
    skaterTableDiv.appendChild(makeSkaterTable(crgData))
})