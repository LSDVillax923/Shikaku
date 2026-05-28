// Game State Variables
let currentPuzzle = null;
let predefinedPuzzles = [];
let gameMode = "human"; // "human" or "solver"
let userRectangles = []; // Array of {r1, c1, r2, c2, color, id, valid, info}
let timerInterval = null;
let secondsElapsed = 0;

// Drag Selection State
let isDragging = false;
let dragStartCell = null; // {row, col}
let dragEndCell = null;   // {row, col}

// Solver Animation State
let solverHistory = [];
let solverStepIndex = 0;
let solverInterval = null;
let solverSpeed = 100; // ms per step
let currentSolverRects = new Map(); // clue_id -> DOM element

// DOM Elements
const boardGrid = document.getElementById("board-grid");
const selectPuzzle = document.getElementById("select-puzzle");
const btnGenerate = document.getElementById("btn-generate");
const genWidth = document.getElementById("gen-width");
const genHeight = document.getElementById("gen-height");
const modeHuman = document.getElementById("mode-human");
const modeSolver = document.getElementById("mode-solver");
const solverControls = document.getElementById("solver-controls");
const btnSolveInstant = document.getElementById("btn-solve-instant");
const btnSolveAnimated = document.getElementById("btn-solve-animated");
const btnSolveStep = document.getElementById("btn-solve-step");
const sliderSpeed = document.getElementById("solver-speed");
const speedVal = document.getElementById("speed-val");
const statTime = document.getElementById("stat-time");
const statRects = document.getElementById("stat-rects");
const btnReset = document.getElementById("btn-reset");
const btnCheck = document.getElementById("btn-check");
const gameStatusBanner = document.getElementById("game-status-banner");
const modalHelp = document.getElementById("modal-help");
const btnHowTo = document.getElementById("btn-how-to");
const modalClose = document.getElementById("modal-close");

// Initialize application on load
window.addEventListener("DOMContentLoaded", () => {
    fetchPredefinedPuzzles();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Mode toggles
    modeHuman.addEventListener("click", () => setGameMode("human"));
    modeSolver.addEventListener("click", () => setGameMode("solver"));

    // Puzzle level selection
    selectPuzzle.addEventListener("change", (e) => {
        const selectedId = parseInt(e.target.value);
        const puzzle = predefinedPuzzles.find(p => p.id === selectedId);
        if (puzzle) loadPuzzle(puzzle);
    });

    // Custom level generation
    btnGenerate.addEventListener("click", generateCustomPuzzle);

    // Game Action buttons
    btnReset.addEventListener("click", resetBoard);
    btnCheck.addEventListener("click", checkUserSolution);

    // Solver Actions
    btnSolveInstant.addEventListener("click", solveInstant);
    btnSolveAnimated.addEventListener("click", toggleAnimatedSolve);
    btnSolveStep.addEventListener("click", solveStepByStep);
    sliderSpeed.addEventListener("input", (e) => {
        solverSpeed = parseInt(e.target.value);
        speedVal.textContent = `${solverSpeed}ms`;
        // Si el solver está corriendo, reconfigurar intervalo
        if (solverInterval) {
            stopSolverInterval();
            startSolverInterval();
        }
    });

    // Help Modal
    btnHowTo.addEventListener("click", () => modalHelp.classList.add("open"));
    modalClose.addEventListener("click", () => modalHelp.classList.remove("open"));
    window.addEventListener("click", (e) => {
        if (e.target === modalHelp) modalHelp.classList.remove("open");
    });
}

// Fetch predefined puzzles from backend
async function fetchPredefinedPuzzles() {
    try {
        const response = await fetch("/api/puzzles");
        if (!response.ok) throw new Error("Error al obtener niveles");
        predefinedPuzzles = await response.json();
        
        // Populate select list
        selectPuzzle.innerHTML = "";
        predefinedPuzzles.forEach(puzzle => {
            const option = document.createElement("option");
            option.value = puzzle.id;
            option.textContent = puzzle.name;
            selectPuzzle.appendChild(option);
        });

        // Load first puzzle by default
        if (predefinedPuzzles.length > 0) {
            loadPuzzle(predefinedPuzzles[0]);
        }
    } catch (error) {
        console.error(error);
        showBanner("error", "No se pudieron cargar los niveles predefinidos del servidor.");
    }
}

// Generate custom puzzle using API
async function generateCustomPuzzle() {
    const w = parseInt(genWidth.value);
    const h = parseInt(genHeight.value);

    if (isNaN(w) || isNaN(h) || w < 5 || h < 5 || w > 20 || h > 20) {
        showBanner("error", "Las dimensiones deben estar entre 5 y 20.");
        return;
    }

    showBanner("info", "Generando nuevo Shikaku...");
    
    try {
        const response = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ width: w, height: h })
        });
        if (!response.ok) throw new Error("Error al generar nivel");
        const puzzle = await response.json();
        
        // Agregar a la lista temporal
        const customName = `Personalizado ${w}x${h}`;
        puzzle.name = customName;
        
        // Eliminar personalizados anteriores de la lista para no acumular
        predefinedPuzzles = predefinedPuzzles.filter(p => !p.name.startsWith("Personalizado"));
        predefinedPuzzles.push(puzzle);

        // Agregar al selector
        const option = document.createElement("option");
        option.value = puzzle.id;
        option.textContent = customName;
        selectPuzzle.appendChild(option);
        selectPuzzle.value = puzzle.id;

        loadPuzzle(puzzle);
    } catch (error) {
        console.error(error);
        showBanner("error", "No se pudo generar el puzzle en el servidor.");
    }
}

