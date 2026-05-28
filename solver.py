import time

class ShikakuSolver:
    def __init__(self, width, height, clues):
        self.width = width
        self.height = height
        self.clues = clues  # List of dict: {"row": r, "col": c, "value": v}
        self.num_clues = len(clues)
        
        # Asignar un ID único a cada pista
        for idx, clue in enumerate(self.clues):
            clue["id"] = idx
            
        self.history = []  # Registro de pasos: [{"type": "place"/"backtrack", "clue_id": id, "rect": {...}}]
        self.candidates = {}  # Map: clue_id -> list of candidate rects
        
        # Generar todos los rectángulos candidatos para cada pista
        self._generate_candidates()
        
    def _generate_candidates(self):
        """Genera y filtra los rectángulos candidatos para cada número."""
        for clue in self.clues:
            cid = clue["id"]
            cr, cc, val = clue["row"], clue["col"], clue["value"]
            self.candidates[cid] = []
            
            # Dimensiones del rectángulo h x w = val
            for h in range(1, val + 1):
                if val % h != 0:
                    continue
                w = val // h
                
                # Desplazar la esquina superior izquierda (r1, c1) tal que el rectángulo cubra a (cr, cc)
                # r1 debe ser <= cr, y r1 + h - 1 >= cr
                # r1 + h - 1 < height => r1 >= height - h
                min_r1 = max(0, cr - h + 1)
                max_r1 = min(cr, self.height - h)
                
                min_c1 = max(0, cc - w + 1)
                max_c1 = min(cc, self.width - w)
                
                for r1 in range(min_r1, max_r1 + 1):
                    for c1 in range(min_c1, max_c1 + 1):
                        r2 = r1 + h - 1
                        c2 = c1 + w - 1
                        
                        # Verificar que este rectángulo NO contenga ninguna otra pista
                        contains_other_clue = False
                        for other_clue in self.clues:
                            if other_clue["id"] == cid:
                                continue
                            ocr, occ = other_clue["row"], other_clue["col"]
                            if r1 <= ocr <= r2 and c1 <= occ <= c2:
                                contains_other_clue = True
                                break
                                
                        if not contains_other_clue:
                            self.candidates[cid].append({
                                "r1": r1, "c1": c1,
                                "r2": r2, "c2": c2,
                                "h": h, "w": w
                            })

    def _rects_overlap(self, r1, r2):
        """Retorna True si dos rectángulos se solapan."""
        return not (r1["r2"] < r2["r1"] or r1["r1"] > r2["r2"] or
                    r1["c2"] < r2["c1"] or r1["c1"] > r2["c2"])

    def solve(self):
        """Inicia el proceso de resolución."""
        self.history = []
        # Tablero de ocupación: True si la celda está cubierta
        occupied = [[False for _ in range(self.width)] for _ in range(self.height)]
        # Asignaciones de rectángulos a pistas: clue_id -> rect
        assignments = {}
        
        start_time = time.time()
        success = self._backtrack(occupied, assignments)
        end_time = time.time()
        
        duration_ms = (end_time - start_time) * 1000
        
        if success:
            # Formatear la solución final
            solution = []
            for cid, rect in assignments.items():
                clue = self.clues[cid]
                solution.append({
                    "clue": {"row": clue["row"], "col": clue["col"], "value": clue["value"]},
                    "rect": rect
                })
            return {
                "success": True,
                "solution": solution,
                "history": self.history,
                "duration_ms": duration_ms
            }
        else:
            return {
                "success": False,
                "history": self.history,
                "duration_ms": duration_ms
            }

    def _backtrack(self, occupied, assignments):
        """Búsqueda con retroceso con heurística MRV dinámica."""
        # Si todas las pistas tienen un rectángulo asignado, hemos terminado
        if len(assignments) == self.num_clues:
            return True
            
        # Encontrar la pista sin asignar con menor número de candidatos válidos (MRV)
        best_clue_id = None
        best_candidates = []
        min_candidate_count = float("inf")
        
        for clue in self.clues:
            cid = clue["id"]
            if cid in assignments:
                continue
                
            # Filtrar candidatos que no se solapen con lo ya ocupado
            valid_candidates = []
            for rect in self.candidates[cid]:
                # Verificar si el candidato choca con alguna celda ya ocupada
                collision = False
                for r in range(rect["r1"], rect["r2"] + 1):
                    for c in range(rect["c1"], rect["c2"] + 1):
                        if occupied[r][c]:
                            collision = True
                            break
                    if collision:
                        break
                if not collision:
                    valid_candidates.append(rect)
            
            cand_count = len(valid_candidates)
            # Si una pista no tiene candidatos válidos, hay un fallo (forward checking)
            if cand_count == 0:
                return False
                
            if cand_count < min_candidate_count:
                min_candidate_count = cand_count
                best_clue_id = cid
                best_candidates = valid_candidates
                
        if best_clue_id is None:
            return False
            
        # Probar candidatos para la mejor pista elegida
        for rect in best_candidates:
            # 1. Colocar el rectángulo (marcar celdas como ocupadas)
            self._set_occupied(rect, occupied, True)
            assignments[best_clue_id] = rect
            
            # Registrar paso de colocación para la animación
            clue = self.clues[best_clue_id]
            self.history.append({
                "type": "place",
                "clue_id": best_clue_id,
                "clue": {"row": clue["row"], "col": clue["col"], "value": clue["value"]},
                "rect": rect
            })
            
            # 2. Recursión
            if self._backtrack(occupied, assignments):
                return True
                
            # 3. Retroceso (desmarcar celdas y remover asignación)
            self._set_occupied(rect, occupied, False)
            del assignments[best_clue_id]
            
            # Registrar paso de retroceso
            self.history.append({
                "type": "backtrack",
                "clue_id": best_clue_id,
                "clue": {"row": clue["row"], "col": clue["col"], "value": clue["value"]},
                "rect": rect
            })
            
        return False

    def _set_occupied(self, rect, occupied, val):
        """Ocupa o libera las celdas cubiertas por el rectángulo."""
        for r in range(rect["r1"], rect["r2"] + 1):
            for c in range(rect["c1"], rect["c2"] + 1):
                occupied[r][c] = val

# Test del solucionador si se ejecuta este archivo directamente
if __name__ == "__main__":
    from puzzles import PREDEFINED_PUZZLES
    print("Probando el Solver con el puzzle de 5x5...")
    puzzle = PREDEFINED_PUZZLES[0]
    solver = ShikakuSolver(puzzle["width"], puzzle["height"], puzzle["clues"])
    result = solver.solve()
    if result["success"]:
        print(f"¡Resuelto con éxito en {result['duration_ms']:.2f} ms!")
        print(f"Total de pasos registrados en el historial: {len(result['history'])}")
        print("Solución:")
        for sol in result["solution"]:
            c = sol["clue"]
            r = sol["rect"]
            print(f"  Número {c['value']} en ({c['row']}, {c['col']}) -> Rect: ({r['r1']},{r['c1']}) a ({r['r2']},{r['c2']})")
    else:
        print("No se encontró solución.")
