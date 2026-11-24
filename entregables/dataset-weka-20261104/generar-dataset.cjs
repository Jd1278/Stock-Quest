// Synthetic educational data only. No Stock Quest database is read.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = __dirname;
const seed = 20261104;
let state = seed;
function random() {
  let t = state += 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
const integer = (min, max) => min + Math.floor(random() * (max - min + 1));
const choice = list => list[integer(0, list.length - 1)];
const round = n => Math.round(n * 100) / 100;
function shuffle(values) {
  for (let i = values.length - 1; i > 0; i--) {
    const j = integer(0, i); [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}
const columns = [
  ['id_registro', 'numeric', 'Identificador del movimiento; no usar como predictor ni en IQR.'],
  ['dia_operacion', 'numeric', 'Dia del periodo simulado, entero de 1 a 365.'],
  ['almacen', '{norte,sur,centro,NORTE,SUR,CENTRO}', 'Almacen; solo norte, sur y centro son formas canonicas.'],
  ['categoria', '{alimentos,aseo,papeleria,tecnologia}', 'Categoria del producto.'],
  ['proveedor', '{P01,P02,P03,P04,P05}', 'Codigo sintetico de proveedor.'],
  ['stock_inicial', 'numeric', 'Unidades al inicio, rango normal 50-200.'],
  ['demanda', 'numeric', 'Unidades solicitadas, rango normal 10-60.'],
  ['unidades_recibidas', 'numeric', 'Unidades recibidas, rango normal 0-80.'],
  ['unidades_vendidas', 'numeric', 'min(stock_inicial + unidades_recibidas, demanda).'],
  ['stock_final', 'numeric', 'stock_inicial + unidades_recibidas - unidades_vendidas.'],
  ['costo_unitario', 'numeric', 'Unidades monetarias ficticias por unidad, rango normal 10-50.'],
  ['precio_unitario', 'numeric', 'Unidades monetarias ficticias; costo por margen de 1.4 a 1.8.'],
  ['plazo_entrega_dias', 'numeric', 'Plazo entero normal 1-7; casos extremos 365-730.'],
  ['costo_pedido', 'numeric', 'Costo por pedido en unidades monetarias ficticias; normal 0-30.'],
  ['canal_venta', '{tienda,web,mayorista}', 'Canal de venta nominal; no es clase objetivo.']
];
function csvCell(v) {
  const s = String(v);
  return /[",\r\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s;
}
const csvLine = a => a.map(csvCell).join(',');
function writeArff(name, rows, relation) {
  fs.writeFileSync(path.join(root, name),
    '% Datos sinteticos: no representan observaciones reales.\n' +
    '@relation ' + relation + '\n\n' +
    columns.map(([name, type]) => '@attribute ' + name + ' ' + type).join('\n') +
    '\n\n@data\n' + rows.map(csvLine).join('\n') + '\n');
}
const records = Array.from({ length: 100000 }, (_, i) => {
  const stock = integer(50, 200), demand = integer(10, 60), received = integer(0, 80);
  const sold = Math.min(stock + received, demand), cost = integer(1000, 5000) / 100;
  return { row: [i + 1, integer(1, 365), choice(['norte','sur','centro']),
    choice(['alimentos','aseo','papeleria','tecnologia']), choice(['P01','P02','P03','P04','P05']),
    stock, demand, received, sold, stock + received - sold, cost,
    round(cost * (integer(140, 180) / 100)), integer(1, 7), integer(0, 3000) / 100,
    choice(['tienda','web','mayorista'])], type: 'normal', subtype: '', field: '', before: '', after: '', sourceId: '' };
});
const selection = shuffle(Array.from({ length: records.length }, (_, i) => i));
for (let n = 0; n < 10000; n++) {
  const r = records[selection[n]];
  r.type = 'outlier';
  if (n < 4000) {
    r.subtype = 'plazo_extremo'; r.field = 'plazo_entrega_dias'; r.before = r.row[12];
    r.row[12] = integer(365, 730); r.after = r.row[12];
  } else if (n < 7000) {
    r.subtype = 'costo_y_precio_extremos'; r.field = 'costo_unitario|precio_unitario';
    r.before = JSON.stringify([r.row[10], r.row[11]]);
    const margin = r.row[11] / r.row[10]; r.row[10] = integer(500000, 2000000) / 100;
    r.row[11] = round(r.row[10] * margin); r.after = JSON.stringify([r.row[10], r.row[11]]);
  } else {
    r.subtype = 'demanda_extrema'; r.field = 'demanda|unidades_vendidas|stock_final';
    r.before = JSON.stringify([r.row[6], r.row[8], r.row[9]]);
    r.row[6] = integer(5000, 10000); r.row[8] = Math.min(r.row[5] + r.row[7], r.row[6]);
    r.row[9] = r.row[5] + r.row[7] - r.row[8]; r.after = JSON.stringify([r.row[6], r.row[8], r.row[9]]);
  }
}
for (let n = 0; n < 10000; n++) {
  const r = records[selection[10000 + n]];
  r.type = 'sucio';
  if (n < 4000) {
    const idx = n < 2000 ? 2 : 13;
    r.subtype = 'faltante'; r.field = columns[idx][0]; r.before = r.row[idx]; r.row[idx] = '?'; r.after = '?';
  } else if (n < 6000) {
    r.subtype = 'categoria_inconsistente'; r.field = 'almacen'; r.before = r.row[2];
    r.row[2] = r.row[2].toUpperCase(); r.after = r.row[2];
  } else if (n < 8000) {
    r.subtype = 'negativo_invalido'; r.field = 'costo_pedido'; r.before = r.row[13];
    r.row[13] = -integer(1, 3000) / 100; r.after = r.row[13];
  } else {
    const source = records[selection[20000 + n - 8000]];
    r.subtype = 'duplicado_exacto'; r.field = 'todos'; r.before = JSON.stringify(r.row);
    r.row = [...source.row]; r.after = 'copia exacta'; r.sourceId = source.row[0];
  }
}
shuffle(records);
const rows = records.map(r => r.row);
const csv = [columns.map(c => c[0]), ...rows].map(csvLine).join('\n') + '\n';
fs.writeFileSync(path.join(root, 'stockquest_100000_15_original.csv'), csv);
writeArff('stockquest_100000_15_original.arff', rows, 'stockquest_sintetico_100000_15');
fs.writeFileSync(path.join(root, 'referencia_anomalias_NO_IMPORTAR_EN_WEKA.csv'),
  [['fila_datos_1_based','fila_archivo_csv','id_registro_observado','tipo_fila','subtipo','campos','valor_antes','valor_introducido','id_fuente_duplicado'],
   ...records.map((r,i) => [i+1,i+2,r.row[0],r.type,r.subtype,r.field,r.before,r.after,r.sourceId])].map(csvLine).join('\n') + '\n');
fs.writeFileSync(path.join(root, 'diccionario_campos.csv'),
  [['posicion_weka','campo','tipo_arff','descripcion'],...columns.map((c,i)=>[i+1,...c])].map(csvLine).join('\n') + '\n');
const counts = { normal: 0, outlier: 0, sucio: 0 }, subtypes = {};
for (const r of records) { counts[r.type]++; if (r.subtype) subtypes[r.subtype] = (subtypes[r.subtype] || 0) + 1; }
const duplicateCount = rows.length - new Set(rows.map(csvLine)).size;
const missingCells = rows.flat().filter(v => v === '?').length;
if (rows.length !== 100000 || rows.some(r => r.length !== 15) || counts.outlier !== 10000 || counts.sucio !== 10000 || duplicateCount !== 2000 || missingCells !== 4000) throw Error('Dataset validation failed');
const metadata = { synthetic: true, seed, records: rows.length, fields: columns.length,
  percentageDenominator: 'filas, no celdas; grupos sin solapamiento', counts, subtypes,
  duplicates: duplicateCount, missingCells, outlierIds: records.filter(r=>r.type==='outlier').map(r=>r.row[0]),
  expectedCleaning: { afterDeduplication: 98000, outliersRemoved: 10000, finalRows: 88000, finalFields: 15 },
  sha256: Object.fromEntries(['stockquest_100000_15_original.csv','stockquest_100000_15_original.arff'].map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')])) };
fs.writeFileSync(path.join(root, 'control-generacion.json'), JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify({records:metadata.records,fields:metadata.fields,counts,subtypes,duplicateCount,missingCells},null,2));
