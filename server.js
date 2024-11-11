// server.js
const express = require('express');
const analyzeDependencies = require('./src/analyze');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());


/**
 * Endpoint to analyze dependencies in a specified folder.
 * @param {string} folderPath - Path to the folder containing project files.
 * @param {string} fileType - The file extension to analyze (e.g., 'js' for .js files).
 */
app.post('/analyze', async (req, res) => {
    const { folderPath, fileType } = req.body;

    if (!folderPath || !fileType) {
        return res.status(400).json({ error: 'Please provide both folderPath and fileType in the request body.' });
    }

    try {
        // Resolve the absolute path for folderPath
        const absoluteFolderPath = path.resolve(folderPath);

        // Analyze dependencies based on the specified fileType
        const dependencyGraph = await analyzeDependencies(absoluteFolderPath, fileType);
        res.json({ dependencyGraph, hasCycles: false });
    } catch (error) {
        console.error('Error analyzing dependencies:', error);
        res.status(500).json({ error: 'Failed to analyze dependencies' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
