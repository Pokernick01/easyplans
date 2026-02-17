# EasyPlans

EasyPlans is a free architectural plan creator for students and general users.

## English

### What it includes
- 2D plan editor
- 3D view
- Export to image/PDF
- Multi-floor projects

### Recent canvas management behavior
- `New Project` button (and `Ctrl+N`) now asks to save your current project before creating a blank one.
- If you choose save, the app runs the normal save flow first.
- `Clear Canvas` button asks for confirmation before removing all elements from all floors.
- On mobile, sidebars now auto-collapse on load so the drawing canvas is visible immediately.
- The active workflow is now `Plan + 3D` (section/facade tabs removed from UI).
- 3D rendering now has improved shading, depth readability, and touch/wheel orbit controls.
- Plan and 3D now display orientation markers (North + Front), and `Front direction` is configurable from the top bar.
- The top bar includes a more prominent `Apoyame` support button.

### Development
```bash
npm install
npm run dev
```

### Build and quality checks
```bash
npm run lint
npm run build
```

### Manual
- In-app: Top bar -> `More` -> `Help`
- Direct file: `public/manual.html`

## Espanol

### Que incluye
- Editor de plano 2D
- Vista 3D
- Exportacion a imagen/PDF
- Proyectos con multiples pisos

### Comportamiento reciente de gestion de lienzo
- El boton `Nuevo proyecto` (y `Ctrl+N`) ahora pregunta si deseas guardar el proyecto actual antes de crear uno en blanco.
- Si eliges guardar, la app ejecuta primero el flujo normal de guardado.
- El boton `Limpiar lienzo` pide confirmacion antes de eliminar todos los elementos de todos los pisos.
- En movil, las barras laterales se cierran automaticamente al abrir para mostrar el lienzo de inmediato.
- El flujo activo ahora es `Planta + 3D` (las pestanas de corte/fachada se quitaron de la UI).
- El render 3D ahora tiene mejor sombreado, mejor lectura de profundidad y controles tactiles/rueda para orbitar.
- Planta y 3D ahora muestran marcadores de orientacion (Norte + Frente), y la `Direccion de frente` se puede configurar en la barra superior.
- La barra superior incluye un boton `Apoyame` mas visible.

### Manual
- Dentro de la app: barra superior -> `Mas` -> `Ayuda`
- Archivo directo: `public/manual.html`
