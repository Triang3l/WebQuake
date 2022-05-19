'use strict';
const $universe = global.theUn1v3rse.controls.interface();

if(!$universe.baseCheck('Sys')){
    const $sys = new (require('./server/Sys.js')).base();
    $universe.baseAdd('Sys', $sys);
}

exports.base = $universe.baseGet('Sys');

