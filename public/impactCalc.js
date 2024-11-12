// impactCalc.js

export function calculateImpactScores(dependencyGraph) {
    const impactScores = {};
    Object.keys(dependencyGraph).forEach(file => {
        let visited = new Set();
        calculateImpact(file, dependencyGraph, visited);
        impactScores[file] = visited.size;
    });
    return impactScores;
}

// Recursive function to count all dependencies of a given file
function calculateImpact(file, graph, visited) {
    if (visited.has(file)) return;
    visited.add(file);
    (graph[file] || []).forEach(dep => calculateImpact(dep, graph, visited));
}

// Color coding based on impact score
export function getImpactColor(score) {
    const normalizedScore = Math.min(1, score / 10); // Normalize for color scaling
    const red = Math.floor(255 * normalizedScore);
    const green = 255 - red;
    return `rgb(${red}, ${green}, 0)`; // Gradient from green (low) to red (high)
}
