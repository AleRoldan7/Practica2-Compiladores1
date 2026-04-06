#!/bin/bash
echo "Generando analizador..."

node -e "
var jison = require('jison');
var fs = require('fs');
var grammar = fs.readFileSync('wison.jison', 'utf8');
try {
    var gen = new jison.Generator(grammar, {type: 'lalr'});
    var src = gen.generate();
    fs.writeFileSync('wison.js', src);
    console.log('Generado exitosamente: wison.js');

} catch(e) {
    console.error('ERROR:', e.message);
    process.exit(1);
}
"
