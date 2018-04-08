//
//  OSZ/OSU file loader
//  By Sam Lynch
//  Covered by MIT licensing
//
let fs = require('fs');

class OSULoader {

    constructor() {/* y u make instance :( */
    }

    /**
     *
     * @param {Array<string>} splitFile The OSU file split into an array by newline
     * @param {int} index Index of the splitFile array to start at
     * @param {string} sectionName Name of the section to handle
     * @private
     */
    static _handleOSUSection(splitFile, index, sectionName) {
        let section = {};
        switch (sectionName) {
            case 'General':
            case 'Kenobi!':
            case 'Editor':
            case 'Metadata':
            case 'Difficulty':
                // handle by getting data after the colon as string
                let lineDifficulty;
                while ((lineDifficulty = splitFile[++index]).trim() !== '') {
                    let key = lineDifficulty.substring(0, lineDifficulty.indexOf(':'));
                    lineDifficulty = lineDifficulty.substring(lineDifficulty.indexOf(':') + 1).trim();
                    section[key] = lineDifficulty;
                }
                break;
            case 'Events':
                // https://osu.ppy.sh/help/wiki/Storyboard_Scripting
                break;
            case 'TimingPoints':
                // Offset, Milliseconds per Beat, Meter, Sample Set, Sample Index, Volume, Inherited, Kiai Mode
                let lineTP;
                section = [];
                while ((lineTP = splitFile[++index]).trim() !== '') {
                    let lineSplit = lineTP.split(',');
                    for (let i = 0; i < lineSplit.length; i++) {
                        lineSplit[i] = lineSplit[i].trim();
                        lineSplit[i] = (+(lineSplit[i]));
                    }
                    section.push(lineSplit);
                }
                break;
            case 'Colours':
                break;
                return this._handleColours(splitFile, index);
            case 'HitObjects':
                return this._handleHitObjects(splitFile, index);
            default:
                throw new Error('Unrecognised section name! ' + sectionName);
        }
    }

    static _handleColours(splitFile, index){
        let section = {};

        let lineColours;
        while ((lineColours = splitFile[++index]).trim() !== '') {
            let key = lineColours.substring(0, lineColours.indexOf(':'));
            lineColours = lineColours.substring(lineColours.indexOf(':') + 1).trim();
            lineColours = lineColours.split(',');
            if(lineColours.length !== 3)
                throw new Error('Invalid number of colours!');

            let colourObj = {
                r:(+lineColours[0]),
                g:(+lineColours[1]),
                b:(+lineColours[2])
            };
            section[key] = colourObj;
        }

        return section;
    }

    static _handleHitObjects(splitFile, index){
        let currLine;
        while ((currLine = splitFile[++index]).trim() !== '') {
            //x,y,time,type,hitSound...,extras
            let currLineSplit = currLine.split(',');
            let entry = {
                x: +currLineSplit[0],
                y: +currLineSplit[1],
                time: +currLineSplit[2],
                type: +currLineSplit[3],
                hitSound: +currLineSplit[4]
            };
        }
    }

    static _getFileVersion(str) {
        if (str.substring(0, 17) !== "osu file format v") {
            throw new Error('Version not at top of file!');
        }

        return (+str.substring(17));
    }

    /**
     *
     * @param {String} file
     * @returns {Promise<void>}
     */
    static ParseOSUFileAsync(file) {
        return new Promise((resolve, reject) => {
            let output = {};

            // Check input
            if (!file || typeof file !== 'string') {
                reject('Invalid input! Must be a string!');
            }

            // Split file by newline and trim excess
            let split = file.split('\n');
            for (let i = 0; i < split.length; i++) {
                split[i] = split[i].trim();
            }

            // First line is version
            output['version'] = this._getFileVersion(split[0]);
            console.log('Version is %i', output['version']);

            for (let i = 0; i < split.length; i++) {
                let current = split[i];

                if (current.length < 2)
                    continue; // Most likely an empty line

                if (current[0] === '[' && current.indexOf(']') !== -1) {
                    // it's a section start
                    let sectionName = current.match(/\[([^)]*)\]/)[1];
                    output[sectionName] = this._handleOSUSection(split, i, sectionName);
                }
            }

            resolve(output);
        });
    }
}

return OSULoader.ParseOSUFileAsync(fs.readFileSync('./sample_input/STYX_HELIX.osu', 'utf8')).then((output) => {
    console.log(JSON.stringify(output));
})
.catch((err) => {
    console.error(err);
});

//module.exports = OSULoader;