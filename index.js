let gridSize = 8;
let gridData = [];
let queenPositions = [];
let columns = [];
let rows = [];
let plotSize = 0;
let steps = [];
let currentStep = 0;
let layout = {};
let data = [];
let config = {
	modeBarButtonsToRemove: [
		"zoom2d",
		"select2d",
		"lasso2d",
		"toggleSpikelines",
		"hoverClosestCartesian",
		"hoverCompareCartesian",
	],
	scrollZoom: true,
	displaylogo: false,
};
let isPlaying = false;
let isCalculated = false;
const playBtn = document.getElementById("play");
const log = document.getElementById("log");

generateChessboard(8);

document.getElementById("generateGrid").addEventListener("click", function () {
	gridSize = parseInt(document.getElementById("gridSize").value);
	if (isNaN(gridSize) || gridSize <= 0) {
		alert("Please enter a valid grid size.");
		return;
	}
	generateChessboard(gridSize);
});

function generateChessboard(n) {
	const z = [];

	// Generate column and row names
	columns = Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i)); // A, B, C, ...
	rows = Array.from({ length: n }, (_, i) => (i + 1).toString()); // 1, 2, 3, ...

	for (let i = 0; i < n; i++) {
		const row = [];
		for (let j = 0; j < n; j++) {
			row.push((i + j) % 2 ? 0 : 1); // Create a checkerboard pattern
		}
		z.push(row);
	}

	gridData = z; // Store the grid data for later updates
	queenPositions = []; // Reset queen positions

	data = [
		{
			x: columns,
			y: rows,
			z: z,
			type: "heatmap",
			colorscale: [
				[0, "#ffcf9f"], // Light color
				[1, "#d28c45"], // Dark color
			],
			showscale: false,
		},
	];

	plotSize = Math.min(n < 10 ? 500 : n * 50, window.innerWidth - 100);

	layout = {
		title: `Chessboard Grid of Size ${n}`,
		xaxis: {
			fixedrange: true,
			title: "Columns",
		},
		yaxis: {
			fixedrange: true,
			title: "Rows",
			tickvals: rows.map((_, i) => i + 1), // Explicitly set tick values
			ticktext: rows, // Explicitly set tick text
		},
		width: plotSize,
		height: plotSize,
		margin: { t: 50, r: 50, b: 50, l: 50 },
		images: [], // Initialize images array
	};

	Plotly.newPlot("gridContainer", data, layout, config);

	// Add click event listener
	document.getElementById("gridContainer").on("plotly_click", function (data) {
		const xIndex = columns.indexOf(data.points[0].x);
		const yIndex = data.points[0].y - 1;
		toggleQueen(xIndex, yIndex, columns, rows);
	});
}

function toggleQueen(x, y, columns, rows) {
	const queenIndex = queenPositions.findIndex((pos) => pos.x === x && pos.y === y);
	if (queenIndex > -1) {
		// Remove queen
		queenPositions.splice(queenIndex, 1);
	} else {
		let index = queenPositions.findIndex((pos) => pos.x === x);
		if (index > -1) queenPositions[index].y = y;
		else queenPositions.push({ x, y });
	}

	updateBoard(queenPositions);
}

function populateImages(positions) {
	const images = positions.map((pos) => ({
		source: "https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg", // URL of the queen image
		xref: "x",
		yref: "y",
		x: columns[pos.x],
		y: rows[pos.y],
		sizex: 1,
		sizey: 1,
		xanchor: "center",
		yanchor: "middle",
	}));

	return images;
}

function updateBoard(positions) {
	layout.images = populateImages(positions);
	Plotly.react("gridContainer", data, layout, config);
}

// Function to wait until a variable is true
function waitForTrue(variable) {
	return new Promise((resolve) => {
		const interval = setInterval(() => {
			if (variable) {
				clearInterval(interval);
				resolve();
			}
		}, 100); // Check every 100ms
	});
}

