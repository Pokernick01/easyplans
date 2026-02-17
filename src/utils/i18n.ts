import { useUIStore } from '@/store/ui-store.ts';

// ---------------------------------------------------------------------------
// Simple i18n helper — English / Spanish
// ---------------------------------------------------------------------------

export type Language = 'en' | 'es';

const dict: Record<string, { en: string; es: string }> = {
  // -- Tool names --
  'tool.select': { en: 'Select', es: 'Seleccionar' },
  'tool.wall': { en: 'Wall', es: 'Muro' },
  'tool.door': { en: 'Door', es: 'Puerta' },
  'tool.window': { en: 'Window', es: 'Ventana' },
  'tool.room': { en: 'Room', es: 'Cuarto' },
  'tool.dimension': { en: 'Dimension', es: 'Cota' },
  'tool.text': { en: 'Text', es: 'Texto' },
  'tool.stamp': { en: 'Furniture', es: 'Muebles' },
  'tool.eraser': { en: 'Erase', es: 'Borrar' },
  'tool.archline': { en: 'Lines', es: 'L\u00edneas' },
  'tool.stair': { en: 'Stairs', es: 'Escaleras' },

  // -- Tool hints --
  'hint.select': {
    en: 'Click to select, drag to move. Shift for multi-select.',
    es: 'Clic para seleccionar, arrastrar para mover. Shift para multi-selecci\u00f3n.',
  },
  'hint.wall': {
    en: 'Click to start wall, click again to finish.',
    es: 'Clic para iniciar muro, clic de nuevo para terminar.',
  },
  'hint.door': {
    en: 'Click on a wall to place a door.',
    es: 'Clic en un muro para colocar puerta.',
  },
  'hint.window': {
    en: 'Click on a wall to place a window.',
    es: 'Clic en un muro para colocar ventana.',
  },
  'hint.room': {
    en: 'Click corners to define room. Double-click to close.',
    es: 'Clic en esquinas para definir cuarto. Doble clic para cerrar.',
  },
  'hint.dimension': {
    en: 'Click start point, then end point to create dimension.',
    es: 'Clic en punto inicio, luego punto final para crear cota.',
  },
  'hint.text': {
    en: 'Click to place a text label.',
    es: 'Clic para colocar etiqueta de texto.',
  },
  'hint.stamp': {
    en: 'Select furniture from the Library, then click to place.',
    es: 'Selecciona un mueble de la Biblioteca, luego clic para colocar.',
  },
  'hint.eraser': {
    en: 'Click an element to delete it.',
    es: 'Clic en un elemento para eliminarlo.',
  },
  'hint.archline': {
    en: 'Click start point, then end point to draw line.',
    es: 'Clic punto inicio, luego punto final para dibujar l\u00ednea.',
  },
  'hint.stair': {
    en: 'Click to place stairs. R to rotate.',
    es: 'Clic para colocar escaleras. R para rotar.',
  },

  // -- View modes --
  'view.plan': { en: 'Plan', es: 'Planta' },
  'view.section': { en: 'Section', es: 'Corte' },
  'view.facade': { en: 'Facade', es: 'Fachada' },
  'view.isometric': { en: '3D', es: '3D' },

  // -- TopBar UI labels --
  'ui.grid': { en: 'Grid', es: 'Cuadr\u00edcula' },
  'ui.snap': { en: 'Snap', es: 'Ajustar' },
  'ui.dimensions': { en: 'Dimensions', es: 'Cotas' },
  'ui.undo': { en: 'Undo', es: 'Deshacer' },
  'ui.redo': { en: 'Redo', es: 'Rehacer' },
  'ui.export': { en: 'Export', es: 'Exportar' },
  'ui.newProject': { en: 'New Project', es: 'Nuevo proyecto' },
  'ui.clearCanvas': { en: 'Clear Canvas', es: 'Limpiar lienzo' },
  'ui.save': { en: 'Save', es: 'Guardar' },
  'ui.saveAs': { en: 'Save as:', es: 'Guardar como:' },
  'ui.load': { en: 'Load', es: 'Cargar' },
  'ui.custom': { en: 'Custom...', es: 'Personalizado...' },
  'ui.more': { en: 'More', es: 'Más' },
  'ui.floorActions': { en: 'Floor actions', es: 'Acciones de piso' },

  // -- TopBar tooltips --
  'tooltip.grid': { en: 'Grid (G)', es: 'Cuadr\u00edcula (G)' },
  'tooltip.snap': { en: 'Snap (S)', es: 'Ajustar (S)' },
  'tooltip.dimensions': { en: 'Dimensions (D)', es: 'Cotas (D)' },
  'tooltip.undo': { en: 'Undo (Ctrl+Z)', es: 'Deshacer (Ctrl+Z)' },
  'tooltip.redo': { en: 'Redo (Ctrl+Y)', es: 'Rehacer (Ctrl+Y)' },
  'tooltip.export': { en: 'Export', es: 'Exportar' },
  'tooltip.newProject': { en: 'New Project (Ctrl+N)', es: 'Nuevo proyecto (Ctrl+N)' },
  'tooltip.clearCanvas': { en: 'Clear all elements', es: 'Eliminar todos los elementos' },
  'tooltip.save': { en: 'Save Project', es: 'Guardar Proyecto' },
  'tooltip.load': { en: 'Load Project', es: 'Cargar Proyecto' },

  // -- Confirmations --
  'confirm.newProject.saveBefore': {
    en: 'Save the current project before creating a new one?',
    es: '¿Guardar el proyecto actual antes de crear uno nuevo?',
  },
  'confirm.newProject.discardChanges': {
    en: 'Create a new project without saving?',
    es: '¿Crear un proyecto nuevo sin guardar?',
  },
  'confirm.clearCanvas': {
    en: 'Are you sure you want to clear the canvas? This removes all elements on all floors.',
    es: '¿Seguro que deseas limpiar el lienzo? Esto elimina todos los elementos de todos los pisos.',
  },

  // -- BottomBar --
  'ui.addFloor': { en: 'Add floor', es: 'Agregar piso' },
  'ui.duplicateFloor': { en: 'Duplicate floor', es: 'Duplicar piso' },
  'ui.removeFloor': { en: 'Delete floor', es: 'Eliminar piso' },
  'ui.zoomToFit': { en: 'Zoom to fit', es: 'Ajustar a vista' },

  // -- RightSidebar tabs --
  'tab.properties': { en: 'Properties', es: 'Propiedades' },
  'tab.library': { en: 'Library', es: 'Biblioteca' },

  // -- RightSidebar property labels --
  'prop.wall': { en: 'Wall', es: 'Muro' },
  'prop.door': { en: 'Door', es: 'Puerta' },
  'prop.window': { en: 'Window', es: 'Ventana' },
  'prop.room': { en: 'Room', es: 'Cuarto' },
  'prop.furniture': { en: 'Furniture', es: 'Mueble' },
  'prop.text': { en: 'Text', es: 'Texto' },
  'prop.dimension': { en: 'Dimension', es: 'Cota' },
  'prop.stair': { en: 'Stair', es: 'Escalera' },
  'prop.archline': { en: 'Architectural Line', es: 'L\u00ednea Arquitect\u00f3nica' },

  // -- Common property field labels --
  'field.length': { en: 'Length', es: 'Largo' },
  'field.width': { en: 'Width', es: 'Ancho' },
  'field.height': { en: 'Height', es: 'Alto' },
  'field.depth': { en: 'Depth', es: 'Profundidad' },
  'field.thickness': { en: 'Thickness', es: 'Espesor' },
  'field.startX': { en: 'Start X', es: 'Inicio X' },
  'field.startY': { en: 'Start Y', es: 'Inicio Y' },
  'field.endX': { en: 'End X', es: 'Fin X' },
  'field.endY': { en: 'End Y', es: 'Fin Y' },
  'field.position': { en: 'Position', es: 'Posici\u00f3n' },
  'field.rotation': { en: 'Rotation', es: 'Rotaci\u00f3n' },
  'field.angle': { en: 'Angle', es: '\u00c1ngulo' },
  'field.color': { en: 'Color', es: 'Color' },
  'field.fillColor': { en: 'Fill Color', es: 'Color Relleno' },
  'field.style': { en: 'Style', es: 'Estilo' },
  'field.label': { en: 'Label', es: 'Etiqueta' },
  'field.pattern': { en: 'Pattern', es: 'Patr\u00f3n' },
  'field.area': { en: 'Area', es: '\u00c1rea' },
  'field.scale': { en: 'Scale', es: 'Escala' },
  'field.fontSize': { en: 'Font Size', es: 'Tama\u00f1o Fuente' },
  'field.offset': { en: 'Offset', es: 'Desplazamiento' },
  'field.treads': { en: 'Treads', es: 'Pelda\u00f1os' },
  'field.riserHeight': { en: 'Riser Height', es: 'Altura Contrahuella' },
  'field.sillHeight': { en: 'Sill Height', es: 'Altura Antepecho' },
  'field.lineWeight': { en: 'Line Weight', es: 'Grosor L\u00ednea' },
  'field.opening': { en: 'Opening', es: 'Apertura' },
  'field.side': { en: 'Side', es: 'Lado' },
  'field.hinge': { en: 'Hinge', es: 'Bisagra' },
  'field.openAngle': { en: 'Open Angle', es: '\u00c1ngulo Apertura' },
  'field.direction': { en: 'Direction', es: 'Direcci\u00f3n' },
  'field.flip': { en: 'Flip', es: 'Voltear' },
  'field.text': { en: 'Text', es: 'Texto' },

  // -- Door styles --
  'doorStyle.single': { en: 'Single', es: 'Simple' },
  'doorStyle.double': { en: 'Double', es: 'Doble' },
  'doorStyle.sliding': { en: 'Sliding', es: 'Corrediza' },
  'doorStyle.pocket': { en: 'Pocket', es: 'Empotrada' },
  'doorStyle.folding': { en: 'Folding', es: 'Plegable' },
  'doorStyle.revolving': { en: 'Revolving', es: 'Giratoria' },

  // -- Window styles --
  'windowStyle.single': { en: 'Single', es: 'Simple' },
  'windowStyle.double': { en: 'Double', es: 'Doble' },
  'windowStyle.sliding': { en: 'Sliding', es: 'Corrediza' },
  'windowStyle.fixed': { en: 'Fixed', es: 'Fija' },
  'windowStyle.casement': { en: 'Casement', es: 'Abatible' },
  'windowStyle.awning': { en: 'Awning', es: 'Proyectante' },

  // -- Stair styles --
  'stairStyle.straight': { en: 'Straight', es: 'Recta' },
  'stairStyle.l-shaped': { en: 'L-Shaped', es: 'Forma L' },
  'stairStyle.u-shaped': { en: 'U-Shaped', es: 'Forma U' },
  'stairStyle.spiral': { en: 'Spiral', es: 'Espiral' },
  'stairStyle.winder': { en: 'Winder', es: 'Compensada' },
  'stairStyle.curved': { en: 'Curved', es: 'Curva' },

  // -- Arch line styles --
  'archStyle.colindancia': { en: 'Boundary', es: 'Colindancia' },
  'archStyle.limite-lote': { en: 'Lot Limit', es: 'L\u00edmite de Lote' },
  'archStyle.eje': { en: 'Axis', es: 'Eje' },
  'archStyle.setback': { en: 'Setback', es: 'Restricci\u00f3n' },
  'archStyle.center': { en: 'Center', es: 'Eje Central' },

  // -- Selector headers --
  'selector.lineStyle': { en: 'Line Style', es: 'Estilo de L\u00ednea' },
  'selector.doorStyle': { en: 'Door Style', es: 'Estilo de Puerta' },
  'selector.windowStyle': { en: 'Window Style', es: 'Estilo de Ventana' },
  'selector.stairStyle': { en: 'Stair Style', es: 'Estilo de Escalera' },

  // -- Door swing directions --
  'swing.left': { en: 'Left', es: 'Izquierda' },
  'swing.right': { en: 'Right', es: 'Derecha' },

  // -- Door side --
  'side.interior': { en: 'Interior', es: 'Interior' },
  'side.exterior': { en: 'Exterior', es: 'Exterior' },

  // -- Door hinge --
  'hinge.left': { en: 'Hinge Left', es: 'Bisagra Izq.' },
  'hinge.right': { en: 'Hinge Right', es: 'Bisagra Der.' },

  // -- Stair direction --
  'stairDir.up': { en: 'Up', es: 'Sube' },
  'stairDir.down': { en: 'Down', es: 'Baja' },

  // -- Floor names --
  'floor.ground': { en: 'Ground Floor', es: 'Planta Baja' },
  'floor.level': { en: 'Floor', es: 'Piso' },

  // -- Tool name --
  'tool.shape': { en: 'Shapes', es: 'Formas' },

  // -- Tool hint --
  'hint.shape': {
    en: 'Click-drag to draw a shape. Shift for equal proportions.',
    es: 'Clic y arrastrar para dibujar forma. Shift para proporciones iguales.',
  },

  // -- Shape kinds --
  'shapeKind.rectangle': { en: 'Rectangle', es: 'Rect\u00e1ngulo' },
  'shapeKind.circle': { en: 'Circle', es: 'C\u00edrculo' },
  'shapeKind.triangle': { en: 'Triangle', es: 'Tri\u00e1ngulo' },

  // -- Shape selector header --
  'selector.shapeKind': { en: 'Shape Type', es: 'Tipo de Forma' },

  // -- Shape property labels --
  'prop.shape': { en: 'Shape', es: 'Forma' },
  'field.shapeKind': { en: 'Shape', es: 'Forma' },
  'field.filled': { en: 'Filled', es: 'Relleno' },
  'field.strokeColor': { en: 'Stroke Color', es: 'Color Trazo' },
  'field.strokeWidth': { en: 'Stroke Width', es: 'Grosor Trazo' },

  // -- Save As --
  'ui.saveAsBtn': { en: 'Save As', es: 'Guardar como' },
  'tooltip.saveAs': { en: 'Save As New File', es: 'Guardar como Nuevo Archivo' },

  // -- Section / Facade directions --
  'dir.north': { en: 'North', es: 'Norte' },
  'dir.south': { en: 'South', es: 'Sur' },
  'dir.east': { en: 'East', es: 'Este' },
  'dir.west': { en: 'West', es: 'Oeste' },

  // -- Isometric preset views --
  'iso.preset.iso': { en: 'Isometric', es: 'Isom\u00e9trica' },
  'iso.preset.top': { en: 'Top', es: 'Superior' },
  'iso.preset.front': { en: 'Front', es: 'Frontal' },
  'iso.preset.side': { en: 'Side', es: 'Lateral' },
  'iso.dragHint': { en: 'Drag \u2194\u2195 to orbit', es: 'Arrastra \u2194\u2195 para rotar' },

  // -- Stair labels --
  'stair.up': { en: 'UP', es: 'SUBE' },
  'stair.down': { en: 'DN', es: 'BAJA' },

  // -- Room default label --
  'room.default': { en: 'Room', es: 'Cuarto' },

  // -- Unit settings --
  'ui.units': { en: 'Units', es: 'Unidades' },
  'tooltip.units': { en: 'Display Units', es: 'Unidades de Medida' },
  'unit.mm': { en: 'Millimeters (mm)', es: 'Mil\u00edmetros (mm)' },
  'unit.cm': { en: 'Centimeters (cm)', es: 'Cent\u00edmetros (cm)' },
  'unit.m': { en: 'Meters (m)', es: 'Metros (m)' },
  'unit.ft': { en: 'Feet (ft)', es: 'Pies (ft)' },
  'unit.in': { en: 'Inches (in)', es: 'Pulgadas (in)' },
  'unit.ft-in': { en: 'Feet & Inches', es: 'Pies y Pulgadas' },

  // -- Misc --
  'ui.delete': { en: 'Delete', es: 'Eliminar' },
  'ui.reset': { en: 'Reset', es: 'Restablecer' },
  'ui.selectToEdit': { en: 'Select an element to edit properties', es: 'Selecciona un elemento para editar propiedades' },
  'ui.elementNotFound': { en: 'Element not found', es: 'Elemento no encontrado' },
  'ui.noItems': { en: 'No items in this category', es: 'Sin elementos en esta categor\u00eda' },
  'ui.flipH': { en: 'Horiz. (F)', es: 'Horiz. (F)' },
  'ui.flipV': { en: 'Vert. (G)', es: 'Vert. (G)' },
  'ui.renameFloor': { en: 'Rename floor', es: 'Renombrar piso' },
  'ui.renameFloorPrompt': { en: 'Enter new floor name:', es: 'Ingresa nuevo nombre del piso:' },

  // -- Export Dialog --
  'dialog.export': { en: 'Export', es: 'Exportar' },
  'dialog.paperSize': { en: 'Paper Size', es: 'Tamaño de Papel' },
  'dialog.format': { en: 'Format', es: 'Formato' },
  'dialog.pngTransparent': { en: 'PNG (Transparent)', es: 'PNG (Transparente)' },
  'dialog.includeTitleBlock': { en: 'Include title block', es: 'Incluir cuadro de título' },
  'dialog.projectName': { en: 'Project Name', es: 'Nombre del Proyecto' },
  'dialog.author': { en: 'Author', es: 'Autor' },
  'dialog.transparentInfo': {
    en: 'Exports a transparent PNG without background, borders, or title block.',
    es: 'Exporta un PNG transparente sin fondo, bordes ni cuadro de título.',
  },
  'dialog.cancel': { en: 'Cancel', es: 'Cancelar' },
  'dialog.preview': { en: 'Preview', es: 'Vista previa' },
  'dialog.previewHint': {
    en: 'Preview reflects current view and selected export options.',
    es: 'La vista previa refleja la vista actual y las opciones seleccionadas.',
  },
  'dialog.includeDimensions': { en: 'Include dimensions', es: 'Incluir cotas' },

  // -- Library categories --
  'category.furniture': { en: 'Furniture', es: 'Muebles' },
  'category.bathroom': { en: 'Bathroom', es: 'Baño' },
  'category.kitchen': { en: 'Kitchen', es: 'Cocina' },
  'category.outdoor': { en: 'Outdoor', es: 'Exterior' },
  'category.people': { en: 'People', es: 'Personas' },
  'category.vehicles': { en: 'Vehicles', es: 'Vehículos' },
  'category.accessories': { en: 'Accessories', es: 'Accesorios' },
  'category.decoration': { en: 'Decoration', es: 'Decoraci\u00f3n' },
  'category.laundry': { en: 'Laundry', es: 'Lavander\u00eda' },

  // -- Wall pattern field label --
  'field.wallPattern': { en: 'Material', es: 'Material' },

  // -- Room fill patterns --
  'roomPattern.solid': { en: 'Solid', es: 'S\u00f3lido' },
  'roomPattern.hatch': { en: 'Hatch', es: 'Achurado' },
  'roomPattern.tile': { en: 'Tile', es: 'Azulejo' },
  'roomPattern.wood': { en: 'Wood', es: 'Madera' },
  'roomPattern.stone': { en: 'Stone', es: 'Piedra' },
  'roomPattern.brick': { en: 'Brick', es: 'Ladrillo' },
  'roomPattern.marble': { en: 'Marble', es: 'M\u00e1rmol' },
  'roomPattern.concrete': { en: 'Concrete', es: 'Concreto' },
  'roomPattern.ceramic': { en: 'Ceramic', es: 'Cer\u00e1mica' },
  'roomPattern.parquet': { en: 'Parquet', es: 'Parquet' },
  'roomPattern.herringbone': { en: 'Herringbone', es: 'Espiga' },
  'roomPattern.hexagonal': { en: 'Hexagonal', es: 'Hexagonal' },
  'roomPattern.carpet': { en: 'Carpet', es: 'Alfombra' },
  'roomPattern.grass': { en: 'Grass', es: 'Pasto' },
  'roomPattern.granite': { en: 'Granite', es: 'Granito' },

  // -- Wall fill patterns / materials --
  'wallPattern.solid': { en: 'Solid', es: 'S\u00f3lido' },
  'wallPattern.brick': { en: 'Brick', es: 'Ladrillo' },
  'wallPattern.concrete': { en: 'Concrete', es: 'Concreto' },
  'wallPattern.stone': { en: 'Stone', es: 'Piedra' },
  'wallPattern.hatch': { en: 'Hatch', es: 'Achurado' },
  'wallPattern.crosshatch': { en: 'Crosshatch', es: 'Doble Achurado' },
  'wallPattern.drywall': { en: 'Drywall', es: 'Tablaroca' },
  'wallPattern.block': { en: 'Block (CMU)', es: 'Block (CMU)' },
  'wallPattern.stucco': { en: 'Stucco', es: 'Estuco' },
  'wallPattern.plaster': { en: 'Plaster', es: 'Yeso' },

  // -- Support / Donation Dialog --
  'support.title': { en: 'Support EasyPlans', es: 'Apoya EasyPlans' },
  'support.madeBy': { en: 'Made by', es: 'Hecho por' },
  'support.message': {
    en: 'EasyPlans is free and open source, built by a student for students. If this tool helps you with your projects, consider supporting its development.',
    es: 'EasyPlans es gratis y de c\u00f3digo abierto, hecho por un estudiante para estudiantes. Si esta herramienta te ayuda en tus proyectos, considera apoyar su desarrollo.',
  },
  'support.donate': { en: 'Support on Ko-fi', es: 'Apoyar en Ko-fi' },
  'support.github': { en: 'Star on GitHub', es: 'Estrella en GitHub' },
  'support.share': { en: 'Share with a friend', es: 'Comparte con un amigo' },
  'support.copied': { en: 'Link copied!', es: '\u00a1Enlace copiado!' },
  'support.version': { en: 'Version', es: 'Versi\u00f3n' },
  'support.free': { en: 'Free & open source', es: 'Gratis y c\u00f3digo abierto' },
  'support.support': { en: 'Support', es: 'Apoya' },
  'support.close': { en: 'Close', es: 'Cerrar' },
  'support.thankYou': { en: 'Thank you for using EasyPlans!', es: '\u00a1Gracias por usar EasyPlans!' },
  'tooltip.support': { en: 'Support EasyPlans', es: 'Apoya EasyPlans' },
  'support.apoyame': { en: 'Support me', es: 'Apóyame' },
  'support.suggestions': { en: 'Send suggestions', es: 'Enviar sugerencias' },
  'support.suggestionsHint': {
    en: 'Have ideas or feedback? I\'d love to hear from you!',
    es: '¿Tienes ideas o comentarios? ¡Me encantaría escucharte!',
  },

  // -- Help / Manual --
  'ui.help': { en: 'Help', es: 'Ayuda' },
  'tooltip.help': { en: 'User Manual', es: 'Manual de Usuario' },
  'support.manual': { en: 'User Manual', es: 'Manual de Usuario' },
  'support.manualHint': { en: 'Learn how to use all the tools', es: 'Aprende a usar todas las herramientas' },

  // -- Suggestion Form --
  'suggestion.title': { en: 'Send a Suggestion', es: 'Enviar Sugerencia' },
  'suggestion.subtitle': {
    en: 'Have ideas, feedback, or found a bug? Let us know!',
    es: '\u00bfTienes ideas, comentarios o encontraste un error? \u00a1Cu\u00e9ntanos!',
  },
  'suggestion.name': { en: 'Name', es: 'Nombre' },
  'suggestion.namePlaceholder': { en: 'Your name', es: 'Tu nombre' },
  'suggestion.email': { en: 'Email', es: 'Correo' },
  'suggestion.emailPlaceholder': { en: 'your@email.com', es: 'tu@correo.com' },
  'suggestion.message': { en: 'Message', es: 'Mensaje' },
  'suggestion.messagePlaceholder': {
    en: 'Tell us your suggestion, idea, or report a bug...',
    es: 'Cu\u00e9ntanos tu sugerencia, idea, o reporta un error...',
  },
  'suggestion.optional': { en: 'optional', es: 'opcional' },
  'suggestion.send': { en: 'Send', es: 'Enviar' },
  'suggestion.sending': { en: 'Sending...', es: 'Enviando...' },
  'suggestion.thankYou': { en: 'Thank you!', es: '\u00a1Gracias!' },
  'suggestion.received': {
    en: 'Your suggestion has been received. We appreciate your feedback!',
    es: 'Tu sugerencia ha sido recibida. \u00a1Agradecemos tus comentarios!',
  },
  'suggestion.error': {
    en: 'Something went wrong. Please try again.',
    es: 'Algo sali\u00f3 mal. Por favor int\u00e9ntalo de nuevo.',
  },
};

/**
 * Translate a key using the current language from the UI store.
 * Falls back to the key itself if not found.
 */
export function t(key: string): string {
  const lang = useUIStore.getState().language;
  const entry = dict[key];
  if (!entry) return key;
  return entry[lang] ?? entry.es ?? key;
}

/**
 * React hook that returns a translate function bound to the current language.
 * Re-renders when language changes.
 */
export function useTranslation() {
  const lang = useUIStore((s) => s.language);
  return (key: string): string => {
    const entry = dict[key];
    if (!entry) return key;
    return entry[lang] ?? entry.es ?? key;
  };
}
