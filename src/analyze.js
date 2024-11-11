const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

async function analyzeDependencies(folderPath, fileType) {
    const dependencyGraph = {};

    function shouldAnalyze(filePath) {
        // Only analyze files that match the fileType and are outside node_modules
        return filePath.endsWith(`.${fileType}`) && !filePath.includes('node_modules');
    }

    function getDependencies(filePath) {
        const dependencies = [];
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const ast = parser.parse(fileContent, {
            sourceType: 'module',
        });

        traverse(ast, {
            ImportDeclaration({ node }) {
                dependencies.push(node.source.value);
            },
            CallExpression({ node }) {
                if (node.callee.name === 'require' && node.arguments[0]) {
                    dependencies.push(node.arguments[0].value);
                }
            },
        });

        return dependencies;
    }

    function analyzeFolder(folderPath) {
        const files = fs.readdirSync(folderPath);
        files.forEach((file) => {
            const filePath = path.join(folderPath, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                if (!filePath.includes('node_modules')) {
                    analyzeFolder(filePath); // Recursive call for directories
                }
            } else if (shouldAnalyze(filePath)) {
                const dependencies = getDependencies(filePath);
                dependencyGraph[filePath] = dependencies.map(dep => {
                    if (dep.startsWith('.')) {
                        // Resolve relative imports to absolute paths
                        return path.resolve(path.dirname(filePath), dep);
                    }
                    return dep; // Return module names as they are
                });
            }
        });
    }

    analyzeFolder(folderPath);

    // Create both relative and full path versions of the graph
    const relativePathDependencyGraph = {};
    const fullPathDependencyGraph = {};

    Object.keys(dependencyGraph).forEach(fullPath => {
        // Relative path from the root folder
        const relativePath = path.relative(folderPath, fullPath).replace(/\\/g, '/');

        // Populate the relative path dependency graph
        relativePathDependencyGraph[`/${relativePath}`] = dependencyGraph[fullPath].map(dep => {
            // Convert absolute dependency paths to relative ones for display
            if (dep.startsWith(folderPath)) {
                return `/${path.relative(folderPath, dep).replace(/\\/g, '/')}`;
            }
            return dep;
        });

        // Populate the full path dependency graph with consistent single forward slashes
        fullPathDependencyGraph[fullPath.replace(/\\/g, '/')] = dependencyGraph[fullPath].map(dep => {
            return dep.startsWith(folderPath) ? dep.replace(/\\/g, '/') : dep;
        });
    });

    return { relativePathDependencyGraph, fullPathDependencyGraph };
}

module.exports = analyzeDependencies;
