
const MAX_ITER = 100;
let lastRun = null;  

function $(id) { return document.getElementById(id); }

function showMessage(text) {
    const box = $("message");
    box.className = text ? "error-msg" : "";
    box.textContent = text || "";
}

function buildFunctions(eqStr) {
    const node = math.parse(eqStr);
    const f = node.compile();
    const fn = (x) => Number(f.evaluate({ x: x }));

    let dfn;
    try {
        const d = math.derivative(node, "x").compile();
        dfn = (x) => Number(d.evaluate({ x: x }));
    } catch (e) {
       
        dfn = (x) => { const h = 1e-6; return (fn(x + h) - fn(x - h)) / (2 * h); };
    }
    return { fn, dfn, node };
}

function readInputs() {
    const eqStr = $("EqStr").value.trim();
    const x0 = parseFloat($("initial-guess").value);
    const tol = parseFloat($("tolerance").value);
    if (eqStr === "" || isNaN(x0)) {
        showMessage("Please enter a valid equation and initial guess.");
        return null;
    }
    return { eqStr, x0, tol: (isNaN(tol) || tol <= 0) ? 1e-8 : tol };
}

function fmt(v) {
    if (!isFinite(v)) return String(v);
    const a = Math.abs(v);
    return (a !== 0 && (a < 1e-4 || a >= 1e8)) ? v.toExponential(6) : v.toFixed(8);
}

function NewtonRaphson() {
    showMessage("");
    $("Convergence-result").textContent = "";
    $("Convergence-result").className = "";

    const input = readInputs();
    if (!input) return false;

    let fn, dfn;
    try {
        ({ fn, dfn } = buildFunctions(input.eqStr));
        fn(input.x0);
    } catch (e) {
        showMessage("Invalid equation: " + e.message);
        return false;
    }

    const steps = []; 
    let x = input.x0;
    steps.push({ i: 0, x: x, fx: fn(x), diff: null });

    let reason = "max";
    for (let i = 1; i <= MAX_ITER; i++) {
        const fx = fn(x);
        const dfx = dfn(x);
        if (!isFinite(fx) || !isFinite(dfx)) { reason = "diverged"; break; }
        if (dfx === 0) { reason = "zero-derivative"; break; }

        const xNew = x - fx / dfx;
        const diff = Math.abs(xNew - x);
        if (!isFinite(xNew)) { reason = "diverged"; break; }

        steps.push({ i: i, x: xNew, fx: fn(xNew), diff: diff });
        x = xNew;
        if (diff < input.tol) { reason = "converged"; break; }
    }

    lastRun = { input, steps, reason, fn, dfn };
    renderTable(steps);
    renderSummary(lastRun);
    drawGraph(lastRun);
    return false;  
}


function renderTable(steps) {
    const body = $("steps-table");
    body.innerHTML = steps.map((s) =>
        "<tr><td>" + (s.i === 0 ? "0 (initial)" : s.i) + "</td>" +
        "<td>" + fmt(s.x) + "</td>" +
        "<td>" + fmt(s.fx) + "</td>" +
        "<td>" + (s.diff === null ? "—" : fmt(s.diff)) + "</td></tr>"
    ).join("");
}

function renderSummary(run) {
    const box = $("summary");
    const last = run.steps[run.steps.length - 1];
    const count = run.steps.length - 1;
    let html = "";

    if (run.reason === "converged") {
        html = "Number of iterations: <b>" + count + "</b><br>" +
               "Root: <b>x ≈ " + fmt(last.x) + "</b><br>" +
               "f(root) = <b>" + fmt(last.fx) + "</b> (≈ 0)<br>" +
               "Stopped because the value became stable (|x<sub>n+1</sub> − x<sub>n</sub>| &lt; " + run.input.tol + ").";
        showMessage("");
    } else if (run.reason === "zero-derivative") {
        html = "Number of iterations: <b>" + count + "</b><br>The method stopped: f′(x) = 0 at x = " + fmt(last.x) + " (division by zero). Try another initial guess.";
    } else if (run.reason === "diverged") {
        html = "Number of iterations: <b>" + count + "</b><br>The method diverged (the value became infinite or undefined). Try another initial guess.";
    } else {
        html = "Reached the maximum of " + MAX_ITER + " iterations without becoming stable.<br>Last value: x = " + fmt(last.x) + ", f(x) = " + fmt(last.fx);
    }
    box.innerHTML = html;
    box.style.display = "block";
}

function checkConvergence() {
    showMessage("");
    const out = $("Convergence-result");
    const input = readInputs();
    if (!input) return;

    try {
        const node = math.parse(input.eqStr);
        const f = node.compile();
        const d1 = math.derivative(node, "x");
        const d2 = math.derivative(d1, "x").compile();
        const d1c = d1.compile();
        const scope = { x: input.x0 };
        const fx = f.evaluate(scope), f1 = d1c.evaluate(scope), f2 = d2.evaluate(scope);

        if (f1 === 0) {
            out.className = "not-guaranteed";
            out.textContent = "f′(x₀) = 0, so Newton's method cannot start from this point.";
            return;
        }
        const value = Math.abs((fx * f2) / (f1 * f1));
        if (value < 1) {
            out.className = "guaranteed";
            out.textContent = "|f·f″ / (f′)²| = " + value.toFixed(6) + " < 1, convergence is guaranteed.";
        } else {
            out.className = "not-guaranteed";
            out.textContent = "|f·f″ / (f′)²| = " + value.toFixed(6) + " ≥ 1, convergence is not guaranteed.";
        }
    } catch (e) {
        showMessage("Invalid equation: " + e.message);
    }
}

