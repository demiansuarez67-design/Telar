// Pruebas del motor estadístico de Telar.
// Cada resultado se compara con el valor que dan bibliotecas estadísticas establecidas (SciPy,
// statsmodels, pingouin, scikit-learn, scikit-posthocs), guardado en referencias/referencias.json.
// Correr con:  cd pruebas && npm install && npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {cargarMotor} = require('./motor');

const M = cargarMotor();
const REF = JSON.parse(fs.readFileSync(path.join(__dirname, 'referencias', 'referencias.json'), 'utf8'));

// Compara con tolerancia relativa (y absoluta para valores cercanos a cero)
function cerca(obtenido, esperado, tol = 1e-6, que = ''){
  const dif = Math.abs(obtenido - esperado), escala = Math.max(1, Math.abs(esperado));
  assert.ok(Number.isFinite(obtenido), `${que}: Telar devolvió ${obtenido}`);
  assert.ok(dif <= tol*escala, `${que}: Telar = ${obtenido}, referencia = ${esperado} (diferencia ${dif.toExponential(2)})`);
}
const grupos = obj => Object.entries(obj).map(([g, vals]) => ({g, vals}));
const porPar = (lista, a, b) => lista.find(x => x.a === a && x.b === b);

test('Distribuciones: χ², F, t, normal, beta y rango estudentizado', () => {
  const D = REF.distribuciones;
  D.chi2.forEach(c => cerca(M.chi2Sf(c.x, c.df), c.sf, 1e-8, `χ²(${c.df}) en ${c.x}`));
  D.f.forEach(c => cerca(M.fPValue(c.f, c.d1, c.d2), c.sf, 1e-8, `F(${c.d1},${c.d2}) en ${c.f}`));
  D.t_bilateral.forEach(c => cerca(M.tPValue(c.t, c.df), c.p, 1e-8, `t(${c.df}) en ${c.t}`));
  D.t_cuantil975.forEach(c => cerca(M.tQuantile(0.95, c.df), c.q, 1e-6, `cuantil t(${c.df})`));
  D.normal_cuantil.forEach(c => cerca(M.normQuantile(c.p), c.q, 1e-8, `cuantil normal ${c.p}`));
  D.normal_cdf.forEach(c => cerca(M.normCdf(c.x), c.cdf, 1e-8, `normal en ${c.x}`));
  D.beta_incompleta.forEach(c => cerca(M.betaI(c.a, c.b, c.x), c.I, 1e-8, `beta(${c.a},${c.b}) en ${c.x}`));
  D.rango_estudentizado.forEach(c => cerca(M.ptukey(c.q, 1, c.k, c.df), c.cdf, 1e-5, `rango estudentizado k=${c.k}`));
  D.rango_estudentizado_cuantil95.forEach(c => cerca(M.qtukey(0.95, c.k, c.df), c.q, 1e-4, `cuantil rango estudentizado k=${c.k}`));
});

test('Mann-Whitney: exacta (muestra chica) y aproximación normal con empates', () => {
  REF.mann_whitney.forEach(c => {
    const r = M.mannWhitney(c.x, c.y);
    cerca(r.U, c.U, 1e-10, `U (${c.metodo})`);
    cerca(r.p, c.p, 1e-8, `p (${c.metodo})`);
  });
});

test('Kruskal-Wallis con empates y comparaciones de Dunn (Holm)', () => {
  const K = REF.kruskal_wallis, g = grupos(K.grupos);
  const r = M.kruskalWallis(g);
  cerca(r.H, K.H, 1e-9, 'H'); cerca(r.p, K.p, 1e-8, 'p');
  const d = M.dunnTest(g, 'holm');
  ['AB', 'AC', 'BC'].forEach(par => cerca(porPar(d, par[0], par[1]).padj, K.dunn_holm[par], 1e-8, `Dunn ${par}`));
});

test('Ajuste de p-valores: Holm y Bonferroni', () => {
  const A = REF.ajuste_p;
  M.pAdjust(A.p, 'holm').forEach((v, i) => cerca(v, A.holm[i], 1e-12, `Holm ${i}`));
  M.pAdjust(A.p, 'bonferroni').forEach((v, i) => cerca(v, A.bonferroni[i], 1e-12, `Bonferroni ${i}`));
});

