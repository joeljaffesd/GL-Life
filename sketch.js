//===============================================================
//
//    ██████   ██              ██       ██  ██████  ███████ 
//   ██        ██              ██       ██  ██      ██      
//   ██   ███  ██      ██████  ██       ██  █████   █████   
//   ██    ██  ██              ██       ██  ██      ██      
//    ██████   ███████         ███████  ██  ██      ███████ 
//
// A WebGL implementation of particle life
// Original particle life simulation by @ProgrammingChaos on YouTube
// https://www.youtube.com/watch?v=xiUpAeos168&list=PLZ1w5M-dmhlGWtqzaC2aSLfQFtp0Dz-F_&index=3
//
//===============================================================

let simProgram, displayProgram; // Shader programs for simulation and display
let first = true;// flag to indicate the first pass of the simulation
let agentsPrev, agentsNext, display; // framebuffers for simulation and display
let numParticles = 500; // Number of particles to simulate
let numTypes = 6; // Number of particle types
let parameterData = [];
let phase = 0;

// Stroke drawing variables
let drawMode = false;
let strokeWidth = 15;
let selectedColor = 0;
let isDrawing = false;
let strokes = []; // Array to store all stroke data
let currentStroke = []; // Current stroke being drawn
let maxStrokeParticles = 1000; // Maximum number of stroke particles

// load shaders
function preload() {
  simProgram = loadShader('shaders/shader.vert', 'shaders/simulation.frag');
  displayProgram = loadShader('shaders/shader.vert', 'shaders/display.frag');
}

// resets relationships between particle types
function setParameters() {
  parameterData = [];
  for (let i = 0; i < numTypes; i++) {
    for (let j = 0; j < numTypes; j++) {
      let scale = 1.0;
      let force = random(0.003 * scale, 0.01 * scale);
      if (random() < 0.5) force *= -1;
      let minDistance = random(0.05 * scale, 0.1 * scale);
      let radius = random(0.15 * scale, 0.5 * scale);
      parameterData.push(force, minDistance, radius, 1.0);
    }
  }
}

// prints pixel values to console (first three agents of each row)
function dump(fb) {
  fb.loadPixels();
  print(`Framebuffer: ${fb.width}x${fb.height}, Pixels: ${fb.pixels.length}`);
  for (let row = 0; row < fb.height; row++) {
    for (let col = 0; col < 3 && col < fb.width; col++) {
      const i = (row * fb.width + col) * 4;
      if (i < fb.pixels.length) {
        const x = fb.pixels[i];
        const y = fb.pixels[i + 1];
        const _ = fb.pixels[i + 2];
        const t = fb.pixels[i + 3];
        console.log(`Agent ${i/4}: (${x},${y}), Type: ${t}`);
      }
    }
  }
}

// setup "data bus"
function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  noStroke();

  pixelDensity(1);

  const agentsOptions = {
    width: 1000,
    height: 2,
    textureFiltering: LINEAR,
    format: FLOAT,
  };

  const displayOptions = {
    textureFiltering: LINEAR,
    format: FLOAT,
  };

  agentsPrev = createFramebuffer(agentsOptions);
  agentsNext = createFramebuffer(agentsOptions);
  display = createFramebuffer(displayOptions);

  // Setup UI controls
  setupControls();

  // noLoop(); // manually walk thru frames for debugging 

  // init framebuffers to 0
  agentsNext.begin();
  background(0, 0, 0, 0);
  agentsNext.end();
  agentsPrev.begin();
  background(0, 0, 0, 0);
  agentsPrev.end();
  setParameters() // init params
}

// per-frame sim-step and draw
function draw() {

  // reset sim every 7 seconds
  phase++;
  if (phase >= 60 * 7) {
    setParameters();
    phase = 0;
  }

  // Prepare stroke data for shader
  const strokeData = prepareStrokeData();

  // simulation step
  agentsNext.begin();
  background(0, 0, 0, 0); // Clear the framebuffer
  shader(simProgram);
  simProgram.setUniform("uNumParticles", numParticles);
  simProgram.setUniform("uNumTypes", numTypes);
  simProgram.setUniform("uPrevious", agentsPrev);
  simProgram.setUniform("uFirst", first);
  simProgram.setUniform("uResolution", [agentsNext.width, agentsNext.height]);
  simProgram.setUniform("uParameters", parameterData);
  simProgram.setUniform("uNumStrokes", strokeData.count);
  simProgram.setUniform("uStrokePositions", strokeData.positions);
  simProgram.setUniform("uStrokeTypes", strokeData.types);
  quad(-1, -1, 1, -1, 1, 1, -1, 1);
  agentsNext.end();
  first = false; // set first to false after first pass

  // debug block
  // dump(agentsNext); // print updated agent data
  // clear(); // clear 
  // image(agentsNext, -width / 2, -height / 2, width, height); // display agents 
  
  // display step
  shader(displayProgram);
  displayProgram.setUniform("uSimState", agentsNext);
  displayProgram.setUniform("uNumParticles", numParticles);
  displayProgram.setUniform("uNumTypes", numTypes);
  displayProgram.setUniform("uParticleSize", 5.0); // Adjust as needed
  displayProgram.setUniform("uResolution", [width, height]);
  displayProgram.setUniform("uNumStrokes", strokeData.count);
  displayProgram.setUniform("uStrokePositions", strokeData.positions);
  displayProgram.setUniform("uStrokeTypes", strokeData.types);
  quad(-1, -1, 1, -1, 1, 1, -1, 1);
  
  // Swap buffers for next frame
  [agentsPrev, agentsNext] = [agentsNext, agentsPrev];
}

