const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

async function analyzeDependencies(rootFolderPath, fileType) {
    const dependencyGraph = {};

    function shouldAnalyze(filePath) {
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
                // Get the relative path with respect to the root folder
                const relativeFilePath = path.relative(rootFolderPath, filePath);
                const dependencies = getDependencies(filePath);
                dependencyGraph[`\\${relativeFilePath}`] = dependencies; // Single backslash for JSON consistency
            }
        });
    }

    analyzeFolder(rootFolderPath);

    return dependencyGraph;
}

module.exports = analyzeDependencies;