// Set mode (human or synthetic solver)
function setGameMode(mode) {
    if (gameMode === mode) return;
    
    // Detener cualquier animación en curso
    stopSolverAnimation();

    gameMode = mode;
    resetBoard(); // Limpiar el tablero al cambiar de modo

    if (mode === "human") {
        modeHuman.classList.add("active");
        modeSolver.classList.remove("active");
        solverControls.classList.add("disabled");
        showBanner("info", "Modo Humano activado. Dibuja rectángulos arrastrando el mouse.");
        startTimer();
    } else {
        modeHuman.classList.remove("active");
        modeSolver.classList.add("active");
        solverControls.classList.remove("disabled");
        showBanner("info", "Modo Solucionador activado. Selecciona un método de resolución.");
        stopTimer();
    }
}

// Load a puzzle on the board
function loadPuzzle(puzzle) {
    currentPuzzle = puzzle;
    stopSolverAnimation();
    resetBoard();
}

// Reset board state and rebuild UI
function resetBoard() {
    stopSolverAnimation();
    userRectangles = [];
    secondsElapsed = 0;
    statTime.textContent = "00:00";
    
    if (gameMode === "human") {
        startTimer();
    } else {
        stopTimer();
    }

    if (!currentPuzzle) return;
    
    // Update stats labels
    updateStatsText();

    // Rebuild grid structure
    buildGridUI();
    showBanner("info", gameMode === "human" ? 
        "Dibuja rectángulos arrastrando sobre la cuadrícula." : 
        "Presiona 'Resolver' para iniciar el solucionador sintético.");
}

