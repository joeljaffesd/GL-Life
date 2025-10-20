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
let strokeWidth = 15;
let selectedColor = 0;
let isDrawing = false;
let strokes = []; // Array to store all stroke data
let currentStroke = []; // Current stroke being drawn
let maxStrokeParticles = 1000; // Maximum number of stroke particles

// Framerate counter
let framerateDelta = 0;
let framerateUpdateTime = 0;

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
  // Update framerate counter
  updateFramerate();

  // reset sim every 7 seconds
  phase++;
  if (phase >= 60 * 7) {
    setParameters();
    phase = 0;
  }

  // Prepare stroke data for shader - always process existing strokes
  let strokeData = { count: 0, positions: [], types: [] };
  if (strokes.length > 0 || currentStroke.length > 0) {
    strokeData = prepareStrokeData();
  }

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
  
  // Only set stroke uniforms if we have stroke data
  if (strokeData.count > 0) {
    simProgram.setUniform("uStrokePositions", strokeData.positions);
    simProgram.setUniform("uStrokeTypes", strokeData.types);
  }
  
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
  
  // Only set stroke uniforms if we have stroke data
  if (strokeData.count > 0) {
    displayProgram.setUniform("uStrokePositions", strokeData.positions);
    displayProgram.setUniform("uStrokeTypes", strokeData.types);
  }
  
  quad(-1, -1, 1, -1, 1, 1, -1, 1);
  
  // Swap buffers for next frame
  [agentsPrev, agentsNext] = [agentsNext, agentsPrev];
}

// Prepare stroke data for shaders
function prepareStrokeData() {
  const maxStrokes = 200; // Reduced for better performance
  
  // Combine permanent strokes with current stroke being drawn
  let allStrokes = [...strokes];
  if (currentStroke.length > 0) {
    // Add current stroke being drawn for real-time feedback
    const currentStrokeParticles = interpolateStroke(currentStroke, strokeWidth);
    allStrokes = [...allStrokes, ...currentStrokeParticles];
  }
  
  const strokesToUse = allStrokes.slice(-maxStrokes); // Use most recent strokes
  
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
  // Set canvas cursor to crosshair always
  const canvas = document.querySelector('canvas');
  canvas.style.cursor = 'crosshair';

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
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    isDrawing = true;
    currentStroke = [];
    // Convert p5 coordinates to normalized coordinates
    // Note: p5 uses (0,0) at top-left, but we need (0,0) at bottom-left for WebGL
    const normalizedX = mouseX / width;
    const normalizedY = 1.0 - (mouseY / height); // Flip Y coordinate
    currentStroke.push({
      x: normalizedX,
      y: normalizedY,
      type: selectedColor
    });
  }
}

function mouseDragged() {
  if (isDrawing && mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    // Convert p5 coordinates to normalized coordinates
    const normalizedX = mouseX / width;
    const normalizedY = 1.0 - (mouseY / height); // Flip Y coordinate
    
    // Add point if it's far enough from the last point
    if (currentStroke.length > 0) {
      const lastPoint = currentStroke[currentStroke.length - 1];
      const distance = dist(normalizedX, normalizedY, lastPoint.x, lastPoint.y);
      
      if (distance > 0.003) { // Reduced minimum distance for smoother strokes
        currentStroke.push({
          x: normalizedX,
          y: normalizedY,
          type: selectedColor
        });
      }
    } else {
      // First point after mousePressed
      currentStroke.push({
        x: normalizedX,
        y: normalizedY,
        type: selectedColor
      });
    }
  }
}

function mouseReleased() {
  if (isDrawing && currentStroke.length > 0) {
    // Interpolate points along the stroke to create particles
    const interpolatedStroke = interpolateStroke(currentStroke, strokeWidth);
    
    // Add to existing strokes (don't replace)
    strokes = strokes.concat(interpolatedStroke);
    
    // Limit total stroke particles
    if (strokes.length > maxStrokeParticles) {
      strokes = strokes.slice(strokes.length - maxStrokeParticles);
    }
    
    console.log(`Added stroke with ${interpolatedStroke.length} particles. Total: ${strokes.length}`);
    
    currentStroke = [];
    isDrawing = false;
  }
}

// Interpolate points along a stroke to create dense particle distribution
function interpolateStroke(stroke, width) {
  if (stroke.length < 1) return [];
  if (stroke.length === 1) return [stroke[0]]; // Single point
  
  const particles = [];
  const baseParticlesPerUnit = Math.max(1, width / 8); // Base density of particles
  
  for (let i = 0; i < stroke.length - 1; i++) {
    const p1 = stroke[i];
    const p2 = stroke[i + 1];
    const distance = dist(p1.x, p1.y, p2.x, p2.y);
    const numParticles = Math.max(1, Math.floor(distance * baseParticlesPerUnit * 1000));
    
    for (let j = 0; j < numParticles; j++) {
      const t = j / numParticles;
      const x = lerp(p1.x, p2.x, t);
      const y = lerp(p1.y, p2.y, t);
      
      // Add multiple particles in a circle for thickness
      const numThicknessParticles = Math.max(1, Math.floor(width / 10));
      for (let k = 0; k < numThicknessParticles; k++) {
        const angle = (k / numThicknessParticles) * TWO_PI + random(-0.5, 0.5);
        const maxRadius = width * 0.0005; // Scale radius based on stroke width
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

// Draw preview of current stroke being drawn
function drawStrokePreview() {
  // Set stroke properties based on selected color
  const colors = [
    [255, 51, 51],   // Red
    [51, 255, 51],   // Green
    [51, 51, 255],   // Blue
    [255, 255, 51],  // Yellow
    [255, 51, 255],  // Magenta
    [51, 255, 255]   // Cyan
  ];
  
  const color = colors[selectedColor];
  stroke(color[0], color[1], color[2], 200); // Semi-transparent
  strokeWeight(strokeWidth * 0.5); // Preview at half width for clarity
  noFill();
  
  // Draw the stroke path
  if (currentStroke.length > 1) {
    beginShape();
    for (let point of currentStroke) {
      // Convert back from normalized coordinates to screen coordinates
      // Remember to flip Y coordinate back
      const screenX = point.x * width - width/2;
      const screenY = (1.0 - point.y) * height - height/2;
      vertex(screenX, screenY);
    }
    endShape();
  }
  
  // Reset drawing state
  noStroke();
}

// Draw cursor indicator when in draw mode
function drawCursorIndicator() {
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    // Set stroke properties based on selected color
    const colors = [
      [255, 51, 51],   // Red
      [51, 255, 51],   // Green
      [51, 51, 255],   // Blue
      [255, 255, 51],  // Yellow
      [255, 51, 255],  // Magenta
      [51, 255, 255]   // Cyan
    ];
    
    const color = colors[selectedColor];
    stroke(color[0], color[1], color[2], 150);
    strokeWeight(2);
    noFill();
    
    // Draw circle at cursor position (converted to WebGL coordinates)
    const cursorX = mouseX - width/2;
    const cursorY = mouseY - height/2;
    circle(cursorX, cursorY, strokeWidth);
    
    // Reset drawing state
    noStroke();
  }
}

// Update framerate display
function updateFramerate() {
  framerateDelta++;
  if (millis() - framerateUpdateTime > 500) { // Update every 500ms
    const fps = Math.round(framerateDelta * 2); // Calculate FPS (2 times per second)
    document.getElementById('framerate').textContent = `FPS: ${fps}`;
    framerateDelta = 0;
    framerateUpdateTime = millis();
  }
}