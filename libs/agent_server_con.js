'use strict';
const $universe = global.theUn1v3rse.controls.interface();

if(!$universe.baseCheck('Con')){
    const $con = new (require('./server/Con.js')).base();
    $universe.baseAdd('Con', $con);
}

exports.base = $universe.baseGet('Con');