// Build the HTML board cells dynamically
function buildGridUI() {
    const W = currentPuzzle.width;
    const H = currentPuzzle.height;
    
    // Configurar la rejilla CSS en el contenedor
    boardGrid.style.gridTemplateColumns = `repeat(${W}, 1fr)`;
    boardGrid.style.gridTemplateRows = `repeat(${H}, 1fr)`;
    
    // Ajustar tamaño del contenedor proporcionalmente
    const maxBoardWidth = 500;
    const cellWidth = Math.floor(maxBoardWidth / Math.max(W, H));
    boardGrid.style.width = `${cellWidth * W}px`;
    boardGrid.style.height = `${cellWidth * H}px`;
    
    boardGrid.innerHTML = "";

    // Crear celdas
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            const cell = document.createElement("div");
            cell.classList.add("grid-cell");
            cell.dataset.row = r;
            cell.dataset.col = c;
            
            // Bordes externos redondeados estéticos
            if (c === W - 1) cell.classList.add("edge-right");
            if (r === H - 1) cell.classList.add("edge-bottom");

            // Buscar si esta celda contiene una pista
            const clue = currentPuzzle.clues.find(cl => cl.row === r && cl.col === c);
            if (clue) {
                const badge = document.createElement("div");
                badge.classList.add("clue-number");
                badge.textContent = clue.value;
                cell.appendChild(badge);
            }

            // Eventos del mouse para dibujar en modo humano
            if (gameMode === "human") {
                cell.addEventListener("mousedown", handleMouseDown);
                cell.addEventListener("mouseenter", handleMouseEnter);
            }

            boardGrid.appendChild(cell);
        }
    }

    // Evento del mouse general en la cuadrícula para finalizar arrastre
    if (gameMode === "human") {
        boardGrid.removeEventListener("mouseup", handleMouseUp);
        boardGrid.addEventListener("mouseup", handleMouseUp);
    }
}

// Get cell coords from event
function getCellCoords(element) {
    const cell = element.closest(".grid-cell");
    if (!cell) return null;
    return {
        row: parseInt(cell.dataset.row),
        col: parseInt(cell.dataset.col)
    };
}

// Mouse dragging handlers
function handleMouseDown(e) {
    if (e.button !== 0) return; // Solo click izquierdo
    const coords = getCellCoords(e.target);
    if (!coords) return;

    isDragging = true;
    dragStartCell = coords;
    dragEndCell = coords;
    
    updateDragPreview();
}

function handleMouseEnter(e) {
    if (!isDragging) return;
    const coords = getCellCoords(e.target);
    if (!coords) return;
    
    dragEndCell = coords;
    updateDragPreview();
}

function handleMouseUp(e) {
    if (!isDragging) return;
    isDragging = false;
    
    // Eliminar preview
    const preview = boardGrid.querySelector(".drag-preview");
    if (preview) preview.remove();

    if (!dragStartCell || !dragEndCell) return;

    // Calcular límites del rectángulo arrastrado
    const r1 = Math.min(dragStartCell.row, dragEndCell.row);
    const c1 = Math.min(dragStartCell.col, dragEndCell.col);
    const r2 = Math.max(dragStartCell.row, dragEndCell.row);
    const c2 = Math.max(dragStartCell.col, dragEndCell.col);

    createRectangle(r1, c1, r2, c2);
    
    dragStartCell = null;
    dragEndCell = null;
}

// Update the dotted drag overlay block
function updateDragPreview() {
    let preview = boardGrid.querySelector(".drag-preview");
    if (!preview) {
        preview = document.createElement("div");
        preview.classList.add("drag-preview");
        boardGrid.appendChild(preview);
    }

    const r1 = Math.min(dragStartCell.row, dragEndCell.row);
    const c1 = Math.min(dragStartCell.col, dragEndCell.col);
    const r2 = Math.max(dragStartCell.row, dragEndCell.row);
    const c2 = Math.max(dragStartCell.col, dragEndCell.col);

    positionOverlay(preview, r1, c1, r2, c2);
}

// Position any DOM overlay element over the grid based on row/col range
function positionOverlay(element, r1, c1, r2, c2) {
    const W = currentPuzzle.width;
    const H = currentPuzzle.height;

    // Obtener dimensiones reales del tablero
    const boardRect = boardGrid.getBoundingClientRect();
    const cellW = boardRect.width / W;
    const cellH = boardRect.height / H;

    element.style.left = `${c1 * cellW}px`;
    element.style.top = `${r1 * cellH}px`;
    element.style.width = `${(c2 - c1 + 1) * cellW}px`;
    element.style.height = `${(r2 - r1 + 1) * cellH}px`;
}

