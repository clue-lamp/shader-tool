#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 resolution;
uniform vec2 lineStart;
uniform vec2 lineEnd;

uniform float time;
uniform float shift;
uniform float density;
uniform float fadeStartInner; // e.g. 0.0
uniform float fadeEndInner;   // e.g. 0.2

uniform float fadeStartOuter; // e.g. 0.8
uniform float fadeEndOuter;   // e.g. 1.0

uniform float progress;
uniform float ringShiftProgress;
uniform float shiftAmount;
uniform float shiftSpeed;         // rename if desired
uniform float channelNoiseSpeed; // if needed separately
uniform int distanceMode;
uniform sampler2D pathTexture;

// 2D hash
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// 2D smooth noise
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  // Interpolation weights
  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// 1D hash for time-based shift
float hash1(float n) {
  return fract(sin(n) * 43758.5453);
}

float noise1(float x) {
  float i = floor(x);
  float f = fract(x);
  float u = f * f * (3.0 - 2.0 * f);
  return mix(hash1(i), hash1(i + 1.0), u);
}

// Signed noise (−1 to +1)
float signedNoise1(float x) {
  return noise1(x) * 2.0 - 1.0;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - resolution) / min(resolution.x, resolution.y);
  vec2 screenUV = gl_FragCoord.xy / resolution;

  float radius;

  if (distanceMode == 0) {
    // Default radial distance from center
    radius = length(uv);
  }
  else if (distanceMode == 1) {
    // Distance from line
    vec2 ba = lineEnd - lineStart;
    vec2 pa = uv - lineStart;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    vec2 proj = lineStart + h * ba;
    radius = length(uv - proj);
  }
  else if (distanceMode == 2) {
    // Scale texture coordinates to extend shader effect 2x right and 2x up
    vec2 texCoord = gl_FragCoord.xy / resolution;
    texCoord.x = texCoord.x * 0.5; // double to the right (divide by 2)
    texCoord.y = (1.0 - texCoord.y) * 0.5 + 0.5; // double to the top (flipped, divide by 2) and move up half screen
    float value = texture2D(pathTexture, texCoord).r;
    radius = 1.0 - value; // Invert the distance calculation (180 degrees)
  }
  else if (distanceMode == 3) {
    // Lava mode - use metaball texture (full screen)
    vec2 texCoord = gl_FragCoord.xy / resolution;
    texCoord.x = texCoord.x * 0.5; // double to the right (divide by 2)
    texCoord.y = (1.0 - texCoord.y) * 0.5 + 0.5; // double to the top (flipped, divide by 2) and move up half screen
    float value = texture2D(pathTexture, texCoord).r;
    radius = 1.0 - value; // Invert the distance calculation (180 degrees)
  }
  
  
  float t = progress;
  
  // === Radial RGB shift based on progress ===
  float ringPhase = ringShiftProgress + shiftSpeed;

  float dr = signedNoise1(ringPhase + 0.0);
  float dg = signedNoise1(ringPhase + 12.0);
  float db = signedNoise1(ringPhase + 24.0);

  dr *= shiftAmount;
  dg *= shiftAmount;
  db *= shiftAmount;
  
  float r = noise(vec2((radius + dr) * density, progress));
  float g = noise(vec2((radius + dg) * density, progress + shift));
  float b = noise(vec2((radius + db) * density, progress + shift * 2.0));

  vec3 color = vec3(r, g, b);

  // From center out to edge
  float fadeIn  = smoothstep(fadeStartInner, fadeEndInner, radius);       // center fade
  float fadeOut = smoothstep(fadeEndOuter, fadeStartOuter, radius);       // edge fade
  float alpha = fadeIn * fadeOut;

  vec3 finalColor = mix(vec3(0.0), color, alpha); // fade to black
  gl_FragColor = vec4(finalColor, 1.0);
}