// src/utils.js
function detectCycles(graph) {
    const visited = new Set();
    const stack = new Set();
    const cycleNodes = new Set(); // Track nodes involved in cycles

    const dfs = (node) => {
        if (stack.has(node)) {
            cycleNodes.add(node);
            return true;
        }
        if (visited.has(node)) return false;

        visited.add(node);
        stack.add(node);

        const neighbors = graph[node] || [];
        for (const neighbor of neighbors) {
            if (dfs(neighbor)) {
                cycleNodes.add(node); // Add current node to cycle if a cycle was detected
            }
        }

        stack.delete(node);
        return cycleNodes.has(node);
    };

    for (const node in graph) {
        dfs(node);
    }

    return Array.from(cycleNodes); // Return array of nodes involved in cycles
}

module.exports = { detectCycles };
