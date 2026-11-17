"""
Genera los valores de referencia con los que se validan los cálculos de Telar.

Los resultados se calculan con bibliotecas estadísticas establecidas e independientes de Telar
(SciPy, statsmodels, pingouin, scikit-learn, scikit-posthocs) y se guardan en referencias.json,
junto con los datos de entrada. Las pruebas de Node comparan lo que calcula Telar con esos valores.

También genera archivos de SPSS (.sav) y Stata (.dta) de ejemplo para probar los lectores.

Solo hace falta volver a correrlo si se agregan casos nuevos:
    pip install numpy pandas scipy statsmodels pingouin scikit-learn scikit-posthocs pyreadstat
    python generar_referencias.py
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
import pingouin as pg
import pyreadstat
import scikit_posthocs as sp
import statsmodels.api as sm
import statsmodels.formula.api as smf
from scipy import special, stats
from sklearn.metrics import cohen_kappa_score
from statsmodels.stats.multitest import multipletests
from statsmodels.stats.proportion import proportion_confint

AQUI = Path(__file__).parent
rng = np.random.default_rng(20261117)
R = {}


def lista(a):
    return [float(x) for x in np.asarray(a).ravel()]


# ---------- Distribuciones ----------
R["distribuciones"] = {
    "chi2": [{"x": x, "df": df, "sf": float(stats.chi2.sf(x, df))}
             for x, df in [(0.5, 1), (3.841, 1), (10, 3), (25, 10), (80, 50), (0.01, 4)]],
    "f": [{"f": f, "d1": a, "d2": b, "sf": float(stats.f.sf(f, a, b))}
          for f, a, b in [(1.2, 2, 30), (4.5, 1, 10), (3.1, 3, 120), (0.4, 5, 8), (12, 2, 2.5)]],
    "t_bilateral": [{"t": t, "df": df, "p": float(2 * stats.t.sf(abs(t), df))}
                    for t, df in [(2.1, 5), (-1.3, 20), (3.5, 100), (0.2, 3.7), (6, 1)]],
    "t_cuantil975": [{"df": df, "q": float(stats.t.ppf(0.975, df))} for df in [1, 2, 5, 10, 30, 120, 7.4]],
    "normal_cuantil": [{"p": p, "q": float(stats.norm.ppf(p))} for p in [1e-6, 0.01, 0.025, 0.3, 0.5, 0.8, 0.975, 0.999999]],
    "normal_cdf": [{"x": x, "cdf": float(stats.norm.cdf(x))} for x in [-4, -1.96, -0.3, 0, 1, 2.5]],
    "beta_incompleta": [{"a": a, "b": b, "x": x, "I": float(special.betainc(a, b, x))}
                        for a, b, x in [(0.5, 0.5, 0.3), (2, 3, 0.4), (10, 4, 0.8), (50, 60, 0.45)]],
    "rango_estudentizado": [{"q": q, "k": k, "df": df, "cdf": float(stats.studentized_range.cdf(q, k, df))}
                            for q, k, df in [(3.0, 3, 20), (3.5, 4, 40), (2.2, 2, 10), (4.8, 6, 60)]],
    "rango_estudentizado_cuantil95": [{"k": k, "df": df, "q": float(stats.studentized_range.ppf(0.95, k, df))}
                                      for k, df in [(3, 20), (4, 40), (5, 12)]],
}

# ---------- Datos para comparaciones ----------
g1 = np.round(rng.normal(50, 10, 18), 1)
g2 = np.round(rng.normal(56, 14, 24), 1)
g3 = np.round(rng.normal(47, 8, 15), 1)
grupos = {"A": lista(g1), "B": lista(g2), "C": lista(g3)}
R["grupos"] = grupos

# Mann-Whitney: muestra chica sin empates (exacta) y grande con empates (aproximación normal con corrección)
mw_chico_x, mw_chico_y = [1.2, 3.4, 2.2, 5.1, 4.0, 0.7], [6.3, 2.9, 7.7, 5.6, 8.1, 4.4, 9.0]
mw_grande_x = lista(np.round(rng.normal(10, 3, 30)))
mw_grande_y = lista(np.round(rng.normal(12, 3, 26)))
R["mann_whitney"] = []
for x, y, metodo in [(mw_chico_x, mw_chico_y, "exact"), (mw_grande_x, mw_grande_y, "asymptotic")]:
    res = stats.mannwhitneyu(x, y, alternative="two-sided", method=metodo, use_continuity=True)
    R["mann_whitney"].append({"x": x, "y": y, "U": float(res.statistic), "p": float(res.pvalue), "metodo": metodo})

# Kruskal-Wallis y Dunn (Holm)
kw_datos = {k: lista(np.round(np.array(v) / 5)) for k, v in grupos.items()}  # redondeo para generar empates
kw = stats.kruskal(*kw_datos.values())
dunn = sp.posthoc_dunn(list(kw_datos.values()), p_adjust="holm")
R["kruskal_wallis"] = {"grupos": kw_datos, "H": float(kw.statistic), "p": float(kw.pvalue),
                       "dunn_holm": {"AB": float(dunn.iloc[0, 1]), "AC": float(dunn.iloc[0, 2]), "BC": float(dunn.iloc[1, 2])}}

# Ajuste de p-valores
ps = [0.01, 0.04, 0.03, 0.2, 0.005]
R["ajuste_p"] = {"p": ps, "holm": lista(multipletests(ps, method="holm")[1]),
                 "bonferroni": lista(multipletests(ps, method="bonferroni")[1])}

# Tukey, Games-Howell, Welch de a pares
tk = stats.tukey_hsd(g1, g2, g3)
ci = tk.confidence_interval(0.95)
pares = [(0, 1), (0, 2), (1, 2)]
R["tukey"] = [{"par": f"{'ABC'[i]}{'ABC'[j]}", "dif": float(np.mean([g1, g2, g3][j]) - np.mean([g1, g2, g3][i])),
               "p": float(tk.pvalue[i, j]), "lo": float(-ci.high[i, j]), "hi": float(-ci.low[i, j])} for i, j in pares]
largo = pd.DataFrame({"y": np.concatenate([g1, g2, g3]), "g": ["A"] * len(g1) + ["B"] * len(g2) + ["C"] * len(g3)})
gh = pg.pairwise_gameshowell(data=largo, dv="y", between="g")
R["games_howell"] = [{"par": r.A + r.B, "dif": float(r.mean_B - r.mean_A), "p": float(r.pval), "df": float(r.df)} for r in gh.itertuples()]
welch = [stats.ttest_ind([g1, g2, g3][j], [g1, g2, g3][i], equal_var=False) for i, j in pares]
R["welch_pares"] = [{"par": f"{'ABC'[i]}{'ABC'[j]}", "t": float(w.statistic), "p": float(w.pvalue), "df": float(w.df)}
                    for (i, j), w in zip(pares, welch)]
R["welch_pares_holm"] = lista(multipletests([w.pvalue for w in welch], method="holm")[1])

# Comparación de medias (sin ponderar): Welch para 2 grupos, ANOVA y ANOVA de Welch para 3
t2 = stats.ttest_ind(g2, g1, equal_var=False)
an = stats.f_oneway(g1, g2, g3)
wa = pg.welch_anova(data=largo, dv="y", between="g")
R["comparar_medias"] = {"welch_t": float(t2.statistic), "welch_p": float(t2.pvalue), "welch_df": float(t2.df),
                        "anova_F": float(an.statistic), "anova_p": float(an.pvalue),
                        "welch_anova_F": float(wa["F"].iloc[0]), "welch_anova_p": float(wa["p_unc"].iloc[0]),
                        "welch_anova_df2": float(wa["ddof2"].iloc[0])}

# Shapiro-Wilk
R["shapiro"] = []
for n in [3, 7, 11, 25, 200]:
    x = lista(np.round(rng.gamma(2, 3, n), 2))
    s = stats.shapiro(x)
    R["shapiro"].append({"x": x, "W": float(s.statistic), "p": float(s.pvalue)})

# Levene (mediana)
lv = stats.levene(g1, g2, g3, center="median")
R["levene"] = {"F": float(lv.statistic), "p": float(lv.pvalue)}

# Pareados: t pareada y Wilcoxon
antes = lista(np.round(rng.normal(20, 4, 12), 1))
despues = lista(np.round(np.array(antes) + rng.normal(1.5, 2, 12), 1))
pt = stats.ttest_rel(antes, despues)
cip = pt.confidence_interval(0.95)
# Wilcoxon exacta: diferencias sin empates ni ceros (con empates Telar usa, correctamente, la aproximación normal)
antes_w = [12.0, 15.5, 9.8, 20.1, 14.4, 11.0, 17.3, 13.9, 16.6, 10.2, 18.8, 12.7]
despues_w = [13.1, 17.6, 9.5, 23.4, 14.9, 13.7, 17.1, 18.0, 18.2, 10.9, 25.0, 12.1]
wx = stats.wilcoxon(antes_w, despues_w, method="exact")
antes2 = [5, 7, 7, 3, 9, 6, 6, 8, 4, 5, 7, 6, 8, 9, 5]
despues2 = [6, 7, 9, 5, 9, 8, 7, 8, 6, 7, 6, 8, 9, 11, 7]
wx2 = stats.wilcoxon(antes2, despues2, method="approx", correction=False, zero_method="wilcox")
R["pareados"] = {"x": antes, "y": despues, "xw": antes_w, "yw": despues_w, "t": float(pt.statistic), "p": float(pt.pvalue),
                 "lo": float(cip.low), "hi": float(cip.high),
                 "wilcoxon_T": float(wx.statistic), "wilcoxon_p": float(wx.pvalue),
                 "x2": antes2, "y2": despues2, "wilcoxon2_T": float(wx2.statistic), "wilcoxon2_p": float(wx2.pvalue)}

# Correlaciones
cx = lista(np.round(rng.normal(0, 1, 40), 2))
cy = lista(np.round(np.array(cx) * 0.6 + rng.normal(0, 1, 40), 2))
sr = stats.spearmanr(cx, cy)
pr = stats.pearsonr(cx, cy)
R["correlacion"] = {"x": cx, "y": cy, "rho": float(sr.statistic), "p_rho": float(sr.pvalue), "r": float(pr.statistic)}

# ANOVA de dos factores, tipo II, desbalanceado
n2 = 60
fa = rng.choice(["a1", "a2", "a3"], n2)
fb = rng.choice(["b1", "b2"], n2)
yv = np.round(10 + (fa == "a2") * 2 + (fb == "b2") * 1.5 + (fa == "a3") * (fb == "b2") * 2 + rng.normal(0, 2, n2), 2)
d2 = pd.DataFrame({"a": fa, "b": fb, "y": yv})
tabla = sm.stats.anova_lm(smf.ols("y ~ C(a) * C(b)", data=d2).fit(), typ=2)
R["anova_dos_factores"] = {"obs": [{"a": a, "b": b, "y": float(y)} for a, b, y in zip(fa, fb, yv)],
                           "A": {"ss": float(tabla.loc["C(a)", "sum_sq"]), "F": float(tabla.loc["C(a)", "F"]), "p": float(tabla.loc["C(a)", "PR(>F)"])},
                           "B": {"ss": float(tabla.loc["C(b)", "sum_sq"]), "F": float(tabla.loc["C(b)", "F"]), "p": float(tabla.loc["C(b)", "PR(>F)"])},
                           "AB": {"ss": float(tabla.loc["C(a):C(b)", "sum_sq"]), "F": float(tabla.loc["C(a):C(b)", "F"]), "p": float(tabla.loc["C(a):C(b)", "PR(>F)"])},
                           "resid_ss": float(tabla.loc["Residual", "sum_sq"]), "resid_df": float(tabla.loc["Residual", "df"])}

# Alfa de Cronbach
lat = rng.normal(0, 1, 50)
items = np.clip(np.round(3 + lat[:, None] + rng.normal(0, 0.9, (50, 5))), 1, 5)
alfa = pg.cronbach_alpha(pd.DataFrame(items))[0]
si_se_quita = [pg.cronbach_alpha(pd.DataFrame(np.delete(items, j, axis=1)))[0] for j in range(5)]
item_resto = [float(np.corrcoef(items[:, j], items.sum(1) - items[:, j])[0, 1]) for j in range(5)]
R["cronbach"] = {"items": items.tolist(), "alfa": float(alfa), "alfa_si_se_quita": lista(si_se_quita), "item_resto": item_resto}

# Kappa de Cohen (2×2)
cod_a = rng.integers(0, 2, 80)
cod_b = np.where(rng.random(80) < 0.8, cod_a, 1 - cod_a)
tab = {"a": int(((cod_a == 1) & (cod_b == 1)).sum()), "b": int(((cod_a == 1) & (cod_b == 0)).sum()),
       "c": int(((cod_a == 0) & (cod_b == 1)).sum()), "d": int(((cod_a == 0) & (cod_b == 0)).sum())}
R["kappa"] = {**tab, "k": float(cohen_kappa_score(cod_a, cod_b))}

# Intervalo de Wilson y χ² de proporciones
R["wilson"] = [{"k": k, "n": n, "lo": float(lo) * 100, "hi": float(hi) * 100}
               for k, n in [(12, 40), (1, 25), (95, 100), (300, 1000)]
               for lo, hi in [proportion_confint(k, n, method="wilson")]]
props = [{"g": "A", "k": 14, "n": 40}, {"g": "B", "k": 25, "n": 45}, {"g": "C", "k": 9, "n": 38}]
ch = stats.chi2_contingency([[p["k"], p["n"] - p["k"]] for p in props], correction=False)
R["chi2_proporciones"] = {"grupos": props, "chi2": float(ch.statistic), "p": float(ch.pvalue)}

# Porcentaje y media con ponderador (linealización de Taylor, cada caso como unidad de muestreo:
# el mismo criterio que svymean del paquete survey de R con un diseño sin estratos ni conglomerados)
npd = 150
peso = np.round(rng.uniform(0.3, 3.0, npd), 3)
atrib = (rng.random(npd) < 0.35).astype(float)
valor = np.round(rng.normal(40, 12, npd), 1)
W = peso.sum()
p_pond = (peso * atrib).sum() / W
var_p = npd / (npd - 1) * ((peso * (atrib - p_pond)) ** 2).sum() / W ** 2
m_pond = (peso * valor).sum() / W
var_m = npd / (npd - 1) * ((peso * (valor - m_pond)) ** 2).sum() / W ** 2
neff = p_pond * (1 - p_pond) / var_p
lo, hi = proportion_confint(p_pond * neff, neff, method="wilson")
R["ponderados"] = {"w": lista(peso), "atributo": lista(atrib), "valor": lista(valor),
                   "p": float(p_pond), "ee_p": float(np.sqrt(var_p)), "ic_lo": float(lo) * 100, "ic_hi": float(hi) * 100,
                   "media": float(m_pond), "ee_media": float(np.sqrt(var_m))}

# ---------- Regresión ----------
nr = 120
x1 = np.round(rng.normal(0, 1, nr), 3)
x2 = rng.integers(0, 2, nr).astype(float)
yl = np.round(2 + 1.5 * x1 - 0.8 * x2 + rng.normal(0, 1.2, nr), 3)
wv = np.round(rng.uniform(0.4, 2.5, nr), 3)
X = sm.add_constant(np.column_stack([x1, x2]))
ols = sm.OLS(yl, X).fit()
wls = sm.WLS(yl, X, weights=wv).fit(cov_type="HC0")
V_dis = wls.cov_params() * nr / (nr - 1)  # sándwich de diseño (como svyglm con cada caso como unidad)
eta = -0.3 + 1.1 * x1 + 0.7 * x2
yb = (rng.random(nr) < 1 / (1 + np.exp(-eta))).astype(float)
lg = sm.Logit(yb, X).fit(disp=0)
# Logística ponderada: estimación por máxima verosimilitud ponderada y sándwich con n/(n−1)
glm_w = sm.GLM(yb, X, family=sm.families.Binomial(), var_weights=wv).fit()
pw = glm_w.predict(X)
bread = np.linalg.inv((X * (wv * pw * (1 - pw))[:, None]).T @ X)
meat = (X * ((wv * (yb - pw)) ** 2)[:, None]).T @ X
V_lw = bread @ meat @ bread * nr / (nr - 1)
R["regresion"] = {"X": X.tolist(), "y": lista(yl), "w": lista(wv), "yb": lista(yb),
                  "ols": {"b": lista(ols.params), "se": lista(ols.bse), "r2": float(ols.rsquared), "r2a": float(ols.rsquared_adj),
                          "F": float(ols.fvalue), "pF": float(ols.f_pvalue), "p": lista(ols.pvalues)},
                  "ols_ponderada": {"b": lista(wls.params), "se": lista(np.sqrt(np.diag(V_dis)))},
                  "logit": {"b": lista(lg.params), "se": lista(lg.bse), "ll": float(lg.llf), "ll0": float(lg.llnull),
                            "LR": float(lg.llr), "pLR": float(lg.llr_pvalue), "p": lista(lg.pvalues)},
                  "logit_ponderada": {"b": lista(glm_w.params), "se": lista(np.sqrt(np.diag(V_lw)))}}

# ---------- Archivos de SPSS y Stata ----------
df = pd.DataFrame({
    "id": [1, 2, 3, 4, 5, 6],
    "sexo": [1, 2, 2, 1, 9, 2],
    "edad": [34, 51, 27, np.nan, 45, 62],
    "barrio": ["Centro", "Sur", "Pueyrredón", "Norte", "Centro", "Ñandú"],
    "ingreso": [120500.5, 98000.0, 0.25, 155000.75, 87000.0, 101000.0],
})
etiquetas_var = ["Identificador", "Sexo de la persona", "Edad en años", "Barrio de residencia", "Ingreso mensual"]
etiquetas_val = {"sexo": {1: "Varón", 2: "Mujer", 9: "No responde"}}
for nombre, comprimir in [("ejemplo_sin_comprimir.sav", False), ("ejemplo_comprimido.sav", True)]:
    pyreadstat.write_sav(df, str(AQUI / nombre), column_labels=etiquetas_var, variable_value_labels=etiquetas_val,
                         missing_ranges={"sexo": [9]}, variable_measure={"sexo": "nominal", "edad": "scale"},
                         row_compress=comprimir, file_label="Encuesta de prueba")
pyreadstat.write_dta(df, str(AQUI / "ejemplo.dta"), column_labels=etiquetas_var, variable_value_labels=etiquetas_val,
                     file_label="Encuesta de prueba", version=15)
R["archivos"] = {"columnas": list(df.columns), "etiquetas_var": etiquetas_var,
                 "filas": [[None if (isinstance(v, float) and np.isnan(v)) else v for v in fila] for fila in df.astype(object).values.tolist()],
                 "etiquetas_sexo": {"1": "Varón", "2": "Mujer", "9": "No responde"}}

(AQUI / "referencias.json").write_text(json.dumps(R, ensure_ascii=False, indent=1), encoding="utf-8")
print("Referencias generadas:", ", ".join(R.keys()))