// Render a placed rectangle on the board
function renderRectangle(rect) {
    const el = document.createElement("div");
    el.classList.add("placed-rectangle");
    el.dataset.id = rect.id;
    
    // Asignar colores deterministas basados en las coordenadas y área
    const hue = (rect.r1 * 47 + rect.c1 * 83 + (rect.r2 - rect.r1 + 1) * (rect.c2 - rect.c1 + 1) * 113) % 360;
    el.style.borderColor = `hsl(${hue}, 85%, 55%)`;
    el.style.backgroundColor = `hsla(${hue}, 80%, 45%, 0.255)`;
    el.style.boxShadow = `0 4px 10px hsla(${hue}, 80%, 45%, 0.15)`;
    
    positionOverlay(el, rect.r1, rect.c1, rect.r2, rect.c2);
    
    // Si es inválido por regla de Shikaku, añadir clase de error
    if (rect.valid === false) {
        el.classList.add("invalid");
    }

    // Permitir doble click para borrar
    el.addEventListener("dblclick", () => {
        removeRectangle(rect.id);
    });
    // Click derecho también lo borra
    el.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        removeRectangle(rect.id);
    });

    boardGrid.appendChild(el);
}

// Create a rectangle from drag coordinates (Human Mode)
function createRectangle(r1, c1, r2, c2) {
    // 1. Verificar solapamiento con rectángulos existentes
    // En Shikaku estándar no se permite solapar. Eliminamos los existentes
    // que toquen total o parcialmente este espacio para hacer más fluida la edición.
    // Opcionalmente, simplemente no dejamos ponerlo.
    // Para UX: Eliminamos los rectángulos que se crucen con el nuevo dibujo.
    const toRemove = [];
    userRectangles.forEach(rect => {
        const overlap = !(rect.r2 < r1 || rect.r1 > r2 || rect.c2 < c1 || rect.c1 > c2);
        if (overlap) {
            toRemove.push(rect.id);
        }
    });

    toRemove.forEach(id => removeRectangle(id, false)); // Borrar del DOM sin reconstruir

    // 2. Crear nuevo rectángulo
    const rectId = Date.now() + Math.random().toString(36).substr(2, 5);
    const area = (r2 - r1 + 1) * (c2 - c1 + 1);

    // 3. Validar de forma local
    // Cada rectángulo debe contener exactamente 1 número, y su valor debe ser igual a su área.
    let cluesInside = [];
    currentPuzzle.clues.forEach(clue => {
        if (r1 <= clue.row && clue.row <= r2 && c1 <= clue.col && clue.col <= c2) {
            cluesInside.push(clue);
        }
    });

    let isValid = true;
    let errorMsg = "";
    if (cluesInside.length === 0) {
        isValid = false;
        errorMsg = "No contiene ningún número.";
    } else if (cluesInside.length > 1) {
        isValid = false;
        errorMsg = "Contiene más de un número.";
    } else if (cluesInside[0].value !== area) {
        isValid = false;
        errorMsg = `El área dibujada es ${area}, pero el número requiere ${cluesInside[0].value}.`;
    }

    const newRect = {
        id: rectId,
        r1, c1, r2, c2,
        area,
        valid: isValid,
        clue: cluesInside.length === 1 ? cluesInside[0] : null
    };

    userRectangles.push(newRect);
    renderRectangle(newRect);
    updateStatsText();

    if (!isValid) {
        showBanner("error", `¡Rectángulo inválido! ${errorMsg}`);
    } else {
        showBanner("info", `Rectángulo correcto colocado (Área ${area}). Double click para borrar.`);
    }

    // Auto-validar si ya cubrió todo
    checkAutoWin();
}

// Remove a rectangle from board
function removeRectangle(id, rebuild = true) {
    userRectangles = userRectangles.filter(r => r.id !== id);
    const element = boardGrid.querySelector(`[data-id="${id}"]`);
    if (element) element.remove();
    
    updateStatsText();
    
    if (rebuild) {
        showBanner("info", "Rectángulo eliminado.");
    }
}

