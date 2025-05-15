// Fragment Shader (shader.frag)

precision mediump float;

// simulation variables from `../reference/particleLife.js`
//===============================================================

// let numParticles = 500;                        // unsigned int
// let scale;                                   // unsigned float
// let K = 0.05;                                // unsigned float 
// let friction = 0.3;                // unsigned float in [0, 1]
// let numTypes = 6;                              // unsigned int
// let colorStep = 360 / numTypes;              // unsigned float

// note these are Vec2s
// let minDistances = [];                                 // vec2
// let radii = [];                                        // vec2
// let forces = [];                                       // vec2         
// let swarm = [];                                        // vec2

//===============================================================

// above variables translated to GLSL data types 
// NOTE: sampler2Ds need to be initialized in the sketch.js file
uniform sampler2D uPrevParticles1; // RG = accel, BA = vel
uniform sampler2D uPrevParticles2; // RG = pos, B = ?, A = type?
uniform sampler2D uDistAndRadii;
uniform vec2 uResolution;         // Texture size (numParticles x 1) ??? 
uniform float uK;
uniform float uFriction;
uniform int uNumTypes; // 6 is fine

// variables for handling frame buffering
varying vec2 vTexCoord;
uniform sampler2D uPrevious;
uniform bool uFirst;
uniform bool uDisplay; // new uniform to indicate display mode

void main() {
  if (uFirst) { // special case for the first frame

    // Initial condition
    // gl_FragColor = vec4(vec3(0.0), 1.0);

    // conditionally populate a limited number of particles, of 3 types
    if (vTexCoord.x < 0.5 && vTexCoord.y > 0.5) {
      // Use pixel coordinates to create a type index
      int index = int(mod(float(gl_FragCoord.x), float(uNumTypes)));
      // Map index to color
      vec3 color;
      if (index == 0) {
        color = vec3(1.0, 0.0, 0.0); // red
      } else if (index == 1) {
        color = vec3(0.0, 1.0, 0.0); // green
      } else if (index == 2) {
        color = vec3(0.0, 0.0, 1.0); // blue
      } else { 
        color = vec3(1.0); // fallback (white)
      }
      gl_FragColor = vec4(color, 1.0);
    } else {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // black
    }

  } else {
    // for now, just render previous frame (visualizing initial conditions)
    if (!uDisplay) {
      vec4 previousColor = texture2D(uPrevious, vTexCoord);
      gl_FragColor = previousColor;
    } else {
      vec4 previousColor = texture2D(uPrevious, vTexCoord);
      gl_FragColor = previousColor;
    }
  }
}

//===============================================================
/*
NOTES:
gl_FragCoord is the pixel coordinate in [0, width] x [0, height]
vTexCoord is the normalized coordinate in [0, 1] x [0, 1]

*/