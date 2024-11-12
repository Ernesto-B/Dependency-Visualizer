document.addEventListener("DOMContentLoaded", () => {
    const folderPathInput = document.getElementById('folderPath');
    const analyzeButton = document.getElementById('analyzeButton');
    const canvas = document.getElementById('dependencyCanvas');
    const context = canvas.getContext("2d");
    const jsonView = document.getElementById('jsonView');
    const searchFileInput = document.getElementById('searchFile');
    const searchButton = document.getElementById('searchButton');
    const circularDependenciesText = document.getElementById('circularDependencies');
    const highlightCircularButton = document.getElementById('highlightCircularButton');
    const keyFilesText = document.getElementById('keyFiles');
    const numFilesText = document.getElementById('numFiles');

    let lastDependencyGraph = {};
    let positions = {};
    let highlightedNode = null;
    let connectedNodes = []; // Array to store connected nodes to highlight
    let circularDependencies = [];
    let keyFiles = [];
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isPanning = false;
    let startX, startY;

    // Analyze button click
    analyzeButton.addEventListener('click', async () => {
        const folderPath = folderPathInput.value;
        if (!folderPath) {
            alert("Please provide the root folder path.");
            return;
        }
        try {
            const response = await fetch('http://localhost:3000/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ folderPath })
            });
            if (!response.ok) {
                throw new Error("Failed to connect to the server.");
            }
            const result = await response.json();
            lastDependencyGraph = result.dependencyGraph;
            renderDependencyGraph(lastDependencyGraph);

            // Display JSON
            jsonView.textContent = JSON.stringify(lastDependencyGraph, null, 2);

            // Circular dependencies information
            if (result.hasCycles) {
                circularDependencies = result.cycleNodes || []; // Use an empty array if undefined
                circularDependenciesText.textContent = `True: ${circularDependencies.join(', ')}`;
                highlightCircularButton.style.display = 'inline';
            } else {
                circularDependenciesText.textContent = "False";
                highlightCircularButton.style.display = 'none';
            }

            // Key files
            const fileConnections = Object.keys(lastDependencyGraph).reduce((acc, file) => {
                const connections = lastDependencyGraph[file].length;
                acc[file] = connections;
                lastDependencyGraph[file].forEach(dep => {
                    acc[dep] = (acc[dep] || 0) + 1;
                });
                return acc;
            }, {});

            const maxConnections = Math.max(...Object.values(fileConnections));
            keyFiles = Object.keys(fileConnections).filter(file => fileConnections[file] === maxConnections);
            keyFilesText.textContent = keyFiles.join(', ');

            // Number of files
            numFilesText.textContent = Object.keys(lastDependencyGraph).length;
        } catch (error) {
            alert(error.message);
        }
    });

    // Search button click
    searchButton.addEventListener('click', () => {
        const searchFile = searchFileInput.value.trim();
        if (searchFile && lastDependencyGraph[searchFile]) {
            highlightedNode = searchFile;
            connectedNodes = [...lastDependencyGraph[searchFile], searchFile];
            renderDependencyGraph(lastDependencyGraph);
        } else {
            alert("File not found in the dependency graph.");
        }
    });

    // Highlight circular dependencies
    highlightCircularButton.addEventListener('click', () => {
        if (circularDependencies.length > 0) {
            highlightedNode = null; // Clear any single-node highlight
            connectedNodes = circularDependencies;
            renderDependencyGraph(lastDependencyGraph);
        }
    });

    // Panning and zooming functionality
    canvas.addEventListener("wheel", (event) => {
        event.preventDefault();
        const zoomIntensity = 0.1;
        scale += event.deltaY > 0 ? -zoomIntensity : zoomIntensity;
        scale = Math.min(Math.max(0.5, scale), 3);
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

    // Click-to-highlight functionality
    canvas.addEventListener("click", (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left - offsetX) / scale;
        const y = (event.clientY - rect.top - offsetY) / scale;

        highlightedNode = null;
        connectedNodes = []; // Reset connected nodes
        Object.keys(positions).forEach(node => {
            const { x: nodeX, y: nodeY } = positions[node];
            const distance = Math.sqrt((x - nodeX) ** 2 + (y - nodeY) ** 2);
            if (distance <= 30) { // 30 is the radius of each node
                highlightedNode = node;

                // Handle both internal and external nodes
                if (lastDependencyGraph[node]) {
                    connectedNodes = [...lastDependencyGraph[node], node]; // Include the node and its dependencies
                } else {
                    // For external nodes, find all internal nodes that depend on it
                    connectedNodes = [node];
                    Object.keys(lastDependencyGraph).forEach(internalNode => {
                        if (lastDependencyGraph[internalNode].includes(node)) {
                            connectedNodes.push(internalNode);
                        }
                    });
                }
            }
        });

        renderDependencyGraph(lastDependencyGraph);
    });

    function renderDependencyGraph(dependencyGraph, highlightNodes = []) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.save();
        context.translate(offsetX, offsetY);
        context.scale(scale, scale);

        const nodes = Object.keys(dependencyGraph);
        const nodeRadius = 30;

        // Calculate positions if not already set
        if (Object.keys(positions).length === 0) {
            initializePositions(dependencyGraph);
        }

        // Draw edges
        context.strokeStyle = "#ccc";
        context.lineWidth = 1.5;
        nodes.forEach((node) => {
            const { x: nodeX, y: nodeY } = positions[node];
            dependencyGraph[node].forEach((dep) => {
                const { x: depX, y: depY } = positions[dep];
                context.beginPath();
                context.moveTo(nodeX, nodeY);
                context.lineTo(depX, depY);
                context.stroke();
            });
        });

        // Draw nodes
        nodes.concat(Object.keys(positions).filter(node => !nodes.includes(node))).forEach((node) => {
            const { x, y } = positions[node];
            const isHighlighted = (highlightedNode === node) || connectedNodes.includes(node) || highlightNodes.includes(node);

            context.beginPath();
            context.arc(x, y, nodeRadius, 0, Math.PI * 2, false);
            context.fillStyle = isHighlighted ? "#f39c12" : (nodes.includes(node) ? "#61bffc" : "#ff9999"); // Internal nodes are blue, external are red
            context.fill();
            context.lineWidth = 2;
            context.strokeStyle = "#333";
            context.stroke();

            context.font = "12px Arial";
            context.fillStyle = "#000";
            context.textAlign = "center";
            context.fillText(node, x, y + 4);
        });

        context.restore();
    }

    function initializePositions(dependencyGraph) {
        const nodes = Object.keys(dependencyGraph);
        const spacing = 150;
        positions = {};

        nodes.forEach((node, index) => {
            const x = (index % 5) * spacing + 100;
            const y = Math.floor(index / 5) * spacing + 100;
            positions[node] = { x, y };
        });

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
});
