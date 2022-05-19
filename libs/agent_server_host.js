'use strict';
const $universe = global.theUn1v3rse.controls.interface();

if(!$universe.baseCheck('Host')){
    const $host = new (require('./server/Host.js')).base();
    $universe.baseAdd('Host', $host);
}

exports.base = $universe.baseGet('Host');

