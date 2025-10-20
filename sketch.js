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
let maxStrokeParticles = 10000; // Increased to 10k with texture storage

// Stroke texture system
let strokeTexture; // Framebuffer for stroke particles
let strokeConnectivityTexture; // Framebuffer for stroke connectivity data
let strokeTextureSize = 100; // 100x100 = 10k particles (adjustable)
let strokeCount = 0; // Current number of stroke particles
let strokeTextureNeedsUpdate = false; // Flag to track when texture needs rebuilding
let lastStrokeCount = 0; // Track changes to optimize updates
let textureUpdateTimer = 0; // Debounce texture updates

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

  // Create stroke texture for up to 10k stroke particles
  const strokeOptions = {
    width: strokeTextureSize,
    height: strokeTextureSize,
    textureFiltering: NEAREST, // No interpolation needed for discrete particles
    format: FLOAT,
  };
  strokeTexture = createFramebuffer(strokeOptions);
  strokeConnectivityTexture = createFramebuffer(strokeOptions);

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
  
  // Initialize stroke texture
  strokeTexture.begin();
  background(0, 0, 0, 0);
  strokeTexture.end();
  
  strokeConnectivityTexture.begin();
  background(0, 0, 0, 0);
  strokeConnectivityTexture.end();
  
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

  // Update stroke texture when needed (includes current stroke with Douglas-Peucker)
  const totalStrokeLength = strokes.length + (currentStroke.length > 2 ? douglasPeucker(currentStroke, 0.005).length : currentStroke.length);
  if (strokeTextureNeedsUpdate || totalStrokeLength !== lastStrokeCount || currentStroke.length > 0) {
    // Update more frequently during drawing for real-time feedback
    const updateInterval = isDrawing ? 50 : 100; // 50ms during drawing, 100ms otherwise
    if (millis() - textureUpdateTimer > updateInterval) {
      updateStrokeTexture();
      strokeTextureNeedsUpdate = false;
      lastStrokeCount = totalStrokeLength;
      textureUpdateTimer = millis();
    }
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
  simProgram.setUniform("uNumStrokes", strokeCount);
  simProgram.setUniform("uStrokeTexture", strokeTexture);
  simProgram.setUniform("uStrokeConnectivityTexture", strokeConnectivityTexture);
  simProgram.setUniform("uStrokeTextureSize", strokeTextureSize);
  simProgram.setUniform("uStrokeMass", strokeWidth / 50.0); // Normalize stroke width to mass (1-50 -> 0.02-1.0)
  
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
  displayProgram.setUniform("uNumStrokes", strokeCount);
  displayProgram.setUniform("uStrokeTexture", strokeTexture);
  displayProgram.setUniform("uStrokeConnectivityTexture", strokeConnectivityTexture);
  displayProgram.setUniform("uStrokeTextureSize", strokeTextureSize);
  displayProgram.setUniform("uStrokeMass", strokeWidth / 50.0); // Mass for display scaling
  
  quad(-1, -1, 1, -1, 1, 1, -1, 1);
  
  // Swap buffers for next frame
  [agentsPrev, agentsNext] = [agentsNext, agentsPrev];
}

