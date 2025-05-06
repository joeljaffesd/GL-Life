// Fragment Shader (shader.frag)
// This shader applies a simple color gradient based on texture coordinates.

precision mediump float;

varying vec2 vTexCoord;
uniform sampler2D uPrevious;
uniform bool uFirst;

void main() {
  if (uFirst) {
    gl_FragColor = vec4(vTexCoord.x, vTexCoord.y, 0.5, 1.0);
  } else {
    // Sample the previous frame's texture
    vec4 previousColor = texture2D(uPrevious, vTexCoord);
    vec3 prevRGB = previousColor.rgb;
    prevRGB = prevRGB + vec3(0.01);
    prevRGB = mod(prevRGB, vec3(1.0));
    gl_FragColor = vec4(prevRGB, 1.0);
  }
}