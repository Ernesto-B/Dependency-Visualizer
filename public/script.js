document.addEventListener("DOMContentLoaded", () => {
    const folderPathInput = document.getElementById('folderPath');
    const fileTypeInput = document.getElementById('fileType');
    const analyzeButton = document.getElementById('analyzeButton');
    const dependencyGraphContainer = document.getElementById('dependencyGraphContainer');
    const jsonView = document.getElementById('jsonView');
    const graphMessage = document.getElementById('graphMessage');
    const toggleButton = document.getElementById('toggleJsonView');
    const dependencyGraphDiv = document.createElement("div");
    dependencyGraphDiv.id = "dependencyGraph";
    dependencyGraphDiv.style.height = "500px";
    dependencyGraphContainer.appendChild(dependencyGraphDiv);

    // Show JSON by default and hide message
    jsonView.style.display = 'block';
    graphMessage.style.display = 'none';
    toggleButton.textContent = 'Hide JSON View';

    // Toggle JSON visibility
    toggleButton.addEventListener('click', () => {
        if (jsonView.style.display === 'block') {
            jsonView.style.display = 'none';
            toggleButton.textContent = 'Show JSON View';
        } else {
            jsonView.style.display = 'block';
            toggleButton.textContent = 'Hide JSON View';
        }
    });

    // Analyze button click event
    analyzeButton.addEventListener('click', async () => {
        const folderPath = folderPathInput.value;
        const fileType = fileTypeInput.value;

        if (!folderPath || !fileType) {
            alert("Please provide both folder path and file type.");
            return;
        }

        graphMessage.style.display = 'none';

        try {
            const response = await fetch('http://localhost:3000/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ folderPath, fileType })
            });

            if (!response.ok) {
                throw new Error("Failed to connect to the server.");
            }

            const result = await response.json();
            const dependencyGraph = result.dependencyGraph;
            const fullPathDependencyGraph = result.fullPathDependencyGraph;
            const hasCycles = result.hasCycles;

            // Display dependency graph in JSON view
            jsonView.textContent = JSON.stringify(dependencyGraph, null, 2);
            graphMessage.textContent = hasCycles ? "Circular Dependencies Found." : "No Circular Dependencies Found.";
            graphMessage.style.display = 'block';

            // Render visual dependency graph
            renderDependencyGraph(fullPathDependencyGraph);
        } catch (error) {
            graphMessage.textContent = error.message;
            graphMessage.style.display = 'block';
        }
    });

    // Function to render dependency graph using vis-network
    function renderDependencyGraph(fullPathDependencyGraph) {
        const nodes = [];
        const edges = [];

        // Populate nodes and edges based on fullPathDependencyGraph
        Object.keys(fullPathDependencyGraph).forEach((filePath) => {
            const fileName = filePath.split("/").pop(); // Extract just the file name for label
            nodes.push({ id: filePath, label: fileName });

            // Add edges for each dependency
            fullPathDependencyGraph[filePath].forEach(dependency => {
                const depPath = Object.keys(fullPathDependencyGraph).find(path => path === dependency);
                if (depPath) {
                    edges.push({ from: filePath, to: depPath });
                }
            });
        });

        // Define network data and options
        const data = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
        const options = {
            nodes: {
                shape: 'box',
                margin: 10,
                font: { align: 'left' },
                color: { background: '#dae8fc', border: '#6c8ebf' }
            },
            edges: {
                arrows: 'to',
                color: { color: '#6c8ebf' }
            },
            layout: {
                hierarchical: {
                    direction: 'UD', // Up-Down layout
                    sortMethod: 'directed',
                    nodeSpacing: 150,
                    levelSeparation: 200
                }
            },
            physics: {
                enabled: true // Disable physics for a cleaner layout
            }
        };

        // Initialize and render the network
        new vis.Network(dependencyGraphDiv, data, options);
    }
});
