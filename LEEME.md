# Telar · Asistente de investigación — versión 0.10.0 (beta)

Telar integra el análisis de bases de datos y encuestas, relatos fechados, entrevistas y codificación cualitativa en una sola herramienta. Funciona entera en el navegador: **los archivos de cada persona se procesan en su computadora y no se envían a ningún servidor.**

## Qué hay en esta carpeta

| Archivo o carpeta | Para qué sirve |
|---|---|
| `index.html` | La aplicación |
| `manifest.webmanifest`, `sw.js`, `icons/` | Lo que permite instalarla y usarla sin conexión |
| `vendor/` | Librerías incluidas (Excel, gráficos, Word, PDF), para no depender de internet |
| `fonts/` | Tipografías incluidas (no se consulta a Google Fonts) |
| `vendor/tesseract/` | Motor de OCR (texto desde imágenes) y datos del idioma español. Se descarga solo la primera vez que se usa |
| `sample-project.js` | El proyecto de ejemplo, con datos ficticios |
| `LICENCIAS-DE-TERCEROS.txt` | Licencias de las librerías y tipografías incluidas |

**Importante:** la carpeta tiene que publicarse completa. Si se mueve solo `index.html`, la app no encuentra sus librerías.

## Probarla en tu computadora

Hacé doble clic en `index.html`. Funciona todo, salvo la instalación como aplicación y el uso sin conexión, que solo se activan cuando la app está publicada en internet (por `https`).

## Publicarla en GitHub Pages (gratis)

1. Creá una cuenta en [github.com](https://github.com) si no tenés una.
2. Creá un repositorio nuevo (botón **New**), por ejemplo `telar`. Puede ser público. *Con una cuenta gratuita, GitHub Pages solo funciona con repositorios públicos: el código de la app queda visible, pero los datos de quienes la usan nunca pasan por ahí.*
3. En el repositorio, **Add file → Upload files** y arrastrá **todo el contenido** de esta carpeta (no la carpeta en sí: `index.html` tiene que quedar en la raíz). Confirmá con **Commit changes**.
4. Andá a **Settings → Pages**. En *Source* elegí **Deploy from a branch**, rama `main` y carpeta `/ (root)`. Guardá.
5. En uno o dos minutos la app queda publicada en `https://TU-USUARIO.github.io/telar/`. Esa es la dirección para compartir con quienes prueben la beta.

Con la app publicada:

- En Chrome o Edge aparece el botón **📲 Instalar** en el encabezado. En iPhone o iPad: Compartir → **Agregar a inicio**.
- Después de abrirla una vez, funciona sin internet.
- Instalada en Chrome o Edge de escritorio, se puede abrir un `.xlsx`, `.csv`, `.docx` o `.sav` directamente con Telar.

Si más adelante el Instituto ofrece un servidor propio, sirve cualquier hosting estático con `https`: se sube la misma carpeta.

## Guardar el proyecto en un archivo (.telar)

Con **💾 Guardar** (o Ctrl+S) todo el proyecto se guarda en un archivo `.telar`, que se abre con **📂 Abrir**. En Chrome y Edge se guarda siempre sobre el mismo archivo y, si se activa, automáticamente mientras se trabaja; en otros navegadores se descarga una copia cada vez. Puede protegerse con contraseña. Las sesiones `.json` exportadas con versiones anteriores también se abren con **📂 Abrir**.

## Formatos que lee

Planillas `.xlsx`, `.xls`, `.ods` y `.csv`; SPSS `.sav`; Stata `.dta` (versiones 8 a 18); documentos `.docx`, `.odt` y `.txt`; imágenes y PDF escaneados (OCR). El informe se descarga en Word (`.docx`), PDF o HTML.

## Texto desde imágenes (OCR)

Las fotos, capturas de pantalla y PDF escaneados se leen con el motor Tesseract, incluido en `vendor/tesseract/`. Se suben desde "Cargar datos", se pegan con Ctrl+V o se abren con el botón **📷 Texto desde imagen (OCR)** de la solapa Relatos. Todo se procesa en la computadora. El OCR funciona con la app publicada o instalada; abriendo `index.html` con doble clic, el navegador no permite cargar el motor.

## Configurar el formulario de comentarios

1. Creá un Formulario de Google (o el que prefieras) con las preguntas de abajo.
2. Copiá su enlace para compartir (botón **Enviar** → ícono de enlace).
3. Abrí `index.html` con un editor de texto y buscá, cerca del comienzo del código, la línea:

   ```js
   const FEEDBACK_URL = '';
   ```

   Pegá el enlace entre las comillas y guardá:

   ```js
   const FEEDBACK_URL = 'https://forms.gle/xxxxxxxx';
   ```

4. Volvé a subir `index.html` al repositorio.

Mientras esa línea esté vacía, el botón "Comentarios" explica que el formulario todavía no está configurado.

### Preguntas sugeridas para el formulario

1. ¿Cuál es tu disciplina o área de investigación?
2. ¿Con qué tipo de material trabajaste en Telar? (bases de eventos, encuestas, relatos o crónicas, entrevistas, matrices de codificación, archivos de SPSS, bibliografía)
3. ¿Qué querías hacer y pudiste hacerlo? (sí / en parte / no)
4. ¿Algo no funcionó o dio un resultado que te pareció incorrecto? Si podés, pegá el **Informe de problema** que genera la app (no incluye tus datos).
5. ¿Qué te resultó confuso o difícil de encontrar?
6. ¿Qué función te gustaría que tuviera? (por ejemplo: codificar con otras personas en tiempo real, otras pruebas estadísticas, otros formatos de archivo)
7. ¿La usarías en una investigación real? ¿Qué te falta para hacerlo?
8. En general, del 1 al 5, ¿qué tan útil te resultó?
9. ¿Querés que te avisemos de las próximas versiones? (correo, opcional)

## Publicar una versión nueva

1. En `index.html`, cambiá `APP_VERSION` (por ejemplo, de `'0.9.0'` a `'0.9.1'`).
2. En `sw.js`, cambiá `VERSION` al mismo número.
3. Subí los archivos al repositorio.

Quienes ya tengan la app abierta o instalada ven el aviso **"Hay una versión nueva de Telar — Actualizar"**. Al actualizar, su trabajo se guarda antes de recargar.

## Privacidad

- Los archivos se leen en la computadora de cada persona; nada se sube a ningún servidor.
- Lo que cada persona hace queda guardado solo en su navegador, salvo en **modo privado**, que no guarda datos.
- La única consulta externa es la búsqueda opcional de datos bibliográficos en CrossRef (solo se envía el DOI o el título buscado).
- El **Informe de problema** solo incluye información técnica (versión, navegador, cantidades y tipos de columnas) y se revisa antes de enviarlo.

## Cómo citarla

Telar · Asistente de investigación, versión 0.10.0 (beta). La versión figura también en cada informe, anexo metodológico y archivo exportado.

## Licencias

Las librerías y tipografías incluidas tienen licencias libres (Apache 2.0, MIT, BSD y SIL Open Font License); el detalle está en `LICENCIAS-DE-TERCEROS.txt`.