test('Comparaciones múltiples: Tukey-Kramer, Games-Howell y Welch de a pares', () => {
  const g = grupos(REF.grupos);
  const tk = M.tukeyHSD(g);
  REF.tukey.forEach(c => { const r = porPar(tk, c.par[0], c.par[1]);
    cerca(r.diff, c.dif, 1e-10, `Tukey ${c.par} diferencia`); cerca(r.padj, c.p, 1e-4, `Tukey ${c.par} p`);
    cerca(r.lo, c.lo, 1e-4, `Tukey ${c.par} IC inferior`); cerca(r.hi, c.hi, 1e-4, `Tukey ${c.par} IC superior`); });
  const gh = M.gamesHowell(g);
  REF.games_howell.forEach(c => { const r = porPar(gh, c.par[0], c.par[1]);
    cerca(r.diff, c.dif, 1e-10, `Games-Howell ${c.par} diferencia`); cerca(r.df, c.df, 1e-8, `Games-Howell ${c.par} gl`);
    cerca(r.padj, c.p, 1e-4, `Games-Howell ${c.par} p`); });
  const wp = M.pairwiseWelch(g, 'holm');
  REF.welch_pares.forEach((c, i) => { const r = porPar(wp, c.par[0], c.par[1]);
    cerca(r.t, c.t, 1e-10, `Welch ${c.par} t`); cerca(r.df, c.df, 1e-8, `Welch ${c.par} gl`);
    cerca(r.p, c.p, 1e-8, `Welch ${c.par} p`); cerca(r.padj, REF.welch_pares_holm[i], 1e-8, `Welch ${c.par} p Holm`); });
});

test('Comparar medias sin ponderar: t de Welch, ANOVA y ANOVA de Welch', () => {
  const C = REF.comparar_medias;
  const obs = Object.entries(REF.grupos).flatMap(([g, vals]) => vals.map(y => ({g, y, w: 1})));
  const dos = M.groupMeans(obs.filter(o => o.g !== 'C'), false);
  const t = M.compareMeans(dos, false, dos.reduce((s, x) => s + x.n, 0));
  cerca(t.t, C.welch_t, 1e-10, 't de Welch'); cerca(t.df, C.welch_df, 1e-8, 'gl de Welch'); cerca(t.p, C.welch_p, 1e-8, 'p de Welch');
  const tres = M.groupMeans(obs, false);
  const a = M.compareMeans(tres, false, obs.length);
  cerca(a.F, C.anova_F, 1e-10, 'F del ANOVA'); cerca(a.p, C.anova_p, 1e-8, 'p del ANOVA');
  cerca(a.Fw, C.welch_anova_F, 1e-8, 'F de Welch'); cerca(a.d2w, C.welch_anova_df2, 1e-8, 'gl de Welch'); cerca(a.pw, C.welch_anova_p, 1e-7, 'p de Welch');
});

test('Supuestos: Shapiro-Wilk y Levene (mediana)', () => {
  REF.shapiro.forEach(c => { const r = M.shapiroWilk(c.x);
    cerca(r.W, c.W, 1e-6, `Shapiro-Wilk W (n=${c.x.length})`); cerca(r.p, c.p, 1e-4, `Shapiro-Wilk p (n=${c.x.length})`); });
  const l = M.leveneTest(grupos(REF.grupos));
  cerca(l.F, REF.levene.F, 1e-10, 'Levene F'); cerca(l.p, REF.levene.p, 1e-8, 'Levene p');
});

test('Datos pareados: t pareada y Wilcoxon (exacta y aproximada con empates y ceros)', () => {
  const P = REF.pareados;
  const t = M.pairedT(P.x, P.y);
  cerca(t.t, P.t, 1e-10, 't pareada'); cerca(t.p, P.p, 1e-8, 'p t pareada');
  cerca(t.lo, P.lo, 1e-6, 'IC inferior'); cerca(t.hi, P.hi, 1e-6, 'IC superior');
  const w = M.wilcoxonSigned(P.xw, P.yw);
  assert.equal(w.method, 'exacta'); cerca(w.T, P.wilcoxon_T, 1e-10, 'Wilcoxon T'); cerca(w.p, P.wilcoxon_p, 1e-8, 'Wilcoxon p exacta');
  const w2 = M.wilcoxonSigned(P.x2, P.y2);
  assert.equal(w2.method, 'aproximación normal');
  cerca(w2.T, P.wilcoxon2_T, 1e-10, 'Wilcoxon T (empates)'); cerca(w2.p, P.wilcoxon2_p, 1e-8, 'Wilcoxon p aproximada');
});

