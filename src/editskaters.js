const electron = require('electron')
const remote = electron.remote
const ipc = require('electron').ipcRenderer
const uuid = require('uuid/v4')

const cancelBtn = document.getElementById('cancelBtn')
const cancelBtn2 = document.getElementById('cancelBtn2')
const confirmBtn = document.getElementById('confirmBtn')
const confirmBtn2 = document.getElementById('confirmBtn2')
const skaterTableDiv = document.getElementById('skaterTableDiv')
const errorMessage = document.getElementById('error-message')

const teamNames = ['home','away']
const maxNum = 20 // Make this dynamic at some point
let crgData = {},
    skatersOnIGRF = {},
    CRGSkaterNumbers = [],
    IGRFSkaterNumbers = []
let outFileName = ''

cancelBtn.addEventListener('click', closeWindow)
cancelBtn2.addEventListener('click', closeWindow)
confirmBtn.addEventListener('click', returnSkaterList)
confirmBtn2.addEventListener('click', returnSkaterList)

let makeSkaterTable = (crgData, skatersOnIGRF) => {
// Create Table
    let table = document.createElement('table')
    table.setAttribute('class','table')

    for (let t in crgData.teams){
    // For each team

        // Get the list of all numbers in both locations.
        CRGSkaterNumbers[t] = Object.values(crgData.teams[t].skaters.map((v) => v.number))
        IGRFSkaterNumbers[t] = (jQuery.isEmptyObject(skatersOnIGRF) ? [] 
            : Object.values(skatersOnIGRF[teamNames[t]]).map((v) => v.number))
        let concatNumbers = CRGSkaterNumbers[t].concat(IGRFSkaterNumbers[t])
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
        let crgDiv = document.createElement('div')
        crgDiv.setAttribute('class','form-check')
        let crgCheckBox = document.createElement('input')
        crgCheckBox.setAttribute('class','form-check-input')
        Object.assign(crgCheckBox, {
            type: 'checkBox',
            id: `checkCRG${t}`,
            checked: false,
            value: t
        })
        crgCheckBox.addEventListener('click', (event) => {toggleCRG(event)})
        let crgCheckLabel = document.createElement('label')
        crgCheckLabel.setAttribute('class','form-check-label')
        crgCheckLabel.setAttribute('for',`checkCRG${t}`)
        crgCheckLabel.innerHTML = 'CRG'
        crgDiv.appendChild(crgCheckBox)
        crgDiv.appendChild(crgCheckLabel)
        tableHeaderCell.appendChild(crgDiv)
        tableHeader.appendChild(tableHeaderCell)

        tableHeaderCell = document.createElement('th')
        let igrfDiv = document.createElement('div')
        igrfDiv.setAttribute('class','form-check')
        let igrfCheckBox = document.createElement('input')
        igrfCheckBox.setAttribute('class','form-check-input')
        Object.assign(igrfCheckBox, {
            type: 'checkBox',
            id: `checkIGRF${t}`,
            value: t
        })
        igrfCheckBox.checked = (IGRFSkaterNumbers[t].length > 0 ? true : false)
        igrfCheckBox.addEventListener('click', (event) => {toggleIGRF(event)})
        let igrfCheckLabel = document.createElement('label')
        igrfCheckLabel.setAttribute('class','form-check-label')
        igrfCheckLabel.setAttribute('for',`checkIGRF${t}`)
        igrfCheckLabel.innerHTML = 'IGRF'
        igrfDiv.appendChild(igrfCheckBox)
        igrfDiv.appendChild(igrfCheckLabel)
        tableHeaderCell.appendChild(igrfDiv)
        tableHeader.appendChild(tableHeaderCell)

        tableHeaderCell = document.createElement('th')
        let allCheckDiv = document.createElement('div')
        allCheckDiv.setAttribute('class','form-check')
        let allCheckBox = document.createElement('input')
        allCheckBox.setAttribute('class','form-check-input')
        Object.assign(allCheckBox, {
            type: 'checkBox',
            id: `checkAll${t}`,
            checked: false,
            value: t
        })
        allCheckBox.addEventListener('click', (event) => {toggleAll(event)})
        let allCheckLabel = document.createElement('label')
        allCheckLabel.setAttribute('class','form-check-label')
        allCheckLabel.setAttribute('for',`checkAll${t}`)
        allCheckLabel.innerHTML = 'All'
        allCheckDiv.appendChild(allCheckBox)
        allCheckDiv.appendChild(allCheckLabel)
        tableHeaderCell.appendChild(allCheckDiv)
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

            if(IGRFSkaterNumbers[t].includes(number)){
            // If the skater is on the IGRF, use the name from there
                skater = Object.values(skatersOnIGRF[teamNames[t]]).find(x => x.number == number)
                name = skater.name
                inIGRF = true
            }
            if(CRGSkaterNumbers[t].includes(number)){
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

    countChecks()
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
    confirmBtn.disabled = (tooMany ? true : false)
    confirmBtn2.disabled = (tooMany ? true : false)
    errorMessage.innerHTML = (errorText != '' ? 'Warning: ' + errorText : '')
}

let toggleAll = (event) => {
// Toggle all the checkboxes for this team

    let team = event.currentTarget.value
    let checklist = `checklist${team}`
    let checkArray = document.getElementsByName(checklist)
    checkArray.forEach(x => x.checked = event.currentTarget.checked)

    //Deactivate the other two boxes
    let crgBox = document.getElementById(`checkCRG${team}`)
    let igrfBox = document.getElementById(`checkIGRF${team}`)
    crgBox.checked = false
    igrfBox.checked = false

    countChecks()
}

let toggleCRG = (event) => {
// Toggle all the checkboxes for this team for skaters in CRG

    let team = event.currentTarget.value
    let checklist = `checklist${team}`
    let checkArray = document.getElementsByName(checklist)
    checkArray.forEach(x => {
        if (CRGSkaterNumbers[team].includes(x.value)){
            x.checked = event.currentTarget.checked
        }
    })

    //Deactivate the other two boxes
    let allBox = document.getElementById(`checkAll${team}`)
    let igrfBox = document.getElementById(`checkIGRF${team}`)
    allBox.checked = false
    igrfBox.checked = false

    countChecks()
}

let toggleIGRF = (event) => {
// Toggle all the checkboxes for this team for skaters in the IGRF

    let team = event.currentTarget.value
    let checklist = `checklist${team}`
    let checkArray = document.getElementsByName(checklist)
    checkArray.forEach(x => {
        if (IGRFSkaterNumbers[team].includes(x.value)){
            x.checked = event.currentTarget.checked
        }
    })

    //Deactivate the other two boxes
    let allBox = document.getElementById(`checkAll${team}`)
    let crgBox = document.getElementById(`checkCRG${team}`)
    allBox.checked = false
    crgBox.checked = false

    countChecks()
}

function closeWindow () {
// Close the window 
    let window = remote.getCurrentWindow()
    ipc.send('skater-window-closed', outFileName, undefined)
    window.close()
}

function returnSkaterList () {
// Build and return skater list
    let window = remote.getCurrentWindow()
    let skaterList = {}  

    for (let t in teamNames){
        let CRGSkaterNumbers = Object.values(crgData.teams[t].skaters.map((v) => v.number))
        let IGRFSkaterNumbers = (jQuery.isEmptyObject(skatersOnIGRF) ? [] 
            : Object.values(skatersOnIGRF[teamNames[t]]).map((v) => v.number))
        let team = {}
        let checkedNumbers = Array
            .from(document.getElementsByName(`checklist${t}`))
            .filter(x => x.checked)
            .map((v) => v.value)
        checkedNumbers.sort()

        if (checkedNumbers.length === 0) {
            if (confirm(`No skaters selected from ${crgData.teams[t].name}. Continue?`)) {
                // This does nothing.
                Function.prototype
            } else {
                return
            }
        }

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
                IGRFskater = Object.values(skatersOnIGRF[teamNames[t]]).find(x => x.number == number)
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
}

ipc.on('send-skater-list', (event, crgJSON, skatersOnIGRFJSON, outFile) => {
    outFileName = outFile
    crgData = JSON.parse(crgJSON)
    skatersOnIGRF = JSON.parse(skatersOnIGRFJSON)
    skaterTableDiv.appendChild(makeSkaterTable(crgData, skatersOnIGRF))
})


// TODO:
// Warn if *names* don't match betwen IGRF and CRG