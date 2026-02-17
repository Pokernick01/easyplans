# EasyPlans

EasyPlans is a free architectural plan creator for students and general users.

## English

### What it includes
- 2D plan editor
- Facade (elevation) view
- 3D view
- Export to image/PDF
- Multi-floor projects

### Recent canvas management behavior
- `New Project` button (and `Ctrl+N`) now asks to save your current project before creating a blank one.
- If you choose save, the app runs the normal save flow first.
- `Clear Canvas` button asks for confirmation before removing all elements from all floors.

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
- Vista de fachada (elevacion)
- Vista 3D
- Exportacion a imagen/PDF
- Proyectos con multiples pisos

### Comportamiento reciente de gestion de lienzo
- El boton `Nuevo proyecto` (y `Ctrl+N`) ahora pregunta si deseas guardar el proyecto actual antes de crear uno en blanco.
- Si eliges guardar, la app ejecuta primero el flujo normal de guardado.
- El boton `Limpiar lienzo` pide confirmacion antes de eliminar todos los elementos de todos los pisos.

### Manual
- Dentro de la app: barra superior -> `Mas` -> `Ayuda`
- Archivo directo: `public/manual.html`
