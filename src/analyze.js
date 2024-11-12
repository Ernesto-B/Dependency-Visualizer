// analyze.js
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

async function analyzeDependencies(folderPath) {
    const dependencyGraph = {};

    // Set of supported extensions for dependency analysis
    const supportedExtensions = new Set(['.js', '.ts', '.py', '.go', '.c', '.cpp', '.h', '.hpp', '.java']);

    function shouldAnalyze(filePath) {
        return supportedExtensions.has(path.extname(filePath).toLowerCase()) && !filePath.includes('node_modules');
    }

    function resolveDependencyPath(filePath, dependency) {
        // Handle Python imports without extensions
        if (dependency.startsWith('.') && path.extname(dependency) === '') {
            const potentialPythonPath = path.resolve(path.dirname(filePath), dependency + '.py');
            if (fs.existsSync(potentialPythonPath)) {
                return potentialPythonPath;
            }
        }

        if (!dependency.startsWith('.')) return dependency; // Return external module names as they are

        // Attempt to resolve dependency with supported extensions
        for (const ext of supportedExtensions) {
            const fullPath = path.resolve(path.dirname(filePath), dependency + ext);
            if (fs.existsSync(fullPath)) {
                return fullPath;
            }
        }
        return path.resolve(path.dirname(filePath), dependency); // Default to the original path if no extension matches
    }

    function getDependencies(filePath) {
        const dependencies = [];
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const ext = path.extname(filePath).toLowerCase();

        if (ext === '.js' || ext === '.ts') {
            const ast = parser.parse(fileContent, { sourceType: 'module' });
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
        } else if (ext === '.py') {
            const importRegex = /(?:from\s+(\S+)\s+import\s+\S+|import\s+(\S+))/g;
            let match;
            while ((match = importRegex.exec(fileContent)) !== null) {
                const dep = match[1] || match[2];
                dependencies.push(dep.startsWith('.') ? dep : './' + dep); // Make relative if needed
            }
        } else if (ext === '.go') {
            const importRegex = /import\s+(?:\(\s*([\s\S]*?)\s*\)|"(.+?)")/g;
            let match;
            while ((match = importRegex.exec(fileContent)) !== null) {
                if (match[1]) {
                    const imports = match[1].split('\n').map(line => line.trim().replace(/"/g, ''));
                    dependencies.push(...imports);
                } else {
                    dependencies.push(match[2]);
                }
            }
        } else if (ext === '.c' || ext === '.cpp' || ext === '.h' || ext === '.hpp') {
            const includeRegex = /#include\s+["<](.+?)[">]/g;
            let match;
            while ((match = includeRegex.exec(fileContent)) !== null) {
                dependencies.push(match[1]);
            }
        } else if (ext === '.java') {
            const importRegex = /import\s+([\w.]+);/g;
            let match;
            while ((match = importRegex.exec(fileContent)) !== null) {
                dependencies.push(match[1]);
            }
        }

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
                dependencyGraph[filePath] = dependencies.map(dep => resolveDependencyPath(filePath, dep));
            }
        });
    }

    analyzeFolder(folderPath);

    // Create both relative and full path versions of the graph
    const relativePathDependencyGraph = {};
    const fullPathDependencyGraph = {};

    Object.keys(dependencyGraph).forEach(fullPath => {
        const relativePath = path.relative(folderPath, fullPath).replace(/\\/g, '/');
        
        relativePathDependencyGraph[`/${relativePath}`] = dependencyGraph[fullPath].map(dep => {
            if (dep.startsWith(folderPath)) {
                return `/${path.relative(folderPath, dep).replace(/\\/g, '/')}`;
            }
            return dep;
        });

        fullPathDependencyGraph[fullPath.replace(/\\/g, '/')] = dependencyGraph[fullPath].map(dep => {
            return dep.startsWith(folderPath) ? dep.replace(/\\/g, '/') : dep;
        });
    });

    return { relativePathDependencyGraph, fullPathDependencyGraph };
}

module.exports = analyzeDependencies;
