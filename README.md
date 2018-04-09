# OSZLoader
An ECMAScript 6 NPM module for parsing .OSU files into JSON.

## Usage

    // Require the module
    const osujson = require('osu-json');
   
    // Load the file to string however you like
    const fs = require('fs');
    let file = fs.readFileSync('./STYX_HELIX.osu', 'utf8');
   
    // Then call 'ParseOSUFileAsync()'; it will return a promise for you to handle
    osujson.ParseOSUFileAsync(file).then( (output)=>{
        console.log(JSON.stringify(output));
    })
    .catch( (err)=>{
        throw new Error(err);
    });