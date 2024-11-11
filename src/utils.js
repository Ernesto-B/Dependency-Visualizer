// src/utils.js
function detectCycles(graph) {
    const visited = new Set();
    const stack = new Set();

    const dfs = (node) => {
        if (stack.has(node)) return true;
        if (visited.has(node)) return false;

        visited.add(node);
        stack.add(node);

        const neighbors = graph[node] || [];
        for (const neighbor of neighbors) {
            if (dfs(neighbor)) return true;
        }

        stack.delete(node);
        return false;
    };

    for (const node in graph) {
        if (dfs(node)) return true;
    }
    return false;
}

module.exports = { detectCycles };