function configureRandomly(state) {
	for (let i = 0; i < gridSize; i++) {
		state[i] = { x: i, y: Math.floor(Math.random() * gridSize) };
	}
}

function printState(state) {
	console.log(state.map((pos) => `(${pos.x}, ${pos.y})`).join(" "));
}

function compareStates(state1, state2) {
	for (let i = 0; i < gridSize; i++) {
		if (state1[i].x !== state2[i].x || state1[i].y !== state2[i].y) {
			return false;
		}
	}
	return true;
}

// Function to calculate the objective (number of attacking pairs), heuristic function
function calculateObjective(state) {
	let attacking = 0;

	for (let i = 0; i < gridSize; i++) {
		let { x: x1, y: y1 } = state[i];

		for (let j = 0; j < gridSize; j++) {
			if (i !== j) {
				let { x: x2, y: y2 } = state[j];

				// Check if queens are in the same row or diagonal
				if (y1 === y2 || Math.abs(x1 - x2) === Math.abs(y1 - y2)) {
					attacking++;
				}
			}
		}
	}

	return Math.floor(attacking / 2); // Divide by 2 to avoid double counting
}

function copyState(state1, state2) {
	for (let i = 0; i < gridSize; i++) {
		state1[i] = { ...state2[i] };
	}
}

function getNeighbour(state) {
	let opState = state.map((pos) => ({ ...pos }));
	let opObjective = calculateObjective(opState);

	let neighbourState = state.map((pos) => ({ ...pos }));

	for (let i = 0; i < gridSize; i++) {
		for (let j = 0; j < gridSize; j++) {
			if (j !== state[i].y) {
				neighbourState[i].y = j;

				let temp = calculateObjective(neighbourState);

				if (temp <= opObjective) {
					opObjective = temp;
					copyState(opState, neighbourState);
				}

				neighbourState[i].y = state[i].y;
			}
		}
	}

	copyState(state, opState);
}

// Hill Climbing Algorithm
async function hillClimbing(state) {
	let neighbourState = state.map((pos) => ({ ...pos }));

	do {
		if (!isPlaying) {
			await waitForTrue(isPlaying); // Pause until isPlaying is true
		}
		// Wait for 50000ms / speed
		let speed = document.getElementById("speed").value;
		await new Promise((resolve) => setTimeout(resolve, 50000 / speed));

		copyState(state, neighbourState);
		steps.push(state.map((pos) => ({ ...pos })));
		// printState(state);
		updateBoard(state);
		log.innerHTML = `Objective: ${calculateObjective(state)}`;

		getNeighbour(neighbourState);

		if (compareStates(state, neighbourState)) {
			steps.push(state.map((pos) => ({ ...pos })));
			// printState(state);
			updateBoard(state);
			log.innerHTML = `Objective: ${calculateObjective(state)}`;
			// alert("Done");
			isPlaying = false;
			break;
		} else if (calculateObjective(state) === calculateObjective(neighbourState)) {
			neighbourState[Math.floor(Math.random() * gridSize)].y = Math.floor(Math.random() * gridSize);
		}
	} while (true);
}

// Reset the board
document.getElementById("reset").addEventListener("click", function () {
	isPlaying = false;
	playBtn.innerHTML = "&#9658;";
	steps = [];
	currentStep = 0;
	isCalculated = false;
	generateChessboard(gridSize);
});

playBtn.addEventListener("click", function () {
	if (gridSize === 0) {
		alert("Please generate a grid first.");
		return;
	}

	if (queenPositions.length !== gridSize) {
		alert("Please place the queens on the board.");
		return;
	}

	if (isPlaying) {
		isPlaying = false;
		playBtn.innerHTML = "&#9658;";
		return;
	}

	playBtn.innerHTML = "&#10074;&#10074;";
	isPlaying = true;

	if (!isCalculated) {
		steps = [];
		currentStep = 0;
		hillClimbing(queenPositions);
	}
});
