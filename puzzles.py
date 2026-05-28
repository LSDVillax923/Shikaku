import random

# Puzzles predefinidos
PREDEFINED_PUZZLES = [
    {
        "id": 1,
        "name": "5x5 Fácil",
        "width": 5,
        "height": 5,
        "clues": [
            {"row": 0, "col": 0, "value": 4},
            {"row": 0, "col": 3, "value": 3},
            {"row": 1, "col": 2, "value": 2},
            {"row": 2, "col": 3, "value": 4},
            {"row": 3, "col": 1, "value": 6},
            {"row": 3, "col": 4, "value": 3},
            {"row": 4, "col": 2, "value": 2},
            {"row": 4, "col": 4, "value": 1}
        ]
    },
    {
        "id": 2,
        "name": "7x7 Medio",
        "width": 7,
        "height": 7,
        "clues": [
            {"row": 0, "col": 0, "value": 4},
            {"row": 0, "col": 4, "value": 5},
            {"row": 1, "col": 3, "value": 3},
            {"row": 2, "col": 2, "value": 2},
            {"row": 2, "col": 5, "value": 4},
            {"row": 3, "col": 1, "value": 6},
            {"row": 3, "col": 3, "value": 4},
            {"row": 4, "col": 4, "value": 2},
            {"row": 4, "col": 5, "value": 4},
            {"row": 5, "col": 0, "value": 4},
            {"row": 5, "col": 2, "value": 3},
            {"row": 5, "col": 6, "value": 4},
            {"row": 6, "col": 3, "value": 4}
        ]
    },
    {
        "id": 3,
        "name": "10x10 Desafío",
        "width": 10,
        "height": 10,
        "clues": [
            {"row": 0, "col": 1, "value": 4},
            {"row": 0, "col": 5, "value": 6},
            {"row": 0, "col": 8, "value": 8},
            {"row": 1, "col": 3, "value": 4},
            {"row": 2, "col": 0, "value": 6},
            {"row": 2, "col": 6, "value": 2},
            {"row": 3, "col": 2, "value": 9},
            {"row": 3, "col": 9, "value": 4},
            {"row": 4, "col": 4, "value": 5},
            {"row": 4, "col": 7, "value": 6},
            {"row": 5, "col": 1, "value": 12},
            {"row": 5, "col": 5, "value": 4},
            {"row": 6, "col": 8, "value": 2},
            {"row": 7, "col": 0, "value": 6},
            {"row": 7, "col": 3, "value": 4},
            {"row": 7, "col": 6, "value": 6},
            {"row": 8, "col": 4, "value": 4},
            {"row": 8, "col": 9, "value": 8},
            {"row": 9, "col": 2, "value": 4},
            {"row": 9, "col": 7, "value": 6}
        ]
    }
]

def generate_shikaku(width, height):
    """
    Genera un tablero de Shikaku válido dividiendo aleatoriamente la cuadrícula
    en rectángulos y colocando una pista en cada uno.
    """
    grid = [[False for _ in range(width)] for _ in range(height)]
    rectangles = []

    # Intentamos cubrir toda la cuadrícula con rectángulos
    for r in range(height):
        for c in range(width):
            if grid[r][c]:
                continue
            
            # Encontrar el tamaño máximo de rectángulo que podemos dibujar aquí
            max_h = height - r
            max_w = width - c
            
            # Buscar rectángulos posibles libres de colisiones
            possible_rects = []
            for h in range(1, max_h + 1):
                for w in range(1, max_w + 1):
                    # El área del rectángulo no debe ser gigante para que sea estético
                    if h * w > 16:
                        continue
                    # Verificar si todas las celdas en r..r+h-1, c..c+w-1 están libres
                    collision = False
                    for pr in range(r, r + h):
                        for pc in range(c, c + w):
                            if grid[pr][pc]:
                                collision = True
                                break
                        if collision:
                            break
                    if not collision:
                        possible_rects.append((h, w))
            
            if not possible_rects:
                # Si por algún motivo nos quedamos atascados, reiniciamos la generación
                return generate_shikaku(width, height)
            
            # Seleccionar un rectángulo aleatorio (preferir tamaños interesantes)
            # Para evitar muchos rectángulos de 1x1, damos menor peso a (1,1) si hay opciones
            if len(possible_rects) > 1:
                weights = [1 if (h==1 and w==1) else 3 for h, w in possible_rects]
                h, w = random.choices(possible_rects, weights=weights, k=1)[0]
            else:
                h, w = possible_rects[0]
                
            # Marcar celdas como cubiertas
            for pr in range(r, r + h):
                for pc in range(c, c + w):
                    grid[pr][pc] = True
            
            # Registrar el rectángulo
            rectangles.append({
                "r1": r,
                "c1": c,
                "r2": r + h - 1,
                "c2": c + w - 1,
                "area": h * w
            })
            
    # Para cada rectángulo, colocar el número del área en una celda aleatoria dentro de él
    clues = []
    for rect in rectangles:
        cr = random.randint(rect["r1"], rect["r2"])
        cc = random.randint(rect["c1"], rect["c2"])
        clues.append({
            "row": cr,
            "col": cc,
            "value": rect["area"]
        })
        
    return {
        "id": random.randint(1000, 9999),
        "name": f"Generado {width}x{height}",
        "width": width,
        "height": height,
        "clues": clues
    }