function drawGraph(run) {
    const canvas = $("plot");
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!run) return;

    const pts = run.steps.filter((s) => isFinite(s.x) && isFinite(s.fx) && Math.abs(s.x) < 1e6);
    if (pts.length === 0) return;

   
    let xmin = Math.min(...pts.map((p) => p.x)), xmax = Math.max(...pts.map((p) => p.x));
    let span = xmax - xmin;
    if (span < 1e-9) span = 2;
    xmin -= span * 0.25 + 0.5 * (span < 1 ? 1 : 0); xmax += span * 0.25 + 0.5 * (span < 1 ? 1 : 0);

   
    const N = 800, xs = [], ys = [];
    for (let k = 0; k <= N; k++) {
        const x = xmin + (xmax - xmin) * k / N;
        let y = NaN;
        try { y = run.fn(x); } catch (e) {}
        xs.push(x); ys.push(isFinite(y) ? y : NaN);
    }

   
    const yPts = pts.map((p) => p.fx).concat([0]);
    let ymin = Math.min(...yPts), ymax = Math.max(...yPts);
    const finite = ys.filter((v) => isFinite(v)).sort((a, b) => a - b);
    if (finite.length) {
        const lo = finite[Math.floor(finite.length * 0.02)], hi = finite[Math.floor(finite.length * 0.98)];
        ymin = Math.min(ymin, lo); ymax = Math.max(ymax, hi);
       
        const ptsSpan = Math.max(...yPts) - Math.min(...yPts) || 1;
        ymin = Math.max(ymin, Math.min(...yPts) - 3 * ptsSpan);
        ymax = Math.min(ymax, Math.max(...yPts) + 3 * ptsSpan);
    }
    if (ymax - ymin < 1e-9) { ymin -= 1; ymax += 1; }
    const ypad = (ymax - ymin) * 0.08; ymin -= ypad; ymax += ypad;

    const m = { l: 55, r: 15, t: 12, b: 30 };
    const px = (x) => m.l + (x - xmin) / (xmax - xmin) * (W - m.l - m.r);
    const py = (y) => H - m.b - (y - ymin) / (ymax - ymin) * (H - m.t - m.b);

   
    ctx.font = "11px Consolas, monospace"; ctx.fillStyle = "#555"; ctx.strokeStyle = "#e3e8f7"; ctx.lineWidth = 1;
    for (let k = 0; k <= 8; k++) {
        const x = xmin + (xmax - xmin) * k / 8, X = px(x);
        ctx.beginPath(); ctx.moveTo(X, m.t); ctx.lineTo(X, H - m.b); ctx.stroke();
        ctx.textAlign = "center"; ctx.fillText(+x.toPrecision(3), X, H - m.b + 15);
    }
    for (let k = 0; k <= 6; k++) {
        const y = ymin + (ymax - ymin) * k / 6, Y = py(y);
        ctx.beginPath(); ctx.moveTo(m.l, Y); ctx.lineTo(W - m.r, Y); ctx.stroke();
        ctx.textAlign = "right"; ctx.fillText(+y.toPrecision(3), m.l - 6, Y + 4);
    }

   
    ctx.strokeStyle = "#333"; ctx.lineWidth = 1.5;
    if (ymin < 0 && ymax > 0) { ctx.beginPath(); ctx.moveTo(m.l, py(0)); ctx.lineTo(W - m.r, py(0)); ctx.stroke(); }
    if (xmin < 0 && xmax > 0) { ctx.beginPath(); ctx.moveTo(px(0), m.t); ctx.lineTo(px(0), H - m.b); ctx.stroke(); }

  
    ctx.save();
    ctx.beginPath(); ctx.rect(m.l, m.t, W - m.l - m.r, H - m.t - m.b); ctx.clip();

   
    ctx.strokeStyle = "#1a3bd1"; ctx.lineWidth = 2; ctx.beginPath();
    let pen = false;
    for (let k = 0; k <= N; k++) {
        if (!isFinite(ys[k])) { pen = false; continue; }
        if (pen && Math.abs(ys[k] - ys[k - 1]) > (ymax - ymin) * 5) { pen = false; } 
        if (!pen) { ctx.moveTo(px(xs[k]), py(ys[k])); pen = true; } else ctx.lineTo(px(xs[k]), py(ys[k]));
    }
    ctx.stroke();

   
    for (let k = 0; k < pts.length - 1; k++) {
        const a = pts[k], b = pts[k + 1];
        ctx.strokeStyle = "#e67e22"; ctx.lineWidth = 1.3; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(px(a.x), py(a.fx)); ctx.lineTo(px(b.x), py(0)); ctx.stroke();
        ctx.strokeStyle = "#999"; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(px(b.x), py(0)); ctx.lineTo(px(b.x), py(b.fx)); ctx.stroke();
    }
    ctx.setLineDash([]);

    pts.forEach((p, k) => {
        const isLast = k === pts.length - 1 && run.reason === "converged";
        ctx.fillStyle = isLast ? "#198754" : "#c0392b";
        ctx.beginPath(); ctx.arc(px(p.x), py(p.fx), isLast ? 6 : 4.5, 0, 2 * Math.PI); ctx.fill();
    });
    ctx.restore();

    ctx.fillStyle = "#222"; ctx.font = "bold 11px Consolas, monospace"; ctx.textAlign = "left";
    pts.slice(0, 6).forEach((p) => {
        const X = px(p.x), Y = py(p.fx);
        if (X > m.l && X < W - m.r && Y > m.t && Y < H - m.b) ctx.fillText("x" + p.i, X + 7, Y - 7);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    $("solver-form").addEventListener("submit", (e) => { e.preventDefault(); NewtonRaphson(); });
    $("check-btn").addEventListener("click", checkConvergence);
    window.addEventListener("resize", () => { if (lastRun) drawGraph(lastRun); });
});
