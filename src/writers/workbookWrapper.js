class WorkbookWrapper {
    constructor(workbook) {
        this._workbook = workbook
        this.sheetCache = {}
    }

    sheet(name) {
        let wrapper =  this.sheetCache[name]
        if(!wrapper) {
            const sheet = this._workbook.sheet(name)
            this.sheetCache[name] = new WorksheetWrapper(sheet)
        }
        return this.sheetCache[name]
    }

    writeFile(filename) {
        return this._workbook.toFileAsync(filename).then(() => filename)
    }
}

class WorksheetWrapper {
    constructor(sheet) {
        this._sheet = sheet
    }

    getCellA1(a1Address) {
        return this._sheet.cell(a1Address)
    }

    getCell(address, rowOffset = 0, colOffset = 0) {
        return this._sheet
        .row(address.r + rowOffset)
        .cell(address.c + colOffset)
    }

    // backwards compatibility
    row(row) {
        return this._sheet.row(row)
    }
}

module.exports = WorkbookWrapper