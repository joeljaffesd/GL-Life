// Fragment Shader (shader.frag)

precision mediump float;

// variables for handling frame buffering
varying vec2 vTexCoord;
uniform sampler2D uPrevious;
uniform bool uFirst;
uniform bool uDisplay; // new uniform to indicate display mode


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

void main() {
  if (uFirst) { // special case for the first frame

    // Initial condition
    gl_FragColor = vec4(vec3(0.0), 1.0);

  } else {
    // Sample the previous frame's texture and update sawtooth phase
    vec4 previousColor = texture2D(uPrevious, vTexCoord);
    vec3 saw = mod(previousColor.rgb + vec3(0.01), vec3(1.0));
    
    if(!uDisplay) { // if !uDisplay, simulation code:

      // Write the sawtooth value into the feedback buffer
      gl_FragColor = vec4(saw, 1.0);

    } else { // if uDisplay, drawing code:

      // Apply a wave shaper (e.g. a simple sine function) for display
      vec3 wave = sin(saw * 3.14159);
      gl_FragColor = vec4(wave, 1.0);
      
    }
  }
}