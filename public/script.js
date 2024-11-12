document.addEventListener("DOMContentLoaded", () => {
    const folderPathInput = document.getElementById('folderPath');
    const fileTypeInput = document.getElementById('fileType');
    const analyzeButton = document.getElementById('analyzeButton');
    const canvas = document.getElementById('dependencyCanvas');
    const context = canvas.getContext("2d");
    const jsonView = document.getElementById('jsonView');

    let scale = 1; // Initial zoom scale
    let offsetX = 0; // Initial horizontal offset
    let offsetY = 0; // Initial vertical offset
    let isPanning = false;
    let startX, startY;
    const positions = {}; // Store positions of nodes and placeholders

    // Event listener for mouse wheel to handle zooming
    canvas.addEventListener("wheel", (event) => {
        event.preventDefault();
        const zoomIntensity = 0.1;
        scale += event.deltaY > 0 ? -zoomIntensity : zoomIntensity;
        scale = Math.min(Math.max(0.1, scale), 3); // Limit zoom scale
        renderDependencyGraph(lastDependencyGraph);
    });

    // Event listeners for panning
    canvas.addEventListener("mousedown", (event) => {
        isPanning = true;
        startX = event.clientX - offsetX;
        startY = event.clientY - offsetY;
    });

    canvas.addEventListener("mousemove", (event) => {
        if (isPanning) {
            offsetX = event.clientX - startX;
            offsetY = event.clientY - startY;
            renderDependencyGraph(lastDependencyGraph);
        }
    });

    canvas.addEventListener("mouseup", () => {
        isPanning = false;
    });

    canvas.addEventListener("mouseleave", () => {
        isPanning = false;
    });

    analyzeButton.addEventListener('click', async () => {
        const folderPath = folderPathInput.value;
        const fileType = fileTypeInput.value;

        if (!folderPath || !fileType) {
            alert("Please provide both folder path and file type.");
            return;
        }

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
            jsonView.textContent = JSON.stringify(dependencyGraph, null, 2);

            lastDependencyGraph = dependencyGraph;
            initializePositions(dependencyGraph); // Initialize positions only once
            renderDependencyGraph(dependencyGraph);
        } catch (error) {
            alert(error.message);
        }
    });

    let lastDependencyGraph = {}; // To store the last graph data for re-rendering on zoom or pan

    // Initialize node positions
    function initializePositions(dependencyGraph) {
        const nodes = Object.keys(dependencyGraph);
        const nodeRadius = 30;
        const spacing = 150;

        // Calculate and store positions for all nodes and placeholders once
        nodes.forEach((node, index) => {
            if (!positions[node]) {
                const x = (index % 5) * spacing + 100;
                const y = Math.floor(index / 5) * spacing + 100;
                positions[node] = { x, y };
            }

            // Initialize positions for each dependency if they don’t exist
            dependencyGraph[node].forEach((dep) => {
                if (!positions[dep]) {
                    const placeholderX = Math.random() * (canvas.width - 2 * nodeRadius) + nodeRadius;
                    const placeholderY = Math.random() * (canvas.height - 2 * nodeRadius) + nodeRadius;
                    positions[dep] = { x: placeholderX, y: placeholderY };
                }
            });
        });
    }

    function renderDependencyGraph(dependencyGraph) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.save();
        context.translate(offsetX, offsetY);
        context.scale(scale, scale);

        const nodes = Object.keys(dependencyGraph);
        const nodeRadius = 30;

        // Draw nodes
        nodes.forEach((node) => {
            const { x, y } = positions[node];

            context.beginPath();
            context.arc(x, y, nodeRadius, 0, Math.PI * 2, false);
            context.fillStyle = "#61bffc";
            context.fill();
            context.lineWidth = 2;
            context.strokeStyle = "#333";
            context.stroke();

            context.font = "12px Arial";
            context.fillStyle = "#000";
            context.textAlign = "center";
            context.fillText(node, x, y + 4);
        });

        // Draw edges
        nodes.forEach((node) => {
            const dependencies = dependencyGraph[node];
            dependencies.forEach((dep) => {
                const { x: x1, y: y1 } = positions[node];
                const { x: x2, y: y2 } = positions[dep];

                // Draw line between nodes
                context.beginPath();
                context.moveTo(x1, y1);
                context.lineTo(x2, y2);
                context.strokeStyle = "#ccc";
                context.lineWidth = 1.5;
                context.stroke();

                // Draw arrowhead
                const angle = Math.atan2(y2 - y1, x2 - x1);
                const arrowSize = 8;

                context.beginPath();
                context.moveTo(x2, y2);
                context.lineTo(x2 - arrowSize * Math.cos(angle - Math.PI / 6), y2 - arrowSize * Math.sin(angle - Math.PI / 6));
                context.lineTo(x2 - arrowSize * Math.cos(angle + Math.PI / 6), y2 - arrowSize * Math.sin(angle + Math.PI / 6));
                context.lineTo(x2, y2);
                context.fillStyle = "#ccc";
                context.fill();
            });
        });

        // Draw placeholders for external dependencies
        nodes.forEach((node) => {
            const dependencies = dependencyGraph[node];
            dependencies.forEach((dep) => {
                if (!nodes.includes(dep)) { // External dependency
                    const { x, y } = positions[dep];

                    context.beginPath();
                    context.arc(x, y, nodeRadius, 0, Math.PI * 2, false);
                    context.fillStyle = "#ff9999"; // Color for external dependencies
                    context.fill();
                    context.lineWidth = 2;
                    context.strokeStyle = "#333";
                    context.stroke();

                    context.font = "12px Arial";
                    context.fillStyle = "#000";
                    context.textAlign = "center";
                    context.fillText(dep, x, y + 4);
                }
            });
        });

        context.restore();
    }
});
