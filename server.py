import http.server
import json
import os
import mimetypes
from urllib.parse import urlparse
from puzzles import PREDEFINED_PUZZLES, generate_shikaku
from solver import ShikakuSolver

PORT = 8000
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

class ShikakuRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        # Endpoint API: Obtener puzzles predefinidos
        if path == "/api/puzzles":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(PREDEFINED_PUZZLES).encode("utf-8"))
            return

        # Servir archivos estáticos
        # Si la ruta es la raíz, servir index.html
        if path == "/" or path == "/index.html":
            file_path = os.path.join(STATIC_DIR, "index.html")
        else:
            # Eliminar la barra inicial de la ruta
            clean_path = path.lstrip("/")
            file_path = os.path.join(STATIC_DIR, clean_path)

        # Evitar ataques de evasión de directorios (directory traversal)
        abs_file_path = os.path.abspath(file_path)
        abs_static_dir = os.path.abspath(STATIC_DIR)
        if not abs_file_path.startswith(abs_static_dir):
            self.send_error(403, "Acceso denegado")
            return

        if os.path.exists(abs_file_path) and os.path.isfile(abs_file_path):
            self.send_response(200)
            mime_type, _ = mimetypes.guess_type(abs_file_path)
            self.send_header("Content-Type", mime_type or "application/octet-stream")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            with open(abs_file_path, "rb") as f:
                self.wfile.write(f.read())
        else:
            self.send_error(404, f"Archivo no encontrado: {path}")

    def do_POST(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        # Leer cuerpo de la petición
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode("utf-8"))
        except Exception:
            self.send_error(400, "Formato JSON inválido")
            return

        # Endpoint API: Resolver un Shikaku
        if path == "/api/solve":
            width = data.get("width")
            height = data.get("height")
            clues = data.get("clues")

            if not width or not height or clues is None:
                self.send_error(400, "Parámetros incompletos (width, height, clues requeridos)")
                return

            try:
                solver = ShikakuSolver(width, height, clues)
                result = solver.solve()
                
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps(result).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))

        # Endpoint API: Generar un Shikaku aleatorio
        elif path == "/api/generate":
            width = data.get("width", 7)
            height = data.get("height", 7)
            
            try:
                puzzle = generate_shikaku(width, height)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps(puzzle).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
        else:
            self.send_error(404, "Endpoint no encontrado")

    def do_OPTIONS(self):
        """Manejar preflight CORS."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

def run(server_class=http.server.HTTPServer, handler_class=ShikakuRequestHandler):
    # Asegurar que el directorio static exista
    os.makedirs(STATIC_DIR, exist_ok=True)
    
    server_address = ("", PORT)
    httpd = server_class(server_address, handler_class)
    print(f"Servidor Shikaku ejecutándose en http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
        httpd.server_close()

if __name__ == "__main__":
    run()
