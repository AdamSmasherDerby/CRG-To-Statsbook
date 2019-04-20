const _ = require('lodash')

exports.makecrgdata = (fileData, crgFilename) => {
    let crgData = {
        teams: [{
            team: '1',
            skaters: []
        },{
            team: '2',
            skaters: []
        }],
        periods: [],
        version: ''
    }

    if (fileData.hasOwnProperty('identifier')){
        // CRG formats prior to 3.9.5
        crgData = fileData
        crgData.version = '3.0'
    } else if (fileData.hasOwnProperty('state')){
        // Determine version
        crgData.version = (fileData.state.hasOwnProperty('ScoreBoard.InJam') ? '4.0' : '3.9.5')

        let sb = {}
        let keys = Object.keys(fileData.state)
        let values = Object.values(fileData.state)
        let id, team, penaltyNumber, idIndex
        let skaterIndices = {}
        let skaterRE = /Team\((\d)\)\.Skater\((\w+-\w+-\w+-\w+-\w+)\)\.Number/
        let penaltyRE = /Team\((\d)\)\.Skater\((\w+-\w+-\w+-\w+-\w+)\)\.Penalty\((\d)\)\.Id/
        let jamStartRE = /Period\((\d)\)\.Jam\((\d+)\)\.PeriodClockElapsedStart/

        // Make sb array
        for (let k in keys){
            _.set(sb, keys[k], values[k])
        }

        sb = sb.ScoreBoard

        for (let k in keys){
        // Populate skaters and penalties

            // If this line is a skaterId line, add their data to crgData
            let match = skaterRE.exec(keys[k])
            if (match != undefined) {
                team = match[1]
                id = match[2]
                idIndex = crgData.teams[parseInt(team) - 1].skaters.push(
                    {
                        number: sb[`Team(${team})`][`Skater(${id})`].Number,
                        penalties: [],
                        name: sb[`Team(${team})`][`Skater(${id})`].Name,
                        id: id
                    }
                )
                // Track the position of each skater ID in the crgData list
                skaterIndices[id] = idIndex - 1
            }

            // If this line is a penalty ID line, add it to the entry for that skater
            match = penaltyRE.exec(keys[k])
            if (match != undefined) {
                team = match[1]
                id = match[2]
                penaltyNumber = match[3]
                if (crgData.version == '3.9.5') {
                    crgData.teams[parseInt(team) - 1].skaters[skaterIndices[id]].penalties.push(
                        {
                            period: sb[`Team(${team})`][`Skater(${id})`][`Penalty(${penaltyNumber})`].Period,
                            code: sb[`Team(${team})`][`Skater(${id})`][`Penalty(${penaltyNumber})`].Code,
                            jam: sb[`Team(${team})`][`Skater(${id})`][`Penalty(${penaltyNumber})`].Jam,
                            id: sb[`Team(${team})`][`Skater(${id})`][`Penalty(${penaltyNumber})`].Id
                        }
                    )
                } else {
                    crgData.teams[parseInt(team) - 1].skaters[skaterIndices[id]].penalties.push(
                        {
                            period: sb[`Team(${team})`][`Skater(${id})`][`Penalty(${penaltyNumber})`].PeriodNumber,
                            code: sb[`Team(${team})`][`Skater(${id})`][`Penalty(${penaltyNumber})`].Code,
                            jam: sb[`Team(${team})`][`Skater(${id})`][`Penalty(${penaltyNumber})`].JamNumber,
                            id: sb[`Team(${team})`][`Skater(${id})`][`Penalty(${penaltyNumber})`].Id
                        }
                    )
                }
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
                
                if (crgData.periods[period - 1].jams.findIndex( x => {return x.jam == jam}) == -1) {
                // if this jam doesn't exist, add it
                    if(crgData.version == '3.9.5') {
                        addJam395(sb, period, jam, crgData)
                    } else {
                        addJam40(sb, period, jam, crgData)
                    }
                }

                crgData.periods[period - 1].jams = _.orderBy(crgData.periods[period - 1].jams, ['jam'])
            }
        }
        
    } 
    return crgData
}