test('Correlaciones de Pearson y Spearman', () => {
  const C = REF.correlacion;
  const s = M.spearman(C.x, C.y);
  cerca(s.rho, C.rho, 1e-10, 'rho de Spearman'); cerca(s.p, C.p_rho, 1e-8, 'p de Spearman');
  cerca(M.pearson(C.x.map((x, i) => [x, C.y[i]])), C.r, 1e-10, 'r de Pearson');
});

test('ANOVA de dos factores desbalanceado (sumas de cuadrados tipo II)', () => {
  const A = REF.anova_dos_factores, r = M.twoWayAnova(A.obs);
  ['A', 'B', 'AB'].forEach(term => { const fila = r.rows.find(x => x.name === term);
    cerca(fila.ss, A[term].ss, 1e-8, `SC ${term}`); cerca(fila.F, A[term].F, 1e-8, `F ${term}`); cerca(fila.p, A[term].p, 1e-7, `p ${term}`); });
  cerca(r.resid.ss, A.resid_ss, 1e-8, 'SC residual'); cerca(r.resid.df, A.resid_df, 0, 'gl residuales');
});

test('Alfa de Cronbach, alfa si se quita el ítem y correlación ítem-resto', () => {
  const C = REF.cronbach, r = M.cronbachAlpha(C.items);
  cerca(r.alpha, C.alfa, 1e-10, 'alfa');
  r.items.forEach((it, j) => { cerca(it.alphaIfDeleted, C.alfa_si_se_quita[j], 1e-10, `alfa sin ítem ${j+1}`);
    cerca(it.itemRest, C.item_resto[j], 1e-10, `ítem-resto ${j+1}`); });
});

test('Kappa de Cohen (acuerdo entre codificadores)', () => {
  const K = REF.kappa;
  cerca(M.cohenKappa(K.a, K.b, K.c, K.d).k, K.k, 1e-12, 'kappa');
});

test('Proporciones: intervalo de Wilson y χ² entre grupos', () => {
  REF.wilson.forEach(c => { const [lo, hi] = M.wilsonCI(c.k/c.n, c.n);
    cerca(lo, c.lo, 1e-8, `Wilson ${c.k}/${c.n} inferior`); cerca(hi, c.hi, 1e-8, `Wilson ${c.k}/${c.n} superior`); });
  const C = REF.chi2_proporciones;
  const r = M.compareProps(C.grupos.map(g => ({g: g.g, n: g.n, k: g.k, p: g.k/g.n, se: 0})), false, 0);
  cerca(r.chi2, C.chi2, 1e-10, 'χ²'); cerca(r.p, C.p, 1e-8, 'p');
});

test('Encuestas con ponderador: porcentaje (error estándar e IC) y media (error estándar)', () => {
  const P = REF.ponderados, n = P.w.length;
  let Sw = 0, Sw2 = 0, W = 0, W2 = 0;
  P.w.forEach((w, i) => { W += w; W2 += w*w; if(P.atributo[i]){ Sw += w; Sw2 += w*w; } });
  cerca(Math.sqrt(M.propDesignVar(Sw, Sw2, W, W2, n)), P.ee_p, 1e-10, 'error estándar del porcentaje');
  const ic = M.propCI(Sw, Sw2, W, W2, n);
  cerca(ic[0], P.ic_lo, 1e-8, 'IC inferior del porcentaje'); cerca(ic[1], P.ic_hi, 1e-8, 'IC superior del porcentaje');
  const [g] = M.groupMeans(P.valor.map((y, i) => ({g: 'todos', y, w: P.w[i]})), true);
  cerca(g.mean, P.media, 1e-12, 'media ponderada'); cerca(g.se, P.ee_media, 1e-10, 'error estándar de la media');
});

test('Rao-Scott: con ponderadores iguales coincide con el χ² de Pearson (salvo el factor n/(n−1))', () => {
  // Tabla 2×3 con todos los pesos = 1: el efecto de diseño es n/(n−1) y el p-valor debe ser casi el del χ²
  const tabla = [[12, 20, 8], [18, 11, 25]], n = 94;
  const cells = tabla.map(f => f.map(v => ({s: v, s2: v})));
  const r = M.raoScott(cells, n);
  cerca(r.meanDeff, n/(n-1), 1e-8, 'efecto de diseño medio');
  cerca(r.d1, 2, 1e-8, 'gl del numerador');
  assert.ok(Math.abs(r.p - M.chiSquarePValue(r.X2, 2)) < 0.01, 'p-valor muy distinto del χ²');
});

