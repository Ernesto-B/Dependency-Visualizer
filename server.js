const express = require('express');
const cors = require('cors');
const analyzeDependencies = require('./src/analyze');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/analyze', async (req, res) => {
    const { folderPath, fileType } = req.body;

    if (!folderPath || !fileType) {
        return res.status(400).json({ error: 'Please provide both folderPath and fileType in the request body.' });
    }

    try {
        const absoluteFolderPath = path.resolve(folderPath);

        // Use the updated analyzeDependencies to get both relative and full path graphs
        const { relativePathDependencyGraph, fullPathDependencyGraph } = await analyzeDependencies(absoluteFolderPath, fileType);

        res.json({
            dependencyGraph: relativePathDependencyGraph,
            fullPathDependencyGraph,
            hasCycles: false // Placeholder for cycle detection if needed
        });
    } catch (error) {
        console.error('Error analyzing dependencies:', error);
        res.status(500).json({ error: 'Failed to analyze dependencies' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
