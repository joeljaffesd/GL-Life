// Fragment Shader (shader.frag)
// This shader applies a simple color gradient based on texture coordinates.

precision mediump float;

varying vec2 vTexCoord;

void main() {
  gl_FragColor = vec4(vTexCoord.x, vTexCoord.y, 0.5, 1.0);
}