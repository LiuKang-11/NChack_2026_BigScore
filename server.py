from flask import Flask, request, jsonify
import subprocess, json, os

app = Flask(__name__)

@app.get("/score")
def score():
    coin = request.args.get("coin", "").strip()
    if not coin:
        return jsonify({"error": "missing coin"}), 400

    p = subprocess.run(
        ["python", "backboard/orchestrator.py", coin],
        capture_output=True, text=True
    )

    if p.returncode != 0:
        return jsonify({"error": "orchestrator failed", "stderr": p.stderr, "stdout": p.stdout}), 500

    try:
        return jsonify(json.loads(p.stdout))
    except Exception:
        return jsonify({"error": "bad json", "stdout": p.stdout}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "10000"))
    app.run(host="0.0.0.0", port=port)