// Prepare stroke data for shaders
function prepareStrokeData() {
  const maxStrokes = 200; // Reduced for better performance
  const strokesToUse = strokes.slice(-maxStrokes); // Use most recent strokes
  
  const positions = [];
  const types = [];
  
  for (let stroke of strokesToUse) {
    positions.push(stroke.x, stroke.y, 0.0, 0.0); // x, y, unused, unused
    types.push(stroke.type / numTypes); // Normalize type to [0,1]
  }
  
  // Ensure we always send the same amount of data
  const actualLength = strokesToUse.length;
  while (positions.length < maxStrokes * 4) {
    positions.push(-1.0, -1.0, 0.0, 0.0); // Invalid positions
  }
  while (types.length < maxStrokes) {
    types.push(-1.0); // Invalid type
  }
  
  return {
    positions: positions.slice(0, maxStrokes * 4),
    types: types.slice(0, maxStrokes),
    count: actualLength
  };
}

// handle window resizing
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// if walking thru frames manually to debug
function keyPressed() {
  // redraw();
}

// Setup UI control event listeners
function setupControls() {
  // Draw mode toggle
  const drawModeCheckbox = document.getElementById('drawMode');
  drawModeCheckbox.addEventListener('change', (e) => {
    drawMode = e.target.checked;
  });

  // Stroke width slider
  const strokeWidthSlider = document.getElementById('strokeWidth');
  const strokeWidthValue = document.getElementById('strokeWidthValue');
  strokeWidthSlider.addEventListener('input', (e) => {
    strokeWidth = parseInt(e.target.value);
    strokeWidthValue.textContent = strokeWidth;
  });

  // Color selection buttons
  const colorButtons = document.querySelectorAll('.color-btn');
  colorButtons.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      // Remove selected class from all buttons
      colorButtons.forEach(b => b.classList.remove('selected'));
      // Add selected class to clicked button
      btn.classList.add('selected');
      selectedColor = parseInt(btn.dataset.type);
    });
  });
  
  // Select first color by default
  colorButtons[0].classList.add('selected');

  // Clear strokes button
  document.getElementById('clearStrokes').addEventListener('click', () => {
    strokes = [];
    currentStroke = [];
  });
}

// Mouse event handlers for drawing
function mousePressed() {
  if (drawMode && mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    isDrawing = true;
    currentStroke = [];
    // Convert p5 coordinates to normalized coordinates
    const normalizedX = mouseX / width;
    const normalizedY = mouseY / height;
    currentStroke.push({
      x: normalizedX,
      y: normalizedY,
      type: selectedColor
    });
    return false; // Prevent default behavior
  }
}

function mouseDragged() {
  if (drawMode && isDrawing && mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    // Convert p5 coordinates to normalized coordinates
    const normalizedX = mouseX / width;
    const normalizedY = mouseY / height;
    
    // Add point if it's far enough from the last point
    if (currentStroke.length > 0) {
      const lastPoint = currentStroke[currentStroke.length - 1];
      const distance = dist(normalizedX, normalizedY, lastPoint.x, lastPoint.y);
      
      if (distance > 0.005) { // Minimum distance between points (reduced for smoother strokes)
        currentStroke.push({
          x: normalizedX,
          y: normalizedY,
          type: selectedColor
        });
      }
    }
    return false; // Prevent default behavior
  }
}

function mouseReleased() {
  if (drawMode && isDrawing && currentStroke.length > 0) {
    // Interpolate points along the stroke to create particles
    const interpolatedStroke = interpolateStroke(currentStroke, strokeWidth);
    strokes.push(...interpolatedStroke);
    
    // Limit total stroke particles
    if (strokes.length > maxStrokeParticles) {
      strokes = strokes.slice(strokes.length - maxStrokeParticles);
    }
    
    currentStroke = [];
    isDrawing = false;
  }
}

// Interpolate points along a stroke to create dense particle distribution
function interpolateStroke(stroke, width) {
  if (stroke.length < 2) return stroke;
  
  const particles = [];
  const baseParticlesPerUnit = width / 3; // Base density of particles
  
  for (let i = 0; i < stroke.length - 1; i++) {
    const p1 = stroke[i];
    const p2 = stroke[i + 1];
    const distance = dist(p1.x, p1.y, p2.x, p2.y);
    const numParticles = Math.max(1, Math.floor(distance * baseParticlesPerUnit * 2000));
    
    for (let j = 0; j < numParticles; j++) {
      const t = j / numParticles;
      const x = lerp(p1.x, p2.x, t);
      const y = lerp(p1.y, p2.y, t);
      
      // Add multiple particles in a circle for thickness
      const numThicknessParticles = Math.max(1, Math.floor(width / 8));
      for (let k = 0; k < numThicknessParticles; k++) {
        const angle = (k / numThicknessParticles) * TWO_PI;
        const maxRadius = width * 0.0008; // Scale radius based on stroke width
        const radius = random(0, maxRadius);
        const offsetX = cos(angle) * radius;
        const offsetY = sin(angle) * radius;
        
        particles.push({
          x: constrain(x + offsetX, 0, 1),
          y: constrain(y + offsetY, 0, 1),
          type: p1.type
        });
      }
    }
  }
  
  return particles;
}