function addJam395(sb, period, jam, crgData) {
// Add jam data to crgData for version 3.9.5
    let jamLengthMS = sb.Stats[`Period(${period})`][`Jam(${jam})`].JamClockElapsedEnd
    let teamOne = sb.Stats[`Period(${period})`][`Jam(${jam})`]['Team(1)']
    let teamTwo = sb.Stats[`Period(${period})`][`Jam(${jam})`]['Team(2)']
    crgData.periods[period - 1].jams.push({
        jam: jam,
        jamLength: msToTimeString(jamLengthMS),
        teams: [{
            team: '1',
            jamScore: teamOne.JamScore,
            starPass: teamOne.StarPass,
            skaters: getJamSkaters395(teamOne)
        }, {
            team: '2',
            jamScore: teamTwo.JamScore,
            starPass: teamTwo.StarPass,
            skaters: getJamSkaters395(teamTwo)
        }]
    })
}

function addJam40(sb, period, jam, crgData) {
// Add jam data to crgData for version 4.0
    let jamLengthMS = sb[`Period(${period})`][`Jam(${jam})`].Duration
    let teams = []

    for(let i = 1; i <=2; i++){
        let team = sb[`Period(${period})`][`Jam(${jam})`][`TeamJam(${i})`]
        let t = 1
        let tripScores = [[],[]]
        while(team.hasOwnProperty(`ScoringTrip(${t})`)){
            if (team[`ScoringTrip(${t})`].AfterSP == false){
                tripScores[0].push(team[`ScoringTrip(${t})`].Score)
            } else {
                tripScores[1].push(team[`ScoringTrip(${t})`].Score)
            }
            t++
        }
        teams.push({
            team: i,
            lead: team.Lead,
            lost: team.Lost,
            call: team.Calloff,
            injury: team.Injury,
            noInitial: team.NoInitial,
            jamScore: team.JamScore,
            starPass: team.StarPass,
            skaters: getJamSkaters40(team),
            tripScores: tripScores
        })
    }

    crgData.periods[period - 1].jams.push({
        jam: jam,
        jamLength: msToTimeString(jamLengthMS),
        teams: teams
    })
}

let getJamSkaters395 = (jamTeam) => {
    // Given an object of key/value pairs for a given team in a given jam, return
    // an array of skater objects.
    let teamSkaterRE = /Skater\((\w+-\w+-\w+-\w+-\w+)\)/
    let keys = Object.keys(jamTeam)
    let id, penaltyBox, position
    let skaters = []
    for (let k in keys) {
        let match = teamSkaterRE.exec(keys[k])
        if (match != undefined){
            id = match[1]
            penaltyBox = jamTeam[`Skater(${id})`].PenaltyBox
            position = jamTeam[`Skater(${id})`].Position
        
            skaters.push({
                id: id,
                penaltyBox: penaltyBox,
                position: position
            })
        }
    }
    return skaters
}

let getJamSkaters40 = (jamTeam) => {
    // Given an object of key/value pairs for a given team in a given jam, return
    // an array of skater objects.
    //let teamSkaterRE = /Fielding\((\w+)\)\.Skater\((\w+-\w+-\w+-\w+-\w+)\)/
    let fieldingRE = /Fielding\((\w+)\)/
    let keys = Object.keys(jamTeam)
    let id, penaltyBox, position
    let skaters = []
    for (let k in keys) {
        let match = fieldingRE.exec(keys[k])
        if (match != undefined){
            position = match[1]
            id = jamTeam[`Fielding(${position})`].Skater
            penaltyBox = jamTeam[`Fielding(${position})`].PenaltyBox
        
            skaters.push({
                id: id,
                penaltyBox: penaltyBox,
                position: position
            })
        }
    }
    return skaters
}

let msToTimeString = (totalms) => {
// Convert ms as int to mm:ss.sss as string
    let mins = Math.floor(totalms / 60000)
    let secs = Math.floor((totalms % 60000)/1000)
    let ms = totalms - mins * 60000 - secs * 1000
    let secstring = (secs < 10 ? `0${secs}` : `${secs}`)
    let msstring = (ms < 10 ? `00${ms}` : (ms < 100 ? `0${ms}` : `${ms}`))
    return (`${mins}:${secstring}.${msstring}`)
}