// Update text statistics on screen
function updateStatsText() {
    if (!currentPuzzle) return;
    const numClues = currentPuzzle.clues.length;
    statRects.textContent = `${userRectangles.length} / ${numClues}`;
}

// Check if user completed the puzzle
function checkUserSolution() {
    if (!currentPuzzle) return;
    
    const W = currentPuzzle.width;
    const H = currentPuzzle.height;
    const numClues = currentPuzzle.clues.length;

    // 1. Verificar número de rectángulos
    if (userRectangles.length !== numClues) {
        showBanner("error", `Faltan rectángulos por colocar. Tienes ${userRectangles.length} de ${numClues}.`);
        return false;
    }

    // 2. Verificar que todos sean válidos localmente
    const allValid = userRectangles.every(r => r.valid);
    if (!allValid) {
        showBanner("error", "Tienes rectángulos con tamaño incorrecto o que contienen múltiples/cero números.");
        return false;
    }

    // 3. Verificar solapamientos y cobertura total del grid
    const coverage = Array(H).fill(0).map(() => Array(W).fill(false));
    let hasOverlap = false;

    userRectangles.forEach(rect => {
        for (let r = rect.r1; r <= rect.r2; r++) {
            for (let c = rect.c1; c <= rect.c2; c++) {
                if (coverage[r][c]) {
                    hasOverlap = true;
                }
                coverage[r][c] = true;
            }
        }
    });

    if (hasOverlap) {
        showBanner("error", "Hay rectángulos que se solapan.");
        return false;
    }

    // Verificar si queda alguna celda vacía
    let isFullyCovered = true;
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            if (!coverage[r][c]) {
                isFullyCovered = false;
            }
        }
    }

    if (!isFullyCovered) {
        showBanner("error", "Aún quedan celdas vacías por cubrir.");
        return false;
    }

    // Si pasa todas las pruebas: GANÓ
    stopTimer();
    showBanner("success", `¡Felicidades! Has completado el Shikaku correctamente en ${statTime.textContent}.`);
    
    // Resaltar todos en verde
    const rectElements = boardGrid.querySelectorAll(".placed-rectangle");
    rectElements.forEach(el => el.classList.add("correct"));
    
    return true;
}

// Silently checks and triggers win if correct
function checkAutoWin() {
    const W = currentPuzzle.width;
    const H = currentPuzzle.height;
    const numClues = currentPuzzle.clues.length;

    if (userRectangles.length !== numClues) return;
    if (!userRectangles.every(r => r.valid)) return;

    // Verificar si ya está completamente cubierto y sin solapamiento
    const coverage = Array(H).fill(0).map(() => Array(W).fill(false));
    for (let i = 0; i < userRectangles.length; i++) {
        const rect = userRectangles[i];
        for (let r = rect.r1; r <= rect.r2; r++) {
            for (let c = rect.col1; c <= rect.c2; c++) {
                // Si hay colisión, salimos
                if (r < 0 || r >= H || c < 0 || c >= W || coverage[r][c]) return;
                coverage[r][c] = true;
            }
        }
    }

    // Validar si está completamente cubierto
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            if (!coverage[r][c]) return;
        }
    }

    // Ganó automáticamente
    stopTimer();
    showBanner("success", `¡Felicidades! Has completado el Shikaku correctamente en ${statTime.textContent}.`);
    const rectElements = boardGrid.querySelectorAll(".placed-rectangle");
    rectElements.forEach(el => el.classList.add("correct"));
}

