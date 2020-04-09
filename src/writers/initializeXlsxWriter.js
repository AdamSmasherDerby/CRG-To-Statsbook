const XLP = require('xlsx-populate')
const XlsxWriter = require('./xlsxWriter')
const WorkbookWrapper = require('./workbookWrapper')

module.exports = function initialize(filename, newSB) {
    return XLP.fromFileAsync(filename)
        .then((workbook) => new XlsxWriter(new WorkbookWrapper(workbook), newSB))
}