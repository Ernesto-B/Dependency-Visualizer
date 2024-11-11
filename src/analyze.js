// src/analyze.js
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
                dependencyGraph[filePath] = dependencies;
            }
        });
    }

    analyzeFolder(folderPath);

    return dependencyGraph;
}

module.exports = analyzeDependencies;
