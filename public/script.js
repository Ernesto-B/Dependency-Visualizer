import { calculateImpactScores, getImpactColor } from './impactCalc.js';

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
    const impactToggle = document.getElementById('impactToggle');
    const scaleSlider = document.getElementById('scaleSlider');

    let lastDependencyGraph = {};
    let positions = {};
    let highlightedNode = null;
    let connectedNodes = [];
    let circularDependencies = [];
    let keyFiles = [];
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isPanning = false;
    let startX, startY;
    let isCircularHighlightActive = false;
    let impactScores = {};
    let showImpactAnalysis = false;
    let scaleMultiplier = 1;
    let isDraggingNode = false;
    let draggedNode = null;
    let isSpacebarPressed = false;

    // Reset the graph data
    function resetGraphData() {
        lastDependencyGraph = {};
        positions = {};
        highlightedNode = null;
        connectedNodes = [];
        circularDependencies = [];
        keyFiles = [];
        offsetX = 0;
        offsetY = 0;
        isCircularHighlightActive = false;
        impactScores = {};
    }

        // Make all dropdown sections open by default
        document.querySelectorAll('.dropdown-section').forEach(section => {
            section.classList.add('open');
        });

    // Analyze button click
    analyzeButton.addEventListener('click', async () => {
        resetGraphData();
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
                circularDependencies = result.cycleNodes || [];
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

            // Calculate impact scores
            impactScores = calculateImpactScores(lastDependencyGraph);

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
            renderDependencyGraph(lastDependencyGraph, true);
        } else {
            alert("File not found in the dependency graph.");
        }
    });

    // Highlight circular dependencies
    highlightCircularButton.addEventListener('click', () => {
        if (circularDependencies.length > 0) {
            highlightedNode = null;
            connectedNodes = circularDependencies;
            isCircularHighlightActive = true;
            renderDependencyGraph(lastDependencyGraph);
        } else {
            alert("No circular dependencies found.");
        }
    });

    // Toggle impact analysis
    impactToggle.addEventListener('change', (event) => {
        showImpactAnalysis = event.target.checked;
        renderDependencyGraph(lastDependencyGraph);
    });

    // Scale slider functionality
    scaleSlider.addEventListener('input', (event) => {
        scaleMultiplier = parseFloat(event.target.value);
        initializePositions(lastDependencyGraph);
        renderDependencyGraph(lastDependencyGraph);
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
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left - offsetX) / scale;
        const y = (event.clientY - rect.top - offsetY) / scale;

        // Check if a node is clicked for dragging only if spacebar is pressed
        if (isSpacebarPressed) {
            draggedNode = getNodeAtPosition(x, y);
            if (draggedNode) {
                isDraggingNode = true;
                return;
            }
        }

        // If no node is clicked or dragging is disabled, initiate panning
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

        // Handle dragging of nodes
        if (isDraggingNode && draggedNode) {
            const rect = canvas.getBoundingClientRect();
            const x = (event.clientX - rect.left - offsetX) / scale;
            const y = (event.clientY - rect.top - offsetY) / scale;

            positions[draggedNode] = { x, y };
            renderDependencyGraph(lastDependencyGraph);
        }
    });

    canvas.addEventListener("mouseup", (event) => {
        if (!isDraggingNode) {
            // Handle node highlight if not dragging
            const rect = canvas.getBoundingClientRect();
            const x = (event.clientX - rect.left - offsetX) / scale;
            const y = (event.clientY - rect.top - offsetY) / scale;

            highlightedNode = null;
            connectedNodes = [];
            Object.keys(positions).forEach(node => {
                const { x: nodeX, y: nodeY } = positions[node];
                const distance = Math.sqrt((x - nodeX) ** 2 + (y - nodeY) ** 2);
                if (distance <= 30) {
                    highlightedNode = node;

                    if (lastDependencyGraph[node]) {
                        connectedNodes = [...lastDependencyGraph[node], node];
                    } else {
                        connectedNodes = [node];
                        Object.keys(lastDependencyGraph).forEach(internalNode => {
                            if (lastDependencyGraph[internalNode].includes(node)) {
                                connectedNodes.push(internalNode);
                            }
                        });
                    }
                }
            });
            isCircularHighlightActive = false;
            renderDependencyGraph(lastDependencyGraph);
        }

        isPanning = false;
        isDraggingNode = false;
        draggedNode = null;
    });

    canvas.addEventListener("mouseleave", () => {
        isPanning = false;
        isDraggingNode = false;
        draggedNode = null;
    });

    function renderDependencyGraph(dependencyGraph, isSearchHighlight = false) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.save();
        context.translate(offsetX, offsetY);
        context.scale(scale, scale);
    
        const nodes = Object.keys(dependencyGraph);
        const nodeRadius = 30;
    
        if (Object.keys(positions).length === 0) {
            initializePositions(dependencyGraph);
        }
    
        // Draw edges with conditional highlighting for direct connections only
        nodes.forEach((node) => {
            const { x: nodeX, y: nodeY } = positions[node];
            dependencyGraph[node].forEach((dep) => {
                if (!positions[dep]) return; // Skip if dep position is undefined
    
                const { x: depX, y: depY } = positions[dep];
                
                // Highlight edge only if the edge is between the highlightedNode and its direct dependencies
                const isDirectlyConnectedEdge = (node === highlightedNode && connectedNodes.includes(dep)) ||
                                                (dep === highlightedNode && connectedNodes.includes(node));
                context.strokeStyle = isDirectlyConnectedEdge ? "#f39c12" : "#ccc";
                context.lineWidth = isDirectlyConnectedEdge ? 2 : 1.5;
    
                context.beginPath();
                context.moveTo(nodeX, nodeY);
                context.lineTo(depX, depY);
                context.stroke();
            });
        });
    
        // Draw nodes with impact analysis if enabled
        nodes.concat(Object.keys(positions).filter(node => !nodes.includes(node))).forEach((node) => {
            const { x, y } = positions[node];
            const isHighlighted = (highlightedNode === node) || connectedNodes.includes(node);
            const isCircularNode = isCircularHighlightActive && circularDependencies.includes(node);
    
            context.beginPath();
            context.arc(x, y, nodeRadius, 0, Math.PI * 2, false);
            context.fillStyle = isCircularNode ? "#D8BFD8" // Light purple for circular dependency
                             : isHighlighted ? (isSearchHighlight && node === highlightedNode ? "red" : "#f39c12") // Red for searched node, yellow for other highlights
                             : (nodes.includes(node) ? "#61bffc" : "#ff9999"); // Blue for internal nodes, red for external nodes
            if (showImpactAnalysis && impactScores[node]) {
                context.fillStyle = getImpactColor(impactScores[node]);
            }
            context.fill();
            context.lineWidth = 2;
            context.strokeStyle = "#333";
            context.stroke();
    
            context.font = "12px Arial";
            context.fillStyle = "#000";
            context.textAlign = "center";
            context.fillText(node, x, y + 4);
    
            // Show impact score if impact analysis is enabled
            if (showImpactAnalysis && impactScores[node]) {
                context.fillText(`Score: ${impactScores[node]}`, x, y + 20);
            }
        });
    
        context.restore();
    }    

    // Function to check if a node is at a given position
    function getNodeAtPosition(x, y) {
        return Object.keys(positions).find(node => {
            const { x: nodeX, y: nodeY } = positions[node];
            const distance = Math.sqrt((x - nodeX) ** 2 + (y - nodeY) ** 2);
            return distance <= 30;
        });
    }

    // Key event listeners to track spacebar state
    document.addEventListener("keydown", (event) => {
        if (event.code === "Space") isSpacebarPressed = true;
    });

    document.addEventListener("keyup", (event) => {
        if (event.code === "Space") isSpacebarPressed = false;
    });

    // Initialize Positions Function with Scale Support for Both Internal and External Nodes
    function initializePositions(dependencyGraph) {
        const nodes = Object.keys(dependencyGraph);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const baseRadius = Math.min(centerX, centerY) - 100;

        // Calculate scaled radius based on slider value
        const scaledRadius = baseRadius * scaleMultiplier;
        const internalRadius = scaledRadius * 0.5; // Blue nodes radius
        const externalRadius = scaledRadius;       // Red nodes radius

        // Position internal (blue) nodes in a smaller circle
        nodes.forEach((node, index) => {
            const angle = (2 * Math.PI * index) / nodes.length;
            positions[node] = {
                x: centerX + internalRadius * Math.cos(angle),
                y: centerY + internalRadius * Math.sin(angle)
            };
        });

        // Calculate positions for external (red) nodes
        const externalDependencies = new Set();
        nodes.forEach((node) => {
            dependencyGraph[node].forEach((dep) => {
                if (!nodes.includes(dep)) {
                    externalDependencies.add(dep);
                }
            });
        });

        const externalNodes = Array.from(externalDependencies);
        externalNodes.forEach((node, index) => {
            const angle = (2 * Math.PI * index) / externalNodes.length;
            positions[node] = {
                x: centerX + externalRadius * Math.cos(angle),
                y: centerY + externalRadius * Math.sin(angle)
            };
        });
    }

});

// Clear the input field
document.addEventListener("DOMContentLoaded", () => {
    const folderPathInput = document.getElementById('folderPath');
    const clearInputButton = document.getElementById('clearInputButton');
    
    clearInputButton.addEventListener('click', () => {
        folderPathInput.value = "";
    });
});
