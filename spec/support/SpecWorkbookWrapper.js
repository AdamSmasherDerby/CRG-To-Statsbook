const rowcol = require('../../src/helpers/rowcol')

class WorkbookWrapper {
    constructor() {
        this.sheetCache = {}
    }

    sheet(name) {
        let wrapper =  this.sheetCache[name]
        if(!wrapper) {
            this.sheetCache[name] = new WorksheetWrapper(name)
        }
        return this.sheetCache[name]
    }
}

class WorksheetWrapper {
    constructor(name) {
        this.name = name
        this.values = []
    }

    getCellA1(a1Address) {
        return this.getCell(rowcol(a1Address))
    }

    getCell(address, rowOffset = 0, colOffset = 0) {
        return valueSetter(this.values, address, rowOffset, colOffset)
    }

    // backwards compatibility
    row(row) {
        throw new Error("Replace Me")
    }
}

function valueSetter(container, address, rowOffset, colOffset) {
    const row = address.r + rowOffset
    const col = address.c + colOffset

    if(!container[row]) { 
        container[row] = []
    }

    return {
        currentValue: container[row][col],
        value(value) {
            container[row][col] = value
        },
        formula(value) {
            container[row][col] = value
        }
    }
}

module.exports = WorkbookWrapper