// Carga el "motor" de Telar para las pruebas: toma el código de index.html, extrae solo las
// funciones (sin ejecutar la interfaz) y las deja disponibles en un contexto aislado de Node.
// Así las pruebas usan exactamente el mismo código que la app publicada, sin copiarlo.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const acorn = require('acorn');

function cargarMotor(){
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  // El código propio de la app es el bloque <script> sin atributo src más extenso
  const bloques = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  if(!bloques.length) throw new Error('No se encontró el código de la app en index.html');
  const codigo = bloques.reduce((a,b)=>b.length>a.length ? b : a);
  const ast = acorn.parse(codigo, {ecmaVersion: 'latest', sourceType: 'script'});
  const funciones = ast.body
    .filter(n=>n.type==='FunctionDeclaration')
    .map(n=>codigo.slice(n.start, n.end));
  const ctx = vm.createContext({console, Math, Number, String, Array, Object, Map, Set, JSON, Uint8Array,
    Float64Array, Int32Array, DataView, ArrayBuffer, TextDecoder, Error, isFinite, isNaN, parseFloat, parseInt, Infinity, NaN});
  vm.runInContext(funciones.join('\n'), ctx, {filename: 'index.html (funciones)'});
  ctx.__cantidadFunciones = funciones.length;
  return ctx;
}
module.exports = {cargarMotor};
