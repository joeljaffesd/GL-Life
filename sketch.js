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

let minDistances, radii, forces;
let parametersProgram;
let parametersBuffer;

// load shaders
function preload() {
  simProgram = loadShader('shaders/shader.vert', 'shaders/simulation.frag');
  displayProgram = loadShader('shaders/shader.vert', 'shaders/display.frag');
  parametersProgram = loadShader('shaders/shader.vert', 'shaders/parameters.frag');
}

function setParameters() {
  parametersBuffer.begin();
  simProgram.setUniform("uParameters", parametersBuffer);
  shader(parametersProgram);
  quad(-1, -1, 1, -1, 1, 1, -1, 1);
  parametersBuffer.end();
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

  const parameterOptions = {
    width: numTypes,
    height: numTypes,
    textureFiltering: LINEAR,
    format: FLOAT,
  };

  agentsPrev = createFramebuffer(agentsOptions);
  agentsNext = createFramebuffer(agentsOptions);
  display = createFramebuffer(displayOptions);
  parametersBuffer = createFramebuffer(parameterOptions);

  // noLoop(); // manually walk thru frames for debugging 

  // init framebuffers to 0
  agentsNext.begin();
  background(0, 0, 0, 0);
  agentsNext.end();
  agentsPrev.begin();
  background(0, 0, 0, 0);
  agentsPrev.end();
  setParameters()
}

// per-frame sim-step and draw
function draw() {

  agentsNext.begin();
  background(0, 0, 0, 0); // Clear the framebuffer
  shader(simProgram);
  simProgram.setUniform("uNumParticles", numParticles);
  simProgram.setUniform("uNumTypes", numTypes);
  simProgram.setUniform("uPrevious", agentsPrev);
  simProgram.setUniform("uFirst", first);
  simProgram.setUniform("uResolution", [agentsNext.width, agentsNext.height]);
  simProgram.setUniform("uParameters", parametersBuffer);
  //print(`Drawing to agentsNext: ${agentsNext.width}x${agentsNext.height}`);
  quad(-1, -1, 1, -1, 1, 1, -1, 1);
  agentsNext.end();
  first = false; // set first to false after first pass

  dump(agentsNext); // print updated agent data
  clear(); // clear 
  image(agentsNext, -width / 2, -height / 2, width, height); // display agents 
  
  // Second pass: render the agents to the display framebuffer.
  shader(displayProgram);
  displayProgram.setUniform("uSimState", agentsNext);
  displayProgram.setUniform("uNumParticles", numParticles);
  displayProgram.setUniform("uNumTypes", numTypes);
  displayProgram.setUniform("uParticleSize", 5.0); // Adjust as needed
  displayProgram.setUniform("uResolution", [width, height]);
  quad(-1, -1, 1, -1, 1, 1, -1, 1);
  
  // Swap buffers for next frame
  [agentsPrev, agentsNext] = [agentsNext, agentsPrev];
}

// handle window resizing
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function keyPressed() {
  // redraw();
  setParameters();
}