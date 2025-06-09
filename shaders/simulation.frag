#version 300 es
// Simulation Fragment Shader (simulation.frag)
// On first pass: Initialize particles with random positions
// On subsequent passes: Maintain those positions (sample and hold)

precision mediump float;

// Input uniform for previous state
uniform sampler2D uPrevious;
uniform bool uFirst;  // Flag for first pass
uniform int uNumParticles; // Number of particles to simulate
uniform vec2 uResolution; // Canvas resolution

// In GLSL 300 ES, the varying keyword is replaced with in/out
in vec2 vTexCoord;

// In GLSL 300 ES, we need to declare our output
out vec4 fragColor;

// Random function - returns a pseudo-random value between 0 and 1
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  // Get the current texel index - corresponds to particle index
  // (0, width - 1)
  int particleIndex = int(vTexCoord.x * uResolution.x);

  // get which layer we're on
  // (0, height - 1)
  int particleLayer = int(vTexCoord.y * uResolution.y);

  if (uFirst) {
    
    if (particleLayer == 0) {
      // First pass: initialize with random positions
      // Generate a unique seed for this particle
      vec2 seed = vec2(float(particleIndex) * 0.01, float(particleIndex) * 0.02);
      
      // Random position in [0,1] range
      float posX = random(seed);
      float posY = random(seed + vec2(1.0, 2.0));
      
      // Random particle type (between 0 and 1, will be mapped to discrete types)
      float particleType = random(seed + vec2(3.0, 4.0));
      
      // Store: RG = position, B = unused, A = particle type
      fragColor = vec4(posX, posY, 0.0, particleType);
    } else {
      // Store: RG = 0-init'd velocity, B = unused, A = unused
      fragColor = vec4(0.0);
    }

  } 

  else { // if !first 

    if (particleLayer == 1) {
      // Get previous state for this particle
      vec4 prevState = texelFetch(uPrevious, ivec2(particleIndex, 1), 0);
      vec2 prevVel = prevState.xy;
      prevVel.y -= 0.01;
      prevState.xy = prevVel;
      fragColor = prevState;
    } else {
      vec4 prevState = texelFetch(uPrevious, ivec2(particleIndex, 0), 0);
      vec2 prevPos = prevState.xy;
      vec2 prevVel = texelFetch(uPrevious, ivec2(particleIndex, 1), 0).xy;
    
      // sanity check sim
      prevPos += prevVel; // "simulation"
      // prevPos.y += prevVel; // "simulation"


      // Toroidal wrapping
      //======================================== 
      if (prevPos.x >= 1.0) {
        prevPos.x -= 1.0;
      }

      if (prevPos.x <= 0.0) {
        prevPos.x += 1.0;
      }

      if (prevPos.y >= 1.0) {
        prevPos.y -= 1.0;
      }

      if (prevPos.y <= 0.0) {
        prevPos.y += 1.0;
      }
      //======================================== 

      // update positons
      prevState.xy = prevPos;

      // Output state
      fragColor = prevState;
    }

  }
}