// Timer Utilities
function startTimer() {
    stopTimer();
    secondsElapsed = 0;
    timerInterval = setInterval(() => {
        secondsElapsed++;
        const mins = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
        const secs = String(secondsElapsed % 60).padStart(2, '0');
        statTime.textContent = `${mins}:${secs}`;
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Banner UI helper
function showBanner(type, message) {
    gameStatusBanner.className = `status-banner ${type}`;
    let icon = "fa-info-circle";
    if (type === "success") icon = "fa-circle-check";
    if (type === "error") icon = "fa-triangle-exclamation";
    
    gameStatusBanner.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
}

// SYNTHETIC SOLVER API INTERACTION

// 1. Solve Instantly
async function solveInstant() {
    if (!currentPuzzle) return;
    stopSolverAnimation();
    showBanner("info", "Invocando al solucionador sintético en el servidor...");

    try {
        const response = await fetch("/api/solve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                width: currentPuzzle.width,
                height: currentPuzzle.height,
                clues: currentPuzzle.clues
            })
        });

        if (!response.ok) throw new Error("Error en la petición de resolución");
        const result = await response.json();

        if (result.success) {
            // Limpiar rectángulos actuales en el DOM
            const rects = boardGrid.querySelectorAll(".placed-rectangle");
            rects.forEach(r => r.remove());

            userRectangles = [];

            // Dibujar rectángulos solucionados
            result.solution.forEach(sol => {
                const rectId = "sol-" + Math.random().toString(36).substr(2, 5);
                const rect = {
                    id: rectId,
                    r1: sol.rect.r1,
                    c1: sol.rect.c1,
                    r2: sol.rect.r2,
                    c2: sol.rect.c2,
                    valid: true,
                    clue: sol.clue
                };
                userRectangles.push(rect);
                renderRectangle(rect);
            });

            // Resaltar en verde
            const rectElements = boardGrid.querySelectorAll(".placed-rectangle");
            rectElements.forEach(el => el.classList.add("correct"));

            updateStatsText();
            showBanner("success", `¡Solucionado instantáneamente por el backend en ${result.duration_ms.toFixed(2)} ms! (${result.history.length} pasos de búsqueda analizados).`);
        } else {
            showBanner("error", "El solucionador sintético no pudo encontrar una solución válida para este puzzle.");
        }
    } catch (error) {
        console.error(error);
        showBanner("error", "Error de comunicación con el solucionador en Python.");
    }
}

// 2. Animated Solve (Plays back the search space history step-by-step)
async function toggleAnimatedSolve() {
    if (solverInterval) {
        // Pausar animación
        stopSolverInterval();
        btnSolveAnimated.innerHTML = '<i class="fa-solid fa-play"></i> Continuar';
        showBanner("info", "Animación pausada.");
        return;
    }

    if (solverHistory.length > 0 && solverStepIndex < solverHistory.length) {
        // Continuar desde el paso actual
        btnSolveAnimated.innerHTML = '<i class="fa-solid fa-pause"></i> Pausar';
        startSolverInterval();
        return;
    }

    // Iniciar nueva animación: llamar al servidor
    if (!currentPuzzle) return;
    showBanner("info", "Obteniendo historial de búsqueda del solver...");
    
    try {
        const response = await fetch("/api/solve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                width: currentPuzzle.width,
                height: currentPuzzle.height,
                clues: currentPuzzle.clues
            })
        });

        if (!response.ok) throw new Error("Error");
        const result = await response.json();

        if (!result.success && result.history.length === 0) {
            showBanner("error", "No se puede resolver este puzzle.");
            return;
        }

        solverHistory = result.history;
        solverStepIndex = 0;
        currentSolverRects.clear();
        
        // Limpiar tablero
        const rects = boardGrid.querySelectorAll(".placed-rectangle");
        rects.forEach(r => r.remove());
        userRectangles = [];

        btnSolveAnimated.innerHTML = '<i class="fa-solid fa-pause"></i> Pausar';
        showBanner("info", "Animando búsqueda por retroceso en tiempo real...");
        startSolverInterval();

    } catch (error) {
        console.error(error);
        showBanner("error", "Error al conectar con el solucionador en Python.");
    }
}

