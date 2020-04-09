module.exports = class Reader400 {
    readPenalty(penaltyNumber, penalty, skater) {
        const penaltyData = {
            period: penalty.PeriodNumber,
            code: penalty.Code,
            jam: penalty.JamNumber,
            id: penalty.Id
        }

        if (penaltyNumber === '0') {
            skater.fo_exp = penaltyData
        } else {
            skater.penalties.push(penaltyData)
        }
    }

    jamStatsSource(rawData) {
        return rawData
    }

    addJam(jamNumber, rawData, jamList) {
        const durationMs = rawData.Duration
        const teams = []

        for (let i = 1; i <= 2; i++) {
            const team = rawData[`TeamJam(${i})`]
            const trips = []

            let starPassTrip = -1
            let trip
            let t = 1
            let spId = team['StarPassTrip']

            while (Object.prototype.hasOwnProperty.call(team,`ScoringTrip(${t})`)) {
                trip = team[`ScoringTrip(${t})`]
                const afterSP =  trip.AfterSP

                trips.push({
                    trip: t,
                    tripBy: afterSP ? 'Pivot': 'Jammer',
                    score: trip.Score
                })

                if(spId === trip.Id) {
                    starPassTrip = t
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
                noPivot: team.NoPivot,
                jamScore: team.JamScore,
                starPass: team.StarPass,
                skaters: this.addJamSkaters(team),
                starPassTrip,
                trips
            })
        }

        jamList.push({
            jam: jamNumber,
            jamLength: msToTimeString(durationMs),
            jamLengthSeconds: Math.round(durationMs / 1000),
            teams: teams
        })
    }

    addJamSkaters(jamTeam) {
        // Given an object of key/value pairs for a given team in a given jam, return
        // an array of skater objects.
        //let teamSkaterRE = /Fielding\((\w+)\)\.Skater\((\w+-\w+-\w+-\w+-\w+)\)/
        let fieldingRE = /Fielding\((\w+)\)/
        let keys = Object.keys(jamTeam)
        let id, penaltyBox
        let skaters = []
        let boxTripSymbols = []
        let comment = ''

        for (let k in keys) {
            const match = fieldingRE.exec(keys[k])
            if (match != undefined) {
                let position = match[1]
                const skaterData = jamTeam[`Fielding(${position})`]
                
                if (jamTeam.NoPivot && position == 'Pivot') {
                    position = 'Blocker4'
                }

                if (!Object.prototype.hasOwnProperty.call(skaterData,'Skater')) { 
                    continue 
                }

                id = skaterData.Skater
                penaltyBox = skaterData.PenaltyBox
                if (jamTeam.StarPass) {
                    boxTripSymbols = [
                        [skaterData.BoxTripSymbolsBeforeSP.trim().split(' ')],
                        [skaterData.BoxTripSymbolsAfterSP.trim().split(' ')]
                    ]
                } else {
                    boxTripSymbols = [skaterData.BoxTripSymbols.trim().split(' ')]
                }
                if (skaterData.SkaterNumber == 'n/a') { comment = 'n/a' }
                if (skaterData.SkaterNumber == '?') { comment = '?' }

                skaters.push({
                    id: id,
                    penaltyBox: penaltyBox,
                    position: position,
                    boxTripSymbols: boxTripSymbols,
                    comment: comment
                })
            }
        }
        return skaters
    }
}

let msToTimeString = (totalms) => {
    // Convert ms as int to mm:ss.sss as string
    const mins = Math.floor(totalms / 60000)
    let secs = Math.floor((totalms % 60000) / 1000)
    let ms = totalms - mins * 60000 - secs * 1000
    let secstring = (secs < 10 ? `0${secs}` : `${secs}`)
    let msstring = (ms < 10 ? `00${ms}` : (ms < 100 ? `0${ms}` : `${ms}`))
    return (`${mins}:${secstring}.${msstring}`)
}