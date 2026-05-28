# Shikaku Puzzle Game & Synthetic Solver

Este proyecto consiste en el diseño, desarrollo e implementación de un juego interactivo de Shikaku (rompecabezas lógico japonés) que incorpora una interfaz gráfica web y un solucionador sintético inteligente escrito en Python 3, desarrollado para la clase de Análisis de Algoritmos.

El proyecto está diseñado bajo un enfoque de Ingeniería de Software desacoplado (Cliente-Servidor), separando la interfaz de usuario de la lógica de resolución mediante una API REST ligera y sin dependencias de instalación de terceros (Zero-Dependency).

---

## Caracteristicas Clave

*   **Interfaz de Usuario Premium**: Diseñada en estilo Dark Glassmorphism con efectos neón, animaciones de colocación/retroceso y diseño totalmente adaptable (responsivo).
*   **Modo de Juego Humano Interactivo**: Permite dibujar rectángulos directamente en la rejilla usando click y arrastre de ratón (Click & Drag), con validación interactiva de reglas en tiempo real (área y colisiones).
*   **Solucionador Sintético (IA)**: Un solucionador basado en búsquedas en profundidad con retroceso que expone dos modos:
    *   *Resolución Instantánea*: Resuelve puzzles complejos (como de tamaño 10x10) en milisegundos en el backend de Python.
    *   *Resolución Animada*: Permite reproducir paso a paso cada decisión del algoritmo (colocar y remover rectángulos) directamente en el tablero, controlando la velocidad de la animación.
*   **Generador Dinámico de Puzzles**: Además de niveles predefinidos (5x5, 7x7 y 10x10), incluye un generador procedimental en Python que divide la cuadrícula aleatoriamente en rectángulos para crear nuevos tableros válidos y solubles del tamaño que desees (ej. 8x8, 12x12).
*   **Sin Dependencias**: Funciona nativamente con las librerías integradas de Python (http.server, json, random), eliminando la necesidad de comandos como pip install.

---

## Arquitectura del Proyecto

Para demostrar buenas prácticas de desarrollo, se implementó una arquitectura cliente-servidor:

*   **Backend (Python 3)**:
    *   `solver.py`: Aloja la lógica del motor de resolución del CSP.
    *   `puzzles.py`: Administra los puzzles precargados y el motor de división aleatoria.
    *   `server.py`: Servidor HTTP nativo que escucha peticiones y expone endpoints JSON (/api/solve, /api/generate, /api/puzzles).
*   **Frontend (HTML5 / CSS3 / JavaScript)**:
    *   `static/index.html`: Estructura semántica del juego.
    *   `static/style.css`: Estilización moderna, responsividad y animaciones de backtracking.
    *   `static/app.js`: Manejo del arrastre de mouse, renderizado del grid, peticiones fetch al backend y control del paso a paso animado.

---

## Detalles del Algoritmo del Solucionador

El solucionador sintético modela el Shikaku como un Problema de Satisfacción de Restricciones (CSP) utilizando las siguientes estrategias:

1.  **Generación de Candidatos**: Para cada número en la cuadrícula de valor A, se calculan todos los rectángulos posibles de área A que contienen a dicho número, caben dentro del tablero y no encierran otros números.
2.  **Búsqueda con Retroceso (Backtracking DFS)**: El algoritmo realiza una búsqueda sistemática asignando un rectángulo a cada número.
3.  **Heurística MRV (Minimum Remaining Values)**: En cada paso de la búsqueda, el algoritmo evalúa cuál es el número sin asignar que tiene la menor cantidad de rectángulos candidatos válidos y lo resuelve primero. Esto reduce exponencialmente el espacio de búsqueda.
4.  **Propagación de Restricciones (Forward Checking)**: Al posicionar un rectángulo temporal, se eliminan dinámicamente los candidatos en conflicto de los otros números. Si algún número se queda con cero opciones viables, el algoritmo corta esa rama de búsqueda (backtrack) de inmediato.

---

## Requisitos e Instalacion

### Requisitos
*   Tener instalado Python 3.x en tu sistema operativo.

### Instrucciones de Ejecución
1.  Descarga o clona este repositorio.
2.  Abre una terminal en la carpeta raíz del proyecto.
3.  Inicia el servidor ejecutando:
    ```bash
    python3 server.py
    ```
4.  Abre tu navegador de preferencia e ingresa a:
    http://localhost:8000
5.  (Opcional) Para ejecutar y probar la consistencia del algoritmo del solver en la terminal directamente:
    ```bash
    python3 solver.py
    ```

---

## Integrantes / Autores
Este proyecto fue desarrollado para la materia de Análisis de Algoritmos por:

*   Miguel Laiton
*   Daniel Osorio
*   Diego Villabón
