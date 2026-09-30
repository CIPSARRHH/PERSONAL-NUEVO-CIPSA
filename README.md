# CIPSA · Ficha de ingreso de personal

Aplicación web para que cada persona complete su ficha desde un enlace y el sistema genere automáticamente **un solo PDF por persona** con sus documentos de ingreso ya completados: los 7 formatos generales y el formato de abono de haberes del banco que la persona eligió.

- **Formulario** (para las personas): `https://TU-DOMINIO/`
- **Panel de administración** (solo RR. HH.): `https://TU-DOMINIO/admin`

## Qué hace

1. La persona abre el enlace y completa 6 pasos: datos personales, contacto y domicilio, familia, estudios, experiencia laboral, y pensiones y banco. Al final revisa sus datos y envía la ficha.
2. El sistema le asigna un código único con el formato `NOMBRE-APELLIDO-NNN` (por ejemplo, `DAYHANA-MUNOZ-001`) y se lo muestra en pantalla.
3. En el panel, RR. HH. ve la lista, busca por nombre, código o documento, revisa los datos y descarga o imprime el PDF. El archivo se llama con el código: `DAYHANA-MUNOZ-001.pdf`.
4. Se pueden descargar varios PDFs juntos en un ZIP y exportar todos los registros a Excel (CSV).

El PDF se genera en el momento de descargarlo a partir de los datos guardados. Así, cada archivo siempre corresponde a una sola persona y usa los formatos originales vigentes.

## Los documentos (en este orden dentro del PDF)

| N.° | Documento | Plantilla |
|---|---|---|
| 01 | Consentimiento para el uso de datos personales | `templates/01_consentimiento.pdf` |
| 02 | Compromiso de confidencialidad | `templates/02_confidencialidad.pdf` |
| 03 | Cuestionario de antecedentes de salud | `templates/03_salud.pdf` |
| 04 | Información del trabajador | `templates/04_info_trabajador.pdf` |
| 05 | Elección del sistema de pensiones | `templates/05_pensiones.pdf` |
| 06 | Declaración jurada de domicilio | `templates/06_domicilio.pdf` |
| 07 | Depositario de la CTS | `templates/07_cts.pdf` |
| 08 | Abono de haberes: **solo el del banco elegido** (BCP, BBVA, Interbank o Scotiabank) | `templates/08…11_*.pdf` |

Se dejan en blanco, para completar a mano o por RR. HH.:

- Firmas, huellas y foto.
- Las casillas "CÓDIGO" de los formatos.
- La sección "Admisión" de la ficha de información del trabajador.
- Las respuestas del cuestionario de salud.

Los pies de página y códigos de los formatos no se modifican.

## Probar en tu computadora

Requisito: Node.js 18 o superior.

```bash
npm install
ADMIN_PASSWORD=tu_clave npm start
# Formulario: http://localhost:3000   Panel: http://localhost:3000/admin
```

En Windows (PowerShell): `$env:ADMIN_PASSWORD="tu_clave"; npm start`

Para generar un PDF de ejemplo sin abrir la web: `npm run ejemplo`.

## Publicarlo en internet (Render)

1. Sube esta carpeta a un repositorio de GitHub.
2. En [render.com](https://render.com), elige **New → Blueprint** y selecciona el repositorio. Se usará `render.yaml`.
3. Cuando lo pida, escribe la contraseña del panel en `ADMIN_PASSWORD`.
4. Al terminar, Render te da una dirección como `https://cipsa-registro-personal.onrender.com`. Ese es el enlace que envías a las personas.

**Importante:** los registros se guardan en un disco persistente (`/var/data`). Render solo ofrece disco persistente en planes de pago (plan *Starter*, unos USD 7 al mes). En el plan gratuito los datos se borran cada vez que el servicio se reinicia.

Otras opciones equivalentes: Railway (con un volumen montado en `/data` y la variable `DATA_DIR=/data`) o cualquier servidor con Docker (`Dockerfile` incluido).

### Variables de configuración

| Variable | Para qué sirve |
|---|---|
| `ADMIN_PASSWORD` | Contraseña del panel. **Obligatorio cambiarla**; si no se define, se usa `cipsa2026`. |
| `SESSION_SECRET` | Clave para firmar la sesión del panel. Render la genera sola. |
| `DATA_DIR` | Carpeta donde se guardan los registros (`registros.json`). |
| `PORT` | Puerto del servidor; la plataforma lo asigna. |

## Cambiar los campos del formulario

Desde el panel, en la pestaña **Formulario**, puedes editar la configuración y guardarla. También puedes editar directamente `config/formulario.json`.

Tipos de campo disponibles:

- `texto`, `correo`, `telefono`, `fecha`
- `seleccion` (lista desplegable)
- `opciones` (botones de elección)
- `casilla`
- `grupo` (filas repetibles, con `max`)

Otras propiedades útiles:

- `visibleSi` muestra un campo solo cuando otro campo tiene un valor determinado.
- **No cambies el `key` de los campos existentes**, porque los documentos lo usan para rellenarse.

Los campos nuevos que agregues se guardan, se ven en el panel y salen en la exportación CSV. Para que además aparezcan dentro de algún PDF, hay que añadirlos al mapeo.

## Ajustar la posición de un dato en un PDF

Todas las posiciones están en `config/documentos.js`, separadas por documento y página. Cada campo indica:

- `x0` y `x1`: desde dónde y hasta dónde se escribe, en puntos PDF medidos desde la izquierda.
- `base`: la altura de la línea de escritura, medida desde el borde superior de la página.
- La función que devuelve el dato del formulario que se escribe ahí.

Si un texto no cabe, la letra se reduce automáticamente.

Si en el futuro cambias un formato, reemplaza el PDF en `templates/` con el mismo nombre y revisa sus posiciones.

## Seguridad y datos personales

- El panel requiere contraseña. La sesión dura 8 horas y hay bloqueo temporal tras varios intentos fallidos.
- No se permite registrar dos veces el mismo número de documento. Si una persona necesita corregir su ficha, elimina su registro desde el panel y pídele que la envíe de nuevo.
- Haz copias de seguridad periódicas del archivo `DATA_DIR/registros.json`.
- Publica el sistema siempre con HTTPS; Render y Railway lo incluyen.
