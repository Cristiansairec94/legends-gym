const fs = require('fs');
const path = require('path');

const rootGymDir = path.resolve(__dirname, '../..');
const legendsDir = path.resolve(__dirname, '..');
const layersDir = path.join(legendsDir, 'public/editor_layers');
const assetsDir = path.join(legendsDir, 'src/assets');

function toBase64DataUri(filePath, mime) {
  const buf = fs.readFileSync(filePath);
  return `data:${mime};base64,${buf.toString('base64')}`;
}

const cleanWallUri = toBase64DataUri(path.join(layersDir, 'layer_clean_wall.jpg'), 'image/jpeg');
const titleUri = toBase64DataUri(path.join(layersDir, 'layer_title.png'), 'image/png');
const subtitleUri = toBase64DataUri(path.join(layersDir, 'layer_subtitle.png'), 'image/png');
const machinesUri = toBase64DataUri(path.join(layersDir, 'layer_machines.png'), 'image/png');

const card1Uri = toBase64DataUri(path.join(assetsDir, 'card-cliente-nuevo.jpg'), 'image/jpeg');
const card2Uri = toBase64DataUri(path.join(assetsDir, 'card-visita.jpg'), 'image/jpeg');
const card3Uri = toBase64DataUri(path.join(assetsDir, 'card-huella.jpg'), 'image/jpeg');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EDITOR DE DISEÑO Y REFERENCIA VISUAL - LEYENDS GYM</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      user-select: none;
      -webkit-user-select: none;
    }
    html, body {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: #0b0d13;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #ffffff;
      display: flex;
      flex-direction: column;
    }

    /* ==================== BARRA SUPERIOR (NUNCA SE CORTA) ==================== */
    #top-bar {
      width: 100%;
      background: #10131c;
      border-bottom: 1px solid rgba(251, 191, 36, 0.35);
      padding: 7px 12px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      z-index: 200;
      flex-shrink: 0;
    }
    .top-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 5px;
    }
    body.clean-mode #top-bar,
    body.clean-mode #sidebar {
      display: none !important;
    }

    .toolbar-btn {
      background: #181c29;
      border: 1px solid rgba(255,255,255,0.16);
      color: #e4e4e7;
      font-size: 11px;
      font-weight: 800;
      padding: 6px 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
    }
    .toolbar-btn:hover {
      background: rgba(251, 191, 36, 0.18);
      border-color: #fbbf24;
      color: #ffffff;
    }
    .toolbar-btn.active {
      background: linear-gradient(90deg, #f59e0b, #d97706);
      border-color: #fde68a;
      color: #000000;
      box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
    }
    .toolbar-btn.emerald {
      background: linear-gradient(90deg, #10b981, #059669);
      border-color: #6ee7b7;
      color: #000000;
    }
    .toolbar-btn.danger {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.4);
      color: #fca5a5;
    }
    .toolbar-btn.danger:hover {
      background: rgba(239, 68, 68, 0.3);
      color: #ffffff;
    }

    /* ==================== CONTENEDOR PRINCIPAL: LIENZO + PANEL LATERAL ==================== */
    #main-area {
      flex: 1;
      display: flex;
      width: 100%;
      height: 100%;
      overflow: hidden;
      position: relative;
    }

    /* Área donde vive el lienzo 16:9 sin que nada lo tape */
    #workspace {
      flex: 1;
      height: 100%;
      background: radial-gradient(circle at center, #131722 0%, #07080c 100%);
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Envoltorio con el tamaño exacto ya escalado para que nunca se recorte */
    #stage-holder {
      position: relative;
      box-shadow: 0 12px 50px rgba(0,0,0,0.95), 0 0 0 1px rgba(251,191,36,0.28);
      border-radius: 4px;
      overflow: hidden;
    }
    body.clean-mode #stage-holder {
      box-shadow: none;
      border-radius: 0;
    }

    #stage {
      position: absolute;
      top: 0;
      left: 0;
      width: 1920px;
      height: 1080px;
      background: #07080c;
      overflow: hidden;
      transform-origin: 0 0;
    }

    /* ==================== PANEL LATERAL FIJO (NO TAPA LA IMAGEN) ==================== */
    #sidebar {
      width: 340px;
      height: 100%;
      background: #10131c;
      border-left: 1px solid rgba(251, 191, 36, 0.3);
      display: flex;
      flex-direction: column;
      z-index: 150;
      flex-shrink: 0;
    }
    #sidebar-header {
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      background: #141824;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }
    #sidebar-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 10px 12px;
    }
    #sidebar-scroll::-webkit-scrollbar {
      width: 5px;
    }
    #sidebar-scroll::-webkit-scrollbar-thumb {
      background: #3f3f46;
      border-radius: 4px;
    }

    /* Cuadrícula de 2 columnas para que todos los controles se vean sin bajar */
    .controls-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .ctrl-box {
      background: #171b28;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      padding: 7px 9px;
    }
    .ctrl-box.full {
      grid-column: span 2;
    }
    .ctrl-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10.5px;
      font-weight: 700;
      color: #d4d4d8;
      margin-bottom: 4px;
    }
    .ctrl-val {
      color: #fbbf24;
      font-family: monospace;
      font-size: 11px;
      font-weight: 800;
    }
    input[type="range"] {
      width: 100%;
      accent-color: #f59e0b;
      cursor: pointer;
      height: 5px;
      display: block;
    }

    /* Botón flotante para salir de Vista Limpia */
    #clean-mode-pill {
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 300;
      background: rgba(16, 19, 28, 0.9);
      border: 1px solid #fbbf24;
      color: #fde68a;
      font-size: 11px;
      font-weight: 800;
      padding: 7px 14px;
      border-radius: 10px;
      cursor: pointer;
      display: none;
      box-shadow: 0 4px 15px rgba(0,0,0,0.8);
    }
    body.clean-mode #clean-mode-pill {
      display: block;
    }

    /* Guías de centrado */
    .guide-line-v {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 960px;
      width: 2px;
      background: rgba(251, 191, 36, 0.85);
      box-shadow: 0 0 10px rgba(251, 191, 36, 0.9);
      pointer-events: none;
      z-index: 90;
      display: none;
    }
    .guide-line-h {
      position: absolute;
      left: 0;
      right: 0;
      top: 540px;
      height: 2px;
      background: rgba(251, 191, 36, 0.85);
      box-shadow: 0 0 10px rgba(251, 191, 36, 0.9);
      pointer-events: none;
      z-index: 90;
      display: none;
    }

    /* Elementos Editables en el Lienzo */
    .editable-item {
      position: absolute;
      cursor: move;
      touch-action: none;
    }
    body:not(.clean-mode) .editable-item:hover {
      outline: 2px dashed rgba(251, 191, 36, 0.7);
      outline-offset: 2px;
    }
    body:not(.clean-mode) .editable-item.selected {
      outline: 3px solid #fbbf24;
      outline-offset: 2px;
      z-index: 50 !important;
    }

    /* 8 Manijas de Redimensionado Grandes y Cómodas */
    .handle {
      position: absolute;
      width: 18px;
      height: 18px;
      background: #fbbf24;
      border: 2.5px solid #000;
      border-radius: 50%;
      z-index: 60;
      display: none;
      box-shadow: 0 0 10px rgba(0,0,0,0.95);
    }
    body:not(.clean-mode) .editable-item.selected > .handle {
      display: block;
    }
    .handle:hover {
      transform: scale(1.25);
      background: #fde047;
    }
    .handle.nw { top: -10px; left: -10px; cursor: nwse-resize; }
    .handle.ne { top: -10px; right: -10px; cursor: nesw-resize; }
    .handle.sw { bottom: -10px; left: -10px; cursor: nesw-resize; }
    .handle.se { bottom: -10px; right: -10px; cursor: nwse-resize; }
    .handle.n  { top: -9px; left: calc(50% - 14px); width: 28px; height: 14px; border-radius: 5px; cursor: ns-resize; }
    .handle.s  { bottom: -9px; left: calc(50% - 14px); width: 28px; height: 14px; border-radius: 5px; cursor: ns-resize; }
    .handle.w  { top: calc(50% - 14px); left: -9px; width: 14px; height: 28px; border-radius: 5px; cursor: ew-resize; }
    .handle.e  { top: calc(50% - 14px); right: -9px; width: 14px; height: 28px; border-radius: 5px; cursor: ew-resize; }

    /* Etiqueta de Medidas sobre el elemento seleccionado */
    .dim-badge {
      position: absolute;
      top: -36px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(11, 12, 19, 0.96);
      border: 1.5px solid #fbbf24;
      color: #fde68a;
      font-size: 14px;
      font-weight: 800;
      padding: 4px 12px;
      border-radius: 999px;
      white-space: nowrap;
      pointer-events: none;
      display: none;
      box-shadow: 0 4px 14px rgba(0,0,0,0.85);
    }
    body:not(.clean-mode) .editable-item.selected > .dim-badge {
      display: block;
    }

    /* Barras Lineales Neón */
    .neon-bar-visual {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      pointer-events: none;
    }
    .neon-bar-core {
      width: 100%;
      background: #f4f5f7;
      border-radius: 999px;
    }

    /* Las 3 Tarjetas de Inicio */
    .gym-card {
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #090a0f;
    }
    .gym-card-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      pointer-events: none;
    }
    .gym-card-vignette {
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.2) 100%);
      pointer-events: none;
    }
    .gym-card-badge {
      position: relative;
      z-index: 5;
      align-self: flex-end;
      background: rgba(0, 0, 0, 0.9);
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #ffffff;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      box-shadow: 0 4px 10px rgba(0,0,0,0.6);
      pointer-events: none;
    }
    .gym-card-footer {
      position: relative;
      z-index: 5;
      background: rgba(9, 10, 15, 0.92);
      backdrop-filter: blur(6px);
      border: 1px solid rgba(63, 63, 70, 0.75);
      box-shadow: 0 8px 20px rgba(0,0,0,0.75);
      pointer-events: none;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .gym-card-title {
      font-weight: 900;
      color: #ffffff;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      line-height: 1.15;
      text-shadow: 0 1px 4px rgba(0,0,0,0.95);
    }
    .gym-card-subrow {
      border-top: 1px solid rgba(39, 39, 42, 0.85);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .gym-card-cta {
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .gym-card-circle {
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 900;
      flex-shrink: 0;
    }
  </style>
</head>
<body>

  <!-- Botón flotante para volver cuando estás en Vista Limpia -->
  <button id="clean-mode-pill" onclick="toggleCleanMode()">
    🛠️ Mostrar Panel de Edición (Tecla H)
  </button>

  <!-- BARRA SUPERIOR: Todas las capas y botones 100% visibles sin cortarse -->
  <div id="top-bar">
    <div class="top-group">
      <span style="font-size:11px;font-weight:900;color:#fbbf24;margin-right:2px;">CAPAS:</span>
      <button class="toolbar-btn" id="tab-title" onclick="selectItem('title')">🔤 1. Título LEYENDS GYM</button>
      <button class="toolbar-btn" id="tab-subtitle" onclick="selectItem('subtitle')">🔠 2. Subtítulo CLUB FITNESS</button>
      <button class="toolbar-btn" id="tab-barTop" onclick="selectItem('barTop')">➖ 3. Barra Superior</button>
      <button class="toolbar-btn" id="tab-barMid" onclick="selectItem('barMid')">➖ 4. Barra Central</button>
      <button class="toolbar-btn active" id="tab-cards" onclick="selectItem('cards')">🖼️ 5. Las 3 Imágenes</button>
      <button class="toolbar-btn" id="tab-machines" onclick="selectItem('machines')">🚲 6. Fondo Elípticas</button>
    </div>
    <div class="top-group">
      <button class="toolbar-btn" onclick="centerSelectedHorizontally()" title="Centrar elemento horizontalmente">🎯 Centrar</button>
      <button class="toolbar-btn" onclick="toggleCleanMode()" title="Ver pantalla limpia sin controles (Tecla H)">👁️ Vista Limpia (H)</button>
      <button class="toolbar-btn emerald" onclick="exportReferencePng()" title="Descargar imagen PNG lista">📸 Guardar PNG</button>
      <button class="toolbar-btn danger" onclick="resetDefaults()" title="Restablecer posición original">↺ Reiniciar</button>
    </div>
  </div>

  <!-- ÁREA CENTRAL + PANEL LATERAL DEDICADO -->
  <div id="main-area">

    <!-- LIENZO COMPLETO (Nunca es tapado por el menú lateral) -->
    <div id="workspace">
      <div id="stage-holder">
        <div id="stage">
          <!-- 1. Pared Oscura Limpia -->
          <img id="wall-bg" src="${cleanWallUri}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;z-index:1;" />
          <div id="wall-glow" style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 35%, rgba(245,158,11,0.22) 0%, rgba(0,0,0,0) 60%);pointer-events:none;z-index:2;"></div>

          <!-- Guías de centrado -->
          <div class="guide-line-v" id="guide-v"></div>
          <div class="guide-line-h" id="guide-h"></div>

          <!-- 2. Fondo de Máquinas Elípticas -->
          <div id="el-machines" class="editable-item" style="z-index:5;" onmousedown="startDrag(event, 'machines')">
            <div class="dim-badge" id="badge-machines"></div>
            <img src="${machinesUri}" style="width:100%;height:100%;object-fit:fill;pointer-events:none;display:block;" />
            <div class="handle nw" onmousedown="startResize(event, 'machines', 'nw')"></div>
            <div class="handle ne" onmousedown="startResize(event, 'machines', 'ne')"></div>
            <div class="handle sw" onmousedown="startResize(event, 'machines', 'sw')"></div>
            <div class="handle se" onmousedown="startResize(event, 'machines', 'se')"></div>
            <div class="handle n"  onmousedown="startResize(event, 'machines', 'n')"></div>
            <div class="handle s"  onmousedown="startResize(event, 'machines', 's')"></div>
            <div class="handle w"  onmousedown="startResize(event, 'machines', 'w')"></div>
            <div class="handle e"  onmousedown="startResize(event, 'machines', 'e')"></div>
          </div>

          <!-- 3. Barra Lineal Superior -->
          <div id="el-barTop" class="editable-item" style="z-index:15;" onmousedown="startDrag(event, 'barTop')">
            <div class="dim-badge" id="badge-barTop"></div>
            <div class="neon-bar-visual" id="vis-barTop">
              <div class="neon-bar-core" id="core-barTop"></div>
            </div>
            <div class="handle nw" onmousedown="startResize(event, 'barTop', 'nw')"></div>
            <div class="handle ne" onmousedown="startResize(event, 'barTop', 'ne')"></div>
            <div class="handle sw" onmousedown="startResize(event, 'barTop', 'sw')"></div>
            <div class="handle se" onmousedown="startResize(event, 'barTop', 'se')"></div>
            <div class="handle n"  onmousedown="startResize(event, 'barTop', 'n')"></div>
            <div class="handle s"  onmousedown="startResize(event, 'barTop', 's')"></div>
            <div class="handle w"  onmousedown="startResize(event, 'barTop', 'w')"></div>
            <div class="handle e"  onmousedown="startResize(event, 'barTop', 'e')"></div>
          </div>

          <!-- 4. Título Principal: LEYENDS GYM -->
          <div id="el-title" class="editable-item" style="z-index:20;" onmousedown="startDrag(event, 'title')">
            <div class="dim-badge" id="badge-title"></div>
            <img id="img-title" src="${titleUri}" style="width:100%;height:100%;object-fit:fill;pointer-events:none;display:block;" />
            <div class="handle nw" onmousedown="startResize(event, 'title', 'nw')"></div>
            <div class="handle ne" onmousedown="startResize(event, 'title', 'ne')"></div>
            <div class="handle sw" onmousedown="startResize(event, 'title', 'sw')"></div>
            <div class="handle se" onmousedown="startResize(event, 'title', 'se')"></div>
            <div class="handle n"  onmousedown="startResize(event, 'title', 'n')"></div>
            <div class="handle s"  onmousedown="startResize(event, 'title', 's')"></div>
            <div class="handle w"  onmousedown="startResize(event, 'title', 'w')"></div>
            <div class="handle e"  onmousedown="startResize(event, 'title', 'e')"></div>
          </div>

          <!-- 5. Subtítulo: CLUB FITNESS -->
          <div id="el-subtitle" class="editable-item" style="z-index:20;" onmousedown="startDrag(event, 'subtitle')">
            <div class="dim-badge" id="badge-subtitle"></div>
            <img id="img-subtitle" src="${subtitleUri}" style="width:100%;height:100%;object-fit:fill;pointer-events:none;display:block;" />
            <div class="handle nw" onmousedown="startResize(event, 'subtitle', 'nw')"></div>
            <div class="handle ne" onmousedown="startResize(event, 'subtitle', 'ne')"></div>
            <div class="handle sw" onmousedown="startResize(event, 'subtitle', 'sw')"></div>
            <div class="handle se" onmousedown="startResize(event, 'subtitle', 'se')"></div>
            <div class="handle n"  onmousedown="startResize(event, 'subtitle', 'n')"></div>
            <div class="handle s"  onmousedown="startResize(event, 'subtitle', 's')"></div>
            <div class="handle w"  onmousedown="startResize(event, 'subtitle', 'w')"></div>
            <div class="handle e"  onmousedown="startResize(event, 'subtitle', 'e')"></div>
          </div>

          <!-- 6. Barra Lineal Central -->
          <div id="el-barMid" class="editable-item" style="z-index:15;" onmousedown="startDrag(event, 'barMid')">
            <div class="dim-badge" id="badge-barMid"></div>
            <div class="neon-bar-visual" id="vis-barMid">
              <div class="neon-bar-core" id="core-barMid"></div>
            </div>
            <div class="handle nw" onmousedown="startResize(event, 'barMid', 'nw')"></div>
            <div class="handle ne" onmousedown="startResize(event, 'barMid', 'ne')"></div>
            <div class="handle sw" onmousedown="startResize(event, 'barMid', 'sw')"></div>
            <div class="handle se" onmousedown="startResize(event, 'barMid', 'se')"></div>
            <div class="handle n"  onmousedown="startResize(event, 'barMid', 'n')"></div>
            <div class="handle s"  onmousedown="startResize(event, 'barMid', 's')"></div>
            <div class="handle w"  onmousedown="startResize(event, 'barMid', 'w')"></div>
            <div class="handle e"  onmousedown="startResize(event, 'barMid', 'e')"></div>
          </div>

          <!-- 7. Contenedor de las 3 Imágenes / Tarjetas -->
          <div id="el-cards" class="editable-item" style="z-index:30;" onmousedown="startDrag(event, 'cards')">
            <div class="dim-badge" id="badge-cards"></div>
            <div id="cards-grid" style="width:100%;height:100%;display:grid;grid-template-columns:repeat(3,1fr);pointer-events:none;">
              
              <!-- Tarjeta 1: CLIENTE NUEVO -->
              <div class="gym-card" id="card-1" style="border:2px solid rgba(251,191,36,0.65);box-shadow:0 0 25px rgba(245,158,11,0.22);">
                <img class="gym-card-bg" id="card-img-1" src="${card1Uri}" />
                <div class="gym-card-vignette"></div>
                <div class="gym-card-badge" style="border:1px solid rgba(251,191,36,0.85);">
                  <span style="color:#fbbf24;">👤+</span>
                  <span>INSCRIPCIÓN</span>
                </div>
                <div class="gym-card-footer">
                  <div class="gym-card-title">CLIENTE NUEVO</div>
                  <div class="gym-card-subrow">
                    <span class="gym-card-cta" style="color:#fbbf24;">Registrarme &rarr;</span>
                    <span class="gym-card-circle" style="background:linear-gradient(90deg,#f59e0b,#d97706);">+</span>
                  </div>
                </div>
              </div>

              <!-- Tarjeta 2: QUIERO VISITA -->
              <div class="gym-card" id="card-2" style="border:2px solid rgba(52,211,153,0.65);box-shadow:0 0 25px rgba(16,185,129,0.22);">
                <img class="gym-card-bg" id="card-img-2" src="${card2Uri}" />
                <div class="gym-card-vignette"></div>
                <div class="gym-card-badge" style="border:1px solid rgba(52,211,153,0.85);">
                  <span style="color:#34d399;">🎟️</span>
                  <span>PASE DEL DÍA</span>
                </div>
                <div class="gym-card-footer">
                  <div class="gym-card-title">QUIERO VISITA</div>
                  <div class="gym-card-subrow">
                    <span class="gym-card-cta" style="color:#34d399;">Pase de Visita &rarr;</span>
                    <span class="gym-card-circle" style="background:linear-gradient(90deg,#10b981,#059669);">✓</span>
                  </div>
                </div>
              </div>

              <!-- Tarjeta 3: YA TENGO MEMBRESÍA -->
              <div class="gym-card" id="card-3" style="border:2px solid rgba(251,191,36,0.7);box-shadow:0 0 25px rgba(245,158,11,0.25);">
                <img class="gym-card-bg" id="card-img-3" src="${card3Uri}" />
                <div class="gym-card-vignette"></div>
                <div class="gym-card-badge" style="border:1px solid rgba(251,191,36,0.85);">
                  <span style="color:#fbbf24;">⚡</span>
                  <span>ACCESO DIRECTO</span>
                </div>
                <div class="gym-card-footer">
                  <div class="gym-card-title">YA TENGO MEMBRESÍA</div>
                  <div class="gym-card-subrow">
                    <span class="gym-card-cta" style="color:#fbbf24;">Validar Huella &rarr;</span>
                    <span class="gym-card-circle" style="background:linear-gradient(90deg,#f59e0b,#d97706);">☝</span>
                  </div>
                </div>
              </div>

            </div>
            <div class="handle nw" onmousedown="startResize(event, 'cards', 'nw')"></div>
            <div class="handle ne" onmousedown="startResize(event, 'cards', 'ne')"></div>
            <div class="handle sw" onmousedown="startResize(event, 'cards', 'sw')"></div>
            <div class="handle se" onmousedown="startResize(event, 'cards', 'se')"></div>
            <div class="handle n"  onmousedown="startResize(event, 'cards', 'n')"></div>
            <div class="handle s"  onmousedown="startResize(event, 'cards', 's')"></div>
            <div class="handle w"  onmousedown="startResize(event, 'cards', 'w')"></div>
            <div class="handle e"  onmousedown="startResize(event, 'cards', 'e')"></div>
          </div>

        </div>
      </div>
    </div>

    <!-- PANEL LATERAL DERECHO FIJO: Nunca tapa el lienzo y muestra todas las opciones cómodamente -->
    <div id="sidebar">
      <div id="sidebar-header">
        <div>
          <div id="inspector-title" style="font-size:12px;font-weight:900;color:#fbbf24;text-transform:uppercase;">
            🖼️ Las 3 Imágenes (Tarjetas)
          </div>
          <div style="font-size:10px;color:#a1a1aa;margin-top:1px;">
            Arrastra con el mouse o usa estos ajustes
          </div>
        </div>
        <button onclick="centerSelectedHorizontally()" class="toolbar-btn" style="padding:4px 8px;font-size:10px;">
          🎯 Centrar X
        </button>
      </div>
      <div id="sidebar-scroll">
        <div id="inspector-body"></div>
      </div>
    </div>

  </div>

  <script>
    const STORAGE_KEY = 'legends_reference_layout_v1';

    const DEFAULT_STATE = {
      barTop: {
        x: 0,
        y: 12,
        w: 1920,
        h: 34,
        thickness: 10,
        glow: 26,
        opacity: 100
      },
      title: {
        x: 179,
        y: 131,
        w: 1487,
        h: 219,
        opacity: 100,
        brightness: 105
      },
      subtitle: {
        x: 634,
        y: 379,
        w: 571,
        h: 78,
        opacity: 100,
        brightness: 102
      },
      barMid: {
        x: 0,
        y: 522,
        w: 1920,
        h: 36,
        thickness: 11,
        glow: 28,
        opacity: 100
      },
      cards: {
        x: 280,
        y: 672,
        w: 1360,
        h: 272,
        gap: 28,
        radius: 22,
        padding: 16,
        footerHeight: 92,
        titleSize: 21,
        ctaSize: 15,
        badgeSize: 13,
        circleSize: 34,
        imgZoom: 100,
        imgPosY: 50
      },
      machines: {
        x: 0,
        y: 615,
        w: 1920,
        h: 465,
        opacity: 100,
        brightness: 100
      }
    };

    let state = loadState();
    let selectedKey = 'cards';
    let dragInfo = null;
    let stageScale = 1;

    function loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            barTop: { ...DEFAULT_STATE.barTop, ...(parsed.barTop || {}) },
            title: { ...DEFAULT_STATE.title, ...(parsed.title || {}) },
            subtitle: { ...DEFAULT_STATE.subtitle, ...(parsed.subtitle || {}) },
            barMid: { ...DEFAULT_STATE.barMid, ...(parsed.barMid || {}) },
            cards: { ...DEFAULT_STATE.cards, ...(parsed.cards || {}) },
            machines: { ...DEFAULT_STATE.machines, ...(parsed.machines || {}) },
          };
        }
      } catch (e) {}
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }

    function saveState() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {}
    }

    // Calcula el espacio libre del área de trabajo para que el lienzo 1920x1080 SIEMPRE se vea completo al 100%
    function updateStageScale() {
      const ws = document.getElementById('workspace');
      const holder = document.getElementById('stage-holder');
      const stage = document.getElementById('stage');
      const isClean = document.body.classList.contains('clean-mode');

      const pad = isClean ? 0 : 24;
      const availW = Math.max(200, ws.clientWidth - pad);
      const availH = Math.max(200, ws.clientHeight - pad);

      stageScale = Math.min(availW / 1920, availH / 1080);
      const scaledW = Math.round(1920 * stageScale);
      const scaledH = Math.round(1080 * stageScale);

      holder.style.width = scaledW + 'px';
      holder.style.height = scaledH + 'px';
      stage.style.transform = \`scale(\${stageScale})\`;
    }
    window.addEventListener('resize', updateStageScale);

    function applyStateToDOM() {
      // 1. barTop
      const bt = state.barTop;
      const elBt = document.getElementById('el-barTop');
      elBt.style.left = bt.x + 'px';
      elBt.style.top = bt.y + 'px';
      elBt.style.width = bt.w + 'px';
      elBt.style.height = bt.h + 'px';
      elBt.style.opacity = (bt.opacity / 100);
      const coreBt = document.getElementById('core-barTop');
      coreBt.style.height = bt.thickness + 'px';
      coreBt.style.boxShadow = \`0 0 \${bt.glow}px rgba(255,255,255,0.95), 0 0 \${bt.glow * 2.2}px rgba(255,255,255,0.55)\`;
      document.getElementById('badge-barTop').textContent = \`Barra Superior: \${Math.round(bt.w)} × \${Math.round(bt.thickness)} px (Y: \${Math.round(bt.y)})\`;

      // 2. title
      const ti = state.title;
      const elTi = document.getElementById('el-title');
      elTi.style.left = ti.x + 'px';
      elTi.style.top = ti.y + 'px';
      elTi.style.width = ti.w + 'px';
      elTi.style.height = ti.h + 'px';
      elTi.style.opacity = (ti.opacity / 100);
      document.getElementById('img-title').style.filter = \`brightness(\${ti.brightness}%)\`;
      document.getElementById('badge-title').textContent = \`Título: \${Math.round(ti.w)} × \${Math.round(ti.h)} px (X: \${Math.round(ti.x)}, Y: \${Math.round(ti.y)})\`;

      // 3. subtitle
      const su = state.subtitle;
      const elSu = document.getElementById('el-subtitle');
      elSu.style.left = su.x + 'px';
      elSu.style.top = su.y + 'px';
      elSu.style.width = su.w + 'px';
      elSu.style.height = su.h + 'px';
      elSu.style.opacity = (su.opacity / 100);
      document.getElementById('img-subtitle').style.filter = \`brightness(\${su.brightness}%)\`;
      document.getElementById('badge-subtitle').textContent = \`Subtítulo: \${Math.round(su.w)} × \${Math.round(su.h)} px (X: \${Math.round(su.x)}, Y: \${Math.round(su.y)})\`;

      // 4. barMid
      const bm = state.barMid;
      const elBm = document.getElementById('el-barMid');
      elBm.style.left = bm.x + 'px';
      elBm.style.top = bm.y + 'px';
      elBm.style.width = bm.w + 'px';
      elBm.style.height = bm.h + 'px';
      elBm.style.opacity = (bm.opacity / 100);
      const coreBm = document.getElementById('core-barMid');
      coreBm.style.height = bm.thickness + 'px';
      coreBm.style.boxShadow = \`0 0 \${bm.glow}px rgba(255,255,255,0.95), 0 0 \${bm.glow * 2.2}px rgba(255,255,255,0.55)\`;
      document.getElementById('badge-barMid').textContent = \`Barra Central: \${Math.round(bm.w)} × \${Math.round(bm.thickness)} px (Y: \${Math.round(bm.y)})\`;

      // 5. cards
      const ca = state.cards;
      const elCa = document.getElementById('el-cards');
      elCa.style.left = ca.x + 'px';
      elCa.style.top = ca.y + 'px';
      elCa.style.width = ca.w + 'px';
      elCa.style.height = ca.h + 'px';
      const grid = document.getElementById('cards-grid');
      grid.style.gap = ca.gap + 'px';
      const singleCardW = Math.round((ca.w - ca.gap * 2) / 3);
      document.getElementById('badge-cards').textContent = \`3 Imágenes: Total \${Math.round(ca.w)} × \${Math.round(ca.h)} px | C/U: \${singleCardW} × \${Math.round(ca.h)} px\`;

      document.querySelectorAll('.gym-card').forEach(card => {
        card.style.borderRadius = ca.radius + 'px';
        card.style.padding = ca.padding + 'px';
      });
      document.querySelectorAll('.gym-card-bg').forEach(img => {
        img.style.transform = \`scale(\${ca.imgZoom / 100})\`;
        img.style.objectPosition = \`center \${ca.imgPosY}%\`;
      });
      document.querySelectorAll('.gym-card-badge').forEach(b => {
        b.style.fontSize = ca.badgeSize + 'px';
        b.style.padding = \`\${Math.max(3, Math.round(ca.badgeSize * 0.35))}px \${Math.max(8, Math.round(ca.badgeSize * 0.85))}px\`;
      });
      document.querySelectorAll('.gym-card-footer').forEach(f => {
        f.style.minHeight = ca.footerHeight + 'px';
        f.style.padding = \`\${Math.max(8, Math.round(ca.footerHeight * 0.14))}px \${Math.max(12, Math.round(ca.footerHeight * 0.18))}px\`;
        f.style.borderRadius = Math.max(8, ca.radius - 6) + 'px';
      });
      document.querySelectorAll('.gym-card-title').forEach(t => {
        t.style.fontSize = ca.titleSize + 'px';
      });
      document.querySelectorAll('.gym-card-subrow').forEach(sr => {
        sr.style.marginTop = Math.max(4, Math.round(ca.footerHeight * 0.08)) + 'px';
        sr.style.paddingTop = Math.max(4, Math.round(ca.footerHeight * 0.08)) + 'px';
      });
      document.querySelectorAll('.gym-card-cta').forEach(c => {
        c.style.fontSize = ca.ctaSize + 'px';
      });
      document.querySelectorAll('.gym-card-circle').forEach(ci => {
        ci.style.width = ca.circleSize + 'px';
        ci.style.height = ca.circleSize + 'px';
        ci.style.fontSize = Math.round(ca.circleSize * 0.52) + 'px';
      });

      // 6. machines
      const ma = state.machines;
      const elMa = document.getElementById('el-machines');
      elMa.style.left = ma.x + 'px';
      elMa.style.top = ma.y + 'px';
      elMa.style.width = ma.w + 'px';
      elMa.style.height = ma.h + 'px';
      elMa.style.opacity = (ma.opacity / 100);
      elMa.querySelector('img').style.filter = \`brightness(\${ma.brightness}%)\`;
      document.getElementById('badge-machines').textContent = \`Fondo Elípticas: \${Math.round(ma.w)} × \${Math.round(ma.h)} px (Y: \${Math.round(ma.y)})\`;

      saveState();
    }

    const LABELS = {
      title: '🔤 1. Título: LEYENDS GYM',
      subtitle: '🔠 2. Subtítulo: CLUB FITNESS',
      barTop: '➖ 3. Barra Lineal Superior',
      barMid: '➖ 4. Barra Lineal Central',
      cards: '🖼️ 5. Las 3 Imágenes (Tarjetas)',
      machines: '🚲 6. Fondo de Elípticas'
    };

    function selectItem(key) {
      selectedKey = key;
      ['title', 'subtitle', 'barTop', 'barMid', 'cards', 'machines'].forEach(k => {
        const el = document.getElementById('el-' + k);
        const tab = document.getElementById('tab-' + k);
        if (el) el.classList.toggle('selected', k === key);
        if (tab) tab.classList.toggle('active', k === key);
      });
      renderInspector();
    }

    function updateProp(key, prop, val) {
      state[key][prop] = Number(val);
      applyStateToDOM();
      const valSpan = document.getElementById(\`val-\${key}-\${prop}\`);
      if (valSpan) valSpan.textContent = Math.round(Number(val));
    }

    function scaleSelectedProportionally(factor) {
      if (!selectedKey) return;
      const item = state[selectedKey];
      const cx = item.x + item.w / 2;
      const cy = item.y + item.h / 2;
      item.w = Math.max(40, Math.round(item.w * factor));
      item.h = Math.max(16, Math.round(item.h * factor));
      item.x = Math.round(cx - item.w / 2);
      item.y = Math.round(cy - item.h / 2);
      applyStateToDOM();
      renderInspector();
    }

    function centerSelectedHorizontally() {
      if (!selectedKey) return;
      const item = state[selectedKey];
      item.x = Math.round((1920 - item.w) / 2);
      applyStateToDOM();
      renderInspector();
    }

    function sliderBox(key, prop, label, min, max, unit = 'px', full = false) {
      const val = Math.round(state[key][prop]);
      return \`
        <div class="ctrl-box \${full ? 'full' : ''}">
          <div class="ctrl-label">
            <span>\${label}</span>
            <span class="ctrl-val"><span id="val-\${key}-\${prop}">\${val}</span>\${unit}</span>
          </div>
          <input type="range" min="\${min}" max="\${max}" value="\${val}" oninput="updateProp('\${key}', '\${prop}', this.value)" />
        </div>
      \`;
    }

    function renderInspector() {
      const titleEl = document.getElementById('inspector-title');
      const bodyEl = document.getElementById('inspector-body');
      titleEl.textContent = LABELS[selectedKey] || 'Elemento';

      const quickScaleBtns = \`
        <div style="display:flex;gap:6px;margin-bottom:8px;">
          <button class="toolbar-btn" style="flex:1;justify-content:center;padding:7px;" onclick="scaleSelectedProportionally(0.95)">➖ Reducir 5%</button>
          <button class="toolbar-btn" style="flex:1;justify-content:center;padding:7px;" onclick="scaleSelectedProportionally(1.05)">➕ Agrandar 5%</button>
        </div>
      \`;

      if (selectedKey === 'cards') {
        bodyEl.innerHTML = quickScaleBtns + '<div class="controls-grid">' +
          sliderBox('cards', 'w', 'Ancho Total (3 Imágenes)', 600, 1880, 'px', true) +
          sliderBox('cards', 'h', 'Alto de las Imágenes', 120, 520, 'px', true) +
          sliderBox('cards', 'gap', 'Separación', 0, 100) +
          sliderBox('cards', 'radius', 'Bordes Redondeados', 0, 48) +
          sliderBox('cards', 'y', 'Posición Vertical Y', 50, 960) +
          sliderBox('cards', 'x', 'Posición Horiz. X', 0, 1300) +
          sliderBox('cards', 'footerHeight', 'Alto Barra Texto', 50, 170) +
          sliderBox('cards', 'titleSize', 'Letra Título', 11, 36) +
          sliderBox('cards', 'ctaSize', 'Letra Subtítulo', 9, 26) +
          sliderBox('cards', 'badgeSize', 'Letra Insignia', 8, 22) +
          sliderBox('cards', 'circleSize', 'Botón Circular (+)', 20, 56) +
          sliderBox('cards', 'imgZoom', 'Zoom Fotos', 100, 160, '%') +
          sliderBox('cards', 'imgPosY', 'Encuadre Foto Y', 0, 100, '%', true) +
          '</div>';
      } else if (selectedKey === 'title' || selectedKey === 'subtitle') {
        bodyEl.innerHTML = quickScaleBtns + '<div class="controls-grid">' +
          sliderBox(selectedKey, 'w', 'Ancho del Texto / Logo', 150, 1900, 'px', true) +
          sliderBox(selectedKey, 'h', 'Alto del Texto / Logo', 30, 550, 'px', true) +
          sliderBox(selectedKey, 'y', 'Posición Vertical Y', 0, 1000) +
          sliderBox(selectedKey, 'x', 'Posición Horiz. X', 0, 1700) +
          sliderBox(selectedKey, 'brightness', 'Brillo', 50, 160, '%') +
          sliderBox(selectedKey, 'opacity', 'Opacidad', 10, 100, '%') +
          '</div>';
      } else if (selectedKey === 'barTop' || selectedKey === 'barMid') {
        bodyEl.innerHTML = '<div class="controls-grid">' +
          sliderBox(selectedKey, 'y', 'Posición Vertical (Altura)', 0, 1050, 'px', true) +
          sliderBox(selectedKey, 'w', 'Largo de la Barra Lineal', 200, 1920, 'px', true) +
          sliderBox(selectedKey, 'thickness', 'Grosor de Línea', 2, 32) +
          sliderBox(selectedKey, 'glow', 'Brillo Neón', 0, 60) +
          sliderBox(selectedKey, 'x', 'Posición X', 0, 1500) +
          sliderBox(selectedKey, 'opacity', 'Opacidad', 10, 100, '%') +
          '</div>';
      } else if (selectedKey === 'machines') {
        bodyEl.innerHTML = quickScaleBtns + '<div class="controls-grid">' +
          sliderBox('machines', 'y', 'Posición Vertical Y', 200, 1000, 'px', true) +
          sliderBox('machines', 'h', 'Altura Elípticas', 200, 900) +
          sliderBox('machines', 'w', 'Ancho Elípticas', 800, 2400) +
          sliderBox('machines', 'x', 'Posición X', -300, 600) +
          sliderBox('machines', 'brightness', 'Brillo', 20, 160, '%') +
          sliderBox('machines', 'opacity', 'Opacidad', 0, 100, '%', true) +
          '</div>';
      }
    }

    // Arrastrar y Redimensionar con el Mouse
    function startDrag(e, key) {
      if (e.target.classList.contains('handle')) return;
      e.stopPropagation();
      selectItem(key);
      const item = state[key];
      dragInfo = {
        mode: 'move',
        key,
        startX: e.clientX,
        startY: e.clientY,
        origX: item.x,
        origY: item.y,
        origW: item.w,
        origH: item.h
      };
    }

    function startResize(e, key, dir) {
      e.stopPropagation();
      e.preventDefault();
      selectItem(key);
      const item = state[key];
      dragInfo = {
        mode: 'resize',
        dir,
        key,
        startX: e.clientX,
        startY: e.clientY,
        origX: item.x,
        origY: item.y,
        origW: item.w,
        origH: item.h
      };
    }

    window.addEventListener('mousemove', (e) => {
      if (!dragInfo) return;
      const dx = (e.clientX - dragInfo.startX) / stageScale;
      const dy = (e.clientY - dragInfo.startY) / stageScale;
      const item = state[dragInfo.key];
      const guideV = document.getElementById('guide-v');

      if (dragInfo.mode === 'move') {
        let nextX = dragInfo.origX + dx;
        let nextY = dragInfo.origY + dy;

        const centerTargetX = (1920 - item.w) / 2;
        if (Math.abs(nextX - centerTargetX) < 10) {
          nextX = centerTargetX;
          guideV.style.display = 'block';
        } else {
          guideV.style.display = 'none';
        }

        item.x = Math.round(nextX);
        item.y = Math.round(nextY);
      } else if (dragInfo.mode === 'resize') {
        const d = dragInfo.dir;
        let nx = dragInfo.origX;
        let ny = dragInfo.origY;
        let nw = dragInfo.origW;
        let nh = dragInfo.origH;

        if (d.includes('e')) nw = Math.max(60, dragInfo.origW + dx);
        if (d.includes('w')) {
          nw = Math.max(60, dragInfo.origW - dx);
          nx = dragInfo.origX + (dragInfo.origW - nw);
        }
        if (d.includes('s')) nh = Math.max(16, dragInfo.origH + dy);
        if (d.includes('n')) {
          nh = Math.max(16, dragInfo.origH - dy);
          ny = dragInfo.origY + (dragInfo.origH - nh);
        }

        item.x = Math.round(nx);
        item.y = Math.round(ny);
        item.w = Math.round(nw);
        item.h = Math.round(nh);

        if ((dragInfo.key === 'barTop' || dragInfo.key === 'barMid') && (d.includes('n') || d.includes('s'))) {
          item.thickness = Math.max(2, Math.min(40, Math.round(nh * 0.32)));
        }
      }

      applyStateToDOM();
      renderInspector();
    });

    window.addEventListener('mouseup', () => {
      if (dragInfo) {
        dragInfo = null;
        document.getElementById('guide-v').style.display = 'none';
        document.getElementById('guide-h').style.display = 'none';
      }
    });

    function toggleCleanMode() {
      document.body.classList.toggle('clean-mode');
      setTimeout(updateStageScale, 20);
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'h' || e.key === 'H') {
        toggleCleanMode();
      }
      if (!selectedKey) return;
      const step = e.shiftKey ? 10 : 2;
      if (e.key === 'ArrowLeft')  { state[selectedKey].x -= step; applyStateToDOM(); renderInspector(); }
      if (e.key === 'ArrowRight') { state[selectedKey].x += step; applyStateToDOM(); renderInspector(); }
      if (e.key === 'ArrowUp')    { state[selectedKey].y -= step; applyStateToDOM(); renderInspector(); }
      if (e.key === 'ArrowDown')  { state[selectedKey].y += step; applyStateToDOM(); renderInspector(); }
    });

    function resetDefaults() {
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      applyStateToDOM();
      renderInspector();
    }

    async function exportReferencePng() {
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');

      const loadImage = (src) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = src;
      });

      const wallImg = await loadImage(document.getElementById('wall-bg').src);
      ctx.drawImage(wallImg, 0, 0, 1920, 1080);

      const rad = ctx.createRadialGradient(960, 378, 10, 960, 378, 900);
      rad.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
      rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rad;
      ctx.fillRect(0, 0, 1920, 1080);

      const ma = state.machines;
      const machImg = await loadImage(document.querySelector('#el-machines img').src);
      ctx.save();
      ctx.globalAlpha = ma.opacity / 100;
      ctx.filter = \`brightness(\${ma.brightness}%)\`;
      ctx.drawImage(machImg, ma.x, ma.y, ma.w, ma.h);
      ctx.restore();

      const drawBar = (b) => {
        ctx.save();
        ctx.globalAlpha = b.opacity / 100;
        const cy = b.y + b.h / 2;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = b.glow * 1.6;
        ctx.fillStyle = '#f4f5f7';
        ctx.fillRect(b.x, cy - b.thickness / 2, b.w, b.thickness);
        ctx.restore();
      };
      drawBar(state.barTop);
      drawBar(state.barMid);

      const ti = state.title;
      const titleImg = await loadImage(document.getElementById('img-title').src);
      ctx.save();
      ctx.globalAlpha = ti.opacity / 100;
      ctx.filter = \`brightness(\${ti.brightness}%)\`;
      ctx.drawImage(titleImg, ti.x, ti.y, ti.w, ti.h);
      ctx.restore();

      const su = state.subtitle;
      const subImg = await loadImage(document.getElementById('img-subtitle').src);
      ctx.save();
      ctx.globalAlpha = su.opacity / 100;
      ctx.filter = \`brightness(\${su.brightness}%)\`;
      ctx.drawImage(subImg, su.x, su.y, su.w, su.h);
      ctx.restore();

      const ca = state.cards;
      const cardData = [
        { imgSrc: document.getElementById('card-img-1').src, title: 'CLIENTE NUEVO', cta: 'Registrarme →', badge: 'INSCRIPCIÓN', color: '#fbbf24', border: 'rgba(251,191,36,0.75)' },
        { imgSrc: document.getElementById('card-img-2').src, title: 'QUIERO VISITA', cta: 'Pase de Visita →', badge: 'PASE DEL DÍA', color: '#34d399', border: 'rgba(52,211,153,0.75)' },
        { imgSrc: document.getElementById('card-img-3').src, title: 'YA TENGO MEMBRESÍA', cta: 'Validar Huella →', badge: 'ACCESO DIRECTO', color: '#fbbf24', border: 'rgba(251,191,36,0.75)' },
      ];
      const cw = (ca.w - ca.gap * 2) / 3;
      const ch = ca.h;

      const roundRect = (x, y, w, h, r) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      };

      for (let i = 0; i < 3; i++) {
        const cd = cardData[i];
        const cx = ca.x + i * (cw + ca.gap);
        const cy = ca.y;
        const cImg = await loadImage(cd.imgSrc);

        ctx.save();
        roundRect(cx, cy, cw, ch, ca.radius);
        ctx.clip();
        ctx.drawImage(cImg, cx, cy, cw, ch);

        const vig = ctx.createLinearGradient(cx, cy, cx, cy + ch);
        vig.addColorStop(0, 'rgba(0,0,0,0.2)');
        vig.addColorStop(0.5, 'rgba(0,0,0,0.25)');
        vig.addColorStop(1, 'rgba(0,0,0,0.9)');
        ctx.fillStyle = vig;
        ctx.fillRect(cx, cy, cw, ch);

        const fx = cx + ca.padding;
        const fw = cw - ca.padding * 2;
        const fh = ca.footerHeight;
        const fy = cy + ch - ca.padding - fh;
        roundRect(fx, fy, fw, fh, Math.max(8, ca.radius - 6));
        ctx.fillStyle = 'rgba(9, 10, 15, 0.92)';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(63, 63, 70, 0.8)';
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = \`900 \${ca.titleSize}px system-ui, sans-serif\`;
        ctx.fillText(cd.title, fx + 14, fy + Math.round(fh * 0.38));

        ctx.fillStyle = cd.color;
        ctx.font = \`800 \${ca.ctaSize}px system-ui, sans-serif\`;
        ctx.fillText(cd.cta, fx + 14, fy + fh - 16);

        ctx.restore();

        ctx.save();
        roundRect(cx, cy, cw, ch, ca.radius);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = cd.border;
        ctx.stroke();
        ctx.restore();
      }

      const link = document.createElement('a');
      link.download = 'REFERENCIA_DISENO_LEYENDS_GYM.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }

    selectItem('cards');
    applyStateToDOM();
    setTimeout(updateStageScale, 30);
  </script>
</body>
</html>`;

const outHtmlRoot = path.join(rootGymDir, 'EDITOR_DISENO_INICIO.html');
const outHtmlPublic = path.join(legendsDir, 'public/editor_diseno.html');
const outHtmlDist = path.join(legendsDir, 'dist/editor_diseno.html');
const outHtmlRelease = path.join(legendsDir, 'release/FITNESS_LEGENDS_TERMINAL-win32-x64/resources/app/dist/editor_diseno.html');

fs.writeFileSync(outHtmlRoot, html, 'utf8');
if (fs.existsSync(path.dirname(outHtmlPublic))) fs.writeFileSync(outHtmlPublic, html, 'utf8');
if (fs.existsSync(path.dirname(outHtmlDist))) fs.writeFileSync(outHtmlDist, html, 'utf8');
if (fs.existsSync(path.dirname(outHtmlRelease))) fs.writeFileSync(outHtmlRelease, html, 'utf8');

console.log('✓ Updated standalone visual editor HTML:', outHtmlRoot);
