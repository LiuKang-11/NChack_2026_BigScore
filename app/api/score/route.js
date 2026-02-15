import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const coin = searchParams.get("coin");

    if (!coin) {
      return NextResponse.json({ error: "Missing coin" }, { status: 400 });
    }

    // Absolute path to Python file
    const scriptPath = path.join(process.cwd(), "backboard", "orchestrator.py");

    // Use "python" for Windows
    const py = spawn("python", [scriptPath, coin], {
      env: process.env,
    });

    let out = "";
    let err = "";

    py.stdout.on("data", (d) => (out += d.toString()));
    py.stderr.on("data", (d) => (err += d.toString()));

    const code = await new Promise((resolve) => py.on("close", resolve));

    if (code !== 0) {
      return NextResponse.json(
        { error: "Orchestrator failed", stderr: err },
        { status: 500 },
      );
    }

    return NextResponse.json(JSON.parse(out));
  } catch (error) {
    return NextResponse.json(
      { error: "Server crashed", details: String(error) },
      { status: 500 },
    );
  }
}
