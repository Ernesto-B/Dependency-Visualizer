// server.js
const express = require('express');
const cors = require('cors');
const analyzeDependencies = require('./src/analyze');
const { detectCycles } = require('./src/utils'); // Import cycle detection function
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/analyze', async (req, res) => {
    const { folderPath } = req.body;

    if (!folderPath) {
        return res.status(400).json({ error: 'Please provide the folderPath in the request body.' });
    }

    try {
        const absoluteFolderPath = path.resolve(folderPath);

        // Get both relative and full path graphs
        const { relativePathDependencyGraph, fullPathDependencyGraph } = await analyzeDependencies(absoluteFolderPath);

        console.log("Dependency Graph:", relativePathDependencyGraph);

        // Detect cycles in the relative path graph and capture all files involved in circular dependencies
        const cycleNodes = detectCycles(relativePathDependencyGraph); // Adjusted to return files involved in cycles
        const hasCycles = cycleNodes.length > 0;

        // Log for debugging
        console.log("Cycle Detection Result:", cycleNodes);

        res.json({
            dependencyGraph: relativePathDependencyGraph,
            fullPathDependencyGraph,
            hasCycles,
            cycleNodes, // Send list of files involved in cycles
        });
    } catch (error) {
        console.error('Error analyzing dependencies:', error);
        res.status(500).json({ error: 'Failed to analyze dependencies' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
