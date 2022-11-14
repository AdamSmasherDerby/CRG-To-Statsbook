**This tool is no longer being updated.** Now that CRG 5.x natively supports statsbook export, this tool is obsolete, and will no longer be updated.  It will continue to be supported for users of older versions.

CRG Data Tool is a utility for converting output Game Data files from CRG Scoreboard 3.x and 4.x to WFTDA StatsBooks.  It can either generate a new statsbook based on a template or repopulate an existing statsbook file.  If there is a conflict between your scoreboard data and an existing statsbook file, it will attempt to help you resolve the conflict.

**Note:** It is important to open the generated spreadsheet in a compatiable spreadsheet program BEFORE either feeding it to the statsbook checker or submitting it to WFTDA.  There are formulas in the spreadsheet that will not execute unless the file is opened.  (For example, there won't be any jam numbers in the lineup tab.)

It is recommended to back up any StatsBook files *before* feeding them to this program, unless you want to risk retyping stuff.

Although the software uses data from both CRG Scoreboard and WFTDA, it is not provided, endorsed, produced, or supported by the WFTDA. 

[![ko-fi](https://www.ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/J3J11GKIZ)

## Current Abilities

As of CRG 4.0, all data needed for a statsbook other than IGRF information such as officials can now be captured by the scoreboard.  All information which is entered will be transferred to the statsbook.  The "telepathy" add on which will allow information NOT entered to be transferred to the statsbook is currently under development.

If you are still running CRG 3.9.5 or earlier, the following information can be transferred:

* Game Time and Date
* Team Names
* Team Rosters with name and number
* Jam Numbers, including star passes
* Jammer numbers
* Pivot numbers
* Blocker numbers
* Penalty codes
* Foul Outs
* Expulsions
* Jam times on the Game Clock sheet.  Because why not?

Flamingo icon from http://www.iconsmind.com

Installable binaries are located at:
https://github.com/AdamSmasherDerby/CRG-To-Statsbook/releases

## Installation instructions:

*Windows:* Download and run <code>CRG Data Tool Setup.x.x.x-Windows.exe</code>

*Mac:* Download and run the <code>CRG Data Tool-x.x.x.dmg</code> file. Drag the flamingo onto the folder. Right or control click the StatsBook Tool program and select "open." Agree to run the software, despite dire warnings of awful consequences. (The awful consequences are that I have not ponied up $100 for a Developer certificate to sign the code.)

*Linux:* Download <code>crgdataktool-x.x.x-x86_64.AppImage</code>, then type "chmod a+x crgdatatool-x.x.x-x86_64.AppImage" to make the file executable. 

### Release Notes

* 0.0.1 - Alpha release for testing at BrewHaHa.
* 0.3.0 - July 1, 2018
    * Initial Public Beta.
* 0.3.1 - Also July 1, 2018
    * Immediate Bug Fix. (Nice going, Smasher.)
* 0.3.2 - July 2, 2018
    * No longer opens dev tools for "edit skaters" window in production version.
* 0.3.3 - August 5, 2018
    * Added ability to swap team order
    * Changed default output file name to match gamedata file name.
    * Allow the same CRG data file to be uploaded twice in a row.
    * Prevent files dropped outside of the drop zone from doing stuff.
* 0.3.4 - August 24, 2018
    * Skaters deselected in the edit screen are now removed from prexisting IGRF.
    * Fixed wrong input area turning pink on dragover.
    * Added error popup if attempt is made to save to a file open in Excel.
* 0.3.5 - September 28, 2018
    * Fixed error introduced in last version with updating IGRF
    * Fixed situation where filling in blockers at halftime would break conditional formatting after a second export at the end of the game.  This was due to an Excel issue where cell formats aren't updated properly. Thanks, Microsoft!
* 1.0.0 - October 10, 2018
    * Will read CRG 3.9.5 and later data files as well as earlier
    * Also probably time to declare a non-beta release.
* 2.0.0 - December 18, 2018
    * Cancel / Confirm buttons added at the bottom of the edit skaters dialog
    * Select CRG / Select IGRF checkboxes added to edit skaters dialog
    * Updated to output 2019 statsbook.
* 2.0.1 - March 3, 2019
    * Added support for A4 paper
* 2.1.0 - March 16, 2019
    * Added check for latest version
* 2.1.1 - March 27, 2019
    * Will now correctly sort skaters from versions 3.9.5 and up by number
    * Adds a note to the statsbook colophon indicating which version of this tool was used to generate the statsbook.
    * Added confirmation dialog when selecting no skaters from the reconciliation screen.
* 2.2.0 - April 28, 2019
    * Support for future CRG releases
    * Changed from m:ss format to sss format on game clock page to allow formulas to work correctly.
* 2.2.1 - July 15, 2019
    * Fixed bug where star passes would cause a "0" in the "NI" column.
    * Correctly add 4.0 formatted foulouts and expulsions.
    * Add ? and n/a as possible skater numbers.  Can't add comments to the spreadsheet for now, but if that is supported in the future, this can be easily updated.
* 2.2.2 - August 11,2019
    * Fixed a breaking bug where program would crash if a jammer wasn't entered for a given jam.
* 2.2.3 - December 9, 2019
    * Another round of 4.0 related bug fixes
* 2.2.4 - January 20, 2020
    * Added strongly worded note about always opening output files in Excel before error checking.
    * Fixed "no pivot" data not appearing in output sheet.
* 2.3.0 - February 15, 2020
    * MAJOR under-the-hood improvements, courtesy of official-sounding
    * Added a dialog to allow users to immediately open their created Statsbook in their default spreadsheet program.
* 2.3.1 - February 21, 2020
    * Make the exporter tolerant of negative jam durations.
* 2.3.2 - March 11, 2020
    * Fix bug with box trip symbols in jams with a star pass.
* 2.4.0 - April 12, 2021
    * Add compatibility with CRG 4.1.1 and up
* 2.4.1 - October 17, 2021
    * Fix issue resulting from CRG reording save file.
* 2.4.2 - September 11, 2022
    * Will now throw an explicit error when fed a statsbook file from CRG 5.0.0 and up.
* 2.4.3 - November 13, 2022
    * Fix "switch teams" button.