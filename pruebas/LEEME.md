# Pruebas automáticas de Telar

Estas pruebas comprueban que los cálculos de Telar dan los mismos resultados que bibliotecas estadísticas
establecidas e independientes: **SciPy, statsmodels, pingouin, scikit-learn y scikit-posthocs**.
Usan exactamente el código de `index.html` (no una copia), así que si un cambio altera un resultado, se detecta.

No forman parte de la app: quien usa Telar no las descarga ni las ve.

## Qué se verifica

| Área | Pruebas |
|---|---|
| Distribuciones | χ², F, t, normal, beta incompleta, rango estudentizado (p-valores y cuantiles) |
| No paramétricas | Mann-Whitney (exacta y aproximada), Kruskal-Wallis, Dunn, Wilcoxon (exacta y aproximada), Spearman |
| Comparación de grupos | t de Welch, ANOVA, ANOVA de Welch, Tukey-Kramer, Games-Howell, Welch de a pares, Holm y Bonferroni |
| Supuestos | Shapiro-Wilk, Levene (mediana) |
| Datos pareados | t pareada con IC |
| Modelos | ANOVA de dos factores (tipo II), regresión lineal y logística, con y sin ponderador |
| Encuestas con ponderador | error estándar e IC de porcentajes, error estándar de medias, Rao-Scott |
| Escalas y acuerdo | alfa de Cronbach (y si se quita cada ítem, correlación ítem-resto), kappa de Cohen |
| Proporciones | IC de Wilson, χ² entre grupos |
| Archivos | SPSS `.sav` (con y sin compresión, etiquetas, valores perdidos, acentos y ñ) y Stata `.dta` |

## Cómo se corren

Se corren solas en GitHub cada vez que se sube un cambio (pestaña **Actions** del repositorio).
Para correrlas en una computadora con Node.js instalado:

```
cd pruebas
npm install
npm test
```

## Archivos

- `motor.js`: toma las funciones de `index.html` sin ejecutar la interfaz.
- `estadistica.test.js`: las pruebas.
- `referencias/generar_referencias.py`: calcula los valores de referencia con Python y genera los archivos de ejemplo.
- `referencias/referencias.json`: los valores de referencia y los datos de entrada.
- `referencias/ejemplo*.sav`, `referencias/ejemplo.dta`: archivos de prueba con datos ficticios.
