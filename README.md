# Dependency-Visualizer

A tool to analyze and visualize dependencies within a specified project folder. This tool is designed to work with various programming languages, including JavaScript, TypeScript, Python, Go, C, C++, and Java. The dependency graph is displayed on a web interface, allowing users to click on nodes to see their dependencies or parent connections.

## Features

![](GifDemo.gif)
- Analyzes dependencies for multiple programming languages.
- Visualizes dependencies in a graph format, with options to pan and zoom.
- Highlights dependencies and parent connections when a node is clicked.

## Supported Languages

- JavaScript (.js)
- TypeScript (.ts)
- Python (.py)
- Go (.go)
- C (.c), C++ (.cpp), and Header Files (.h, .hpp)
- Java (.java)


### Prerequisites

- [Node.js](https://nodejs.org/) (version 14 or later)


## Usage

1. Clone the repository:
   ```bash
   git clone https://github.com/Ernesto-B/Dependency-Visualizer.git
   cd Dependency-Visualizer
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
    node server.js
    ```
    - Default port is `3000`.
4. Open `index.html` in a web browser.
5. Enter the root folder path of the project you want to analyze and click the "Analyze" button.

## Future Improvements
- Add support for more programming languages.
- Circular dependency detection.
- Improve graph layout and styling.
- Add search functionality to find specific nodes.
- Add functionality to export the graph as an image.