// Cesium 1.139+ PostProcessStage auto-declares:
//   in vec2 v_textureCoordinates;
//   uniform sampler2D colorTexture;
//   out vec4 out_FragColor;
// We must NOT re-declare them. Just provide main() and helper functions.

export const CRT_SHADER = `
in vec2 v_textureCoordinates;
uniform sampler2D colorTexture;

void main(void) {
    vec2 uv = v_textureCoordinates;
    
    // Slight barrel distortion
    vec2 cc = uv - 0.5;
    float dist = dot(cc, cc);
    uv = uv + cc * (dist * 0.1);
    
    // RGB Chromatic Aberration
    float r = texture(colorTexture, uv + vec2(0.002, 0.0)).r;
    float g = texture(colorTexture, uv).g;
    float b = texture(colorTexture, uv - vec2(0.002, 0.0)).b;
    vec3 color = vec3(r, g, b);

    // Thick Scanlines
    float scanline = sin(uv.y * 1000.0) * 0.08;
    color -= scanline;

    // Hard Vignette
    color *= smoothstep(0.8, 0.2, distance(uv, vec2(0.5)) * 0.9);

    out_FragColor = vec4(color, 1.0);
}
`;

export const NVG_SHADER = `
in vec2 v_textureCoordinates;
uniform sampler2D colorTexture;

float rand(vec2 co){
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main(void) {
    vec4 color = texture(colorTexture, v_textureCoordinates);

    // Extract Luminance
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    // High ISO grain/noise mapping
    float noise = (rand(v_textureCoordinates * 2000.0) - 0.5) * 0.4;
    
    // P43 Phosphor Green (Military NVG standard)
    vec3 phosphorColor = vec3(0.1, 0.95, 0.2) * (lum + noise);

    // Light amplification bloat (cheap halo)
    if (lum > 0.8) {
        phosphorColor += vec3(0.0, 0.5, 0.1);
    }

    // Heavy Circular Vignetting representing NVG tubes
    float dist = distance(v_textureCoordinates, vec2(0.5));
    float vignette = smoothstep(0.6, 0.35, dist);
    
    out_FragColor = vec4(phosphorColor * vignette, 1.0);
}
`;

export const FLIR_SHADER = `
in vec2 v_textureCoordinates;
uniform sampler2D colorTexture;

// More accurate White-Hot FLIR mapping
vec3 whiteHot(float t) {
    // Invert the heat so hot = white, cold = dark gray/black
    return vec3(t); 
}

void main(void) {
    vec4 color = texture(colorTexture, v_textureCoordinates);

    // Calculate heat based on luminance
    float heat = dot(color.rgb, vec3(0.3, 0.59, 0.11));
    
    // Stretch contrast dramatically to simulate thermal sensitivity
    heat = smoothstep(0.05, 0.7, heat);

    vec3 thermal = whiteHot(heat);
    
    // Add very slight blue tint to the coldest spots for cinematic effect
    if (heat < 0.1) {
        thermal += vec3(0.0, 0.0, 0.05);
    }

    // Vignette
    float dist = distance(v_textureCoordinates, vec2(0.5));
    thermal *= smoothstep(0.9, 0.4, dist);

    out_FragColor = vec4(thermal, 1.0);
}
`;
