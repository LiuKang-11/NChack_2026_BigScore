import { NextResponse } from "next/server";
import { spawn } from "child_process";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const coin = searchParams.get("coin");
  if (!coin) return NextResponse.json({ error: "Missing coin" }, { status: 400 });

  const py = spawn("python3", ["backboard/orchestrator.py", coin], {
    env: process.env,
  });

  let out = "";
  let err = "";
  py.stdout.on("data", (d) => (out += d.toString()));
  py.stderr.on("data", (d) => (err += d.toString()));

  const code = await new Promise((resolve) => py.on("close", resolve));

  if (code !== 0) {
    return NextResponse.json({ error: "Orchestrator failed", stderr: err.trim() }, { status: 500 });
  }

  const text = out.trim();
  if (!text) {
    return NextResponse.json({ error: "No JSON from orchestrator", stderr: err.trim() }, { status: 500 });
  }

  try {
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json(
      { error: "Bad JSON from orchestrator", stdout: text, stderr: err.trim() },
      { status: 500 },
    );
  }
}