// Update stroke texture with current stroke data (optimized)
function updateStrokeTexture() {
  // Combine permanent strokes with current stroke being drawn
  let allStrokes = [...strokes];
  
  // Apply Douglas-Peucker to current stroke for real-time preview
  if (currentStroke.length > 2) {
    const epsilon = 0.005;
    const simplifiedCurrent = douglasPeucker(currentStroke, epsilon);
    
    // Convert simplified points to particles with connectivity info
    const currentParticles = simplifiedCurrent.map((point, i) => ({
      x: point.x,
      y: point.y,
      type: point.type,
      isMainPoint: true,
      strokeIndex: i,
      totalStrokePoints: simplifiedCurrent.length,
      nextPointX: i < simplifiedCurrent.length - 1 ? simplifiedCurrent[i + 1].x : -1,
      nextPointY: i < simplifiedCurrent.length - 1 ? simplifiedCurrent[i + 1].y : -1
    }));
    
    allStrokes = [...allStrokes, ...currentParticles];
  } else if (currentStroke.length > 0) {
    // For short strokes, just add the points directly
    allStrokes = [...allStrokes, ...currentStroke.map((point, i) => ({
      x: point.x,
      y: point.y,
      type: point.type,
      isMainPoint: true,
      strokeIndex: i,
      totalStrokePoints: currentStroke.length,
      nextPointX: i < currentStroke.length - 1 ? currentStroke[i + 1].x : -1,
      nextPointY: i < currentStroke.length - 1 ? currentStroke[i + 1].y : -1
    }))];
  }
  
  const maxStrokeCapacity = strokeTextureSize * strokeTextureSize;
  const strokesToUse = allStrokes.slice(-maxStrokeCapacity);
  strokeCount = strokesToUse.length;
  
  strokeTexture.begin();
  background(0, 0, 0, 0); // Clear existing strokes
  
  if (strokeCount === 0) {
    strokeTexture.end();
    
    strokeConnectivityTexture.begin();
    background(0, 0, 0, 0);
    strokeConnectivityTexture.end();
    return;
  }
  
  // Render position and type data to main texture
  push();
  camera(0, 0, 1, 0, 0, 0, 0, 1, 0);
  ortho(-1, 1, -1, 1, -1, 1);
  strokeWeight(1);
  
  for (let i = 0; i < strokeCount; i++) {
    const strokeParticle = strokesToUse[i];
    
    const texX = i % strokeTextureSize;
    const texY = Math.floor(i / strokeTextureSize);
    const ndcX = (texX / strokeTextureSize) * 2.0 - 1.0 + (1.0 / strokeTextureSize);
    const ndcY = (texY / strokeTextureSize) * 2.0 - 1.0 + (1.0 / strokeTextureSize);
    
    // Main texture: position and type
    const r = Math.round(strokeParticle.x * 255);
    const g = Math.round(strokeParticle.y * 255);  
    const b = Math.round((strokeParticle.type / numTypes) * 255);
    const a = strokeParticle.isMainPoint ? 255 : 128; // Distinguish main points
    
    stroke(r, g, b, a);
    point(ndcX, ndcY);
  }
  
  pop();
  strokeTexture.end();
  
  // Render connectivity data to second texture
  strokeConnectivityTexture.begin();
  background(0, 0, 0, 0);
  
  push();
  camera(0, 0, 1, 0, 0, 0, 0, 1, 0);
  ortho(-1, 1, -1, 1, -1, 1);
  strokeWeight(1);
  
  for (let i = 0; i < strokeCount; i++) {
    const strokeParticle = strokesToUse[i];
    
    const texX = i % strokeTextureSize;
    const texY = Math.floor(i / strokeTextureSize);
    const ndcX = (texX / strokeTextureSize) * 2.0 - 1.0 + (1.0 / strokeTextureSize);
    const ndcY = (texY / strokeTextureSize) * 2.0 - 1.0 + (1.0 / strokeTextureSize);
    
    // Connectivity texture: next point position, stroke info, and mass
    const nextX = strokeParticle.nextPointX >= 0 ? Math.round(strokeParticle.nextPointX * 255) : 0;
    const nextY = strokeParticle.nextPointY >= 0 ? Math.round(strokeParticle.nextPointY * 255) : 0;
    const strokeMass = Math.round((strokeWidth / 50.0) * 255); // Mass based on current stroke width (0-255)
    const hasNext = strokeParticle.nextPointX >= 0 ? 255 : 0;
    
    stroke(nextX, nextY, strokeMass, hasNext);
    point(ndcX, ndcY);
  }
  
  pop();
  strokeConnectivityTexture.end();
  
  console.log(`Updated stroke texture with ${strokeCount} particles`);
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
    strokeTextureNeedsUpdate = true; // Trigger texture update
    console.log('All strokes cleared');
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
    
    // Mark texture for update since we added new strokes
    strokeTextureNeedsUpdate = true;
    
    console.log(`Added stroke with ${interpolatedStroke.length} particles. Total: ${strokes.length}. Texture capacity: ${strokeTextureSize * strokeTextureSize}`);
    
    currentStroke = [];
    isDrawing = false;
  }
}