test('Regresión lineal: sin ponderar y con ponderador (errores de diseño)', () => {
  const G = REF.regresion, X = G.X.map(f => Float64Array.from(f));
  const sinPeso = M.olsFit(X, G.y, G.y.map(() => 1), false);
  const tab = M.coefTable(sinPeso, ['const', 'x1', 'x2']);
  tab.forEach((c, j) => { cerca(c.b, G.ols.b[j], 1e-10, `b${j}`); cerca(c.se, G.ols.se[j], 1e-9, `ee${j}`); cerca(c.p, G.ols.p[j], 1e-7, `p${j}`); });
  cerca(sinPeso.r2, G.ols.r2, 1e-10, 'R²'); cerca(sinPeso.r2a, G.ols.r2a, 1e-10, 'R² ajustado');
  cerca(sinPeso.F, G.ols.F, 1e-9, 'F'); cerca(sinPeso.pF, G.ols.pF, 1e-7, 'p de F');
  const conPeso = M.olsFit(X, G.y, G.w, true);
  conPeso.b.forEach((b, j) => { cerca(b, G.ols_ponderada.b[j], 1e-10, `b${j} ponderado`);
    cerca(Math.sqrt(conPeso.V[j][j]), G.ols_ponderada.se[j], 1e-9, `ee${j} ponderado`); });
});

test('Regresión logística: sin ponderar y con ponderador', () => {
  const G = REF.regresion, X = G.X.map(f => Float64Array.from(f));
  const sinPeso = M.logitFit(X, G.yb, G.yb.map(() => 1), false);
  assert.ok(sinPeso.conv, 'la logística no convergió');
  const tab = M.coefTable(sinPeso, ['const', 'x1', 'x2']);
  tab.forEach((c, j) => { cerca(c.b, G.logit.b[j], 1e-8, `b${j}`); cerca(c.se, G.logit.se[j], 1e-7, `ee${j}`); cerca(c.p, G.logit.p[j], 1e-6, `p${j}`); });
  cerca(sinPeso.ll, G.logit.ll, 1e-9, 'log-verosimilitud'); cerca(sinPeso.ll0, G.logit.ll0, 1e-9, 'log-verosimilitud nula');
  cerca(sinPeso.LR, G.logit.LR, 1e-8, 'razón de verosimilitud'); cerca(sinPeso.pLR, G.logit.pLR, 1e-7, 'p de la razón de verosimilitud');
  const conPeso = M.logitFit(X, G.yb, G.w, true);
  conPeso.b.forEach((b, j) => { cerca(b, G.logit_ponderada.b[j], 1e-7, `b${j} ponderado`);
    cerca(Math.sqrt(conPeso.V[j][j]), G.logit_ponderada.se[j], 1e-6, `ee${j} ponderado`); });
});

test('Lectores de archivos: SPSS (.sav, con y sin compresión) y Stata (.dta)', () => {
  const A = REF.archivos;
  const verificar = (leido, archivo, conPerdidos) => {
    const r = JSON.parse(JSON.stringify(leido)); // objetos del contexto aislado → objetos comunes
    assert.deepEqual(r.vars.map(v => v.name), A.columnas, `${archivo}: nombres de variables`);
    assert.deepEqual(r.vars.map(v => v.label), A.etiquetas_var, `${archivo}: etiquetas de variables`);
    assert.deepEqual(r.vars[1].valueLabels, A.etiquetas_sexo, `${archivo}: etiquetas de valores`);
    assert.equal(r.fileLabel, 'Encuesta de prueba', `${archivo}: etiqueta del archivo`);
    A.filas.forEach((fila, i) => A.columnas.forEach((c, j) => {
      assert.equal(r.rows[i][c] ?? null, fila[j], `${archivo}: fila ${i+1}, ${c}`);
    }));
    if(conPerdidos) assert.deepEqual(r.vars[1].missingValues, ['9'], `${archivo}: valores perdidos definidos`);
  };
  ['ejemplo_sin_comprimir.sav', 'ejemplo_comprimido.sav'].forEach(f =>
    verificar(M.readSav(new Uint8Array(fs.readFileSync(path.join(__dirname, 'referencias', f)))), f, true));
  verificar(M.readDta(new Uint8Array(fs.readFileSync(path.join(__dirname, 'referencias', 'ejemplo.dta')))), 'ejemplo.dta', false);
});