function startSolverInterval() {
    solverInterval = setInterval(() => {
        if (solverStepIndex >= solverHistory.length) {
            stopSolverAnimation();
            // Comprobar si se llegó a una solución final exitosa
            // La solución final está completa si todos los clues tienen un rectángulo
            showBanner("success", "¡Solución animada completada con éxito!");
            const rectElements = boardGrid.querySelectorAll(".placed-rectangle");
            rectElements.forEach(el => {
                el.classList.remove("solving-place");
                el.classList.add("correct");
            });
            return;
        }

        executeSolverStep(solverHistory[solverStepIndex]);
        solverStepIndex++;
    }, solverSpeed);
}

function stopSolverInterval() {
    if (solverInterval) {
        clearInterval(solverInterval);
        solverInterval = null;
    }
}

function stopSolverAnimation() {
    stopSolverInterval();
    solverHistory = [];
    solverStepIndex = 0;
    currentSolverRects.clear();
    btnSolveAnimated.innerHTML = '<i class="fa-solid fa-play"></i> Animación';
}

// 3. Step-by-Step Solve
async function solveStepByStep() {
    if (solverHistory.length === 0) {
        // Cargar el historial del backend primero
        if (!currentPuzzle) return;
        showBanner("info", "Cargando pasos del solucionador...");
        
        try {
            const response = await fetch("/api/solve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    width: currentPuzzle.width,
                    height: currentPuzzle.height,
                    clues: currentPuzzle.clues
                })
            });

            if (!response.ok) throw new Error("Error");
            const result = await response.json();

            solverHistory = result.history;
            solverStepIndex = 0;
            currentSolverRects.clear();
            
            const rects = boardGrid.querySelectorAll(".placed-rectangle");
            rects.forEach(r => r.remove());
            userRectangles = [];
        } catch (error) {
            console.error(error);
            showBanner("error", "Error al conectar con el servidor.");
            return;
        }
    }

    if (solverStepIndex < solverHistory.length) {
        const step = solverHistory[solverStepIndex];
        executeSolverStep(step);
        solverStepIndex++;
        showBanner("info", `Paso ${solverStepIndex} de ${solverHistory.length}: ${step.type === 'place' ? 'Colocando' : 'Removiendo'} rect para pista en (${step.clue.row}, ${step.clue.col}).`);
    } else {
        showBanner("success", "El solucionador ha finalizado todos los pasos.");
        const rectElements = boardGrid.querySelectorAll(".placed-rectangle");
        rectElements.forEach(el => {
            el.classList.remove("solving-place");
            el.classList.add("correct");
        });
    }
}

// Apply a single solver step (place/backtrack) to the board UI
function executeSolverStep(step) {
    const clueId = step.clue_id;
    const rect = step.rect;

    if (step.type === "place") {
        // Crear elemento DOM de rectángulo
        const el = document.createElement("div");
        el.classList.add("placed-rectangle", "solving-place");
        
        const hue = (rect.r1 * 47 + rect.c1 * 83 + (rect.r2 - rect.r1 + 1) * (rect.c2 - rect.c1 + 1) * 113) % 360;
        el.style.borderColor = `hsl(${hue}, 85%, 55%)`;
        el.style.backgroundColor = `hsla(${hue}, 80%, 45%, 0.25)`;
        
        positionOverlay(el, rect.r1, rect.c1, rect.r2, rect.c2);
        boardGrid.appendChild(el);
        
        // Guardar referencia
        currentSolverRects.set(clueId, el);

        // Actualizar estadísticas del contador
        statRects.textContent = `${currentSolverRects.size} / ${currentPuzzle.clues.length}`;
    } 
    else if (step.type === "backtrack") {
        const el = currentSolverRects.get(clueId);
        if (el) {
            el.classList.add("solving-backtrack");
            // Eliminar después de una pequeña animación
            setTimeout(() => {
                el.remove();
            }, 150);
            currentSolverRects.delete(clueId);
        }
        statRects.textContent = `${currentSolverRects.size} / ${currentPuzzle.clues.length}`;
    }
}
