document.addEventListener("DOMContentLoaded", () => {
    const folderPathInput = document.getElementById('folderPath');
    const fileTypeInput = document.getElementById('fileType');
    const analyzeButton = document.getElementById('analyzeButton');
    const canvas = document.getElementById('dependencyCanvas');
    const context = canvas.getContext("2d");
    const jsonView = document.getElementById('jsonView');

    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isPanning = false;
    let startX, startY;
    let positions = {};

    canvas.addEventListener("wheel", (event) => {
        event.preventDefault();
        const zoomIntensity = 0.1;
        scale += event.deltaY > 0 ? -zoomIntensity : zoomIntensity;
        scale = Math.min(Math.max(0.1, scale), 3);
        renderDependencyGraph(lastDependencyGraph);
    });

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
            // Reset positions and scale for new analysis
            positions = {};
            scale = 1;
            offsetX = 0;
            offsetY = 0;
            context.clearRect(0, 0, canvas.width, canvas.height);

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
            initializePositions(dependencyGraph);
            renderDependencyGraph(dependencyGraph);
        } catch (error) {
            alert(error.message);
        }
    });

    let lastDependencyGraph = {}; 

    function initializePositions(dependencyGraph) {
        const nodes = Object.keys(dependencyGraph);
        const nodeRadius = 30;
        const spacing = 150;
        positions = {};

        // Blue nodes in grid layout
        nodes.forEach((node, index) => {
            const x = (index % 5) * spacing + 100;
            const y = Math.floor(index / 5) * spacing + 100;
            positions[node] = { x, y };
        });

        // External dependencies in circular layout around grid area
        let angle = 0;
        const radius = Math.min(canvas.width, canvas.height) / 2 + 100;
        const externalDependencies = new Set();

        nodes.forEach((node) => {
            dependencyGraph[node].forEach((dep) => {
                if (!nodes.includes(dep)) {
                    externalDependencies.add(dep);
                }
            });
        });

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        externalDependencies.forEach((dep) => {
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            positions[dep] = { x, y };
            angle += (2 * Math.PI) / externalDependencies.size;
        });
    }

    function renderDependencyGraph(dependencyGraph) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.save();
        context.translate(offsetX, offsetY);
        context.scale(scale, scale);

        const nodes = Object.keys(dependencyGraph);
        const nodeRadius = 30;

        // Draw blue nodes
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

        // Draw edges and red nodes
        nodes.forEach((node) => {
            const dependencies = dependencyGraph[node];
            dependencies.forEach((dep) => {
                const { x: x1, y: y1 } = positions[node];
                const { x: x2, y: y2 } = positions[dep];

                context.beginPath();
                context.moveTo(x1, y1);
                context.lineTo(x2, y2);
                context.strokeStyle = "#ccc";
                context.lineWidth = 1.5;
                context.stroke();

                const angle = Math.atan2(y2 - y1, x2 - x1);
                const arrowSize = 8;

                context.beginPath();
                context.moveTo(x2, y2);
                context.lineTo(x2 - arrowSize * Math.cos(angle - Math.PI / 6), y2 - arrowSize * Math.sin(angle - Math.PI / 6));
                context.lineTo(x2 - arrowSize * Math.cos(angle + Math.PI / 6), y2 - arrowSize * Math.sin(angle + Math.PI / 6));
                context.lineTo(x2, y2);
                context.fillStyle = "#ccc";
                context.fill();

                if (!nodes.includes(dep)) {
                    context.beginPath();
                    context.arc(x2, y2, nodeRadius, 0, Math.PI * 2, false);
                    context.fillStyle = "#ff9999";
                    context.fill();
                    context.lineWidth = 2;
                    context.strokeStyle = "#333";
                    context.stroke();

                    context.font = "12px Arial";
                    context.fillStyle = "#000";
                    context.textAlign = "center";
                    context.fillText(dep, x2, y2 + 4);
                }
            });
        });

        context.restore();
    }
});
