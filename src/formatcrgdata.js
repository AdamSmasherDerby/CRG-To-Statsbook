const _ = require('lodash')
const semver = require('semver')
const ReaderProvider = require('./readers/readerProvider')

exports.makecrgdata = (fileData, crgFilename) => {
    const readerProvider = new ReaderProvider()

    let crgData = {
        teams: [{
            team: '1',
            skaters: []
        },{
            team: '2',
            skaters: []
        }],
        periods: [],
        version: '',
        tooRecent: false
    }

    const version = readerProvider.getVersion(fileData)

    if (semver.gte(version,'5.0.0')){
        crgData.version = version
        crgData.tooRecent = true
        return crgData
    }

    if (version === 'v3.0.0'){
        // CRG formats prior to 3.9.5.  fileData is simply returned as is.
        crgData = fileData
        crgData.version = version

        crgData.periods.forEach((period) => {
            period.jams.forEach((jam) => {
                jam.jamLengthSeconds = parseJamTime(jam)
            })
        })

    } else {
        const reader = readerProvider.getReader(version)
        // Determine version
        crgData.version = version
        
        let sb = {}
        let keys = Object.keys(fileData.state)
        let values = Object.values(fileData.state)
        let id, team, penaltyNumber, idIndex, skater, penalty, rosterNumber
        let skaterIndices = {}
        let skaterRE = /Team\((\d)\)\.Skater\((\w+-\w+-\w+-\w+-\w+)\)\.Number/
        if (semver.gt(version,'4.1.0')){
            skaterRE = /Team\((\d)\)\.Skater\((\w+-\w+-\w+-\w+-\w+)\)\.RosterNumber/
        }
        let penaltyRE = /Team\((\d)\)\.Skater\((\w+-\w+-\w+-\w+-\w+)\)\.Penalty\((\d)\)\.Id/
        let jamStartRE = /Period\((\d)\)\.Jam\((\d+)\)\.PeriodClockElapsedStart/

        // Make sb array
        for (let k in keys){
            _.set(sb, keys[k], values[k])
        }

        sb = sb.ScoreBoard

        for (let k in keys){
        // Populate skaters 

            // If this line is a skaterId line, add their data to crgData
            let match = skaterRE.exec(keys[k])
            if (match != undefined) {
                team = match[1]
                id = match[2]
                if (semver.gt(version,'4.1.0')){
                    rosterNumber = sb[`Team(${team})`][`Skater(${id})`].RosterNumber
                } else {
                    rosterNumber = sb[`Team(${team})`][`Skater(${id})`].Number
                }
                idIndex = crgData.teams[parseInt(team) - 1].skaters.push(
                    {
                        number: rosterNumber,
                        penalties: [],
                        name: sb[`Team(${team})`][`Skater(${id})`].Name,
                        id: id,
                        fo_exp: {}
                    }
                )
                // Track the position of each skater ID in the crgData list
                skaterIndices[id] = idIndex - 1
            }

        }

        for (let k in keys) {
        //populate penalties
            
            // If this line is a penalty ID line, add it to the entry for that skater
            let match = penaltyRE.exec(keys[k])
            if (match != undefined) {
                team = match[1]
                id = match[2]
                penaltyNumber = match[3]

                skater = crgData.teams[parseInt(team) - 1].skaters[skaterIndices[id]]
                penalty = sb[`Team(${team})`][`Skater(${id})`][`Penalty(${penaltyNumber})`]

                reader.readPenalty(penaltyNumber, penalty, skater)
            }
        }

        // Load team names, create identifer
        crgData.teams[0].name = sb['Team(1)'].Name
        crgData.teams[1].name = sb['Team(2)'].Name
        
        let localStartTime = crgFilename.substr(11,5).replace('_',':')
        let localStartDate = crgFilename.substr(0,10)
        // let unixStart = moment(sb.Stats['Period(1)']['Jam(1)'].PeriodClockWalltimeStart)
        // let localStart = moment(`${localStartDate} ${localStartTime}`)
        // Time Offset is in ms for future use
        // let timeoffset = (unixStart > localStart ?  localStart - unixStart : unixStart - localStart)

        crgData.identifier = `${localStartDate} ${localStartTime} - ${crgData.teams[0].name} vs ${crgData.teams[1].name}`

        for(let k in keys){
        // Populate scores and lineups
            let match = jamStartRE.exec(keys[k])
            if (match != undefined) {
                let period = parseInt(match[1])
                let jam = parseInt(match[2])
                if (period == 0 || jam == 0) { continue }

                if (crgData.periods.length < period) {
                // if this period doesn't exist, add it
                    crgData.periods.push(
                        { 
                            period: period,
                            jams: []
                        }
                    )
                }
                let rawData = sb[`Period(${period})`][`Jam(${jam})`]
                let jamList = crgData.periods[period - 1].jams
                
                if (!jamList.some(x => x.jam == jam)) {
                    reader.addJam(jam, rawData, jamList)
                }

                crgData.periods[period - 1].jams = _.orderBy(crgData.periods[period - 1].jams, ['jam'])
            }
        }
        
    } 
    return crgData
}

function parseJamTime(jam) {
    const timeRe = /(\d):(\d\d)(\.\d+)*/
    const rawJamTime = jam.jamLength
    const jamTimeReResult = timeRe.exec(rawJamTime)
    return (parseInt(jamTimeReResult[1]) * 60 + parseInt(jamTimeReResult[2]))
}