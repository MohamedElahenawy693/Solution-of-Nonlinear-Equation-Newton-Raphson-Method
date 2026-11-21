# Newton-Raphson Solver

Web app that finds the root of a nonlinear function using Newton-Raphson:

    x(n+1) = x(n) - f(x(n)) / f'(x(n))

## Features
- Input any nonlinear f(x) and an initial guess x0 (optional tolerance, default 1e-8)
- Automatic derivative (math.js) - no need to type f'(x)
- Shows: number of iterations, the value at each iteration (x, f(x), error), the final root and f(root)
- Graph of f(x) with the iteration points, the tangent lines, and the root
- Convergence check for x0: |f(x) f''(x) / f'(x)^2| < 1
- Handles errors: invalid equation, f'(x) = 0, divergence, max 100 iterations

## Run
Open `index.html` in a browser (internet needed once for the math.js and Bootstrap CDN links).

## Files
- `index.html` - page structure
- `style.css` - styling
- `main.js` - solver, convergence check, and graph drawing (plain canvas)
