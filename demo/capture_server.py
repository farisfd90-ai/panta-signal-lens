from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

ROOT = Path(__file__).parent

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        name = self.path.strip("/") or "capture.png"
        if not name.endswith(".png") or "/" in name or "\\" in name:
            self.send_error(400)
            return
        data = self.rfile.read(int(self.headers.get("Content-Length", "0")))
        (ROOT / name).write_bytes(data)
        self.send_response(204)
        self.end_headers()

    def log_message(self, *_):
        pass

HTTPServer(("127.0.0.1", 4180), Handler).serve_forever()
