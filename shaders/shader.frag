// Fragment Shader (shader.frag)
// This shader applies a simple color gradient based on texture coordinates.

precision mediump float;

varying vec2 vTexCoord;
uniform sampler2D uPrevious;
uniform bool uFirst;
uniform bool uDisplay; // new uniform to indicate display mode

void main() {
  if (uFirst) {
    // Initial condition
    gl_FragColor = vec4(vec3(0.0), 1.0);
  } else {
    // Sample the previous frame's texture and update sawtooth phase
    vec4 previousColor = texture2D(uPrevious, vTexCoord);
    vec3 saw = mod(previousColor.rgb + vec3(0.01), vec3(1.0));
    
    if(uDisplay) {
      // Apply a wave shaper (e.g. a simple sine function) for display
      vec3 wave = sin(saw * 3.14159);
      gl_FragColor = vec4(wave, 1.0);
    } else {
      // Write the sawtooth value into the feedback buffer
      gl_FragColor = vec4(saw, 1.0);
    }
  }
}