// Interpolate points along a stroke to create dense particle distribution
function interpolateStroke(stroke, width) {
  if (stroke.length < 1) return [];
  if (stroke.length === 1) return [stroke[0]]; // Single point
  
  // Apply Douglas-Peucker algorithm to reduce points before particle generation
  const epsilon = 0.005; // Tolerance for line simplification (adjustable)
  const simplifiedStroke = douglasPeucker(stroke, epsilon);
  
  console.log(`Douglas-Peucker: Reduced stroke from ${stroke.length} to ${simplifiedStroke.length} points`);
  
  const particles = [];
  
  // Generate particles for the simplified stroke points with connectivity info
  for (let i = 0; i < simplifiedStroke.length; i++) {
    const point = simplifiedStroke[i];
    
    // Add the main stroke point with connectivity information
    particles.push({
      x: point.x,
      y: point.y,
      type: point.type,
      isMainPoint: true,
      strokeIndex: i,
      totalStrokePoints: simplifiedStroke.length,
      nextPointX: i < simplifiedStroke.length - 1 ? simplifiedStroke[i + 1].x : -1,
      nextPointY: i < simplifiedStroke.length - 1 ? simplifiedStroke[i + 1].y : -1
    });
    
    // Add thickness particles around each simplified point (fewer than before)
    const numThicknessParticles = Math.max(2, Math.floor(width / 15)); // Reduced density
    for (let k = 0; k < numThicknessParticles; k++) {
      const angle = (k / numThicknessParticles) * TWO_PI + random(-0.3, 0.3);
      const maxRadius = width * 0.0003; // Smaller radius since we have fewer main points
      const radius = random(maxRadius * 0.5, maxRadius);
      const offsetX = cos(angle) * radius;
      const offsetY = sin(angle) * radius;
      
      particles.push({
        x: constrain(point.x + offsetX, 0, 1),
        y: constrain(point.y + offsetY, 0, 1),
        type: point.type,
        isMainPoint: false,
        strokeIndex: -1,
        totalStrokePoints: 0,
        nextPointX: -1,
        nextPointY: -1
      });
    }
  }
  
  return particles;
}

// Douglas-Peucker algorithm for line simplification
function douglasPeucker(points, epsilon) {
  if (points.length <= 2) return points;
  
  // Find the point with the maximum distance from the line between first and last points
  let maxDistance = 0;
  let maxIndex = 0;
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], firstPoint, lastPoint);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }
  
  // If the maximum distance is greater than epsilon, recursively simplify
  if (maxDistance > epsilon) {
    // Recursive call for the two segments
    const leftSegment = douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
    const rightSegment = douglasPeucker(points.slice(maxIndex), epsilon);
    
    // Combine results (remove duplicate point at the junction)
    return leftSegment.slice(0, -1).concat(rightSegment);
  } else {
    // If no point is far enough, return just the endpoints
    return [firstPoint, lastPoint];
  }
}

// Calculate perpendicular distance from a point to a line
function perpendicularDistance(point, lineStart, lineEnd) {
  const A = lineEnd.x - lineStart.x;
  const B = lineEnd.y - lineStart.y;
  const C = point.x - lineStart.x;
  const D = point.y - lineStart.y;
  
  const dot = A * C + B * D;
  const lenSq = A * A + B * B;
  
  if (lenSq === 0) {
    // Line start and end are the same point
    return dist(point.x, point.y, lineStart.x, lineStart.y);
  }
  
  const param = dot / lenSq;
  let closestX, closestY;
  
  if (param < 0) {
    closestX = lineStart.x;
    closestY = lineStart.y;
  } else if (param > 1) {
    closestX = lineEnd.x;
    closestY = lineEnd.y;
  } else {
    closestX = lineStart.x + param * A;
    closestY = lineStart.y + param * B;
  }
  
  return dist(point.x, point.y, closestX, closestY);
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